import type { AssetDefinition, AssetCategory } from '@/types/asset-library'

const registry = new Map<string, AssetDefinition>()

export function registerAsset(asset: AssetDefinition): void {
  if (registry.has(asset.assetId)) {
    console.warn(`[AssetRegistry] Overwriting existing asset: ${asset.assetId}`)
  }
  registry.set(asset.assetId, asset)
}

export function registerAssets(assets: AssetDefinition[]): void {
  for (const asset of assets) {
    registerAsset(asset)
  }
}

export function getAsset(assetId: string): AssetDefinition | null {
  return registry.get(assetId) ?? null
}

export function getAssetsByCategory(category: AssetCategory): AssetDefinition[] {
  const results: AssetDefinition[] = []
  for (const asset of registry.values()) {
    if (asset.category === category) results.push(asset)
  }
  return results
}

export function getAllAssets(): AssetDefinition[] {
  return Array.from(registry.values())
}

export function getAssetCount(): number {
  return registry.size
}

export function getCategoryCounts(): Record<AssetCategory, number> {
  const counts = {} as Record<AssetCategory, number>
  for (const asset of registry.values()) {
    counts[asset.category] = (counts[asset.category] ?? 0) + 1
  }
  return counts
}

export function removeAsset(assetId: string): boolean {
  return registry.delete(assetId)
}

export function clearRegistry(): void {
  registry.clear()
}
