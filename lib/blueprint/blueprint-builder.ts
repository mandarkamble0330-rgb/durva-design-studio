import type { Project } from '@/types'
import type {
  BoothBlueprint,
  BoothType,
  BoothDimensions,
  BrandingSpec,
  ZoneDefinition,
  ZoneType,
  MaterialDefinition,
  LightDefinition,
  LightType,
  FlooringSpec,
  BlueprintCamera,
} from '@/types/blueprint'
import type { CameraViewId } from '@/types/camera'
import { getAllCameraViews } from '@/lib/camera'
import {
  DEFAULT_BOOTH_HEIGHT,
  DEFAULT_FLOORING,
  DEFAULT_MATERIALS,
  DEFAULT_AMBIENT_LIGHT,
  DEFAULT_KEY_LIGHT,
  BOOTH_TYPE_OPEN_SIDES,
} from './defaults'

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function parseBoothSize(sizeStr: string): { width: number; depth: number; height: number } {
  const customMatch = sizeStr.match(/Custom:\s*([\d.]+)\s*x\s*([\d.]+)(?:\s*x\s*([\d.]+))?/)
  if (customMatch) {
    return {
      width: parseFloat(customMatch[1]),
      depth: parseFloat(customMatch[2]),
      height: customMatch[3] ? parseFloat(customMatch[3]) : DEFAULT_BOOTH_HEIGHT,
    }
  }

  const presetMatch = sizeStr.match(/(\d+)\s*x\s*(\d+)/)
  if (presetMatch) {
    return {
      width: parseInt(presetMatch[1], 10),
      depth: parseInt(presetMatch[2], 10),
      height: DEFAULT_BOOTH_HEIGHT,
    }
  }

  return { width: 3, depth: 3, height: DEFAULT_BOOTH_HEIGHT }
}

function inferBoothType(entryPoints: number): BoothType {
  if (entryPoints >= 4) return 'island'
  if (entryPoints === 3) return 'peninsula'
  if (entryPoints === 2) return 'corner'
  return 'inline'
}

function buildDimensions(project: Project, boothType: BoothType): BoothDimensions {
  const parsed = parseBoothSize(project.booth_size)
  return {
    width: parsed.width,
    depth: parsed.depth,
    height: parsed.height,
    unit: 'meters',
    openSides: BOOTH_TYPE_OPEN_SIDES[boothType],
  }
}

function buildBranding(project: Project): BrandingSpec {
  return {
    companyName: project.company_name || project.project_name,
    logoUrl: project.logo_url,
    primaryColor: project.primary_color || '#000000',
    secondaryColor: project.secondary_color || '#ffffff',
    logoPlacement: project.logo_url
      ? [{
          surface: 'fascia_front',
          position: { x: 0, y: 3.5, z: 0 },
          widthMeters: 2,
          heightMeters: 0.8,
        }]
      : [],
  }
}

const ZONE_TYPE_MAP: Record<string, ZoneType> = {
  'Reception': 'reception',
  'Meeting Room': 'meeting_room',
  'Product Display Area': 'product_display',
  'Lounge Area': 'lounge',
  'Gaming Zone': 'gaming',
  'Storage Area': 'storage',
  'LED Screen Area': 'led_screen',
  'Interactive Screens': 'interactive_screen',
  'AR/VR': 'ar_vr',
  'Robotic Arm': 'robotic_arm',
  'Product Launch Stage': 'product_launch_stage',
}

function buildZones(project: Project, dims: BoothDimensions): ZoneDefinition[] {
  const zones = project.zones ?? []
  const count = zones.length || 1
  const sliceWidth = dims.width / count

  return zones.map((zoneName, i): ZoneDefinition => {
    const zoneType = ZONE_TYPE_MAP[zoneName] ?? 'custom'
    const xStart = -dims.width / 2 + i * sliceWidth
    return {
      id: generateId('zone'),
      type: zoneType,
      label: zoneName,
      bounds: {
        min: { x: xStart, y: 0, z: -dims.depth / 2 },
        max: { x: xStart + sliceWidth, y: dims.height, z: dims.depth / 2 },
      },
      floorArea: sliceWidth * dims.depth,
      priority: i,
      metadata: {},
    }
  })
}

