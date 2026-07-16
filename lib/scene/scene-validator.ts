import type { Scene, SceneNode } from '@/types/scene-graph'

export interface SceneValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

function checkDuplicateIds(nodes: SceneNode[], errors: string[]): Set<string> {
  const seen = new Set<string>()
  for (const node of nodes) {
    if (seen.has(node.id)) errors.push(`Duplicate node id: "${node.id}"`)
    seen.add(node.id)
  }
  return seen
}

function checkParentReferences(nodes: SceneNode[], ids: Set<string>, errors: string[]): void {
  for (const node of nodes) {
    if (node.parentId !== null && !ids.has(node.parentId)) {
      errors.push(`Node "${node.name}" (${node.id}) references missing parent: "${node.parentId}"`)
    }
  }
}

function checkCircularParents(nodes: SceneNode[], errors: string[]): void {
  const parentMap = new Map<string, string | null>()
  for (const node of nodes) {
    parentMap.set(node.id, node.parentId)
  }

  for (const node of nodes) {
    const visited = new Set<string>()
    let current: string | null = node.id

    while (current !== null) {
      if (visited.has(current)) {
        errors.push(`Circular parent chain detected involving node: "${node.name}" (${node.id})`)
        break
      }
      visited.add(current)
      current = parentMap.get(current) ?? null
    }
  }
}

function isVec3Valid(v: unknown): v is { x: number; y: number; z: number } {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.x === 'number' && isFinite(o.x)
    && typeof o.y === 'number' && isFinite(o.y)
    && typeof o.z === 'number' && isFinite(o.z)
}

function checkTransforms(nodes: SceneNode[], errors: string[], warnings: string[]): void {
  for (const node of nodes) {
    const t = node.transform
    if (!t) {
      errors.push(`Node "${node.name}" has no transform`)
      continue
    }

    if (!isVec3Valid(t.position)) {
      errors.push(`Node "${node.name}" has missing or invalid position`)
      continue
    }
    if (!isVec3Valid(t.rotation)) {
      errors.push(`Node "${node.name}" has missing or invalid rotation`)
    }
    if (!isVec3Valid(t.scale)) {
      errors.push(`Node "${node.name}" has missing or invalid scale`)
      continue
    }

    const { position, scale } = t

    if (scale.x === 0 && scale.y === 0 && scale.z === 0) {
      warnings.push(`Node "${node.name}" has zero scale on all axes`)
    }

    if (scale.x < 0 || scale.y < 0 || scale.z < 0) {
      warnings.push(`Node "${node.name}" has negative scale`)
    }

    const maxPos = 1000
    if (Math.abs(position.x) > maxPos || Math.abs(position.y) > maxPos || Math.abs(position.z) > maxPos) {
      warnings.push(`Node "${node.name}" position is very far from origin`)
    }
  }
}

function checkMeshReferences(nodes: SceneNode[], warnings: string[]): void {
  for (const node of nodes) {
    if (node.type === 'mesh' && node.mesh && !node.mesh.blendFile) {
      warnings.push(`Mesh node "${node.name}" has no blendFile (asset "${node.mesh.assetId}" may be unresolved)`)
    }
  }
}

function checkLightNodes(nodes: SceneNode[], errors: string[], warnings: string[]): void {
  for (const node of nodes) {
    if (node.type === 'light') {
      if (!node.light) {
        errors.push(`Light node "${node.name}" has no light data`)
        continue
      }
      if (typeof node.light.intensity !== 'number' || !isFinite(node.light.intensity)) {
        errors.push(`Light "${node.name}" has invalid intensity`)
      } else if (node.light.intensity <= 0) {
        warnings.push(`Light "${node.name}" has zero or negative intensity`)
      } else if (node.light.intensity > 100) {
        warnings.push(`Light "${node.name}" has very high intensity: ${node.light.intensity}`)
      }
    }
  }
}

function checkCameraNodes(nodes: SceneNode[], errors: string[], warnings: string[]): void {
  const cameraNodes = nodes.filter(n => n.type === 'camera')
  if (cameraNodes.length === 0) {
    errors.push('Scene has no camera nodes')
  }
  for (const node of cameraNodes) {
    if (!node.camera) {
      errors.push(`Camera node "${node.name}" has no camera data`)
      continue
    }
    if (!node.camera.viewId) {
      warnings.push(`Camera "${node.name}" has no viewId`)
    }
    if (typeof node.camera.fov !== 'number' || node.camera.fov <= 0) {
      errors.push(`Camera "${node.name}" has invalid FOV: ${node.camera.fov}`)
    }
    if (typeof node.camera.near !== 'number' || node.camera.near <= 0) {
      errors.push(`Camera "${node.name}" has invalid near clip: ${node.camera.near}`)
    }
    if (typeof node.camera.far !== 'number' || node.camera.far <= 0) {
      errors.push(`Camera "${node.name}" has invalid far clip: ${node.camera.far}`)
    }
  }
}

function checkRootNode(nodes: SceneNode[], errors: string[]): void {
  const roots = nodes.filter(n => n.type === 'root')
  if (roots.length === 0) errors.push('Scene has no root node')
  if (roots.length > 1) errors.push(`Scene has ${roots.length} root nodes, expected 1`)
}

function checkLogoNodes(nodes: SceneNode[], errors: string[], warnings: string[]): void {
  const logoNodes = nodes.filter(n => n.tags.includes('logo'))
  for (const node of logoNodes) {
    if (!node.metadata.logoUrl && !node.metadata.surface) continue
    if (!node.metadata.logoUrl) {
      warnings.push(`Logo node "${node.name}" has no logoUrl`)
    }
    if (node.transform.scale.x <= 0 || node.transform.scale.y <= 0) {
      errors.push(`Logo node "${node.name}" has invalid dimensions`)
    }
  }
}

export function validateScene(scene: Scene): SceneValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!scene.version) errors.push('Missing scene version')
  if (!scene.id) errors.push('Missing scene id')
  if (!scene.blueprintId) errors.push('Missing blueprintId')
  if (!scene.projectId) errors.push('Missing projectId')
  if (scene.nodes.length === 0) errors.push('Scene has no nodes')

  const ids = checkDuplicateIds(scene.nodes, errors)
  checkParentReferences(scene.nodes, ids, errors)
  checkCircularParents(scene.nodes, errors)
  checkRootNode(scene.nodes, errors)
  checkTransforms(scene.nodes, errors, warnings)
  checkMeshReferences(scene.nodes, warnings)
  checkLightNodes(scene.nodes, errors, warnings)
  checkCameraNodes(scene.nodes, errors, warnings)
  checkLogoNodes(scene.nodes, errors, warnings)

  if (scene.metadata.unresolvedAssets.length > 0) {
    warnings.push(`${scene.metadata.unresolvedAssets.length} unresolved asset(s): ${scene.metadata.unresolvedAssets.join(', ')}`)
  }

  return { valid: errors.length === 0, errors, warnings }
}
