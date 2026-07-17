import type { LightPlacement } from './lighting-types'

export interface LightingValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    totalLights: number
    byType: Record<string, number>
    byCategory: Record<string, number>
  }
}

export function validateLightPlacements(placements: LightPlacement[]): LightingValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const ids = new Set<string>()
  for (const p of placements) {
    if (ids.has(p.lightId)) {
      errors.push(`Duplicate lightId: "${p.lightId}"`)
    }
    ids.add(p.lightId)
  }

  for (const p of placements) {
    if (typeof p.intensity !== 'number' || !isFinite(p.intensity)) {
      errors.push(`Light "${p.lightId}" has invalid intensity: ${p.intensity}`)
    } else if (p.intensity < 0) {
      errors.push(`Light "${p.lightId}" has negative intensity: ${p.intensity}`)
    } else if (p.intensity === 0) {
      warnings.push(`Light "${p.lightId}" has zero intensity`)
    } else if (p.intensity > 10000) {
      warnings.push(`Light "${p.lightId}" has very high intensity: ${p.intensity}`)
    }
  }

  for (const p of placements) {
    if (!p.color || !/^#[0-9a-fA-F]{6}$/.test(p.color)) {
      errors.push(`Light "${p.lightId}" has invalid color: "${p.color}"`)
    }
  }

  for (const p of placements) {
    if (p.temperature < 1000 || p.temperature > 12000) {
      warnings.push(`Light "${p.lightId}" has unusual temperature: ${p.temperature}K`)
    }
  }

  for (const p of placements) {
    if (p.type === 'spot' && (p.angle <= 0 || p.angle > 180)) {
      errors.push(`Spot light "${p.lightId}" has invalid angle: ${p.angle}`)
    }
  }

  for (const p of placements) {
    const pos = p.position
    if (!pos || typeof pos.x !== 'number' || !isFinite(pos.x) ||
        typeof pos.y !== 'number' || !isFinite(pos.y) ||
        typeof pos.z !== 'number' || !isFinite(pos.z)) {
      errors.push(`Light "${p.lightId}" has invalid position`)
    }
  }

  for (const p of placements) {
    if (p.type === 'area' && (p.areaWidth <= 0 || p.areaHeight <= 0)) {
      errors.push(`Area light "${p.lightId}" has invalid dimensions: ${p.areaWidth}x${p.areaHeight}`)
    }
  }

  const byType: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  for (const p of placements) {
    byType[p.type] = (byType[p.type] ?? 0) + 1
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalLights: placements.length,
      byType,
      byCategory,
    },
  }
}
