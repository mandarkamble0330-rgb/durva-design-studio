import type { LightPreset, EngineLightType } from './lighting-types'

const PRESETS: Record<string, LightPreset> = {
  key_spot: {
    type: 'spot',
    category: 'key',
    intensity: 800,
    color: '#ffffff',
    temperature: 4000,
    castShadow: true,
    angle: 45,
    decay: 2,
    spotBlend: 0.15,
  },
  fill_area: {
    type: 'area',
    category: 'fill',
    intensity: 300,
    color: '#fff5e6',
    temperature: 4500,
    castShadow: false,
    areaWidth: 2,
    areaHeight: 2,
  },
  ambient_sun: {
    type: 'sun',
    category: 'ambient',
    intensity: 50,
    color: '#f0f0ff',
    temperature: 5500,
    castShadow: false,
  },
  accent_spot: {
    type: 'spot',
    category: 'accent',
    intensity: 400,
    color: '#ffffff',
    temperature: 3500,
    castShadow: true,
    angle: 30,
    decay: 2,
    spotBlend: 0.2,
  },
  task_point: {
    type: 'point',
    category: 'task',
    intensity: 200,
    color: '#ffffff',
    temperature: 4000,
    castShadow: false,
    decay: 2,
  },
  led_strip: {
    type: 'led_strip',
    category: 'decorative',
    intensity: 150,
    color: '#ffffff',
    temperature: 4000,
    castShadow: false,
    areaWidth: 3,
    areaHeight: 0.05,
  },
  product_spot: {
    type: 'spot',
    category: 'accent',
    intensity: 600,
    color: '#fffaf0',
    temperature: 3200,
    castShadow: true,
    angle: 25,
    decay: 2,
    spotBlend: 0.1,
  },
  overhead_area: {
    type: 'area',
    category: 'key',
    intensity: 500,
    color: '#ffffff',
    temperature: 4000,
    castShadow: true,
    areaWidth: 4,
    areaHeight: 4,
  },
  reception_area: {
    type: 'area',
    category: 'task',
    intensity: 350,
    color: '#fff8f0',
    temperature: 3800,
    castShadow: false,
    areaWidth: 2,
    areaHeight: 1.5,
  },
}

export function getPreset(name: string): LightPreset | null {
  return PRESETS[name] ?? null
}

export function getPresetByType(type: EngineLightType): LightPreset | null {
  for (const preset of Object.values(PRESETS)) {
    if (preset.type === type) return preset
  }
  return null
}

export function getAllPresets(): Record<string, LightPreset> {
  return { ...PRESETS }
}

export function temperatureToHex(kelvin: number): string {
  const t = kelvin / 100
  let r: number, g: number, b: number

  if (t <= 66) {
    r = 255
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(t) - 161.1195681661))
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(t - 60, -0.1332047592)))
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(t - 60, -0.0755148492)))
  }

  if (t >= 66) {
    b = 255
  } else if (t <= 19) {
    b = 0
  } else {
    b = Math.min(255, Math.max(0, 138.5177312231 * Math.log(t - 10) - 305.0447927307))
  }

  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
