import type { CameraView, CameraViewId, CameraPreset } from '@/types/camera'

const CAMERA_VIEWS: Record<CameraViewId, CameraView> = {
  front: {
    id: 'front',
    label: 'Front View',
    description: 'Straight-on elevation from the front entrance',
    position: { x: 0, y: 1.6, z: 8 },
    rotation: { pitch: 0, yaw: 0, roll: 0 },
    fov: 50,
    promptSuffix: '',
    negativeHints: 'side angle, aerial view, tilted camera, dutch angle',
  },
  left: {
    id: 'left',
    label: 'Left View',
    description: '90-degree view from the left side',
    position: { x: -8, y: 1.6, z: 0 },
    rotation: { pitch: 0, yaw: 90, roll: 0 },
    fov: 50,
    promptSuffix: 'Render the exact same booth from the left side (90°). Preserve every structural element, branding, dimensions, materials, lighting, object placement, and branding exactly.',
    negativeHints: 'front view, rear view, aerial view, tilted camera, redesigned booth, different layout',
  },
  right: {
    id: 'right',
    label: 'Right View',
    description: '90-degree view from the right side',
    position: { x: 8, y: 1.6, z: 0 },
    rotation: { pitch: 0, yaw: -90, roll: 0 },
    fov: 50,
    promptSuffix: 'Render the exact same booth from the right side (90°). Preserve every structural element, branding, dimensions, materials, lighting, object placement, and branding exactly.',
    negativeHints: 'front view, rear view, aerial view, tilted camera, redesigned booth, different layout',
  },
  rear: {
    id: 'rear',
    label: 'Rear View',
    description: 'View from behind the booth structure',
    position: { x: 0, y: 1.6, z: -8 },
    rotation: { pitch: 0, yaw: 180, roll: 0 },
    fov: 50,
    promptSuffix: 'Render the exact same booth from the rear (180°). Keep all architecture, branding, and layout identical.',
    negativeHints: 'front view, side view, aerial view, tilted camera, redesigned booth, different layout',
  },
  angle_45: {
    id: 'angle_45',
    label: '45° Perspective',
    description: 'Three-quarter perspective view, slightly elevated',
    position: { x: 6, y: 3, z: 6 },
    rotation: { pitch: -15, yaw: -45, roll: 0 },
    fov: 55,
    promptSuffix: 'Render the exact same booth from a 45-degree perspective. Do not redesign or modify the booth.',
    negativeHints: 'flat elevation, top-down, extreme angle, fisheye, redesigned booth, different layout',
  },
  top_iso: {
    id: 'top_iso',
    label: 'Top Isometric',
    description: 'Elevated isometric view showing full booth layout',
    position: { x: 5, y: 10, z: 5 },
    rotation: { pitch: -55, yaw: -45, roll: 0 },
    fov: 45,
    promptSuffix: 'Render the exact same booth from a top isometric architectural view while preserving every structural element.',
    negativeHints: 'eye-level, ground-level, straight-on elevation, extreme close-up, redesigned booth, different layout',
  },
}

const VIEW_ORDER: CameraViewId[] = [
  'front',
  'angle_45',
  'left',
  'right',
  'rear',
  'top_iso',
]

export function getCameraView(viewId: CameraViewId): CameraView {
  return CAMERA_VIEWS[viewId]
}

export function getAllCameraViews(): CameraView[] {
  return VIEW_ORDER.map(id => CAMERA_VIEWS[id])
}

export function getCameraPresets(): CameraPreset[] {
  return VIEW_ORDER.map((id, index) => ({
    view: CAMERA_VIEWS[id],
    thumbnail: null,
    sortOrder: index,
  }))
}

export function getCameraPromptSuffix(viewId: CameraViewId): string {
  return CAMERA_VIEWS[viewId].promptSuffix
}

export function getCameraNegativeHints(viewId: CameraViewId): string {
  return CAMERA_VIEWS[viewId].negativeHints
}

export { VIEW_ORDER, CAMERA_VIEWS }
