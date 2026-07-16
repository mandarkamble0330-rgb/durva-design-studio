import type { BrandingSpec } from '@/types/blueprint'
import type { PBRMaterialPreset } from './material-presets'

export interface BrandMaterialSet {
  primary: PBRMaterialPreset & { name: string; materialId: string }
  secondary: PBRMaterialPreset & { name: string; materialId: string }
  accent: PBRMaterialPreset & { name: string; materialId: string }
}

function hexToNormalized(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ]
}

function luminance(hex: string): number {
  const [r, g, b] = hexToNormalized(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function brandPreset(color: string): PBRMaterialPreset {
  const lum = luminance(color)
  return {
    baseColor: color,
    roughness: lum > 0.5 ? 0.35 : 0.45,
    metallic: 0,
    opacity: 1,
    transmission: 0,
    emission: 0,
    emissionColor: '#000000',
    normalMapStrength: 0,
    uvScale: [1, 1],
    uvRotation: 0,
    textureSlots: {
      baseColor: null,
      roughness: null,
      metallic: null,
      normal: null,
      emission: null,
      opacity: null,
    },
  }
}

export function generateBrandMaterials(branding: BrandingSpec): BrandMaterialSet {
  const accentColor = branding.accentColor ?? deriveAccent(branding.primaryColor, branding.secondaryColor)

  return {
    primary: {
      ...brandPreset(branding.primaryColor),
      name: `Brand_Primary_${branding.companyName.replace(/\s+/g, '_')}`,
      materialId: 'brand_primary',
    },
    secondary: {
      ...brandPreset(branding.secondaryColor),
      name: `Brand_Secondary_${branding.companyName.replace(/\s+/g, '_')}`,
      materialId: 'brand_secondary',
    },
    accent: {
      ...brandPreset(accentColor),
      name: `Brand_Accent_${branding.companyName.replace(/\s+/g, '_')}`,
      materialId: 'brand_accent',
    },
  }
}

function deriveAccent(primary: string, secondary: string): string {
  const [pr, pg, pb] = hexToNormalized(primary)
  const [sr, sg, sb] = hexToNormalized(secondary)
  const r = Math.round(((pr + sr) / 2) * 255)
  const g = Math.round(((pg + sg) / 2) * 255)
  const b = Math.round(((pb + sb) / 2) * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
