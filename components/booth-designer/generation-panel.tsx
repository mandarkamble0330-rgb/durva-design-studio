'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { GenerationStatusBadge } from './generation-status-badge'
import { ProgressTimeline } from './progress-timeline'
import { PromptPreview } from './prompt-preview'
import { AIResponsePreview } from './ai-response-preview'
import { GeneratedImages } from './generated-images'
import {
  createGenerationJob,
  runGenerationPipeline,
  cancelGenerationJob,
  retryGenerationJob,
  getGenerationJob,
} from '@/app/(dashboard)/booth-designer/actions'
import type { GenerationJob } from '@/types/generation'
import type { CameraViewId, CameraViewRequest } from '@/types/camera'
import { getCameraView } from '@/lib/camera'
import {
  Sparkles,
  Image,
  Loader2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

interface GenerationPanelProps {
  projectId: string
  latestJob: GenerationJob | null
  onJobChange?: (job: GenerationJob | null) => void
  cameraViewId?: CameraViewId
  onGeneratingChange?: (generating: boolean) => void
}

export function GenerationPanel({ projectId, latestJob, onJobChange, cameraViewId = 'front', onGeneratingChange }: GenerationPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentJob, setCurrentJob] = useState<GenerationJob | null>(latestJob)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevLatestJobIdRef = useRef(latestJob?.id)

  useEffect(() => {
    if (latestJob?.id !== prevLatestJobIdRef.current && !loading) {
      setCurrentJob(latestJob)
      prevLatestJobIdRef.current = latestJob?.id
    }
  }, [latestJob, loading])

  function updateCurrentJob(job: GenerationJob | null) {
    setCurrentJob(job)
    onJobChange?.(job)
  }

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const startPolling = useCallback((jobId: string) => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      const updated = await getGenerationJob(jobId)
      if (!updated) return
      setCurrentJob(updated)
      onJobChange?.(updated)
      if (['completed', 'failed', 'cancelled'].includes(updated.status)) {
        stopPolling()
      }
    }, 2000)
  }, [stopPolling, onJobChange])

  function buildCameraViewRequest(): CameraViewRequest {
    const view = getCameraView(cameraViewId)
    const request: CameraViewRequest = {
      viewId: view.id,
      projectId,
    }
    console.log('[CameraView] Request:', JSON.stringify(request))
    console.log('[CameraView] Prompt suffix:', view.promptSuffix)
    console.log('[CameraView] Negative hints:', view.negativeHints)
    return request
  }

  async function handleGenerate() {
    setLoading(true)
    onGeneratingChange?.(true)

    const cameraRequest = buildCameraViewRequest()
    console.log('[CameraView] CameraViewRequest:', cameraRequest.viewId, '→ pipeline')

    const createResult = await createGenerationJob(projectId, cameraViewId)
    if ('error' in createResult && createResult.error) {
      toast.error(createResult.error)
      setLoading(false)
      onGeneratingChange?.(false)
      return
    }

    const job = createResult.job!
    updateCurrentJob(job)
    toast.info('Starting generation pipeline...')

    startPolling(job.id)

    const pipelineResult = await runGenerationPipeline(job.id, cameraViewId)
    stopPolling()

    if ('error' in pipelineResult && pipelineResult.error) {
      toast.error(pipelineResult.error)
      setLoading(false)
      onGeneratingChange?.(false)
      router.refresh()
      return
    }

    if (pipelineResult.job) {
      updateCurrentJob(pipelineResult.job)
    }

    if (pipelineResult.job?.status === 'completed') {
      toast.success('Booth design generated successfully!')
    }

    setLoading(false)
    onGeneratingChange?.(false)
    router.refresh()
  }

  async function handleCancel() {
    if (!currentJob) return
    const result = await cancelGenerationJob(currentJob.id)
    if ('error' in result && result.error) {
      toast.error(result.error)
    } else {
      updateCurrentJob({ ...currentJob, status: 'cancelled' })
      toast.success('Generation cancelled')
      router.refresh()
    }
  }

  async function handleRetry() {
    if (!currentJob) return
    setLoading(true)
    const result = await retryGenerationJob(currentJob.id)
    if ('error' in result && result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    updateCurrentJob({ ...currentJob, status: 'queued' })

    startPolling(currentJob.id)

    const pipelineResult = await runGenerationPipeline(currentJob.id, cameraViewId)
    stopPolling()

    if ('error' in pipelineResult && pipelineResult.error) {
      toast.error(pipelineResult.error)
      setLoading(false)
      router.refresh()
      return
    }

    if (pipelineResult.job) {
      updateCurrentJob(pipelineResult.job)
    }

    if (pipelineResult.job?.status === 'completed') {
      toast.success('Booth design generated successfully!')
    }

    setLoading(false)
    router.refresh()
  }

  const isCompleted = currentJob?.status === 'completed'
  const hasActiveJob = currentJob && !['completed', 'failed', 'cancelled'].includes(currentJob.status)
  const isFailed = currentJob?.status === 'failed'
  const isCancelled = currentJob?.status === 'cancelled'
  const activeView = getCameraView(cameraViewId)

  return (
    <div className="flex flex-col gap-6">
      {/* Generation Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              AI Booth Generation
            </CardTitle>
            {currentJob && <GenerationStatusBadge status={currentJob.status} />}
          </div>
          <CardDescription>
            Generate AI-powered booth designs using OpenRouter + Leonardo AI
            <span className="ml-1.5 inline-flex items-center rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
              {activeView.label}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentJob && (
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Booth Design
            </Button>
          )}

          {hasActiveJob && (
            <div className="flex gap-2">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1 gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}

          {isCompleted && (
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 text-center dark:border-green-900 dark:bg-green-950/20">
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
              <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-400">
                Design Generated Successfully
              </p>
              {currentJob.ai_model && (
                <p className="mt-1 text-xs text-green-600/80 dark:text-green-400/80">
                  Model: {currentJob.ai_model}
                </p>
              )}
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={loading}
                className="mt-3 gap-1"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate New Version
              </Button>
            </div>
          )}

          {isFailed && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 text-center dark:border-red-900 dark:bg-red-950/20">
              <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
              <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-400">
                Generation Failed
              </p>
              {currentJob.error_message && (
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
                  {currentJob.error_message}
                </p>
              )}
              <div className="mt-3 flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={handleRetry} disabled={loading} className="gap-1">
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Retry
                </Button>
                <Button size="sm" onClick={handleGenerate} disabled={loading} className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  New Generation
                </Button>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <XCircle className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">Generation cancelled</p>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                size="sm"
                className="mt-3 gap-1"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Start New Generation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Timeline */}
      {currentJob && !isCancelled && !isCompleted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Pipeline Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressTimeline currentStatus={currentJob.status} />
          </CardContent>
        </Card>
      )}

      {/* Generated Images */}
      {isCompleted && currentJob.image_urls && currentJob.image_urls.length > 0 && (
        <GeneratedImages job={currentJob} />
      )}

      {/* AI Response (completed) */}
      {isCompleted && currentJob.ai_response && (
        <AIResponsePreview job={currentJob} />
      )}

      {/* Prompt Preview or Empty State */}
      {currentJob?.prompt ? (
        <PromptPreview
          job={currentJob}
          onRefresh={isCompleted ? undefined : handleGenerate}
          refreshing={loading}
        />
      ) : (
        <Card className="flex-1">
          <CardContent className="flex min-h-[350px] flex-col items-center justify-center py-12">
            <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 p-12 text-center">
              <Image className="mx-auto h-16 w-16 text-muted-foreground/30" />
              <h3 className="mt-6 text-lg font-semibold text-muted-foreground/60">
                No designs generated yet
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground/40">
                Click &ldquo;Generate Booth Design&rdquo; to create AI-powered
                booth designs using OpenRouter + Leonardo AI.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
