import type { ZoneDefinition, ObjectDefinition, BoothDimensions, BoothSide } from '@/types/blueprint'
import type { Vec3 } from '@/types/blueprint'
import { getSpacingRule } from './spacing-rules'
import { findClearPosition, type PlacedObject } from './collision-detector'

export interface ZonePlacementPlan {
  zoneId: string
  objects: PlacedObjectResult[]
  unplacedObjects: string[]
}

export interface PlacedObjectResult {
  objectId: string
  objectType: string
  position: Vec3
  rotation: number
  dimensions: Vec3
  zoneId: string
}

function getEntrancePositions(dimensions: BoothDimensions): Vec3[] {
  const positions: Vec3[] = []
  const hw = dimensions.width / 2
  const hd = dimensions.depth / 2

  for (const side of dimensions.openSides) {
    switch (side) {
      case 'front': positions.push({ x: 0, y: 0, z: hd }); break
      case 'rear': positions.push({ x: 0, y: 0, z: -hd }); break
      case 'left': positions.push({ x: -hw, y: 0, z: 0 }); break
      case 'right': positions.push({ x: hw, y: 0, z: 0 }); break
    }
  }

  return positions
}

function isNearEntrance(position: Vec3, entrances: Vec3[], clearance: number): boolean {
  for (const entrance of entrances) {
    const dx = position.x - entrance.x
    const dz = position.z - entrance.z
    if (Math.sqrt(dx * dx + dz * dz) < clearance) return true
  }
  return false
}

export function solveZonePlacements(
  zone: ZoneDefinition,
  objects: ObjectDefinition[],
  boothDimensions: BoothDimensions,
  existingPlacements: PlacedObject[]
): ZonePlacementPlan {
  const rule = getSpacingRule(zone.type)
  const entrances = getEntrancePositions(boothDimensions)
  const placed: PlacedObjectResult[] = []
  const unplaced: string[] = []
  const currentPlacements = [...existingPlacements]

  const sorted = [...objects].sort((a, b) => {
    const areaA = a.dimensions.x * a.dimensions.z
    const areaB = b.dimensions.x * b.dimensions.z
    return areaB - areaA
  })

  for (const obj of sorted) {
    const gridStep = Math.min(obj.dimensions.x, obj.dimensions.z, 0.3)

    const position = findClearPosition(
      obj.dimensions,
      zone.bounds,
      currentPlacements,
      rule.objectSpacing,
      rule.wallOffset,
      gridStep
    )

    if (!position) {
      unplaced.push(obj.id)
      continue
    }

    if (isNearEntrance(position, entrances, rule.entranceClearance)) {
      const retryPosition = findClearPositionAvoidingEntrance(
        obj.dimensions,
        zone.bounds,
        currentPlacements,
        rule.objectSpacing,
        rule.wallOffset,
        gridStep,
        entrances,
        rule.entranceClearance
      )

      if (retryPosition) {
        pushPlacement(retryPosition, obj, zone, placed, currentPlacements)
      } else {
        pushPlacement(position, obj, zone, placed, currentPlacements)
      }
    } else {
      pushPlacement(position, obj, zone, placed, currentPlacements)
    }
  }

  return { zoneId: zone.id, objects: placed, unplacedObjects: unplaced }
}

function pushPlacement(
  position: Vec3,
  obj: ObjectDefinition,
  zone: ZoneDefinition,
  placed: PlacedObjectResult[],
  currentPlacements: PlacedObject[]
): void {
  placed.push({
    objectId: obj.id,
    objectType: obj.type,
    position,
    rotation: 0,
    dimensions: obj.dimensions,
    zoneId: zone.id,
  })

  currentPlacements.push({
    id: obj.id,
    position,
    dimensions: obj.dimensions,
    rotation: 0,
  })
}

function findClearPositionAvoidingEntrance(
  dimensions: Vec3,
  zoneBounds: { min: Vec3; max: Vec3 },
  existing: PlacedObject[],
  spacing: number,
  wallOffset: number,
  gridStep: number,
  entrances: Vec3[],
  entranceClearance: number
): Vec3 | null {
  const startX = zoneBounds.min.x + wallOffset + dimensions.x / 2
  const endX = zoneBounds.max.x - wallOffset - dimensions.x / 2
  const startZ = zoneBounds.min.z + wallOffset + dimensions.z / 2
  const endZ = zoneBounds.max.z - wallOffset - dimensions.z / 2

  if (startX > endX || startZ > endZ) return null

  const { checkCollisions } = require('./collision-detector')

  for (let z = startZ; z <= endZ; z += gridStep) {
    for (let x = startX; x <= endX; x += gridStep) {
      const pos: Vec3 = { x, y: 0, z }

      if (isNearEntrance(pos, entrances, entranceClearance)) continue

      const candidate: PlacedObject = {
        id: '_test',
        position: pos,
        dimensions,
        rotation: 0,
      }

      if (!checkCollisions(candidate, existing, spacing)) {
        return pos
      }
    }
  }

  return null
}
