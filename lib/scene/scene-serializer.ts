import type { Scene } from '@/types/scene-graph'

export function serializeScene(scene: Scene): string {
  return JSON.stringify(scene, null, 2)
}

export function deserializeScene(json: string): Scene {
  const parsed = JSON.parse(json) as Scene
  if (!parsed.version || !parsed.id || !parsed.blueprintId || !parsed.projectId) {
    throw new Error('Invalid scene: missing required fields (version, id, blueprintId, projectId)')
  }
  if (!Array.isArray(parsed.nodes)) {
    throw new Error('Invalid scene: nodes must be an array')
  }
  return parsed
}
