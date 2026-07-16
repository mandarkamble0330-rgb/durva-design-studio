import type { Vec3, BoundingBox } from '@/types/blueprint'

export interface PlacedObject {
  id: string
  position: Vec3
  dimensions: Vec3
  rotation: number
}

export function getObjectBounds(obj: PlacedObject): BoundingBox {
  const hw = obj.dimensions.x / 2
  const hd = obj.dimensions.z / 2

  if (Math.abs(obj.rotation % 180) > 45) {
    return {
      min: { x: obj.position.x - hd, y: 0, z: obj.position.z - hw },
      max: { x: obj.position.x + hd, y: obj.dimensions.y, z: obj.position.z + hw },
    }
  }

  return {
    min: { x: obj.position.x - hw, y: 0, z: obj.position.z - hd },
    max: { x: obj.position.x + hw, y: obj.dimensions.y, z: obj.position.z + hd },
  }
}

export function boundsOverlap(a: BoundingBox, b: BoundingBox, margin: number): boolean {
  return (
    a.min.x - margin < b.max.x &&
    a.max.x + margin > b.min.x &&
    a.min.z - margin < b.max.z &&
    a.max.z + margin > b.min.z
  )
}

export function isInsideZone(objBounds: BoundingBox, zoneBounds: BoundingBox, wallOffset: number): boolean {
  return (
    objBounds.min.x >= zoneBounds.min.x + wallOffset &&
    objBounds.max.x <= zoneBounds.max.x - wallOffset &&
    objBounds.min.z >= zoneBounds.min.z + wallOffset &&
    objBounds.max.z <= zoneBounds.max.z - wallOffset
  )
}

export function distanceToEntrance(position: Vec3, entrancePosition: Vec3): number {
  const dx = position.x - entrancePosition.x
  const dz = position.z - entrancePosition.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function checkCollisions(
  candidate: PlacedObject,
  existing: PlacedObject[],
  spacing: number
): boolean {
  const candidateBounds = getObjectBounds(candidate)

  for (const obj of existing) {
    const objBounds = getObjectBounds(obj)
    if (boundsOverlap(candidateBounds, objBounds, spacing)) {
      return true
    }
  }

  return false
}

export function findClearPosition(
  dimensions: Vec3,
  zoneBounds: BoundingBox,
  existing: PlacedObject[],
  spacing: number,
  wallOffset: number,
  gridStep: number
): Vec3 | null {
  const startX = zoneBounds.min.x + wallOffset + dimensions.x / 2
  const endX = zoneBounds.max.x - wallOffset - dimensions.x / 2
  const startZ = zoneBounds.min.z + wallOffset + dimensions.z / 2
  const endZ = zoneBounds.max.z - wallOffset - dimensions.z / 2

  if (startX > endX || startZ > endZ) return null

  for (let z = startZ; z <= endZ; z += gridStep) {
    for (let x = startX; x <= endX; x += gridStep) {
      const candidate: PlacedObject = {
        id: '_test',
        position: { x, y: 0, z },
        dimensions,
        rotation: 0,
      }

      if (!checkCollisions(candidate, existing, spacing)) {
        return { x, y: 0, z }
      }
    }
  }

  return null
}
