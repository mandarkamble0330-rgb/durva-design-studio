import type { BlenderCameraData, BlenderObject, BlenderCustomProperty } from '@/types/blender'
import type { SceneNode } from '@/types/scene-graph'

function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

function buildCameraData(node: SceneNode): BlenderCameraData {
  const cam = node.camera!
  return {
    type: 'PERSP',
    fov: degreesToRadians(cam.fov),
    clipStart: cam.near,
    clipEnd: cam.far,
  }
}

export function buildBlenderCamera(node: SceneNode, collectionName: string, parentName: string | null): BlenderObject {
  const cam = node.camera!
  const customProperties: BlenderCustomProperty[] = [
    { key: 'view_id', value: cam.viewId },
  ]

  for (const [k, v] of Object.entries(node.metadata)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      customProperties.push({ key: k, value: v })
    }
  }

  return {
    name: node.name,
    type: 'CAMERA',
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
    customProperties,
    meshData: null,
    materialName: null,
    cameraData: buildCameraData(node),
    lightData: null,
  }
}
