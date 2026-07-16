import type { ZoneType, ObjectType } from '@/types/blueprint'

export interface SpacingRule {
  minClearance: number
  wallOffset: number
  entranceClearance: number
  objectSpacing: number
}

const DEFAULT_RULE: SpacingRule = {
  minClearance: 0.6,
  wallOffset: 0.15,
  entranceClearance: 1.2,
  objectSpacing: 0.4,
}

const ZONE_RULES: Partial<Record<ZoneType, Partial<SpacingRule>>> = {
  reception: { minClearance: 1.0, entranceClearance: 1.5 },
  meeting_room: { minClearance: 0.8, objectSpacing: 0.3 },
  product_display: { minClearance: 0.8, objectSpacing: 0.5 },
  lounge: { minClearance: 0.9, objectSpacing: 0.3 },
  storage: { minClearance: 0.4, wallOffset: 0.05, objectSpacing: 0.1 },
  led_screen: { minClearance: 1.5 },
  interactive_screen: { minClearance: 1.2 },
  ar_vr: { minClearance: 2.0, objectSpacing: 1.0 },
  product_launch_stage: { minClearance: 1.5 },
}

const OBJECT_MIN_SPACING: Partial<Record<ObjectType, number>> = {
  chair: 0.15,
  sofa: 0.3,
  table: 0.5,
  counter: 0.6,
  shelf: 0.1,
  display_stand: 0.5,
  screen: 0.8,
  kiosk: 0.6,
  podium: 1.0,
  planter: 0.2,
}

export function getSpacingRule(zoneType: ZoneType): SpacingRule {
  const override = ZONE_RULES[zoneType] ?? {}
  return { ...DEFAULT_RULE, ...override }
}

export function getObjectMinSpacing(objectType: ObjectType): number {
  return OBJECT_MIN_SPACING[objectType] ?? DEFAULT_RULE.objectSpacing
}

export function getWalkingClearance(zoneType: ZoneType): number {
  return getSpacingRule(zoneType).minClearance
}
