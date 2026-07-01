import type { CameraViewId, CameraViewResult } from '@/types/camera'
import type { GenerationJob } from '@/types/generation'
import { VIEW_ORDER } from './camera-presets'

export interface ViewGalleryEntry {
  viewId: CameraViewId
  label: string
  result: CameraViewResult
  job: GenerationJob | null
}

export function extractCameraViewId(job: GenerationJob): CameraViewId {
  const metadata = job.metadata as Record<string, unknown> | null
  if (metadata?.cameraViewId && typeof metadata.cameraViewId === 'string') {
    return metadata.cameraViewId as CameraViewId
  }
  return 'front'
}

export function mapJobsToViews(jobs: GenerationJob[]): ViewGalleryEntry[] {
  const viewLabels: Record<CameraViewId, string> = {
    front: 'Front View',
    left: 'Left View',
    right: 'Right View',
    rear: 'Rear View',
    angle_45: '45° Perspective',
    top_iso: 'Top Isometric',
  }

  const bestJobPerView = new Map<CameraViewId, GenerationJob>()

  for (const job of jobs) {
    const viewId = extractCameraViewId(job)
    const existing = bestJobPerView.get(viewId)
    if (!existing) {
      bestJobPerView.set(viewId, job)
      continue
    }
    if (job.status === 'completed' && existing.status !== 'completed') {
      bestJobPerView.set(viewId, job)
    } else if (job.status === existing.status && job.created_at > existing.created_at) {
      bestJobPerView.set(viewId, job)
    }
  }

  return VIEW_ORDER.map((viewId): ViewGalleryEntry => {
    const job = bestJobPerView.get(viewId) ?? null

    if (!job) {
      return {
        viewId,
        label: viewLabels[viewId],
        result: { viewId, imageUrl: null, generationId: null, status: 'pending', metadata: {} },
        job: null,
      }
    }

    const imageUrl = job.image_urls?.[0] ?? null
    const metadata = job.metadata as Record<string, unknown> | null
    const leonardo = metadata?.leonardo as Record<string, unknown> | null

    let status: CameraViewResult['status']
    if (job.status === 'completed' && imageUrl) status = 'completed'
    else if (job.status === 'failed') status = 'failed'
    else if (['queued', 'preparing_prompt', 'ready_for_ai', 'generating', 'preparing_reference', 'sending_to_leonardo', 'rendering_images'].includes(job.status)) status = 'rendering'
    else status = 'pending'

    return {
      viewId,
      label: viewLabels[viewId],
      result: {
        viewId,
        imageUrl,
        generationId: leonardo?.generationId as string ?? null,
        status,
        error: job.error_message ?? undefined,
        metadata: { jobId: job.id, jobStatus: job.status },
      },
      job,
    }
  })
}

export function getCompletedViewCount(entries: ViewGalleryEntry[]): number {
  return entries.filter(e => e.result.status === 'completed').length
}
