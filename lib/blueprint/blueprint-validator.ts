import type { BoothBlueprint } from '@/types/blueprint'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateBlueprint(bp: BoothBlueprint): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!bp.version) errors.push('Missing blueprint version')
  if (!bp.id) errors.push('Missing blueprint id')
  if (!bp.projectId) errors.push('Missing projectId')

  const { dimensions } = bp.booth
  if (dimensions.width <= 0) errors.push('Booth width must be > 0')
  if (dimensions.depth <= 0) errors.push('Booth depth must be > 0')
  if (dimensions.height <= 0) errors.push('Booth height must be > 0')
  if (dimensions.height > 12) warnings.push(`Booth height ${dimensions.height}m exceeds typical exhibition limit`)

  const area = dimensions.width * dimensions.depth
  if (area > 500) warnings.push(`Booth area ${area} sqm is unusually large`)

  if (!bp.branding.companyName) warnings.push('No company name in branding')

  const zoneIds = new Set<string>()
  for (const zone of bp.zones) {
    if (zoneIds.has(zone.id)) errors.push(`Duplicate zone id: ${zone.id}`)
    zoneIds.add(zone.id)
    if (zone.floorArea <= 0) warnings.push(`Zone "${zone.label}" has zero floor area`)
  }

  const matIds = new Set<string>()
  for (const mat of bp.materials) {
    if (matIds.has(mat.id)) errors.push(`Duplicate material id: ${mat.id}`)
    matIds.add(mat.id)
    if (mat.roughness < 0 || mat.roughness > 1) errors.push(`Material "${mat.name}" roughness out of range [0,1]`)
    if (mat.metalness < 0 || mat.metalness > 1) errors.push(`Material "${mat.name}" metalness out of range [0,1]`)
    if (mat.opacity < 0 || mat.opacity > 1) errors.push(`Material "${mat.name}" opacity out of range [0,1]`)
  }

  for (const obj of bp.objects) {
    if (obj.zoneId && !zoneIds.has(obj.zoneId)) {
      warnings.push(`Object "${obj.label}" references unknown zone: ${obj.zoneId}`)
    }
    if (obj.materialId && !matIds.has(obj.materialId)) {
      warnings.push(`Object "${obj.label}" references unknown material: ${obj.materialId}`)
    }
  }

  if (bp.lights.length === 0) warnings.push('No lights defined')
  if (bp.cameras.length === 0) errors.push('At least one camera is required')

  return { valid: errors.length === 0, errors, warnings }
}
