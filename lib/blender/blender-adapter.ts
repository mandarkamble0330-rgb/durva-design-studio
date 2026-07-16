import type { Scene, SceneNode } from '@/types/scene-graph'
import type { BlenderScene, BlenderObject, BlenderCollection, BlenderMaterial, BlenderCustomProperty } from '@/types/blender'
import { buildShellGeometry } from './geometry-builder'
import { mapMaterial, mapBrandMaterial } from './material-mapper'
import { buildBlenderCamera } from './camera-builder'
import { buildBlenderLight } from './light-builder'

function resolveCollectionName(node: SceneNode, nodeMap: Map<string, SceneNode>): string {
  if (node.type === 'root') return 'Scene Collection'
  if (node.type === 'group') return node.name

  let parent = node.parentId ? nodeMap.get(node.parentId) : null
  while (parent) {
    if (parent.type === 'group') return parent.name
    parent = parent.parentId ? nodeMap.get(parent.parentId) : null
  }
  return 'Scene Collection'
}

function resolveParentName(node: SceneNode, nodeMap: Map<string, SceneNode>): string | null {
  if (!node.parentId) return null
  const parent = nodeMap.get(node.parentId)
  if (!parent || parent.type === 'root' || parent.type === 'group') return null
  return parent.name
}

function buildCustomProperties(node: SceneNode): BlenderCustomProperty[] {
  const props: BlenderCustomProperty[] = [
    { key: 'scene_node_id', value: node.id },
  ]

  for (const tag of node.tags) {
    props.push({ key: `tag_${tag}`, value: true })
  }

  for (const [k, v] of Object.entries(node.metadata)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      props.push({ key: k, value: v })
    }
  }

  return props
}

function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

function isShellFloor(node: SceneNode): boolean {
  return node.type === 'mesh' && node.tags.includes('floor') && node.tags.includes('shell')
}

function isShellWall(node: SceneNode): boolean {
  return node.type === 'mesh' && node.tags.includes('wall') && node.tags.includes('shell')
}

function buildMeshObject(node: SceneNode, collectionName: string, parentName: string | null, shellDims: { width: number; depth: number; height: number; openSides: string[] } | null): BlenderObject {
  let meshData = null

  if (shellDims && isShellFloor(node)) {
    const shell = buildShellGeometry(shellDims.width, shellDims.depth, shellDims.height, shellDims.openSides)
    meshData = shell.floor
  } else if (shellDims && isShellWall(node)) {
    const wallSide = node.tags.find(t => ['front', 'rear', 'left', 'right'].includes(t))
    if (wallSide) {
      const shell = buildShellGeometry(shellDims.width, shellDims.depth, shellDims.height, shellDims.openSides)
      const wallData = shell.walls.find(w => w.side === wallSide)
      if (wallData) meshData = wallData.mesh
    }
  }

  const materialName = node.material ? `MAT_${node.material.materialId}` : null

  return {
    name: node.name,
    type: 'MESH',
    transform: {
      location: node.transform.position,
      rotation: {
        x: degreesToRadians(node.transform.rotation.x),
        y: degreesToRadians(node.transform.rotation.y),
        z: degreesToRadians(node.transform.rotation.z),
      },
      scale: node.transform.scale,
    },
    parentName,
    collectionName,
    visible: node.visible,
    customProperties: buildCustomProperties(node),
    meshData,
    materialName,
    cameraData: null,
    lightData: null,
  }
}

function buildEmptyObject(node: SceneNode, collectionName: string, parentName: string | null): BlenderObject {
  return {
    name: node.name,
    type: 'EMPTY',
    transform: {
      location: node.transform.position,
      rotation: {
        x: degreesToRadians(node.transform.rotation.x),
        y: degreesToRadians(node.transform.rotation.y),
        z: degreesToRadians(node.transform.rotation.z),
      },
      scale: node.transform.scale,
    },
    parentName,
    collectionName,
    visible: node.visible,
    customProperties: buildCustomProperties(node),
    meshData: null,
    materialName: null,
    cameraData: null,
    lightData: null,
  }
}

export function adaptSceneToBlender(scene: Scene): BlenderScene {
  const nodeMap = new Map<string, SceneNode>()
  for (const node of scene.nodes) {
    nodeMap.set(node.id, node)
  }

  const collections: BlenderCollection[] = [{ name: 'Scene Collection', parentName: null }]
  const objects: BlenderObject[] = []
  const materials: BlenderMaterial[] = []
  const materialSet = new Set<string>()

  const rootNode = scene.nodes.find(n => n.type === 'root')
  const shellDims = rootNode ? extractShellDims(scene) : null

  for (const node of scene.nodes) {
    if (node.type === 'root') continue

    if (node.type === 'group') {
      const parentNode = node.parentId ? nodeMap.get(node.parentId) : null
      const parentCol = parentNode ? resolveCollectionName(parentNode, nodeMap) : 'Scene Collection'
      collections.push({ name: node.name, parentName: parentCol })
      continue
    }

    const collectionName = resolveCollectionName(node, nodeMap)
    const parentName = resolveParentName(node, nodeMap)

    switch (node.type) {
      case 'mesh':
        objects.push(buildMeshObject(node, collectionName, parentName, shellDims))
        break
      case 'camera':
        objects.push(buildBlenderCamera(node, collectionName, parentName))
        break
      case 'light':
        objects.push(buildBlenderLight(node, collectionName, parentName))
        break
      case 'empty':
        objects.push(buildEmptyObject(node, collectionName, parentName))
        break
    }

    if (node.material && !materialSet.has(node.material.materialId)) {
      materialSet.add(node.material.materialId)
      const matType = node.tags.find(t => ['carpet', 'laminate', 'glass', 'acrylic', 'metal'].includes(t)) ?? 'laminate'
      materials.push(mapMaterial(node.material, matType))
    }
  }

  if (rootNode?.metadata.designTheme) {
    const brandNodes = scene.nodes.filter(n => n.tags.includes('branding'))
    if (brandNodes.length > 0) {
      const logoNode = brandNodes.find(n => n.tags.includes('logo'))
      if (logoNode?.metadata.logoUrl && typeof logoNode.metadata.logoUrl === 'string') {
        if (!materialSet.has('brand_primary')) {
          materials.push(mapBrandMaterial('MAT_brand_primary', '#333333', 'primary'))
          materialSet.add('brand_primary')
        }
      }
    }
  }

  return {
    name: rootNode?.name ?? 'Booth Scene',
    collections,
    objects,
    materials,
    metadata: {
      sourceSceneId: scene.id,
      sourceBlueprintId: scene.blueprintId,
      sourceProjectId: scene.projectId,
      generatedAt: new Date().toISOString(),
      objectCount: objects.length,
      materialCount: materials.length,
      collectionCount: collections.length,
    },
  }
}

function extractShellDims(scene: Scene): { width: number; depth: number; height: number; openSides: string[] } | null {
  const floorNode = scene.nodes.find(n => isShellFloor(n))
  if (!floorNode) return null

  const width = Math.abs(floorNode.transform.scale.x)
  const depth = Math.abs(floorNode.transform.scale.z)

  const wallNodes = scene.nodes.filter(n => isShellWall(n))
  const height = wallNodes.length > 0 ? Math.abs(wallNodes[0].transform.scale.y) : 4

  const existingWallSides = new Set(
    wallNodes.flatMap(n => n.tags.filter(t => ['front', 'rear', 'left', 'right'].includes(t)))
  )
  const allSides = ['front', 'rear', 'left', 'right']
  const openSides = allSides.filter(s => !existingWallSides.has(s))

  return { width, depth, height, openSides }
}
