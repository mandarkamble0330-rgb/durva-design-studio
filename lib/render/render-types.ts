export type RenderPresetName = 'preview' | 'draft' | 'standard' | 'high' | 'ultra'

export type RenderFileFormat = 'PNG' | 'JPEG' | 'OPEN_EXR'

export type RenderEngine = 'CYCLES' | 'BLENDER_EEVEE'

export interface RenderResolution {
  width: number
  height: number
  scale: number
}

export interface RenderSamples {
  render: number
  viewport: number
}

export interface RenderDenoising {
  enabled: boolean
  algorithm: 'OPENIMAGEDENOISE' | 'OPTIX'
  prefilter: 'ACCURATE' | 'FAST' | 'NONE'
}

export interface RenderColorManagement {
  displayDevice: string
  viewTransform: string
  look: string
  exposure: number
  gamma: number
}

export interface RenderFilmSettings {
  transparentBackground: boolean
  filterSize: number
}

export interface RenderConfiguration {
  configId: string
  presetName: RenderPresetName
  engine: RenderEngine
  resolution: RenderResolution
  samples: RenderSamples
  denoising: RenderDenoising
  fileFormat: RenderFileFormat
  fileQuality: number
  colorManagement: RenderColorManagement
  film: RenderFilmSettings
  useMotionBlur: boolean
  maxBounces: number
  metadata: Record<string, unknown>
}

export interface RenderCameraView {
  cameraId: string
  viewId: string
  cameraName: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  fov: number
  near: number
  far: number
}

export interface RenderJob {
  jobId: string
  camera: RenderCameraView
  config: RenderConfiguration
  outputPath: string
  status: 'pending' | 'ready'
  metadata: Record<string, unknown>
}

export interface RenderBatch {
  batchId: string
  blendFilePath: string
  jobs: RenderJob[]
  totalFrames: number
  createdAt: string
}

export interface RenderEngineResult {
  config: RenderConfiguration
  cameras: RenderCameraView[]
  batch: RenderBatch
  errors: string[]
  warnings: string[]
  stats: {
    totalJobs: number
    totalCameras: number
    presetUsed: RenderPresetName
    estimatedResolution: string
  }
}
