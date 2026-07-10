import type { Vec3, BoundingBox } from './blueprint'

export interface SceneTransform {
  position: Vec3
  rotation: Vec3
  scale: Vec3
}

export interface MeshReference {
  assetId: string
  blendFile: string | null
  objectName: string | null
}

export interface MaterialReference {
  materialId: string
  color: string
  roughness: number
  metalness: number
  opacity: number
  textureUrl?: string
  normalMapUrl?: string
}

export interface CameraReference {
  viewId: string
  fov: number
  near: number
  far: number
}

export interface LightReference {
  lightType: string
  color: string
  intensity: number
  castShadow: boolean
  angle?: number
  decay?: number
  target?: Vec3
}

export type SceneNodeType =
  | 'root'
  | 'group'
  | 'mesh'
  | 'camera'
  | 'light'
  | 'empty'

export interface SceneNode {
  id: string
  name: string
  type: SceneNodeType
  parentId: string | null
  transform: SceneTransform
  mesh: MeshReference | null
  material: MaterialReference | null
  camera: CameraReference | null
  light: LightReference | null
  visible: boolean
  tags: string[]
  metadata: Record<string, unknown>
}

export interface Scene {
  version: string
  id: string
  blueprintId: string
  projectId: string
  createdAt: string
  updatedAt: string
  nodes: SceneNode[]
  bounds: BoundingBox
  metadata: {
    nodeCount: number
    meshCount: number
    lightCount: number
    cameraCount: number
    unresolvedAssets: string[]
    [key: string]: unknown
  }
}
