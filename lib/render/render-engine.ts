import type { Scene } from '@/types/scene-graph'
import type { RenderPresetName, RenderConfiguration, RenderEngineResult } from './render-types'
import { getRenderPreset, applyOverrides } from './render-presets'
import { extractCamerasFromScene } from './camera-mapper'
import { createRenderBatch } from './render-jobs'
import { validateRenderConfig, validateRenderCameras, validateRenderBatch } from './render-validator'

export interface RenderEngineOptions {
  preset?: RenderPresetName
  outputDir: string
  blendFilePath: string
  overrides?: Partial<Pick<RenderConfiguration, 'resolution' | 'samples' | 'denoising' | 'fileFormat' | 'fileQuality' | 'colorManagement' | 'film' | 'engine'>>
  cameraFilter?: string[]
}

export function runRenderEngine(
  scene: Scene,
  options: RenderEngineOptions
): RenderEngineResult {
  const errors: string[] = []
  const warnings: string[] = []

  const presetName = options.preset ?? 'standard'
  let config = getRenderPreset(presetName)

  if (options.overrides) {
    config = applyOverrides(config, options.overrides)
  }

  const configValidation = validateRenderConfig(config)
  errors.push(...configValidation.errors)
  warnings.push(...configValidation.warnings)

  let cameras = extractCamerasFromScene(scene)
  const cameraValidation = validateRenderCameras(cameras)
  errors.push(...cameraValidation.errors)
  warnings.push(...cameraValidation.warnings)

  if (options.cameraFilter && options.cameraFilter.length > 0) {
    const filterSet = new Set(options.cameraFilter)
    cameras = cameras.filter(c => filterSet.has(c.viewId))
    if (cameras.length === 0) {
      errors.push(`No cameras match filter: ${options.cameraFilter.join(', ')}`)
    }
  }

  const batch = createRenderBatch(cameras, config, options.blendFilePath, options.outputDir)
  const batchValidation = validateRenderBatch(batch)
  errors.push(...batchValidation.errors)
  warnings.push(...batchValidation.warnings)

  return {
    config,
    cameras,
    batch,
    errors,
    warnings,
    stats: {
      totalJobs: batch.jobs.length,
      totalCameras: cameras.length,
      presetUsed: presetName,
      estimatedResolution: `${config.resolution.width}x${config.resolution.height}`,
    },
  }
}