function buildFlooring(project: Project): FlooringSpec {
  if (!project.flooring_type) return DEFAULT_FLOORING
  const flooringType = project.flooring_type.toLowerCase()
  const raised = flooringType.includes('raised') || flooringType.includes('platform')
  return {
    materialId: `mat_floor_${flooringType.replace(/\s+/g, '_')}`,
    type: project.flooring_type,
    raised,
    raisedHeight: raised ? 0.15 : undefined,
  }
}

const LIGHTING_TYPE_MAP: Record<string, LightType> = {
  'Spotlights': 'spotlight',
  'LED Strips': 'led_strip',
  'Backlit Panels': 'backlit_panel',
  'Ambient Lighting': 'ambient',
  'Neon Accents': 'neon',
  'Projection Mapping': 'projection',
  'Natural Daylight Simulation': 'directional',
}

function buildLights(project: Project, dims: BoothDimensions): LightDefinition[] {
  const lights: LightDefinition[] = [DEFAULT_AMBIENT_LIGHT, DEFAULT_KEY_LIGHT]
  const prefs = project.lighting_preferences ?? []

  prefs.forEach((pref, i) => {
    const lightType = LIGHTING_TYPE_MAP[pref] ?? 'point'
    lights.push({
      id: generateId('light'),
      type: lightType,
      position: {
        x: (i - prefs.length / 2) * (dims.width / prefs.length),
        y: dims.height - 0.5,
        z: 0,
      },
      color: '#ffffff',
      intensity: 0.8,
      castShadow: lightType === 'spotlight',
      target: lightType === 'spotlight' ? { x: 0, y: 0, z: 0 } : undefined,
      angle: lightType === 'spotlight' ? 45 : undefined,
      metadata: { source: pref },
    })
  })

  return lights
}

function buildCameras(): BlueprintCamera[] {
  return getAllCameraViews().map((view): BlueprintCamera => ({
    viewId: view.id,
    position: view.position,
    rotation: view.rotation,
    fov: view.fov,
    near: 0.1,
    far: 100,
  }))
}

function buildMaterials(project: Project): MaterialDefinition[] {
  const mats = [...DEFAULT_MATERIALS]

  if (project.primary_color) {
    mats.push({
      id: 'mat_brand_primary',
      name: 'Brand Primary',
      type: 'laminate',
      color: project.primary_color,
      roughness: 0.3,
      metalness: 0,
      opacity: 1,
    })
  }

  if (project.secondary_color) {
    mats.push({
      id: 'mat_brand_secondary',
      name: 'Brand Secondary',
      type: 'laminate',
      color: project.secondary_color,
      roughness: 0.3,
      metalness: 0,
      opacity: 1,
    })
  }

  return mats
}

export function buildBlueprint(project: Project): BoothBlueprint {
  const boothType = inferBoothType(project.entry_exit_points ?? 1)
  const dimensions = buildDimensions(project, boothType)
  const now = new Date().toISOString()

  return {
    version: '1.0.0',
    id: generateId('bp'),
    projectId: project.id,
    createdAt: now,
    updatedAt: now,

    booth: {
      type: boothType,
      dimensions,
      flooring: buildFlooring(project),
    },

    branding: buildBranding(project),
    zones: buildZones(project, dimensions),
    objects: [],
    materials: buildMaterials(project),
    lights: buildLights(project, dimensions),
    cameras: buildCameras(),

    metadata: {
      designTheme: project.design_theme || '',
      industryType: project.industry_type || '',
      generatedFrom: 'ai',
      sourceProjectName: project.project_name,
    },
  }
}
