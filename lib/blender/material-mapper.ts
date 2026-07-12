import type { BlenderMaterial, BlenderCustomProperty } from '@/types/blender'
import type { MaterialReference } from '@/types/scene-graph'

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  return [r, g, b]
}

interface MaterialPreset {
  roughness: number
  metallic: number
  alpha: number
  blendMode: 'OPAQUE' | 'ALPHA_BLEND' | 'ALPHA_CLIP'
  useBackfaceCulling: boolean
}

const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
  carpet: { roughness: 0.95, metallic: 0, alpha: 1, blendMode: 'OPAQUE', useBackfaceCulling: true },
  laminate: { roughness: 0.3, metallic: 0.05, alpha: 1, blendMode: 'OPAQUE', useBackfaceCulling: true },
  glass: { roughness: 0.05, metallic: 0, alpha: 0.2, blendMode: 'ALPHA_BLEND', useBackfaceCulling: false },
  acrylic: { roughness: 0.1, metallic: 0, alpha: 0.6, blendMode: 'ALPHA_BLEND', useBackfaceCulling: false },
  metal: { roughness: 0.25, metallic: 0.9, alpha: 1, blendMode: 'OPAQUE', useBackfaceCulling: true },
  brand_primary: { roughness: 0.4, metallic: 0, alpha: 1, blendMode: 'OPAQUE', useBackfaceCulling: true },
  brand_secondary: { roughness: 0.4, metallic: 0, alpha: 1, blendMode: 'OPAQUE', useBackfaceCulling: true },
}

function getPreset(materialType: string): MaterialPreset {
  const key = materialType.toLowerCase().replace(/[\s-]/g, '_')
  if (key.includes('carpet')) return MATERIAL_PRESETS.carpet
  if (key.includes('laminate') || key.includes('wood')) return MATERIAL_PRESETS.laminate
  if (key.includes('glass') || key.includes('clear')) return MATERIAL_PRESETS.glass
  if (key.includes('acrylic') || key.includes('frosted')) return MATERIAL_PRESETS.acrylic
  if (key.includes('metal') || key.includes('brushed') || key.includes('steel') || key.includes('aluminum')) return MATERIAL_PRESETS.metal
  if (key.includes('brand_primary') || key.includes('primary')) return MATERIAL_PRESETS.brand_primary
  if (key.includes('brand_secondary') || key.includes('secondary')) return MATERIAL_PRESETS.brand_secondary
  return MATERIAL_PRESETS.laminate
}

export function mapMaterial(ref: MaterialReference, materialType: string): BlenderMaterial {
  const preset = getPreset(materialType)
  const [r, g, b] = hexToRgb(ref.color)

  const customProperties: BlenderCustomProperty[] = [
    { key: 'source_material_id', value: ref.materialId },
    { key: 'material_type', value: materialType },
  ]

  if (ref.textureUrl) {
    customProperties.push({ key: 'texture_url', value: ref.textureUrl })
  }
  if (ref.normalMapUrl) {
    customProperties.push({ key: 'normal_map_url', value: ref.normalMapUrl })
  }

  return {
    name: `MAT_${ref.materialId}`,
    color: [r, g, b, preset.alpha],
    roughness: ref.roughness ?? preset.roughness,
    metallic: ref.metalness ?? preset.metallic,
    alpha: ref.opacity ?? preset.alpha,
    useBackfaceCulling: preset.useBackfaceCulling,
    blendMode: preset.blendMode,
    customProperties,
  }
}

export function mapBrandMaterial(name: string, color: string, variant: 'primary' | 'secondary'): BlenderMaterial {
  const preset = MATERIAL_PRESETS[`brand_${variant}`]
  const [r, g, b] = hexToRgb(color)

  return {
    name,
    color: [r, g, b, 1],
    roughness: preset.roughness,
    metallic: preset.metallic,
    alpha: preset.alpha,
    useBackfaceCulling: preset.useBackfaceCulling,
    blendMode: preset.blendMode,
    customProperties: [{ key: 'brand_variant', value: variant }],
  }
}
