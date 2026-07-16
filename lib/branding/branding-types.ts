import type { Vec3 } from '@/types/blueprint'

export type BrandingSurface =
  | 'front_fascia'
  | 'left_fascia'
  | 'right_fascia'
  | 'rear_fascia'
  | 'reception_counter'
  | 'branding_wall'
  | 'product_display_panel'
  | 'hanging_banner'
  | 'led_display_panel'
  | 'information_kiosk'
  | 'back_wall_graphic'
  | 'custom'

export type LogoAlignment = 'left' | 'center' | 'right'
export type VerticalAlignment = 'top' | 'center' | 'bottom'

export interface LogoDefinition {
  logoId: string
  logoUrl: string
  originalWidth: number
  originalHeight: number
  format: 'svg' | 'png' | 'jpg' | 'webp'
}

export interface BrandingPlacement {
  brandingId: string
  logoId: string
  logoUrl: string
  surface: BrandingSurface
  position: Vec3
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  alignment: LogoAlignment
  verticalAlignment: VerticalAlignment
  layer: number
  safeMargin: number
  aspectRatio: number
  objectId: string | null
  assetId: string | null
  parentId: string | null
}

export interface SafeArea {
  minX: number
  maxX: number
  minY: number
  maxY: number
  surfaceWidth: number
  surfaceHeight: number
  margin: number
}

export interface BrandingEngineResult {
  placements: BrandingPlacement[]
  nodesAdded: number
  errors: string[]
  warnings: string[]
}
