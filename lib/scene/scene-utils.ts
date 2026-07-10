import type { Scene, SceneNode } from '@/types/scene-graph'
import type { BoundingBox, Vec3 } from '@/types/blueprint'

export function findNode(scene: Scene, nodeId: string): SceneNode | null {
  return scene.nodes.find(n => n.id === nodeId) ?? null
}

export function findNodeByName(scene: Scene, name: string): SceneNode | null {
  return scene.nodes.find(n => n.name === name) ?? null
}

export function findNodesByTag(scene: Scene, tag: string): SceneNode[] {
  return scene.nodes.filter(n => n.tags.includes(tag))
}

export function findNodesByType(scene: Scene, type: SceneNode['type']): SceneNode[] {
  return scene.nodes.filter(n => n.type === type)
}

export function findChildren(scene: Scene, parentId: string): SceneNode[] {
  return scene.nodes.filter(n => n.parentId === parentId)
}

export function findDescendants(scene: Scene, parentId: string): SceneNode[] {
  const result: SceneNode[] = []
  const queue = [parentId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const children = scene.nodes.filter(n => n.parentId === currentId)
    for (const child of children) {
      result.push(child)
      queue.push(child.id)
    }
  }

  return result
}

export function findParentChain(scene: Scene, nodeId: string): SceneNode[] {
  const chain: SceneNode[] = []
  let current = findNode(scene, nodeId)

  while (current?.parentId) {
    const parent = findNode(scene, current.parentId)
    if (!parent) break
    chain.push(parent)
    current = parent
  }

  return chain
}

export function flattenScene(scene: Scene): SceneNode[] {
  const rootNode = scene.nodes.find(n => n.type === 'root')
  if (!rootNode) return [...scene.nodes]

  const ordered: SceneNode[] = []
  const visited = new Set<string>()

  function visit(nodeId: string): void {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = scene.nodes.find(n => n.id === nodeId)
    if (!node) return

    ordered.push(node)
    const children = scene.nodes.filter(n => n.parentId === nodeId)
    for (const child of children) {
      visit(child.id)
    }
  }

  visit(rootNode.id)

  for (const node of scene.nodes) {
    if (!visited.has(node.id)) ordered.push(node)
  }

  return ordered
}

export function calculateSceneBounds(scene: Scene): BoundingBox {
  const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity }
  const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity }

  const spatialNodes = scene.nodes.filter(n =>
    n.type === 'mesh' || n.type === 'light' || n.type === 'camera'
  )

  if (spatialNodes.length === 0) return scene.bounds

  for (const node of spatialNodes) {
    const p = node.transform.position
    const s = node.transform.scale

    const halfX = Math.abs(s.x) / 2
    const halfY = Math.abs(s.y) / 2
    const halfZ = Math.abs(s.z) / 2

    min.x = Math.min(min.x, p.x - halfX)
    min.y = Math.min(min.y, p.y - halfY)
    min.z = Math.min(min.z, p.z - halfZ)
    max.x = Math.max(max.x, p.x + halfX)
    max.y = Math.max(max.y, p.y + halfY)
    max.z = Math.max(max.z, p.z + halfZ)
  }

  return { min, max }
}

export function getSceneStats(scene: Scene): {
  totalNodes: number
  meshes: number
  lights: number
  cameras: number
  groups: number
  empties: number
  maxDepth: number
} {
  const meshes = scene.nodes.filter(n => n.type === 'mesh').length
  const lights = scene.nodes.filter(n => n.type === 'light').length
  const cameras = scene.nodes.filter(n => n.type === 'camera').length
  const groups = scene.nodes.filter(n => n.type === 'group').length
  const empties = scene.nodes.filter(n => n.type === 'empty').length

  let maxDepth = 0
  for (const node of scene.nodes) {
    let depth = 0
    let current: SceneNode | null = node
    while (current?.parentId) {
      depth++
      current = scene.nodes.find(n => n.id === current!.parentId) ?? null
    }
    maxDepth = Math.max(maxDepth, depth)
  }

  return { totalNodes: scene.nodes.length, meshes, lights, cameras, groups, empties, maxDepth }
}
