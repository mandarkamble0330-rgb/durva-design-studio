import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReferenceImage, LeonardoBoothView } from '@/types/generation'
import {
  getProjectReferenceImages,
  getPrimaryReference,
  getReferenceForView,
  processAndStoreReference,
  retryLeonardoUpload,
  deleteReference,
} from './reference-image-service'

const ALL_BOOTH_VIEWS: LeonardoBoothView[] = [
  'perspective',
  'front',
  'left',
  'right',
  'rear',
]

export class ReferenceImageManager {
  constructor(
    private supabase: SupabaseClient,
    private projectId: string,
    private userId: string,
  ) {}

  async listAll(): Promise<ReferenceImage[]> {
    return getProjectReferenceImages(this.supabase, this.projectId, this.userId)
  }

  async getPrimary(): Promise<ReferenceImage | null> {
    return getPrimaryReference(this.supabase, this.projectId)
  }

  async getForView(view: LeonardoBoothView): Promise<ReferenceImage | null> {
    return getReferenceForView(this.supabase, this.projectId, view)
  }

  async getViewAssignments(): Promise<Record<LeonardoBoothView, ReferenceImage | null>> {
    const result = {} as Record<LeonardoBoothView, ReferenceImage | null>
    for (const view of ALL_BOOTH_VIEWS) {
      const { data } = await this.supabase
        .from('reference_images')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('booth_view', view)
        .single()
      result[view] = (data as ReferenceImage) ?? null
    }
    return result
  }

  async addReference(
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
    return processAndStoreReference(
      this.supabase,
      this.projectId,
      this.userId,
      imageUrl,
      options,
    )
  }

  async addMultipleReferences(
    imageUrls: string[],
  ): Promise<Array<{ url: string; reference: ReferenceImage; reused: boolean; error?: string }>> {
    const results: Array<{ url: string; reference: ReferenceImage; reused: boolean; error?: string }> = []

    for (const url of imageUrls) {
      try {
        const { reference, reused } = await this.addReference(url)
        results.push({ url, reference, reused })
      } catch (err) {
        results.push({
          url,
          reference: null as unknown as ReferenceImage,
          reused: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return results
  }

  async setPrimary(referenceId: string): Promise<void> {
    await this.supabase
      .from('reference_images')
      .update({ is_primary: false })
      .eq('project_id', this.projectId)
      .eq('is_primary', true)

    await this.supabase
      .from('reference_images')
      .update({ is_primary: true })
      .eq('id', referenceId)
      .eq('project_id', this.projectId)
  }

  async assignView(referenceId: string, view: LeonardoBoothView): Promise<void> {
    await this.supabase
      .from('reference_images')
      .update({ booth_view: null })
      .eq('project_id', this.projectId)
      .eq('booth_view', view)

    await this.supabase
      .from('reference_images')
      .update({ booth_view: view })
      .eq('id', referenceId)
      .eq('project_id', this.projectId)
  }

  async clearViewAssignment(view: LeonardoBoothView): Promise<void> {
    await this.supabase
      .from('reference_images')
      .update({ booth_view: null })
      .eq('project_id', this.projectId)
      .eq('booth_view', view)
  }

  async retryUpload(referenceId: string): Promise<ReferenceImage> {
    return retryLeonardoUpload(this.supabase, referenceId)
  }

  async retryAllPendingUploads(): Promise<{
    succeeded: string[]
    failed: Array<{ id: string; error: string }>
  }> {
    const all = await this.listAll()
    const pending = all.filter(r => !r.init_image_id)
    const succeeded: string[] = []
    const failed: Array<{ id: string; error: string }> = []

    for (const ref of pending) {
      try {
        await this.retryUpload(ref.id)
        succeeded.push(ref.id)
      } catch (err) {
        failed.push({
          id: ref.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return { succeeded, failed }
  }

  async remove(referenceId: string): Promise<void> {
    return deleteReference(this.supabase, referenceId, this.userId)
  }

  async getReadyCount(): Promise<number> {
    const all = await this.listAll()
    return all.filter(r => r.init_image_id !== null).length
  }

  async getPendingCount(): Promise<number> {
    const all = await this.listAll()
    return all.filter(r => r.init_image_id === null).length
  }
}
