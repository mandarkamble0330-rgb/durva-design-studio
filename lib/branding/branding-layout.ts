import type { BoothBlueprint } from '@/types/blueprint'
import type { BrandingPlacement, BrandingSurface } from './branding-types'
import type { LogoPlacementRequest } from './logo-placement'
import { placeMultipleLogos } from './logo-placement'

function getAvailableSurfaces(blueprint: BoothBlueprint): BrandingSurface[] {
  const surfaces: BrandingSurface[] = []
  const openSides = new Set(blueprint.booth.dimensions.openSides)

  if (!openSides.has('rear')) surfaces.push('back_wall_graphic', 'rear_fascia')
  if (!openSides.has('left')) surfaces.push('left_fascia')
  if (!openSides.has('right')) surfaces.push('right_fascia')
  if (!openSides.has('front')) surfaces.push('front_fascia')

  if (openSides.has('front')) surfaces.push('front_fascia')

  const hasReception = blueprint.zones.some(z => z.type === 'reception')
  if (hasReception) surfaces.push('reception_counter')

  const hasDisplay = blueprint.zones.some(z => z.type === 'product_display')
  if (hasDisplay) surfaces.push('product_display_panel')

  const hasLed = blueprint.zones.some(z => z.type === 'led_screen')
  if (hasLed) surfaces.push('led_display_panel')

  return [...new Set(surfaces)]
}

export function generateBrandingLayout(blueprint: BoothBlueprint): BrandingPlacement[] {
  const logoUrl = blueprint.branding.logoUrl
  if (!logoUrl) return []

  const surfaces = getAvailableSurfaces(blueprint)
  const requests: LogoPlacementRequest[] = []

  const existingPlacements = blueprint.branding.logoPlacement ?? []
  for (const lp of existingPlacements) {
    const surface = mapSurfaceString(lp.surface)
    requests.push({
      logoId: `logo_${surface}`,
      logoUrl,
      surface,
      preferredWidth: lp.widthMeters,
      preferredHeight: lp.heightMeters,
      alignment: 'center',
      verticalAlignment: 'center',
      aspectRatio: lp.widthMeters / (lp.heightMeters || 1),
    })
  }

  const coveredSurfaces = new Set(requests.map(r => r.surface))

  const autoPriority: BrandingSurface[] = [
    'back_wall_graphic',
    'front_fascia',
    'rear_fascia',
    'left_fascia',
    'right_fascia',
  ]

  for (const surface of autoPriority) {
    if (coveredSurfaces.has(surface)) continue
    if (!surfaces.includes(surface)) continue

    requests.push({
      logoId: `logo_auto_${surface}`,
      logoUrl,
      surface,
      alignment: 'center',
      verticalAlignment: 'center',
      aspectRatio: 2.5,
    })
    coveredSurfaces.add(surface)
  }

  return placeMultipleLogos(requests, blueprint.booth.dimensions)
}

function mapSurfaceString(surface: string): BrandingSurface {
  const map: Record<string, BrandingSurface> = {
    front_wall: 'front_fascia',
    rear_wall: 'back_wall_graphic',
    back_wall: 'back_wall_graphic',
    left_wall: 'left_fascia',
    right_wall: 'right_fascia',
    front_fascia: 'front_fascia',
    rear_fascia: 'rear_fascia',
    left_fascia: 'left_fascia',
    right_fascia: 'right_fascia',
    reception: 'reception_counter',
    counter: 'reception_counter',
    display: 'product_display_panel',
    banner: 'hanging_banner',
    led: 'led_display_panel',
    kiosk: 'information_kiosk',
  }
  return map[surface.toLowerCase()] ?? 'back_wall_graphic'
}
