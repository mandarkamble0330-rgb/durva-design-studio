import type { ZoneDefinition } from '@/types/blueprint'
import { getObjectBounds, boundsOverlap, isInsideZone, type PlacedObject } from './collision-detector'
import { getSpacingRule } from './spacing-rules'
import type { ZonePlacementPlan } from './zone-solver'

export interface LayoutValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    totalPlaced: number
    totalUnplaced: number
    zonesUsed: number
    collisions: number
    outOfBounds: number
  }
}

export function validateLayout(
  plans: ZonePlacementPlan[],
  zones: ZoneDefinition[]
): LayoutValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let totalPlaced = 0
  let totalUnplaced = 0
  let collisions = 0
  let outOfBounds = 0

  const zoneMap = new Map(zones.map(z => [z.id, z]))
  const allPlaced: PlacedObject[] = []

  for (const plan of plans) {
    const zone = zoneMap.get(plan.zoneId)
    if (!zone) {
      errors.push(`Zone "${plan.zoneId}" not found in blueprint`)
      continue
    }

    const rule = getSpacingRule(zone.type)
    totalPlaced += plan.objects.length
    totalUnplaced += plan.unplacedObjects.length

    if (plan.unplacedObjects.length > 0) {
      warnings.push(`Zone "${zone.label}": ${plan.unplacedObjects.length} object(s) could not be placed`)
    }

    for (const obj of plan.objects) {
      const placed: PlacedObject = {
        id: obj.objectId,
        position: obj.position,
        dimensions: obj.dimensions,
        rotation: obj.rotation,
      }

      const objBounds = getObjectBounds(placed)
      if (!isInsideZone(objBounds, zone.bounds, rule.wallOffset)) {
        errors.push(`Object "${obj.objectId}" extends outside zone "${zone.label}"`)
        outOfBounds++
      }

      for (const other of allPlaced) {
        const otherBounds = getObjectBounds(other)
        if (boundsOverlap(objBounds, otherBounds, rule.objectSpacing)) {
          errors.push(`Collision: "${obj.objectId}" overlaps with "${other.id}"`)
          collisions++
        }
      }

      allPlaced.push(placed)
    }

    const zoneArea = zone.floorArea
    const usedArea = plan.objects.reduce((sum, o) => sum + o.dimensions.x * o.dimensions.z, 0)
    const density = zoneArea > 0 ? usedArea / zoneArea : 0

    if (density > 0.8) {
      warnings.push(`Zone "${zone.label}" is very dense (${(density * 100).toFixed(0)}% floor coverage)`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalPlaced,
      totalUnplaced,
      zonesUsed: plans.length,
      collisions,
      outOfBounds,
    },
  }
}
