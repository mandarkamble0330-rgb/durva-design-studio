import type { ObjectType } from '@/types/blueprint'

export type SurfaceRole =
  | 'floor'
  | 'wall'
  | 'fascia'
  | 'reception_counter'
  | 'display_shelf'
  | 'product_pedestal'
  | 'table_surface'
  | 'chair_frame'
  | 'chair_seat'
  | 'storage_unit'
  | 'pantry_surface'
  | 'branding_panel'
  | 'logo_plane'
  | 'screen_frame'
  | 'planter_body'
  | 'partition'
  | 'signage'
  | 'generic'

const OBJECT_TO_SURFACE: Partial<Record<ObjectType, SurfaceRole>> = {
  counter: 'reception_counter',
  table: 'table_surface',
  chair: 'chair_frame',
  sofa: 'chair_seat',
  shelf: 'display_shelf',
  display_stand: 'product_pedestal',
  screen: 'screen_frame',
  kiosk: 'screen_frame',
  podium: 'reception_counter',
  wall_panel: 'branding_panel',
  partition: 'partition',
  signage: 'signage',
  lighting_fixture: 'generic',
  planter: 'planter_body',
}

const SURFACE_DEFAULT_MATERIAL: Record<SurfaceRole, string> = {
  floor: 'carpet',
  wall: 'laminate',
  fascia: 'brushed_metal',
  reception_counter: 'laminate',
  display_shelf: 'glass',
  product_pedestal: 'acrylic',
  table_surface: 'wood',
  chair_frame: 'brushed_metal',
  chair_seat: 'fabric',
  storage_unit: 'laminate',
  pantry_surface: 'laminate',
  branding_panel: 'brand_primary',
  logo_plane: 'brand_primary',
  screen_frame: 'brushed_metal',
  planter_body: 'pvc',
  partition: 'frosted_acrylic',
  signage: 'brand_secondary',
  generic: 'laminate',
}

export function getSurfaceRole(objectType: ObjectType | string, tags: string[]): SurfaceRole {
  if (tags.includes('floor')) return 'floor'
  if (tags.includes('wall')) return 'wall'
  if (tags.includes('logo') || tags.includes('branding')) return 'logo_plane'
  if (tags.includes('fascia')) return 'fascia'

  return OBJECT_TO_SURFACE[objectType as ObjectType] ?? 'generic'
}

export function getDefaultMaterialType(role: SurfaceRole): string {
  return SURFACE_DEFAULT_MATERIAL[role]
}

export function mapSurfaceToMaterial(objectType: ObjectType | string, tags: string[]): string {
  const role = getSurfaceRole(objectType, tags)
  return getDefaultMaterialType(role)
}
