import type { BlenderScene, BlenderValidationResult } from '@/types/blender'

function checkMissingObjects(scene: BlenderScene, errors: string[], warnings: string[]): void {
  if (scene.objects.length === 0) {
    errors.push('Blender scene has no objects')
  }

  const meshObjects = scene.objects.filter(o => o.type === 'MESH')
  if (meshObjects.length === 0) {
    warnings.push('Blender scene has no mesh objects')
  }

  for (const obj of meshObjects) {
    if (obj.meshData && obj.meshData.vertices.length === 0) {
      errors.push(`Mesh object "${obj.name}" has no vertices`)
    }
    if (obj.meshData && obj.meshData.faces.length === 0) {
      errors.push(`Mesh object "${obj.name}" has no faces`)
    }
  }
}

function checkMissingMaterials(scene: BlenderScene, errors: string[], warnings: string[]): void {
  const materialNames = new Set(scene.materials.map(m => m.name))

  for (const obj of scene.objects) {
    if (obj.materialName && !materialNames.has(obj.materialName)) {
      warnings.push(`Object "${obj.name}" references material "${obj.materialName}" which is not in the scene`)
    }
  }

  if (scene.materials.length === 0) {
    warnings.push('Blender scene has no materials')
  }

  for (const mat of scene.materials) {
    if (mat.color.some(c => c < 0 || c > 1)) {
      errors.push(`Material "${mat.name}" has color values outside [0,1]`)
    }
  }
}

function checkHierarchy(scene: BlenderScene, errors: string[]): void {
  const objectNames = new Set(scene.objects.map(o => o.name))
  const collectionNames = new Set(scene.collections.map(c => c.name))

  for (const obj of scene.objects) {
    if (obj.parentName && !objectNames.has(obj.parentName)) {
      errors.push(`Object "${obj.name}" references parent "${obj.parentName}" which does not exist`)
    }
    if (!collectionNames.has(obj.collectionName)) {
      errors.push(`Object "${obj.name}" references collection "${obj.collectionName}" which does not exist`)
    }
  }

  for (const col of scene.collections) {
    if (col.parentName && !collectionNames.has(col.parentName)) {
      errors.push(`Collection "${col.name}" references parent "${col.parentName}" which does not exist`)
    }
  }

  const visited = new Set<string>()
  for (const obj of scene.objects) {
    const chain = new Set<string>()
    let current: string | null = obj.name
    while (current) {
      if (chain.has(current)) {
        errors.push(`Circular parent chain detected involving object "${obj.name}"`)
        break
      }
      if (visited.has(current)) break
      chain.add(current)
      const parent = scene.objects.find(o => o.name === current)
      current = parent?.parentName ?? null
    }
    for (const name of chain) visited.add(name)
  }
}

function checkCameras(scene: BlenderScene, warnings: string[]): void {
  const cameras = scene.objects.filter(o => o.type === 'CAMERA')
  if (cameras.length === 0) {
    warnings.push('Blender scene has no cameras')
  }

  for (const cam of cameras) {
    if (!cam.cameraData) {
      warnings.push(`Camera object "${cam.name}" has no camera data`)
      continue
    }
    if (cam.cameraData.fov <= 0 || cam.cameraData.fov > Math.PI) {
      warnings.push(`Camera "${cam.name}" has unusual FOV: ${cam.cameraData.fov} radians`)
    }
  }
}

function checkLights(scene: BlenderScene, warnings: string[]): void {
  const lights = scene.objects.filter(o => o.type === 'LIGHT')
  if (lights.length === 0) {
    warnings.push('Blender scene has no lights')
  }

  for (const light of lights) {
    if (!light.lightData) {
      warnings.push(`Light object "${light.name}" has no light data`)
      continue
    }
    if (light.lightData.energy <= 0) {
      warnings.push(`Light "${light.name}" has zero or negative energy`)
    }
    if (light.lightData.energy > 10000) {
      warnings.push(`Light "${light.name}" has very high energy: ${light.lightData.energy}`)
    }
  }
}

export function validateBlenderScene(scene: BlenderScene): BlenderValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!scene.name) errors.push('Blender scene has no name')
  if (scene.collections.length === 0) errors.push('Blender scene has no collections')

  checkMissingObjects(scene, errors, warnings)
  checkMissingMaterials(scene, errors, warnings)
  checkHierarchy(scene, errors)
  checkCameras(scene, warnings)
  checkLights(scene, warnings)

  return { valid: errors.length === 0, errors, warnings }
}
