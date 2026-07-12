import type { Vec3 } from './blueprint'

export interface BlenderTransform {
  location: Vec3
  rotation: Vec3
  scale: Vec3
}

export type BlenderObjectType =
  | 'MESH'
  | 'EMPTY'
  | 'CAMERA'
  | 'LIGHT'

export interface BlenderCustomProperty {
  key: string
  value: string | number | boolean
}

export interface BlenderObject {
  name: string
  type: BlenderObjectType
  transform: BlenderTransform
  parentName: string | null
  collectionName: string
  visible: boolean
  customProperties: BlenderCustomProperty[]
  meshData: BlenderMeshData | null
  materialName: string | null
  cameraData: BlenderCameraData | null
  lightData: BlenderLightData | null
}

export interface BlenderVertex {
  x: number
  y: number
  z: number
}

export interface BlenderFace {
  vertices: number[]
}

export interface BlenderMeshData {
  vertices: BlenderVertex[]
  faces: BlenderFace[]
  uvLayers: BlenderUVLayer[]
}

export interface BlenderUVLayer {
  name: string
  data: Array<{ u: number; v: number }>
}

export interface BlenderMaterial {
  name: string
  color: [number, number, number, number]
  roughness: number
  metallic: number
  alpha: number
  useBackfaceCulling: boolean
  blendMode: 'OPAQUE' | 'ALPHA_BLEND' | 'ALPHA_CLIP'
  customProperties: BlenderCustomProperty[]
}

export interface BlenderCameraData {
  type: 'PERSP' | 'ORTHO'
  fov: number
  clipStart: number
  clipEnd: number
}

export type BlenderLightType =
  | 'POINT'
  | 'SUN'
  | 'SPOT'
  | 'AREA'

export interface BlenderLightData {
  type: BlenderLightType
  color: [number, number, number]
  energy: number
  useShadow: boolean
  spotSize?: number
  spotBlend?: number
  areaSize?: [number, number]
  target?: Vec3
}

export interface BlenderCollection {
  name: string
  parentName: string | null
}

export interface BlenderScene {
  name: string
  collections: BlenderCollection[]
  objects: BlenderObject[]
  materials: BlenderMaterial[]
  metadata: {
    sourceSceneId: string
    sourceBlueprintId: string
    sourceProjectId: string
    generatedAt: string
    objectCount: number
    materialCount: number
    collectionCount: number
  }
}

export interface BlenderValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
