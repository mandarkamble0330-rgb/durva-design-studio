import type { OutputStructure } from './orchestrator-types'
import type { RenderFileFormat } from '@/lib/render/render-types'

export function buildOutputStructure(outputDir: string): OutputStructure {
  const path = require('path')
  return {
    root: outputDir,
    rendersDir: path.join(outputDir, 'renders'),
    thumbnailsDir: path.join(outputDir, 'thumbnails'),
    manifestPath: path.join(outputDir, 'render-manifest.json'),
  }
}

export function ensureOutputDirs(structure: OutputStructure): void {
  const fs = require('fs')
  fs.mkdirSync(structure.rendersDir, { recursive: true })
  fs.mkdirSync(structure.thumbnailsDir, { recursive: true })
}

export function buildOutputFilename(
  viewId: string,
  preset: string,
  format: RenderFileFormat
): string {
  const ext = formatToExtension(format)
  return `${viewId}_${preset}.${ext}`
}

export function buildThumbnailFilename(viewId: string, preset: string): string {
  return `${viewId}_${preset}_thumb.png`
}

export function buildOutputPath(
  structure: OutputStructure,
  viewId: string,
  preset: string,
  format: RenderFileFormat
): string {
  const path = require('path')
  return path.join(structure.rendersDir, buildOutputFilename(viewId, preset, format))
}

export function buildThumbnailPath(
  structure: OutputStructure,
  viewId: string,
  preset: string
): string {
  const path = require('path')
  return path.join(structure.thumbnailsDir, buildThumbnailFilename(viewId, preset))
}

function formatToExtension(format: RenderFileFormat): string {
  switch (format) {
    case 'PNG': return 'png'
    case 'JPEG': return 'jpg'
    case 'OPEN_EXR': return 'exr'
  }
}

export function getFileSizeBytes(filePath: string): number | null {
  const fs = require('fs')
  try {
    return fs.statSync(filePath).size
  } catch {
    return null
  }
}

export function generateThumbnailScript(
  inputPath: string,
  outputPath: string,
  scale: number
): string {
  const pyStr = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

  return [
    'import bpy',
    'import sys',
    '',
    'bpy.context.preferences.filepaths.image_editor = ""',
    '',
    `img = bpy.data.images.load(${pyStr(inputPath)})`,
    `orig_w, orig_h = img.size`,
    `new_w = max(1, int(orig_w * ${scale}))`,
    `new_h = max(1, int(orig_h * ${scale}))`,
    `img.scale(new_w, new_h)`,
    '',
    `img.filepath_raw = ${pyStr(outputPath)}`,
    `img.file_format = 'PNG'`,
    `img.save()`,
    '',
    `print(f"THUMBNAIL_COMPLETE:{new_w}x{new_h}")`,
    `sys.exit(0)`,
  ].join('\n')
}
