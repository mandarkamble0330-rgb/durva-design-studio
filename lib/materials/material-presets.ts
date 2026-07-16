export interface PBRMaterialPreset {
  baseColor: string
  roughness: number
  metallic: number
  opacity: number
  transmission: number
  emission: number
  emissionColor: string
  normalMapStrength: number
  uvScale: [number, number]
  uvRotation: number
  textureSlots: {
    baseColor: string | null
    roughness: string | null
    metallic: string | null
    normal: string | null
    emission: string | null
    opacity: string | null
  }
}

const DEFAULT_TEXTURE_SLOTS = {
  baseColor: null,
  roughness: null,
  metallic: null,
  normal: null,
  emission: null,
  opacity: null,
}

export const MATERIAL_PRESETS: Record<string, PBRMaterialPreset> = {
  carpet: {
    baseColor: '#4a4a4a',
    roughness: 0.95,
    metallic: 0,
    opacity: 1,
    transmission: 0,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0.3,
    uvScale: [4, 4],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  laminate: {
    baseColor: '#f0ece4',
    roughness: 0.3,
    metallic: 0.05,
    opacity: 1,
    transmission: 0,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0.1,
    uvScale: [2, 2],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  mdf: {
    baseColor: '#c4a882',
    roughness: 0.6,
    metallic: 0,
    opacity: 1,
    transmission: 0,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0.2,
    uvScale: [2, 2],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  acrylic: {
    baseColor: '#ffffff',
    roughness: 0.05,
    metallic: 0,
    opacity: 0.15,
    transmission: 0.85,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0,
    uvScale: [1, 1],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  frosted_acrylic: {
    baseColor: '#f5f5f5',
    roughness: 0.4,
    metallic: 0,
    opacity: 0.5,
    transmission: 0.5,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0.15,
    uvScale: [1, 1],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  glass: {
    baseColor: '#ffffff',
    roughness: 0.02,
    metallic: 0,
    opacity: 0.08,
    transmission: 0.92,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0,
    uvScale: [1, 1],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  brushed_metal: {
    baseColor: '#c0c0c0',
    roughness: 0.35,
    metallic: 0.9,
    opacity: 1,
    transmission: 0,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0.5,
    uvScale: [3, 1],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  stainless_steel: {
    baseColor: '#d4d4d4',
    roughness: 0.2,
    metallic: 0.95,
    opacity: 1,
    transmission: 0,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0.1,
    uvScale: [1, 1],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  fabric: {
    baseColor: '#6b6b6b',
    roughness: 0.85,
    metallic: 0,
    opacity: 1,
    transmission: 0,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0.4,
    uvScale: [6, 6],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  vinyl: {
    baseColor: '#2a2a2a',
    roughness: 0.5,
    metallic: 0,
    opacity: 1,
    transmission: 0,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0.2,
    uvScale: [3, 3],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  led_diffuser: {
    baseColor: '#ffffff',
    roughness: 0.3,
    metallic: 0,
    opacity: 0.7,
    transmission: 0.3,
    emission: 2.0,
    emissionColor: '#ffffff',
    normalMapStrength: 0,
    uvScale: [1, 1],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  pvc: {
    baseColor: '#e0e0e0',
    roughness: 0.55,
    metallic: 0,
    opacity: 1,
    transmission: 0,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0.15,
    uvScale: [2, 2],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
  wood: {
    baseColor: '#8b6914',
    roughness: 0.55,
    metallic: 0,
    opacity: 1,
    transmission: 0,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0.3,
    uvScale: [2, 2],
    uvRotation: 0,
    textureSlots: { ...DEFAULT_TEXTURE_SLOTS },
  },
}

export function getPreset(materialType: string): PBRMaterialPreset {
  const key = materialType.toLowerCase().replace(/[\s-]/g, '_')
  if (MATERIAL_PRESETS[key]) return { ...MATERIAL_PRESETS[key], textureSlots: { ...MATERIAL_PRESETS[key].textureSlots } }

  if (key.includes('carpet')) return clonePreset('carpet')
  if (key.includes('laminate')) return clonePreset('laminate')
  if (key.includes('mdf')) return clonePreset('mdf')
  if (key.includes('frosted') && key.includes('acrylic')) return clonePreset('frosted_acrylic')
  if (key.includes('acrylic')) return clonePreset('acrylic')
  if (key.includes('glass') || key.includes('clear')) return clonePreset('glass')
  if (key.includes('brushed') && key.includes('metal')) return clonePreset('brushed_metal')
  if (key.includes('stainless') || key.includes('steel')) return clonePreset('stainless_steel')
  if (key.includes('fabric') || key.includes('cloth')) return clonePreset('fabric')
  if (key.includes('vinyl')) return clonePreset('vinyl')
  if (key.includes('led') || key.includes('diffuser')) return clonePreset('led_diffuser')
  if (key.includes('pvc')) return clonePreset('pvc')
  if (key.includes('wood') || key.includes('oak') || key.includes('walnut')) return clonePreset('wood')
  if (key.includes('metal') || key.includes('aluminum')) return clonePreset('brushed_metal')
  if (key.includes('concrete')) return clonePreset('laminate')

  return clonePreset('laminate')
}

function clonePreset(key: string): PBRMaterialPreset {
  const p = MATERIAL_PRESETS[key]
  return { ...p, textureSlots: { ...p.textureSlots } }
}
