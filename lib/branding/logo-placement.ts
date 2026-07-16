import type { Vec3, BoothDimensions } from '@/types/blueprint'
import type { BrandingPlacement, BrandingSurface, LogoAlignment, VerticalAlignment } from './branding-types'
import { calculateSafeArea, fitWithinSafeArea, alignPosition, generateBrandingId, surfaceRotationY } from './branding-utils'

export interface LogoPlacementRequest {
  logoId: string
  logoUrl: string
  surface: BrandingSurface
  preferredWidth?: number
  preferredHeight?: number
  alignment?: LogoAlignment
  verticalAlignment?: VerticalAlignment
  rotation?: number
  opacity?: number
  visible?: boolean
  layer?: number
  safeMargin?: number
  aspectRatio?: number
  objectId?: string | null
  assetId?: string | null
  parentId?: string | null
}

interface SurfaceGeometry {
  origin: Vec3
  width: number
  height: number
  rotationY: number
}

function getSurfaceGeometry(surface: BrandingSurface, dims: BoothDimensions): SurfaceGeometry {
  const hw = dims.width / 2
  const hd = dims.depth / 2
  const h = dims.height

  switch (surface) {
    case 'front_fascia':
      return { origin: { x: 0, y: h * 0.85, z: hd }, width: dims.width, height: h * 0.3, rotationY: 0 }
    case 'rear_fascia':
    case 'back_wall_graphic':
      return { origin: { x: 0, y: h * 0.5, z: -hd }, width: dims.width, height: h * 0.8, rotationY: Math.PI }
    case 'left_fascia':
      return { origin: { x: -hw, y: h * 0.85, z: 0 }, width: dims.depth, height: h * 0.3, rotationY: Math.PI / 2 }
    case 'right_fascia':
      return { origin: { x: hw, y: h * 0.85, z: 0 }, width: dims.depth, height: h * 0.3, rotationY: -Math.PI / 2 }
    case 'reception_counter':
      return { origin: { x: 0, y: 1.1, z: hd * 0.5 }, width: 1.8, height: 0.3, rotationY: 0 }
    case 'branding_wall':
      return { origin: { x: 0, y: h * 0.5, z: -hd }, width: dims.width * 0.8, height: h * 0.6, rotationY: Math.PI }
    case 'product_display_panel':
      return { origin: { x: 0, y: 1.5, z: 0 }, width: 1.2, height: 0.8, rotationY: 0 }
    case 'hanging_banner':
      return { origin: { x: 0, y: h - 0.3, z: 0 }, width: 1.5, height: 2.5, rotationY: 0 }
    case 'led_display_panel':
      return { origin: { x: 0, y: 1.5, z: -hd + 0.05 }, width: 2.0, height: 1.2, rotationY: Math.PI }
    case 'information_kiosk':
      return { origin: { x: 0, y: 1.3, z: 0 }, width: 0.5, height: 0.8, rotationY: 0 }
    default:
      return { origin: { x: 0, y: h * 0.5, z: -hd }, width: 2, height: 1, rotationY: Math.PI }
  }
}

export function placeLogo(
  request: LogoPlacementRequest,
  dims: BoothDimensions,
  index: number
): BrandingPlacement {
  const geom = getSurfaceGeometry(request.surface, dims)
  const margin = request.safeMargin ?? 0.05
  const aspectRatio = request.aspectRatio ?? 1.5
  const alignment = request.alignment ?? 'center'
  const verticalAlignment = request.verticalAlignment ?? 'center'

  const safeArea = calculateSafeArea(geom.width, geom.height, margin)

  const prefW = request.preferredWidth ?? geom.width * 0.6
  const prefH = request.preferredHeight ?? prefW / aspectRatio

  const { width, height } = fitWithinSafeArea(prefW, prefH, safeArea, aspectRatio)
  const { offsetX, offsetY } = alignPosition(geom.width, geom.height, width, height, alignment, verticalAlignment, margin)

  const relX = offsetX - geom.width / 2
  const relY = offsetY - geom.height / 2

  const position: Vec3 = {
    x: geom.origin.x + (geom.rotationY === 0 ? relX : geom.rotationY === Math.PI ? -relX : 0),
    y: geom.origin.y + relY,
    z: geom.origin.z + (Math.abs(geom.rotationY) === Math.PI / 2 ? relX * Math.sign(-geom.rotationY) : 0),
  }

  return {
    brandingId: generateBrandingId(request.surface, index),
    logoId: request.logoId,
    logoUrl: request.logoUrl,
    surface: request.surface,
    position,
    width,
    height,
    rotation: request.rotation ?? 0,
    opacity: request.opacity ?? 1,
    visible: request.visible ?? true,
    alignment,
    verticalAlignment,
    layer: request.layer ?? 0,
    safeMargin: margin,
    aspectRatio,
    objectId: request.objectId ?? null,
    assetId: request.assetId ?? null,
    parentId: request.parentId ?? null,
  }
}

export function placeMultipleLogos(
  requests: LogoPlacementRequest[],
  dims: BoothDimensions
): BrandingPlacement[] {
  return requests.map((req, i) => placeLogo(req, dims, i))
}
