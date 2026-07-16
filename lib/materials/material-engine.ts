import type { BoothBlueprint } from '@/types/blueprint'
import type { Scene, SceneNode } from '@/types/scene-graph'
import { generateBrandMaterials, type BrandMaterialSet } from './brand-materials'
import { resolveFromBlueprint, resolveFromSurface, resolveFromReference, buildMaterialReference, type ResolvedMaterial } from './material-resolver'
import { validateMaterialAssignments, type MaterialValidationResult } from './material-validator'

export interface MaterialEngineResult {
  scene: Scene
  validation: MaterialValidationResult
  assignedCount: number
  brandMaterialSet: BrandMaterialSet
}

export function runMaterialEngine(
  blueprint: BoothBlueprint,
  scene: Scene
): MaterialEngineResult {
  const brandMaterials = generateBrandMaterials(blueprint.branding)
  const nodes = scene.nodes.map(node => assignMaterialToNode(node, blueprint, brandMaterials))

  const updatedScene: Scene = {
    ...scene,
    nodes,
    updatedAt: new Date().toISOString(),
    metadata: {
      ...scene.metadata,
      materialsAssigned: true,
    },
  }

  const validation = validateMaterialAssignments(updatedScene)
  const assignedCount = nodes.filter(n => n.material !== null).length

  return { scene: updatedScene, validation, assignedCount, brandMaterialSet: brandMaterials }
}

function assignMaterialToNode(
  node: SceneNode,
  blueprint: BoothBlueprint,
  brandMaterials: BrandMaterialSet
): SceneNode {
  if (node.type !== 'mesh' && !(node.type === 'empty' && node.tags.includes('logo'))) {
    return node
  }

  if (node.material) {
    const resolved = resolveFromReference(node.material, blueprint.materials)
    return {
      ...node,
      material: buildMaterialReference(resolved),
      metadata: {
        ...node.metadata,
        materialSource: resolved.source,
        materialPresetType: resolved.materialId,
      },
    }
  }

  const objectType = inferObjectType(node)
  const resolved = resolveFromSurface(objectType, node.tags, brandMaterials)

  return {
    ...node,
    material: buildMaterialReference(resolved),
    metadata: {
      ...node.metadata,
      materialSource: resolved.source,
      materialPresetType: resolved.materialId,
      materialAutoAssigned: true,
    },
  }
}

function inferObjectType(node: SceneNode): string {
  const objectTag = node.tags.find(t =>
    ['counter', 'table', 'chair', 'sofa', 'shelf', 'display_stand',
     'screen', 'kiosk', 'podium', 'wall_panel', 'partition', 'signage',
     'lighting_fixture', 'planter'].includes(t)
  )
  if (objectTag) return objectTag

  if (node.tags.includes('floor')) return 'floor'
  if (node.tags.includes('wall')) return 'wall'
  if (node.tags.includes('logo')) return 'logo'
  if (node.tags.includes('branding')) return 'branding'

  if (node.mesh?.assetId) return node.mesh.assetId

  return 'generic'
}
