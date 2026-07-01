'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types'

export async function getProjects(params: {
  search?: string
  status?: string
  page?: number
  perPage?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const page = params.page ?? 1
  const perPage = params.perPage ?? 12
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (params.search) {
    query = query.or(
      `project_name.ilike.%${params.search}%,client_name.ilike.%${params.search}%,company_name.ilike.%${params.search}%,exhibition_name.ilike.%${params.search}%`
    )
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }

  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) throw new Error(error.message)

  return {
    projects: (data ?? []) as Project[],
    total: count ?? 0,
    page,
    perPage,
    totalPages: Math.ceil((count ?? 0) / perPage),
  }
}

export async function getProject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) throw new Error(error.message)
  return data as Project
}

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const zones = formData.getAll('zones') as string[]
  const lightingPreferences = formData.getAll('lighting_preferences') as string[]
  const referenceImages = formData.getAll('reference_images') as string[]
  const referencePdfs = formData.getAll('reference_pdfs') as string[]

  const projectData = {
    user_id: user.id,
    status: 'draft' as const,
    project_name: formData.get('project_name') as string,
    client_name: formData.get('client_name') as string,
    company_name: formData.get('company_name') as string,
    exhibition_name: formData.get('exhibition_name') as string,
    industry_type: formData.get('industry_type') as string,
    event_date: (formData.get('event_date') as string) || null,
    booth_size: formData.get('booth_size') as string,
    ceiling_height: formData.get('ceiling_height') as string,
    meeting_rooms: parseInt(formData.get('meeting_rooms') as string) || 0,
    entry_exit_points: parseInt(formData.get('entry_exit_points') as string) || 1,
    design_theme: formData.get('design_theme') as string,
    primary_color: formData.get('primary_color') as string,
    secondary_color: formData.get('secondary_color') as string,
    zones,
    flooring_type: formData.get('flooring_type') as string,
    lighting_preferences: lightingPreferences,
    branding_requirements: formData.get('branding_requirements') as string,
    product_categories: formData.get('product_categories') as string,
    required_zones: formData.get('required_zones') as string,
    display_requirements: formData.get('display_requirements') as string,
    visitor_engagement: formData.get('visitor_engagement') as string,
    color_guidelines: formData.get('color_guidelines') as string,
    logo_url: (formData.get('logo_url') as string) || null,
    reference_images: referenceImages,
    reference_pdfs: referencePdfs,
    reference_pdf_pages: formData.get('reference_pdf_pages') as string,
    additional_requirements: formData.get('additional_requirements') as string,
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/projects')
  return { project: data as Project }
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const zones = formData.getAll('zones') as string[]
  const lightingPreferences = formData.getAll('lighting_preferences') as string[]
  const referenceImages = formData.getAll('reference_images') as string[]
  const referencePdfs = formData.getAll('reference_pdfs') as string[]

  const projectData = {
    project_name: formData.get('project_name') as string,
    client_name: formData.get('client_name') as string,
    company_name: formData.get('company_name') as string,
    exhibition_name: formData.get('exhibition_name') as string,
    industry_type: formData.get('industry_type') as string,
    event_date: (formData.get('event_date') as string) || null,
    booth_size: formData.get('booth_size') as string,
    ceiling_height: formData.get('ceiling_height') as string,
    meeting_rooms: parseInt(formData.get('meeting_rooms') as string) || 0,
    entry_exit_points: parseInt(formData.get('entry_exit_points') as string) || 1,
    design_theme: formData.get('design_theme') as string,
    primary_color: formData.get('primary_color') as string,
    secondary_color: formData.get('secondary_color') as string,
    zones,
    flooring_type: formData.get('flooring_type') as string,
    lighting_preferences: lightingPreferences,
    branding_requirements: formData.get('branding_requirements') as string,
    product_categories: formData.get('product_categories') as string,
    required_zones: formData.get('required_zones') as string,
    display_requirements: formData.get('display_requirements') as string,
    visitor_engagement: formData.get('visitor_engagement') as string,
    color_guidelines: formData.get('color_guidelines') as string,
    logo_url: (formData.get('logo_url') as string) || null,
    reference_images: referenceImages,
    reference_pdfs: referencePdfs,
    reference_pdf_pages: formData.get('reference_pdf_pages') as string,
    additional_requirements: formData.get('additional_requirements') as string,
  }

  const { error } = await supabase
    .from('projects')
    .update(projectData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
  return { success: true }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/projects')
  return { success: true }
}

export async function duplicateProject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: original, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !original) return { error: 'Project not found' }

  const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = original
  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...rest,
      project_name: `${rest.project_name} (Copy)`,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/projects')
  return { project: data as Project }
}

export async function uploadProjectFile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const MAX_FILE_SIZE = 20 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'Maximum file size is 20 MB.' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf' || file.type === 'application/pdf') {
    // PDF files allowed
  } else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext ?? '')) {
    // Image files allowed
  } else {
    return { error: 'Only PDF and image files are allowed.' }
  }

  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('project-files')
    .upload(fileName, file)

  if (error) return { error: error.message }

  const { data: urlData } = supabase.storage
    .from('project-files')
    .getPublicUrl(fileName)

  return { url: urlData.publicUrl }
}
