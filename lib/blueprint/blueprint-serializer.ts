import type { BoothBlueprint } from '@/types/blueprint'

export function serializeBlueprint(bp: BoothBlueprint): string {
  return JSON.stringify(bp, null, 2)
}

export function deserializeBlueprint(json: string): BoothBlueprint {
  const parsed = JSON.parse(json) as BoothBlueprint
  if (!parsed.version || !parsed.id || !parsed.projectId) {
    throw new Error('Invalid blueprint: missing required fields (version, id, projectId)')
  }
  return parsed
}
