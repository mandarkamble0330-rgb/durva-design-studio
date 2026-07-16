import type { BoothBlueprint } from '@/types/blueprint'
import type { Scene, SceneNode } from '@/types/scene-graph'
import type { BrandingPlacement, BrandingEngineResult } from './branding-types'
import { generateBrandingLayout } from './branding-layout'
import { validateBrandingPlacements } from './branding-validator'
import { surfaceRotationY } from './branding-utils'

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function createBrandingNode(placement: BrandingPlacement, parentGroupId: string): SceneNode {
  return {
    id: generateId('brand'),
    name: `Logo_${placement.surface}_${placement.layer}`,
    type: 'empty',
    parentId: parentGroupId,
    transform: {
      position: placement.position,
      rotation: {
        x: 0,
        y: surfaceRotationY(placement.surface) + placement.rotation,
        z: 0,
      },
      scale: { x: placement.width, y: placement.height, z: 0.01 },
    },
    mesh: null,
    material: {
      materialId: 'brand_primary',
      color: '#ffffff',
      roughness: 0.4,
      metalness: 0,
      opacity: placement.opacity,
    },
    camera: null,
    light: null,
    visible: placement.visible,
    tags: ['branding', 'logo', placement.surface],
    metadata: {
      brandingId: placement.brandingId,
      logoId: placement.logoId,
      logoUrl: placement.logoUrl,
      surface: placement.surface,
      alignment: placement.alignment,
      verticalAlignment: placement.verticalAlignment,
      layer: placement.layer,
      aspectRatio: placement.aspectRatio,
      safeMargin: placement.safeMargin,
      widthMeters: placement.width,
      heightMeters: placement.height,
      objectId: placement.objectId,
      assetId: placement.assetId,
    },
  }
}

export function runBrandingEngine(
  blueprint: BoothBlueprint,
  scene: Scene
): { scene: Scene; result: BrandingEngineResult } {
  const placements = generateBrandingLayout(blueprint)
  const validation = validateBrandingPlacements(placements)

  const nodes = [...scene.nodes]

  const existingBrandingNodes = nodes.filter(n => n.tags.includes('branding') && n.tags.includes('logo'))
  const existingBrandingIds = new Set(existingBrandingNodes.map(n => n.metadata.brandingId as string).filter(Boolean))

  let brandingGroupId = nodes.find(
    n => n.type === 'group' && n.name === 'Branding'
  )?.id

  if (!brandingGroupId) {
    const rootId = nodes.find(n => n.type === 'root')?.id
    if (!rootId) {
      return {
        scene,
        result: { placements: [], nodesAdded: 0, errors: ['No root node found'], warnings: [] },
      }
    }

    brandingGroupId = generateId('grp_branding')
    nodes.push({
      id: brandingGroupId,
      name: 'Branding',
      type: 'group',
      parentId: rootId,
      transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      mesh: null,
      material: null,
      camera: null,
      light: null,
      visible: true,
      tags: ['branding'],
      metadata: {},
    })
  }

  let nodesAdded = 0
  for (const placement of placements) {
    if (existingBrandingIds.has(placement.brandingId)) continue
    nodes.push(createBrandingNode(placement, brandingGroupId))
    nodesAdded++
  }

  const updatedScene: Scene = {
    ...scene,
    nodes,
    updatedAt: new Date().toISOString(),
    metadata: {
      ...scene.metadata,
      nodeCount: nodes.length,
      brandingApplied: true,
      brandingPlacements: placements.length,
    },
  }

  return {
    scene: updatedScene,
    result: {
      placements,
      nodesAdded,
      errors: validation.errors,
      warnings: validation.warnings,
    },
  }
}
