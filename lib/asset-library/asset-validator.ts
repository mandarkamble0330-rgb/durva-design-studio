import type { AssetDefinition, AssetCategory } from '@/types/asset-library'
import { ASSET_CATEGORIES } from '@/types/asset-library'

export interface AssetValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const VALID_CATEGORIES = new Set<string>(ASSET_CATEGORIES.map(c => c.id))

export function validateAsset(asset: AssetDefinition): AssetValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!asset.assetId?.trim()) errors.push('Missing assetId')
  if (!asset.displayName?.trim()) errors.push('Missing displayName')
  if (!asset.category) {
    errors.push('Missing category')
  } else if (!VALID_CATEGORIES.has(asset.category)) {
    errors.push(`Invalid category: "${asset.category}"`)
  }

  if (!asset.dimensions) {
    errors.push('Missing dimensions')
  } else {
    if (asset.dimensions.width <= 0) errors.push('Width must be > 0')
    if (asset.dimensions.height <= 0) errors.push('Height must be > 0')
    if (asset.dimensions.depth <= 0) errors.push('Depth must be > 0')
    if (asset.dimensions.width > 50) warnings.push(`Width ${asset.dimensions.width} is unusually large`)
    if (asset.dimensions.height > 20) warnings.push(`Height ${asset.dimensions.height} is unusually large`)
  }

  if (!asset.description?.trim()) warnings.push('Missing description')
  if (!asset.tags || asset.tags.length === 0) warnings.push('No tags defined')
  if (!asset.thumbnail) warnings.push('No thumbnail')

  if (asset.supportedMaterials) {
    const slotNames = new Set<string>()
    for (const slot of asset.supportedMaterials) {
      if (!slot.slotName?.trim()) errors.push('Material slot missing slotName')
      if (slotNames.has(slot.slotName)) errors.push(`Duplicate material slot: "${slot.slotName}"`)
      slotNames.add(slot.slotName)
    }
  }

  if (asset.metadata) {
    if (!asset.metadata.version) warnings.push('Missing metadata.version')
    if (asset.metadata.polyCount !== undefined && asset.metadata.polyCount < 0) {
      errors.push('polyCount cannot be negative')
    }
    if (asset.metadata.polyCount !== undefined && asset.metadata.polyCount > 500000) {
      warnings.push(`High poly count: ${asset.metadata.polyCount}`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateAssets(assets: AssetDefinition[]): {
  valid: AssetDefinition[]
  invalid: { asset: AssetDefinition; result: AssetValidationResult }[]
} {
  const valid: AssetDefinition[] = []
  const invalid: { asset: AssetDefinition; result: AssetValidationResult }[] = []

  for (const asset of assets) {
    const result = validateAsset(asset)
    if (result.valid) {
      valid.push(asset)
    } else {
      invalid.push({ asset, result })
    }
  }

  return { valid, invalid }
}
