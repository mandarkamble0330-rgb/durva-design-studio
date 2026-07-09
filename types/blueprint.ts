import type { CameraViewId, CameraPosition, CameraRotation } from './camera'

// --- Spatial primitives ---

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface BoundingBox {
  min: Vec3
  max: Vec3
}

export interface Transform {
  position: Vec3
  rotation: Vec3
  scale: Vec3
}

// --- Booth shell ---

export interface BoothDimensions {
  width: number
  depth: number
  height: number
  unit: 'meters' | 'feet'
  openSides: BoothSide[]
}

export type BoothSide = 'front' | 'left' | 'right' | 'rear'

export type BoothType = 'island' | 'peninsula' | 'corner' | 'inline'

// --- Branding ---

export interface BrandingSpec {
  companyName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  accentColor?: string
  fontFamily?: string
  logoPlacement: LogoPlacement[]
}

export interface LogoPlacement {
  surface: string
  position: Vec3
  widthMeters: number
  heightMeters: number
}

// --- Zones ---

export interface ZoneDefinition {
  id: string
  type: ZoneType
  label: string
  bounds: BoundingBox
  floorArea: number
  priority: number
  adjacency?: string[]
  metadata: Record<string, unknown>
}

export type ZoneType =
  | 'reception'
  | 'meeting_room'
  | 'product_display'
  | 'lounge'
  | 'gaming'
  | 'storage'
  | 'led_screen'
  | 'interactive_screen'
  | 'ar_vr'
  | 'robotic_arm'
  | 'product_launch_stage'
  | 'custom'

// --- Objects ---

export interface ObjectDefinition {
  id: string
  type: ObjectType
  label: string
  transform: Transform
  dimensions: Vec3
  zoneId: string | null
  materialId: string | null
  metadata: Record<string, unknown>
}

export type ObjectType =
  | 'counter'
  | 'table'
  | 'chair'
  | 'sofa'
  | 'shelf'
  | 'display_stand'
  | 'screen'
  | 'kiosk'
  | 'podium'
  | 'wall_panel'
  | 'partition'
  | 'signage'
  | 'lighting_fixture'
  | 'planter'
  | 'custom'

// --- Materials ---

export interface MaterialDefinition {
  id: string
  name: string
  type: MaterialType
  color: string
  roughness: number
  metalness: number
  opacity: number
  textureUrl?: string
  normalMapUrl?: string
}

export type MaterialType =
  | 'wood'
  | 'metal'
  | 'glass'
  | 'fabric'
  | 'acrylic'
  | 'vinyl'
  | 'carpet'
  | 'laminate'
  | 'concrete'
  | 'led_panel'
  | 'custom'

// --- Lighting ---

export interface LightDefinition {
  id: string
  type: LightType
  position: Vec3
  rotation?: Vec3
  color: string
  intensity: number
  castShadow: boolean
  target?: Vec3
  angle?: number
  decay?: number
  metadata: Record<string, unknown>
}

export type LightType =
  | 'spotlight'
  | 'led_strip'
  | 'backlit_panel'
  | 'ambient'
  | 'neon'
  | 'projection'
  | 'point'
  | 'directional'
  | 'area'

// --- Camera ---

export interface BlueprintCamera {
  viewId: CameraViewId
  position: CameraPosition
  rotation: CameraRotation
  fov: number
  near: number
  far: number
}

// --- Flooring ---

export interface FlooringSpec {
  materialId: string
  type: string
  raised: boolean
  raisedHeight?: number
}

// --- The Blueprint ---

export interface BoothBlueprint {
  version: string
  id: string
  projectId: string
  createdAt: string
  updatedAt: string

  booth: {
    type: BoothType
    dimensions: BoothDimensions
    flooring: FlooringSpec
  }

  branding: BrandingSpec

  zones: ZoneDefinition[]
  objects: ObjectDefinition[]
  materials: MaterialDefinition[]
  lights: LightDefinition[]
  cameras: BlueprintCamera[]

  metadata: {
    designTheme: string
    industryType: string
    generatedFrom: 'manual' | 'ai' | 'template'
    sourceProjectName: string
    [key: string]: unknown
  }
}
