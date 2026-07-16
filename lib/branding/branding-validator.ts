import type { BrandingPlacement } from './branding-types'

export interface BrandingValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    totalPlacements: number
    surfaces: number
    visibleLogos: number
    hiddenLogos: number
  }
}

export function validateBrandingPlacements(placements: BrandingPlacement[]): BrandingValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const brandingIds = new Set<string>()
  for (const p of placements) {
    if (brandingIds.has(p.brandingId)) {
      errors.push(`Duplicate brandingId: "${p.brandingId}"`)
    }
    brandingIds.add(p.brandingId)
  }

  for (const p of placements) {
    if (!p.logoUrl || p.logoUrl.trim() === '') {
      errors.push(`Placement "${p.brandingId}" has missing logo URL`)
    }
  }

  for (const p of placements) {
    if (p.width <= 0 || p.height <= 0) {
      errors.push(`Placement "${p.brandingId}" has invalid dimensions: ${p.width}x${p.height}`)
    }
    if (p.width > 20 || p.height > 20) {
      warnings.push(`Placement "${p.brandingId}" is very large: ${p.width.toFixed(2)}x${p.height.toFixed(2)}m`)
    }
  }

  for (const p of placements) {
    if (p.aspectRatio <= 0 || !isFinite(p.aspectRatio)) {
      errors.push(`Placement "${p.brandingId}" has invalid aspect ratio: ${p.aspectRatio}`)
    }
  }

  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i]
      const b = placements[j]
      if (a.surface !== b.surface) continue
      if (a.layer !== b.layer) continue

      const overlapX = Math.abs(a.position.x - b.position.x) < (a.width + b.width) / 2
      const overlapY = Math.abs(a.position.y - b.position.y) < (a.height + b.height) / 2
      const overlapZ = Math.abs(a.position.z - b.position.z) < 0.1

      if (overlapX && overlapY && overlapZ) {
        warnings.push(`Possible overlap: "${a.brandingId}" and "${b.brandingId}" on surface "${a.surface}"`)
      }
    }
  }

  for (const p of placements) {
    if (p.opacity < 0 || p.opacity > 1) {
      errors.push(`Placement "${p.brandingId}" has invalid opacity: ${p.opacity}`)
    }
  }

  const surfaces = new Set(placements.map(p => p.surface))
  const visibleLogos = placements.filter(p => p.visible).length
  const hiddenLogos = placements.filter(p => !p.visible).length

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalPlacements: placements.length,
      surfaces: surfaces.size,
      visibleLogos,
      hiddenLogos,
    },
  }
}
