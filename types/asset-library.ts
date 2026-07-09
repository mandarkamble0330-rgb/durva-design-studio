import type { Vec3 } from './blueprint'

export type AssetCategory =
  | 'walls'
  | 'reception'
  | 'led_walls'
  | 'tvs'
  | 'furniture'
  | 'meeting_room'
  | 'storage'
  | 'hanging_ring'
  | 'flooring'
  | 'ceiling'
  | 'plants'
  | 'lighting'
  | 'logos'

export interface AssetDimensions {
  width: number
  height: number
  depth: number
  unit: 'meters' | 'centimeters'
}

export interface AssetMaterialSlot {
  slotName: string
  defaultMaterialType: string
  swappable: boolean
}

export interface AssetDefinition {
  assetId: string
  category: AssetCategory
  displayName: string
  description: string
  dimensions: AssetDimensions
  supportedMaterials: AssetMaterialSlot[]
  thumbnail: string | null
  previewImage: string | null
  blendFile: string | null
  tags: string[]
  metadata: AssetMetadata
}

export interface AssetMetadata {
  version: string
  author: string
  polyCount?: number
  fileSize?: number
  createdAt: string
  updatedAt: string
  snapPoints?: SnapPoint[]
  stackable?: boolean
  wallMountable?: boolean
  floorPlaced?: boolean
  [key: string]: unknown
}

export interface SnapPoint {
  id: string
  position: Vec3
  normal: Vec3
  label: string
}

export interface AssetSearchQuery {
  text?: string
  category?: AssetCategory
  tags?: string[]
  maxWidth?: number
  maxHeight?: number
  maxDepth?: number
  wallMountable?: boolean
  floorPlaced?: boolean
}

export interface AssetSearchResult {
  asset: AssetDefinition
  score: number
}

export const ASSET_CATEGORIES: { id: AssetCategory; label: string; description: string }[] = [
  { id: 'walls', label: 'Walls', description: 'Wall panels, partitions, and structural walls' },
  { id: 'reception', label: 'Reception', description: 'Reception counters, desks, and welcome areas' },
  { id: 'led_walls', label: 'LED Walls', description: 'LED video walls and digital displays' },
  { id: 'tvs', label: 'TVs', description: 'Television screens and monitors' },
  { id: 'furniture', label: 'Furniture', description: 'Tables, chairs, sofas, and shelving' },
  { id: 'meeting_room', label: 'Meeting Room', description: 'Meeting tables, presentation equipment' },
  { id: 'storage', label: 'Storage', description: 'Cabinets, lockers, and storage units' },
  { id: 'hanging_ring', label: 'Hanging Ring', description: 'Overhead hanging structures and ring displays' },
  { id: 'flooring', label: 'Flooring', description: 'Floor tiles, platforms, and raised floors' },
  { id: 'ceiling', label: 'Ceiling', description: 'Ceiling panels, grids, and overhead structures' },
  { id: 'plants', label: 'Plants', description: 'Decorative plants, planters, and greenery' },
  { id: 'lighting', label: 'Lighting', description: 'Light fixtures, spotlights, and LED strips' },
  { id: 'logos', label: 'Logos', description: 'Logo displays, backlit signs, and branding elements' },
]
