import type { Scene } from '@/types/scene-graph'
import type { RenderCameraView } from './render-types'

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function extractCamerasFromScene(scene: Scene): RenderCameraView[] {
  const cameras: RenderCameraView[] = []

  for (const node of scene.nodes) {
    if (node.type !== 'camera' || !node.camera) continue

    cameras.push({
      cameraId: generateId('rcam'),
      viewId: node.camera.viewId ?? 'default',
      cameraName: node.name,
      position: { ...node.transform.position },
      rotation: { ...node.transform.rotation },
      fov: node.camera.fov ?? 50,
      near: node.camera.near ?? 0.1,
      far: node.camera.far ?? 1000,
    })
  }

  return cameras
}

export function getCameraByViewId(cameras: RenderCameraView[], viewId: string): RenderCameraView | null {
  return cameras.find(c => c.viewId === viewId) ?? null
}

export function getDefaultCamera(cameras: RenderCameraView[]): RenderCameraView | null {
  return cameras.find(c => c.viewId === 'front')
    ?? cameras.find(c => c.viewId === 'angle_45')
    ?? cameras[0]
    ?? null
}
