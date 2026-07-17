import type { RenderPresetName, RenderFileFormat, RenderCameraView, RenderConfiguration } from '@/lib/render/render-types'

export type RenderJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'retrying'

export interface OrchestratorJob {
  jobId: string
  camera: RenderCameraView
  config: RenderConfiguration
  outputPath: string
  thumbnailPath: string | null
  status: RenderJobStatus
  attempt: number
  maxAttempts: number
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  error: string | null
}

export interface RenderProgress {
  totalJobs: number
  completed: number
  failed: number
  running: number
  queued: number
  percentComplete: number
  elapsedMs: number
  estimatedRemainingMs: number | null
}

export interface RenderManifestEntry {
  renderId: string
  projectId: string
  sceneId: string
  cameraView: string
  preset: RenderPresetName
  outputPath: string
  thumbnailPath: string | null
  renderTimeMs: number
  resolution: { width: number; height: number }
  fileFormat: RenderFileFormat
  fileSizeBytes: number | null
  success: boolean
  error: string | null
  timestamp: string
}

export interface RenderManifest {
  manifestId: string
  projectId: string
  batchId: string
  preset: RenderPresetName
  createdAt: string
  completedAt: string | null
  totalRenders: number
  successCount: number
  failCount: number
  totalRenderTimeMs: number
  entries: RenderManifestEntry[]
  outputRoot: string
}

export interface OutputStructure {
  root: string
  rendersDir: string
  thumbnailsDir: string
  manifestPath: string
}

export interface OrchestratorOptions {
  projectId: string
  sceneId: string
  blenderPath: string
  blendFilePath: string
  outputDir: string
  preset?: RenderPresetName
  cameraFilter?: string[]
  maxRetries?: number
  thumbnailScale?: number
  timeoutMs?: number
}

export interface OrchestratorResult {
  manifest: RenderManifest
  outputStructure: OutputStructure
  progress: RenderProgress
  jobs: OrchestratorJob[]
  errors: string[]
  warnings: string[]
}
