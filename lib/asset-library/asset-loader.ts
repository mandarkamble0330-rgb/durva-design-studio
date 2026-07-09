import type { AssetDefinition } from '@/types/asset-library'
import { validateAsset } from './asset-validator'
import { registerAssets } from './asset-registry'

export interface LoadResult {
  loaded: number
  skipped: number
  errors: { assetId: string; error: string }[]
}

export function loadAssetManifest(assets: AssetDefinition[]): LoadResult {
  const valid: AssetDefinition[] = []
  const errors: { assetId: string; error: string }[] = []

  for (const asset of assets) {
    const result = validateAsset(asset)
    if (result.valid) {
      valid.push(asset)
    } else {
      errors.push({
        assetId: asset.assetId ?? '(unknown)',
        error: result.errors.join('; '),
      })
    }
  }

  registerAssets(valid)

  console.log(`[AssetLoader] Loaded ${valid.length} assets, skipped ${errors.length}`)
  if (errors.length > 0) {
    console.warn('[AssetLoader] Skipped assets:', errors)
  }

  return {
    loaded: valid.length,
    skipped: errors.length,
    errors,
  }
}

export function loadAssetManifestFromJSON(json: string): LoadResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { loaded: 0, skipped: 0, errors: [{ assetId: '(parse)', error: 'Invalid JSON' }] }
  }

  if (!Array.isArray(parsed)) {
    return { loaded: 0, skipped: 0, errors: [{ assetId: '(format)', error: 'Expected JSON array' }] }
  }

  return loadAssetManifest(parsed as AssetDefinition[])
}
