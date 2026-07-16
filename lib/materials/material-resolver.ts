import type { MaterialDefinition } from '@/types/blueprint'
import type { MaterialReference } from '@/types/scene-graph'
import { getPreset, type PBRMaterialPreset } from './material-presets'
import { mapSurfaceToMaterial } from './surface-mapper'
import type { BrandMaterialSet } from './brand-materials'

export interface ResolvedMaterial {
  materialId: string
  preset: PBRMaterialPreset
  source: 'blueprint' | 'surface_default' | 'brand' | 'fallback'
}

export function resolveFromBlueprint(
  materialId: string,
  blueprintMaterials: MaterialDefinition[]
): ResolvedMaterial | null {
  const bpMat = blueprintMaterials.find(m => m.id === materialId)
  if (!bpMat) return null

  const preset = getPreset(bpMat.type)
  preset.baseColor = bpMat.color
  preset.roughness = bpMat.roughness
  preset.metallic = bpMat.metalness
  preset.opacity = bpMat.opacity
  if (bpMat.textureUrl) preset.textureSlots.baseColor = bpMat.textureUrl
  if (bpMat.normalMapUrl) preset.textureSlots.normal = bpMat.normalMapUrl

  return { materialId: bpMat.id, preset, source: 'blueprint' }
}

export function resolveFromSurface(
  objectType: string,
  tags: string[],
  brandMaterials: BrandMaterialSet | null
): ResolvedMaterial {
  const materialType = mapSurfaceToMaterial(objectType, tags)

  if (materialType === 'brand_primary' && brandMaterials) {
    return { materialId: 'brand_primary', preset: brandMaterials.primary, source: 'brand' }
  }
  if (materialType === 'brand_secondary' && brandMaterials) {
    return { materialId: 'brand_secondary', preset: brandMaterials.secondary, source: 'brand' }
  }

  const preset = getPreset(materialType)
  return { materialId: `auto_${materialType}`, preset, source: 'surface_default' }
}

export function resolveFromReference(
  ref: MaterialReference,
  blueprintMaterials: MaterialDefinition[]
): ResolvedMaterial {
  const fromBp = resolveFromBlueprint(ref.materialId, blueprintMaterials)
  if (fromBp) return fromBp

  const preset = getPreset('laminate')
  preset.baseColor = ref.color
  preset.roughness = ref.roughness
  preset.metallic = ref.metalness
  preset.opacity = ref.opacity
  if (ref.textureUrl) preset.textureSlots.baseColor = ref.textureUrl
  if (ref.normalMapUrl) preset.textureSlots.normal = ref.normalMapUrl

  return { materialId: ref.materialId, preset, source: 'fallback' }
}

export function buildMaterialReference(resolved: ResolvedMaterial): MaterialReference {
  return {
    materialId: resolved.materialId,
    color: resolved.preset.baseColor,
    roughness: resolved.preset.roughness,
    metalness: resolved.preset.metallic,
    opacity: resolved.preset.opacity,
    textureUrl: resolved.preset.textureSlots.baseColor ?? undefined,
    normalMapUrl: resolved.preset.textureSlots.normal ?? undefined,
  }
}
