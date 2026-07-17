import path from 'path'
import type { RenderConfiguration, RenderCameraView, RenderJob, RenderBatch } from './render-types'

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function fileExtension(format: string): string {
  switch (format) {
    case 'JPEG': return 'jpg'
    case 'OPEN_EXR': return 'exr'
    default: return 'png'
  }
}

export function createRenderJob(
  camera: RenderCameraView,
  config: RenderConfiguration,
  outputDir: string
): RenderJob {
  const ext = fileExtension(config.fileFormat)
  const filename = `render_${camera.viewId}_${config.presetName}.${ext}`

  return {
    jobId: generateId('rjob'),
    camera,
    config,
    outputPath: path.join(outputDir, filename),
    status: 'ready',
    metadata: {
      viewId: camera.viewId,
      cameraName: camera.cameraName,
      preset: config.presetName,
      resolution: `${config.resolution.width}x${config.resolution.height}`,
    },
  }
}

export function createRenderBatch(
  cameras: RenderCameraView[],
  config: RenderConfiguration,
  blendFilePath: string,
  outputDir: string
): RenderBatch {
  const jobs = cameras.map(cam => createRenderJob(cam, config, outputDir))

  return {
    batchId: generateId('rbatch'),
    blendFilePath,
    jobs,
    totalFrames: jobs.length,
    createdAt: new Date().toISOString(),
  }
}
