import type { ZoneType, ObjectType } from '@/types/blueprint'

export interface ZoneStrategy {
  primaryObjects: ObjectType[]
  optionalObjects: ObjectType[]
  layout: 'perimeter' | 'center' | 'grid' | 'freeform'
  facingDirection: 'entrance' | 'center' | 'wall' | 'none'
  maxDensity: number
}

const STRATEGIES: Partial<Record<ZoneType, ZoneStrategy>> = {
  reception: {
    primaryObjects: ['counter', 'display_stand', 'signage'],
    optionalObjects: ['planter', 'screen', 'chair'],
    layout: 'center',
    facingDirection: 'entrance',
    maxDensity: 0.4,
  },
  product_display: {
    primaryObjects: ['shelf', 'display_stand', 'table'],
    optionalObjects: ['screen', 'lighting_fixture', 'signage'],
    layout: 'grid',
    facingDirection: 'center',
    maxDensity: 0.5,
  },
  meeting_room: {
    primaryObjects: ['table', 'chair'],
    optionalObjects: ['screen', 'planter'],
    layout: 'center',
    facingDirection: 'center',
    maxDensity: 0.55,
  },
  lounge: {
    primaryObjects: ['sofa', 'table'],
    optionalObjects: ['planter', 'lighting_fixture', 'chair'],
    layout: 'freeform',
    facingDirection: 'center',
    maxDensity: 0.35,
  },
  storage: {
    primaryObjects: ['shelf'],
    optionalObjects: ['counter'],
    layout: 'perimeter',
    facingDirection: 'wall',
    maxDensity: 0.7,
  },
  led_screen: {
    primaryObjects: ['screen'],
    optionalObjects: ['lighting_fixture'],
    layout: 'perimeter',
    facingDirection: 'entrance',
    maxDensity: 0.3,
  },
  interactive_screen: {
    primaryObjects: ['kiosk', 'screen'],
    optionalObjects: ['counter', 'signage'],
    layout: 'grid',
    facingDirection: 'entrance',
    maxDensity: 0.35,
  },
  ar_vr: {
    primaryObjects: ['kiosk'],
    optionalObjects: ['screen', 'signage'],
    layout: 'center',
    facingDirection: 'entrance',
    maxDensity: 0.15,
  },
  product_launch_stage: {
    primaryObjects: ['podium', 'screen'],
    optionalObjects: ['lighting_fixture', 'signage'],
    layout: 'center',
    facingDirection: 'entrance',
    maxDensity: 0.25,
  },
}

const DEFAULT_STRATEGY: ZoneStrategy = {
  primaryObjects: ['table', 'display_stand'],
  optionalObjects: ['planter', 'signage'],
  layout: 'freeform',
  facingDirection: 'none',
  maxDensity: 0.4,
}

export function getZoneStrategy(zoneType: ZoneType): ZoneStrategy {
  return STRATEGIES[zoneType] ?? DEFAULT_STRATEGY
}

export function getRecommendedObjects(zoneType: ZoneType): ObjectType[] {
  const strategy = getZoneStrategy(zoneType)
  return [...strategy.primaryObjects, ...strategy.optionalObjects]
}

export function getMaxObjectCount(zoneType: ZoneType, zoneArea: number, avgObjectArea: number): number {
  const strategy = getZoneStrategy(zoneType)
  if (avgObjectArea <= 0) return 0
  return Math.floor((zoneArea * strategy.maxDensity) / avgObjectArea)
}
