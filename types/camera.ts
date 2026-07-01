// Module 6: Camera View Architecture — renderer-independent

export type CameraViewId =
  | 'front'
  | 'left'
  | 'right'
  | 'rear'
  | 'angle_45'
  | 'top_iso'

export interface CameraPosition {
  x: number
  y: number
  z: number
}

export interface CameraRotation {
  pitch: number
  yaw: number
  roll: number
}

export interface CameraView {
  id: CameraViewId
  label: string
  description: string
  position: CameraPosition
  rotation: CameraRotation
  fov: number
  promptSuffix: string
  negativeHints: string
}

export interface CameraPreset {
  view: CameraView
  thumbnail: string | null
  sortOrder: number
}

export interface CameraViewRequest {
  viewId: CameraViewId
  projectId: string
  referenceImageId?: string
  overrides?: Partial<Pick<CameraView, 'fov' | 'position' | 'rotation'>>
}

export interface CameraViewResult {
  viewId: CameraViewId
  imageUrl: string | null
  generationId: string | null
  status: 'pending' | 'rendering' | 'completed' | 'failed'
  error?: string
  metadata: Record<string, unknown>
}

export interface CameraSession {
  id: string
  projectId: string
  activeViewId: CameraViewId
  views: Record<CameraViewId, CameraViewResult | null>
  createdAt: string
  updatedAt: string
}
