import type {
  MaterialDefinition,
  LightDefinition,
  FlooringSpec,
  BoothType,
  BoothSide,
} from '@/types/blueprint'

export const DEFAULT_BOOTH_HEIGHT = 4

export const DEFAULT_FLOORING: FlooringSpec = {
  materialId: 'mat_floor_carpet',
  type: 'carpet',
  raised: false,
}

export const BOOTH_TYPE_OPEN_SIDES: Record<BoothType, BoothSide[]> = {
  island: ['front', 'left', 'right', 'rear'],
  peninsula: ['front', 'left', 'right'],
  corner: ['front', 'right'],
  inline: ['front'],
}

export const DEFAULT_MATERIALS: MaterialDefinition[] = [
  {
    id: 'mat_floor_carpet',
    name: 'Booth Carpet',
    type: 'carpet',
    color: '#333333',
    roughness: 0.9,
    metalness: 0,
    opacity: 1,
  },
  {
    id: 'mat_wall_white',
    name: 'White Wall Panel',
    type: 'laminate',
    color: '#f5f5f5',
    roughness: 0.3,
    metalness: 0,
    opacity: 1,
  },
  {
    id: 'mat_metal_brushed',
    name: 'Brushed Metal',
    type: 'metal',
    color: '#c0c0c0',
    roughness: 0.4,
    metalness: 0.8,
    opacity: 1,
  },
  {
    id: 'mat_glass_clear',
    name: 'Clear Glass',
    type: 'glass',
    color: '#ffffff',
    roughness: 0.05,
    metalness: 0,
    opacity: 0.3,
  },
  {
    id: 'mat_acrylic_frosted',
    name: 'Frosted Acrylic',
    type: 'acrylic',
    color: '#ffffff',
    roughness: 0.5,
    metalness: 0,
    opacity: 0.6,
  },
]

export const DEFAULT_AMBIENT_LIGHT: LightDefinition = {
  id: 'light_ambient',
  type: 'ambient',
  position: { x: 0, y: 4, z: 0 },
  color: '#ffffff',
  intensity: 0.4,
  castShadow: false,
  metadata: { role: 'fill' },
}

export const DEFAULT_KEY_LIGHT: LightDefinition = {
  id: 'light_key',
  type: 'directional',
  position: { x: 5, y: 8, z: 5 },
  color: '#fff8f0',
  intensity: 1.0,
  castShadow: true,
  target: { x: 0, y: 0, z: 0 },
  metadata: { role: 'key' },
}
