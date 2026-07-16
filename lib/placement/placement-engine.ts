import type { BoothBlueprint, ObjectDefinition, ZoneDefinition } from '@/types/blueprint'
import type { Scene, SceneNode } from '@/types/scene-graph'
import { solveZonePlacements, type ZonePlacementPlan, type PlacedObjectResult } from './zone-solver'
import { validateLayout, type LayoutValidationResult } from './layout-validator'
import { getZoneStrategy } from './placement-strategies'
import type { PlacedObject } from './collision-detector'

export interface PlacementEngineResult {
  scene: Scene
  plans: ZonePlacementPlan[]
  validation: LayoutValidationResult
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function groupObjectsByZone(objects: ObjectDefinition[]): Map<string, ObjectDefinition[]> {
  const map = new Map<string, ObjectDefinition[]>()
  for (const obj of objects) {
    const key = obj.zoneId ?? '_unassigned'
    const list = map.get(key) ?? []
    list.push(obj)
    map.set(key, list)
  }
  return map
}

function createObjectNode(
  result: PlacedObjectResult,
  sourceObject: ObjectDefinition | null,
  parentGroupId: string
): SceneNode {
  return {
    id: generateId('obj'),
    name: sourceObject?.label ?? result.objectType,
    type: 'mesh',
    parentId: parentGroupId,
    transform: {
      position: result.position,
      rotation: { x: 0, y: (result.rotation * Math.PI) / 180, z: 0 },
      scale: result.dimensions,
    },
    mesh: {
      assetId: result.objectType,
      blendFile: null,
      objectName: null,
    },
    material: sourceObject?.materialId ? {
      materialId: sourceObject.materialId,
      color: '#cccccc',
      roughness: 0.5,
      metalness: 0,
      opacity: 1,
    } : null,
    camera: null,
    light: null,
    visible: true,
    tags: ['object', result.objectType, 'placed'],
    metadata: {
      objectId: result.objectId,
      zoneId: result.zoneId,
      placedByEngine: true,
      ...(sourceObject?.metadata ?? {}),
    },
  }
}

export function runPlacementEngine(
  blueprint: BoothBlueprint,
  scene: Scene
): PlacementEngineResult {
  const objectsByZone = groupObjectsByZone(blueprint.objects)
  const plans: ZonePlacementPlan[] = []
  const globalPlacements: PlacedObject[] = []

  const sortedZones = [...blueprint.zones].sort((a, b) => a.priority - b.priority)

  for (const zone of sortedZones) {
    const zoneObjects = objectsByZone.get(zone.id) ?? []
    if (zoneObjects.length === 0) continue

    const plan = solveZonePlacements(
      zone,
      zoneObjects,
      blueprint.booth.dimensions,
      globalPlacements
    )

    for (const obj of plan.objects) {
      globalPlacements.push({
        id: obj.objectId,
        position: obj.position,
        dimensions: obj.dimensions,
        rotation: obj.rotation,
      })
    }

    plans.push(plan)
  }

  const validation = validateLayout(plans, blueprint.zones)

  const updatedScene = applyPlacementsToScene(scene, plans, blueprint)

  return { scene: updatedScene, plans, validation }
}

function applyPlacementsToScene(
  scene: Scene,
  plans: ZonePlacementPlan[],
  blueprint: BoothBlueprint
): Scene {
  const nodes = [...scene.nodes]
  const objectMap = new Map(blueprint.objects.map(o => [o.id, o]))

  let objectsGroupId = nodes.find(
    n => n.type === 'group' && n.tags.includes('objects')
  )?.id

  if (!objectsGroupId) {
    const rootId = nodes.find(n => n.type === 'root')?.id
    if (!rootId) return scene

    objectsGroupId = generateId('grp_objects')
    nodes.push({
      id: objectsGroupId,
      name: 'Objects',
      type: 'group',
      parentId: rootId,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      mesh: null,
      material: null,
      camera: null,
      light: null,
      visible: true,
      tags: ['objects'],
      metadata: {},
    })
  }

  for (const plan of plans) {
    for (const result of plan.objects) {
      const sourceObj = objectMap.get(result.objectId) ?? null
      nodes.push(createObjectNode(result, sourceObj, objectsGroupId))
    }
  }

  const meshCount = nodes.filter(n => n.type === 'mesh').length
  const lightCount = nodes.filter(n => n.type === 'light').length
  const cameraCount = nodes.filter(n => n.type === 'camera').length
  const unresolvedAssets = (scene.metadata.unresolvedAssets as string[]) ?? []

  return {
    ...scene,
    nodes,
    updatedAt: new Date().toISOString(),
    metadata: {
      ...scene.metadata,
      nodeCount: nodes.length,
      meshCount,
      lightCount,
      cameraCount,
      unresolvedAssets,
      placementApplied: true,
    },
  }
}
