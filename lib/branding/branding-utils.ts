import type { Vec3 } from '@/types/blueprint'
import type { SafeArea, LogoAlignment, VerticalAlignment } from './branding-types'

export function calculateSafeArea(
  surfaceWidth: number,
  surfaceHeight: number,
  margin: number
): SafeArea {
  return {
    minX: margin,
    maxX: surfaceWidth - margin,
    minY: margin,
    maxY: surfaceHeight - margin,
    surfaceWidth,
    surfaceHeight,
    margin,
  }
}

export function fitWithinSafeArea(
  logoWidth: number,
  logoHeight: number,
  safeArea: SafeArea,
  aspectRatio: number
): { width: number; height: number } {
  const availW = safeArea.maxX - safeArea.minX
  const availH = safeArea.maxY - safeArea.minY

  if (availW <= 0 || availH <= 0) return { width: 0, height: 0 }

  let w = Math.min(logoWidth, availW)
  let h = w / aspectRatio

  if (h > availH) {
    h = availH
    w = h * aspectRatio
  }

  return { width: w, height: h }
}

export function alignPosition(
  surfaceWidth: number,
  surfaceHeight: number,
  logoWidth: number,
  logoHeight: number,
  alignment: LogoAlignment,
  verticalAlignment: VerticalAlignment,
  margin: number
): { offsetX: number; offsetY: number } {
  let offsetX: number
  switch (alignment) {
    case 'left': offsetX = margin + logoWidth / 2; break
    case 'right': offsetX = surfaceWidth - margin - logoWidth / 2; break
    case 'center': default: offsetX = surfaceWidth / 2; break
  }

  let offsetY: number
  switch (verticalAlignment) {
    case 'top': offsetY = surfaceHeight - margin - logoHeight / 2; break
    case 'bottom': offsetY = margin + logoHeight / 2; break
    case 'center': default: offsetY = surfaceHeight / 2; break
  }

  return { offsetX, offsetY }
}

export function preserveAspectRatio(
  originalWidth: number,
  originalHeight: number
): number {
  if (originalHeight <= 0) return 1
  return originalWidth / originalHeight
}

export function generateBrandingId(surface: string, index: number): string {
  return `branding_${surface}_${index}_${Date.now().toString(36)}`
}

export function surfaceNormal(surface: string): Vec3 {
  switch (surface) {
    case 'front_fascia': return { x: 0, y: 0, z: 1 }
    case 'rear_fascia':
    case 'back_wall_graphic': return { x: 0, y: 0, z: -1 }
    case 'left_fascia': return { x: -1, y: 0, z: 0 }
    case 'right_fascia': return { x: 1, y: 0, z: 0 }
    default: return { x: 0, y: 0, z: -1 }
  }
}

export function surfaceRotationY(surface: string): number {
  switch (surface) {
    case 'front_fascia': return 0
    case 'rear_fascia':
    case 'back_wall_graphic': return Math.PI
    case 'left_fascia': return Math.PI / 2
    case 'right_fascia': return -Math.PI / 2
    default: return 0
  }
}
