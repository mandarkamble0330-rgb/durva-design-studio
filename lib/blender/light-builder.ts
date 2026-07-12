import type { BlenderLightData, BlenderLightType, BlenderObject, BlenderCustomProperty } from '@/types/blender'
import type { SceneNode } from '@/types/scene-graph'

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  return [r, g, b]
}

function mapLightType(sceneType: string): BlenderLightType {
  switch (sceneType.toLowerCase()) {
    case 'ambient':
    case 'directional':
      return 'SUN'
    case 'area':
    case 'led_strip':
    case 'led_wall':
      return 'AREA'
    case 'spot':
    case 'track':
      return 'SPOT'
    case 'point':
    default:
      return 'POINT'
  }
}

function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

export function buildBlenderLight(node: SceneNode, collectionName: string, parentName: string | null): BlenderObject {
  const light = node.light!
  const blenderType = mapLightType(light.lightType)
  const [r, g, b] = hexToRgb(light.color)

  const lightData: BlenderLightData = {
    type: blenderType,
    color: [r, g, b],
    energy: light.intensity,
    useShadow: light.castShadow,
  }

  if (blenderType === 'SPOT') {
    lightData.spotSize = light.angle ? degreesToRadians(light.angle) : Math.PI / 4
    lightData.spotBlend = 0.15
  }

  if (blenderType === 'AREA') {
    lightData.areaSize = [1, 1]
  }

  if (light.target) {
    lightData.target = light.target
  }

  const customProperties: BlenderCustomProperty[] = [
    { key: 'source_light_type', value: light.lightType },
  ]

  if (light.decay !== undefined) {
    customProperties.push({ key: 'decay', value: light.decay })
  }

  for (const [k, v] of Object.entries(node.metadata)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      customProperties.push({ key: k, value: v })
    }
  }

  return {
    name: node.name,
    type: 'LIGHT',
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
    cameraData: null,
    lightData,
  }
}
