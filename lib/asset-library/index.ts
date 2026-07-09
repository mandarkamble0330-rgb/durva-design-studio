export {
  registerAsset,
  registerAssets,
  getAsset,
  getAssetsByCategory,
  getAllAssets,
  getAssetCount,
  getCategoryCounts,
  removeAsset,
  clearRegistry,
} from './asset-registry'

export {
  loadAssetManifest,
  loadAssetManifestFromJSON,
  type LoadResult,
} from './asset-loader'

export {
  validateAsset,
  validateAssets,
  type AssetValidationResult,
} from './asset-validator'

export {
  searchAssets,
  findAssetsByTags,
  findAssetsForZone,
} from './asset-search'

export {
  getRecommendedFolderStructure,
  getCategoryFolder,
  getAssetBlendPath,
  getAssetThumbnailPath,
  getAssetPreviewPath,
  flattenFolderTree,
  type FolderNode,
} from './folder-structure'
