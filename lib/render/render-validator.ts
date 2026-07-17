import type { RenderConfiguration, RenderCameraView, RenderBatch } from './render-types'

export interface RenderValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateRenderConfig(config: RenderConfiguration): RenderValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (config.resolution.width <= 0 || config.resolution.height <= 0) {
    errors.push(`Invalid resolution: ${config.resolution.width}x${config.resolution.height}`)
  }
  if (config.resolution.width > 7680 || config.resolution.height > 4320) {
    warnings.push(`Very high resolution: ${config.resolution.width}x${config.resolution.height}`)
  }
  if (config.resolution.scale <= 0 || config.resolution.scale > 200) {
    errors.push(`Invalid resolution scale: ${config.resolution.scale}%`)
  }

  if (config.samples.render <= 0) {
    errors.push(`Invalid render samples: ${config.samples.render}`)
  }
  if (config.samples.render > 4096) {
    warnings.push(`Very high sample count: ${config.samples.render}`)
  }

  if (config.fileQuality < 0 || config.fileQuality > 100) {
    errors.push(`Invalid file quality: ${config.fileQuality}`)
  }

  const cm = config.colorManagement
  if (typeof cm.exposure !== 'number' || !isFinite(cm.exposure)) {
    errors.push(`Invalid exposure: ${cm.exposure}`)
  }
  if (cm.exposure < -10 || cm.exposure > 10) {
    warnings.push(`Extreme exposure value: ${cm.exposure}`)
  }
  if (typeof cm.gamma !== 'number' || cm.gamma <= 0) {
    errors.push(`Invalid gamma: ${cm.gamma}`)
  }

  if (config.maxBounces < 0 || config.maxBounces > 128) {
    errors.push(`Invalid max bounces: ${config.maxBounces}`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateRenderCameras(cameras: RenderCameraView[]): RenderValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (cameras.length === 0) {
    errors.push('No cameras available for rendering')
  }

  const ids = new Set<string>()
  for (const cam of cameras) {
    if (ids.has(cam.cameraId)) {
      errors.push(`Duplicate camera ID: "${cam.cameraId}"`)
    }
    ids.add(cam.cameraId)

    if (cam.fov <= 0 || cam.fov > 180) {
      errors.push(`Camera "${cam.viewId}" has invalid FOV: ${cam.fov}`)
    }
    if (cam.near <= 0) {
      errors.push(`Camera "${cam.viewId}" has invalid near clip: ${cam.near}`)
    }
    if (cam.far <= cam.near) {
      errors.push(`Camera "${cam.viewId}" far clip (${cam.far}) <= near clip (${cam.near})`)
    }

    const p = cam.position
    if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) {
      errors.push(`Camera "${cam.viewId}" has invalid position`)
    }
  }

  const viewIds = cameras.map(c => c.viewId)
  const dupeViews = viewIds.filter((v, i) => viewIds.indexOf(v) !== i)
  if (dupeViews.length > 0) {
    warnings.push(`Duplicate view IDs: ${[...new Set(dupeViews)].join(', ')}`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateRenderBatch(batch: RenderBatch): RenderValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!batch.blendFilePath) {
    errors.push('Batch has no blend file path')
  }
  if (batch.jobs.length === 0) {
    errors.push('Batch has no render jobs')
  }

  const jobIds = new Set<string>()
  for (const job of batch.jobs) {
    if (jobIds.has(job.jobId)) {
      errors.push(`Duplicate job ID: "${job.jobId}"`)
    }
    jobIds.add(job.jobId)

    if (!job.outputPath) {
      errors.push(`Job "${job.jobId}" has no output path`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}
