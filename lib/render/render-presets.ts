import type { RenderConfiguration, RenderPresetName } from './render-types'

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const PRESETS: Record<RenderPresetName, Omit<RenderConfiguration, 'configId' | 'metadata'>> = {
  preview: {
    presetName: 'preview',
    engine: 'BLENDER_EEVEE',
    resolution: { width: 640, height: 480, scale: 100 },
    samples: { render: 16, viewport: 8 },
    denoising: { enabled: false, algorithm: 'OPENIMAGEDENOISE', prefilter: 'FAST' },
    fileFormat: 'JPEG',
    fileQuality: 70,
    colorManagement: { displayDevice: 'sRGB', viewTransform: 'Standard', look: 'None', exposure: 0, gamma: 1.0 },
    film: { transparentBackground: false, filterSize: 1.5 },
    useMotionBlur: false,
    maxBounces: 4,
  },
  draft: {
    presetName: 'draft',
    engine: 'CYCLES',
    resolution: { width: 1280, height: 720, scale: 100 },
    samples: { render: 64, viewport: 16 },
    denoising: { enabled: true, algorithm: 'OPENIMAGEDENOISE', prefilter: 'FAST' },
    fileFormat: 'PNG',
    fileQuality: 90,
    colorManagement: { displayDevice: 'sRGB', viewTransform: 'Filmic', look: 'None', exposure: 0, gamma: 1.0 },
    film: { transparentBackground: false, filterSize: 1.5 },
    useMotionBlur: false,
    maxBounces: 6,
  },
  standard: {
    presetName: 'standard',
    engine: 'CYCLES',
    resolution: { width: 1920, height: 1080, scale: 100 },
    samples: { render: 256, viewport: 32 },
    denoising: { enabled: true, algorithm: 'OPENIMAGEDENOISE', prefilter: 'ACCURATE' },
    fileFormat: 'PNG',
    fileQuality: 100,
    colorManagement: { displayDevice: 'sRGB', viewTransform: 'Filmic', look: 'Medium Contrast', exposure: 0, gamma: 1.0 },
    film: { transparentBackground: false, filterSize: 1.5 },
    useMotionBlur: false,
    maxBounces: 8,
  },
  high: {
    presetName: 'high',
    engine: 'CYCLES',
    resolution: { width: 2560, height: 1440, scale: 100 },
    samples: { render: 512, viewport: 64 },
    denoising: { enabled: true, algorithm: 'OPENIMAGEDENOISE', prefilter: 'ACCURATE' },
    fileFormat: 'PNG',
    fileQuality: 100,
    colorManagement: { displayDevice: 'sRGB', viewTransform: 'Filmic', look: 'Medium High Contrast', exposure: 0, gamma: 1.0 },
    film: { transparentBackground: true, filterSize: 1.5 },
    useMotionBlur: false,
    maxBounces: 12,
  },
  ultra: {
    presetName: 'ultra',
    engine: 'CYCLES',
    resolution: { width: 3840, height: 2160, scale: 100 },
    samples: { render: 1024, viewport: 128 },
    denoising: { enabled: true, algorithm: 'OPENIMAGEDENOISE', prefilter: 'ACCURATE' },
    fileFormat: 'PNG',
    fileQuality: 100,
    colorManagement: { displayDevice: 'sRGB', viewTransform: 'Filmic', look: 'High Contrast', exposure: 0, gamma: 1.0 },
    film: { transparentBackground: true, filterSize: 1.5 },
    useMotionBlur: false,
    maxBounces: 16,
  },
}

export function getRenderPreset(name: RenderPresetName): RenderConfiguration {
  const preset = PRESETS[name]
  return {
    ...preset,
    configId: generateId('rconfig'),
    metadata: { presetSource: name },
  }
}

export function getAllPresetNames(): RenderPresetName[] {
  return ['preview', 'draft', 'standard', 'high', 'ultra']
}

export function applyOverrides(
  config: RenderConfiguration,
  overrides: Partial<Pick<RenderConfiguration, 'resolution' | 'samples' | 'denoising' | 'fileFormat' | 'fileQuality' | 'colorManagement' | 'film' | 'engine'>>
): RenderConfiguration {
  return {
    ...config,
    ...overrides,
    resolution: overrides.resolution ? { ...config.resolution, ...overrides.resolution } : config.resolution,
    samples: overrides.samples ? { ...config.samples, ...overrides.samples } : config.samples,
    denoising: overrides.denoising ? { ...config.denoising, ...overrides.denoising } : config.denoising,
    colorManagement: overrides.colorManagement ? { ...config.colorManagement, ...overrides.colorManagement } : config.colorManagement,
    film: overrides.film ? { ...config.film, ...overrides.film } : config.film,
    metadata: { ...config.metadata, hasOverrides: true },
  }
}
