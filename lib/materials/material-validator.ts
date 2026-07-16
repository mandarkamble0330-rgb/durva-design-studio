import type { Scene, SceneNode } from '@/types/scene-graph'

export interface MaterialValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    totalNodes: number
    nodesWithMaterial: number
    nodesWithoutMaterial: number
    uniqueMaterials: number
    brandMaterials: number
  }
}

export function validateMaterialAssignments(scene: Scene): MaterialValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const materialIds = new Set<string>()
  let nodesWithMaterial = 0
  let nodesWithoutMaterial = 0
  let brandMaterials = 0

  const spatialNodes = scene.nodes.filter(n =>
    n.type === 'mesh' || (n.type === 'empty' && n.tags.includes('material'))
  )

  for (const node of spatialNodes) {
    if (node.material) {
      nodesWithMaterial++
      materialIds.add(node.material.materialId)

      if (node.material.materialId.startsWith('brand_')) brandMaterials++

      if (!node.material.color || node.material.color === '') {
        errors.push(`Node "${node.name}" has material with empty color`)
      }

      if (node.material.roughness < 0 || node.material.roughness > 1) {
        errors.push(`Node "${node.name}" roughness out of range: ${node.material.roughness}`)
      }

      if (node.material.metalness < 0 || node.material.metalness > 1) {
        errors.push(`Node "${node.name}" metalness out of range: ${node.material.metalness}`)
      }

      if (node.material.opacity < 0 || node.material.opacity > 1) {
        errors.push(`Node "${node.name}" opacity out of range: ${node.material.opacity}`)
      }
    } else if (node.type === 'mesh') {
      nodesWithoutMaterial++
      if (node.tags.includes('floor') || node.tags.includes('wall')) {
        warnings.push(`Shell node "${node.name}" has no material assigned`)
      }
    }
  }

  const meshesWithoutMat = scene.nodes.filter(
    n => n.type === 'mesh' && !n.material && !n.tags.includes('placeholder')
  )
  if (meshesWithoutMat.length > 0) {
    warnings.push(`${meshesWithoutMat.length} mesh node(s) have no material`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalNodes: spatialNodes.length,
      nodesWithMaterial,
      nodesWithoutMaterial,
      uniqueMaterials: materialIds.size,
      brandMaterials,
    },
  }
}
