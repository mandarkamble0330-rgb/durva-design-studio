'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateProjectForGeneration } from '@/lib/generation/prompt-builder'
import { runFullPipeline } from '@/lib/generation/generation-orchestrator'
import type { Project } from '@/types'
import type { GenerationJob, GenerationStatus } from '@/types/generation'
import type { CameraViewId } from '@/types/camera'

export async function createGenerationJob(projectId: string, cameraViewId: CameraViewId = 'front') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) return { error: 'Project not found' }

  const validation = validateProjectForGeneration(project as Project)
  if (!validation.valid) {
    return { error: `Incomplete project: ${validation.errors.join(', ')}` }
  }

  const { data: job, error: jobError } = await supabase
    .from('generation_jobs')
    .insert({
      project_id: projectId,
      user_id: user.id,
      status: 'queued' as GenerationStatus,
      metadata: { cameraViewId },
    })
    .select()
    .single()

  if (jobError) return { error: jobError.message }

  revalidatePath(`/booth-designer/${projectId}`)
  return { job: job as GenerationJob }
}

export async function runGenerationPipeline(jobId: string, cameraViewId: CameraViewId = 'front') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: job, error: jobError } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) return { error: 'Job not found' }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', job.project_id)
    .single()

  if (projectError || !project) return { error: 'Project not found' }

  const result = await runFullPipeline(supabase, jobId, project as Project, user.id, cameraViewId)

  revalidatePath(`/booth-designer/${project.id}`)

  if (!result.success) {
    return { error: result.error }
  }

  return { job: result.job as GenerationJob }
}

export async function cancelGenerationJob(jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: job, error } = await supabase
    .from('generation_jobs')
    .select('project_id, status')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (error || !job) return { error: 'Job not found' }

  if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed') {
    return { error: 'Job cannot be cancelled in its current state' }
  }

  await supabase
    .from('generation_jobs')
    .update({ status: 'cancelled' as GenerationStatus, updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .neq('status', 'completed')
    .neq('status', 'failed')

  revalidatePath(`/booth-designer/${job.project_id}`)
  return { success: true }
}

export async function retryGenerationJob(jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: job, error } = await supabase
    .from('generation_jobs')
    .select('project_id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (error || !job) return { error: 'Job not found' }

  await updateJobStatus(supabase, jobId, 'queued', {
    error_message: null,
    started_at: null,
    completed_at: null,
    prompt: null,
    ai_response: null,
    ai_provider: null,
    ai_model: null,
    image_urls: [],
  })

  revalidatePath(`/booth-designer/${job.project_id}`)
  return { success: true }
}

export async function deleteGenerationJob(jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: job, error: fetchError } = await supabase
    .from('generation_jobs')
    .select('project_id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !job) return { error: 'Job not found' }

  const { error } = await supabase
    .from('generation_jobs')
    .delete()
    .eq('id', jobId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/booth-designer/${job.project_id}`)
  return { success: true }
}

export async function getGenerationJob(jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  return (data as GenerationJob) ?? null
}

export async function getGenerationJobs(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (data ?? []) as GenerationJob[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateJobStatus(supabase: any, jobId: string, status: GenerationStatus, extra?: Record<string, unknown>) {
  await supabase
    .from('generation_jobs')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', jobId)
}
