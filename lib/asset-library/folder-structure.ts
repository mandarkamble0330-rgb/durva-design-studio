import type { AssetCategory } from '@/types/asset-library'

export interface FolderNode {
  path: string
  description: string
  children?: FolderNode[]
}

const CATEGORY_FOLDERS: Record<AssetCategory, string> = {
  walls: 'walls',
  reception: 'reception',
  led_walls: 'led-walls',
  tvs: 'tvs',
  furniture: 'furniture',
  meeting_room: 'meeting-room',
  storage: 'storage',
  hanging_ring: 'hanging-ring',
  flooring: 'flooring',
  ceiling: 'ceiling',
  plants: 'plants',
  lighting: 'lighting',
  logos: 'logos',
}

export function getRecommendedFolderStructure(): FolderNode {
  const categoryChildren: FolderNode[] = Object.entries(CATEGORY_FOLDERS).map(
    ([category, folder]) => ({
      path: `assets/${folder}`,
      description: `${category} assets`,
      children: [
        { path: `assets/${folder}/blend`, description: 'Blender .blend source files' },
        { path: `assets/${folder}/thumbnails`, description: '256x256 PNG thumbnails' },
        { path: `assets/${folder}/previews`, description: '1024x768 preview renders' },
      ],
    })
  )

  return {
    path: 'assets',
    description: 'Root asset library directory',
    children: [
      ...categoryChildren,
      {
        path: 'assets/shared',
        description: 'Shared resources across categories',
        children: [
          { path: 'assets/shared/materials', description: 'Reusable Blender material .blend files' },
          { path: 'assets/shared/textures', description: 'Texture maps (diffuse, normal, roughness)' },
          { path: 'assets/shared/hdri', description: 'HDRI environment maps for lighting' },
        ],
      },
      { path: 'assets/manifest.json', description: 'Asset manifest loaded by the registry' },
    ],
  }
}

export function getCategoryFolder(category: AssetCategory): string {
  return CATEGORY_FOLDERS[category]
}

export function getAssetBlendPath(category: AssetCategory, assetId: string): string {
  return `assets/${CATEGORY_FOLDERS[category]}/blend/${assetId}.blend`
}

export function getAssetThumbnailPath(category: AssetCategory, assetId: string): string {
  return `assets/${CATEGORY_FOLDERS[category]}/thumbnails/${assetId}.png`
}

export function getAssetPreviewPath(category: AssetCategory, assetId: string): string {
  return `assets/${CATEGORY_FOLDERS[category]}/previews/${assetId}.png`
}

export function flattenFolderTree(node: FolderNode): string[] {
  const paths = [node.path]
  if (node.children) {
    for (const child of node.children) {
      paths.push(...flattenFolderTree(child))
    }
  }
  return paths
}
