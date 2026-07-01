import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReferenceImage, LeonardoBoothView } from '@/types/generation'
import { validateImageUrl, generateFingerprintFromUrl } from './image-validation'
import { uploadImageToLeonardo } from './image-upload-service'

export async function findByFingerprint(
  supabase: SupabaseClient,
  projectId: string,
  fingerprint: string,
): Promise<ReferenceImage | null> {
  const { data } = await supabase
    .from('reference_images')
    .select('*')
    .eq('project_id', projectId)
    .eq('fingerprint', fingerprint)
    .single()

  return (data as ReferenceImage) ?? null
}

export async function getProjectReferenceImages(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<ReferenceImage[]> {
  const { data } = await supabase
    .from('reference_images')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  return (data ?? []) as ReferenceImage[]
}

export async function getPrimaryReference(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ReferenceImage | null> {
  const { data } = await supabase
    .from('reference_images')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_primary', true)
    .single()

  return (data as ReferenceImage) ?? null
}

export async function getReferenceForView(
  supabase: SupabaseClient,
  projectId: string,
  view: LeonardoBoothView,
): Promise<ReferenceImage | null> {
  const { data } = await supabase
    .from('reference_images')
    .select('*')
    .eq('project_id', projectId)
    .eq('booth_view', view)
    .single()

  if (data) return data as ReferenceImage

  return getPrimaryReference(supabase, projectId)
}

export async function processAndStoreReference(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  imageUrl: string,
  options?: {
    width?: number
    height?: number
    fileSize?: number
    fileType?: string
    boothView?: LeonardoBoothView
    isPrimary?: boolean
  },
): Promise<{ reference: ReferenceImage; reused: boolean }> {
  const urlValidation = validateImageUrl(imageUrl)
  if (!urlValidation.valid) {
    throw new Error(urlValidation.errors.join(' '))
  }

  const fingerprint = await generateFingerprintFromUrl(imageUrl)

  const existing = await findByFingerprint(supabase, projectId, fingerprint)
  if (existing) {
    if (options?.boothView && existing.booth_view !== options.boothView) {
      await supabase
        .from('reference_images')
        .update({ booth_view: options.boothView, uploaded_at: new Date().toISOString() })
        .eq('id', existing.id)
      return {
        reference: { ...existing, booth_view: options.boothView },
        reused: true,
      }
    }
    return { reference: existing, reused: true }
  }

  let initImageId: string | null = null
  try {
    initImageId = await uploadImageToLeonardo(imageUrl)
  } catch {
    // Upload to Leonardo failed — store reference without init_image_id
    // It can be retried later
  }

  if (options?.isPrimary) {
    await supabase
      .from('reference_images')
      .update({ is_primary: false })
      .eq('project_id', projectId)
      .eq('is_primary', true)
  }

  const record = {
    project_id: projectId,
    user_id: userId,
    image_url: imageUrl,
    init_image_id: initImageId,
    fingerprint,
    width: options?.width ?? 0,
    height: options?.height ?? 0,
    file_size: options?.fileSize ?? 0,
    file_type: options?.fileType ?? 'image/png',
    is_primary: options?.isPrimary ?? false,
    booth_view: options?.boothView ?? null,
    uploaded_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('reference_images')
    .insert(record)
    .select()
    .single()

  if (error) throw new Error(`Failed to store reference image: ${error.message}`)

  return { reference: data as ReferenceImage, reused: false }
}

export async function retryLeonardoUpload(
  supabase: SupabaseClient,
  referenceId: string,
): Promise<ReferenceImage> {
  const { data: ref, error } = await supabase
    .from('reference_images')
    .select('*')
    .eq('id', referenceId)
    .single()

  if (error || !ref) throw new Error('Reference image not found')

  const reference = ref as ReferenceImage

  if (reference.init_image_id) return reference

  const initImageId = await uploadImageToLeonardo(reference.image_url)

  await supabase
    .from('reference_images')
    .update({ init_image_id: initImageId, uploaded_at: new Date().toISOString() })
    .eq('id', referenceId)

  return { ...reference, init_image_id: initImageId }
}

export async function deleteReference(
  supabase: SupabaseClient,
  referenceId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('reference_images')
    .delete()
    .eq('id', referenceId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to delete reference image: ${error.message}`)
}
