import type { RenderManifest, RenderManifestEntry, OrchestratorJob, OutputStructure } from './orchestrator-types'
import type { RenderPresetName, RenderFileFormat } from '@/lib/render/render-types'
import { getFileSizeBytes } from './output-manager'

export function createManifestEntry(
  job: OrchestratorJob,
  projectId: string,
  sceneId: string,
  preset: RenderPresetName,
  fileFormat: RenderFileFormat,
  resolution: { width: number; height: number }
): RenderManifestEntry {
  return {
    renderId: job.jobId,
    projectId,
    sceneId,
    cameraView: job.camera.viewId,
    preset,
    outputPath: job.outputPath,
    thumbnailPath: job.thumbnailPath,
    renderTimeMs: job.durationMs ?? 0,
    resolution,
    fileFormat,
    fileSizeBytes: job.status === 'completed' ? getFileSizeBytes(job.outputPath) : null,
    success: job.status === 'completed',
    error: job.error,
    timestamp: job.completedAt ?? new Date().toISOString(),
  }
}

export function createManifest(
  batchId: string,
  projectId: string,
  preset: RenderPresetName,
  outputStructure: OutputStructure,
  entries: RenderManifestEntry[],
  startTime: number
): RenderManifest {
  const now = new Date().toISOString()
  const successCount = entries.filter(e => e.success).length
  const failCount = entries.filter(e => !e.success).length
  const totalRenderTimeMs = entries.reduce((sum, e) => sum + e.renderTimeMs, 0)

  return {
    manifestId: `manifest_${batchId}`,
    projectId,
    batchId,
    preset,
    createdAt: new Date(startTime).toISOString(),
    completedAt: now,
    totalRenders: entries.length,
    successCount,
    failCount,
    totalRenderTimeMs,
    entries,
    outputRoot: outputStructure.root,
  }
}

export function writeManifest(manifest: RenderManifest, manifestPath: string): void {
  const fs = require('fs')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}
