import type { AssetDefinition, AssetSearchQuery, AssetSearchResult } from '@/types/asset-library'
import { getAllAssets, getAssetsByCategory } from './asset-registry'

function matchesText(asset: AssetDefinition, text: string): number {
  const lower = text.toLowerCase()
  let score = 0

  if (asset.displayName.toLowerCase().includes(lower)) score += 10
  if (asset.description.toLowerCase().includes(lower)) score += 5
  if (asset.tags.some(t => t.toLowerCase().includes(lower))) score += 7
  if (asset.assetId.toLowerCase().includes(lower)) score += 3
  if (asset.category.toLowerCase().includes(lower)) score += 4

  if (asset.displayName.toLowerCase() === lower) score += 15
  if (asset.tags.some(t => t.toLowerCase() === lower)) score += 10

  return score
}

function matchesDimensions(asset: AssetDefinition, query: AssetSearchQuery): boolean {
  const d = asset.dimensions
  const factor = d.unit === 'centimeters' ? 0.01 : 1

  if (query.maxWidth !== undefined && d.width * factor > query.maxWidth) return false
  if (query.maxHeight !== undefined && d.height * factor > query.maxHeight) return false
  if (query.maxDepth !== undefined && d.depth * factor > query.maxDepth) return false

  return true
}

function matchesFlags(asset: AssetDefinition, query: AssetSearchQuery): boolean {
  if (query.wallMountable !== undefined && asset.metadata.wallMountable !== query.wallMountable) return false
  if (query.floorPlaced !== undefined && asset.metadata.floorPlaced !== query.floorPlaced) return false
  return true
}

function matchesTags(asset: AssetDefinition, tags: string[]): number {
  let matched = 0
  const assetTags = new Set(asset.tags.map(t => t.toLowerCase()))
  for (const tag of tags) {
    if (assetTags.has(tag.toLowerCase())) matched++
  }
  return matched
}

export function searchAssets(query: AssetSearchQuery): AssetSearchResult[] {
  const candidates = query.category
    ? getAssetsByCategory(query.category)
    : getAllAssets()

  const results: AssetSearchResult[] = []

  for (const asset of candidates) {
    if (!matchesDimensions(asset, query)) continue
    if (!matchesFlags(asset, query)) continue

    let score = 1

    if (query.text) {
      const textScore = matchesText(asset, query.text)
      if (textScore === 0) continue
      score += textScore
    }

    if (query.tags && query.tags.length > 0) {
      const tagScore = matchesTags(asset, query.tags)
      if (tagScore === 0 && !query.text) continue
      score += tagScore * 5
    }

    results.push({ asset, score })
  }

  results.sort((a, b) => b.score - a.score)
  return results
}

export function findAssetsByTags(tags: string[]): AssetDefinition[] {
  return searchAssets({ tags }).map(r => r.asset)
}

export function findAssetsForZone(zoneType: string): AssetSearchResult[] {
  const zoneTagMap: Record<string, string[]> = {
    reception: ['reception', 'counter', 'desk', 'welcome'],
    meeting_room: ['meeting', 'table', 'conference', 'presentation'],
    product_display: ['display', 'shelf', 'showcase', 'stand'],
    lounge: ['sofa', 'lounge', 'seating', 'coffee'],
    gaming: ['gaming', 'interactive', 'screen', 'controller'],
    storage: ['storage', 'cabinet', 'locker'],
    led_screen: ['led', 'screen', 'video', 'display'],
    interactive_screen: ['touchscreen', 'interactive', 'kiosk'],
    ar_vr: ['vr', 'ar', 'headset', 'immersive'],
    robotic_arm: ['robotic', 'automation', 'demo'],
    product_launch_stage: ['stage', 'podium', 'presentation', 'launch'],
  }

  const tags = zoneTagMap[zoneType] ?? [zoneType]
  return searchAssets({ tags })
}
