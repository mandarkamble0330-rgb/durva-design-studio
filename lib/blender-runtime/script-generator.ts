import type { BlenderScene, BlenderObject, BlenderMaterial, BlenderCollection, BlenderMeshData } from '@/types/blender'

function indent(code: string, level: number): string {
  const prefix = '    '.repeat(level)
  return code.split('\n').map(line => line.length > 0 ? prefix + line : '').join('\n')
}

function pyStr(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function pyBool(b: boolean): string {
  return b ? 'True' : 'False'
}

function generateImports(): string {
  return `import bpy
import sys
import os
from mathutils import Vector, Euler
import math
`
}

function generateCleanScene(): string {
  return `
# Clean default scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for col in bpy.data.collections:
    bpy.data.collections.remove(col)
`
}

function generateCollection(col: BlenderCollection): string {
  const lines: string[] = []
  lines.push(`col = bpy.data.collections.new(${pyStr(col.name)})`)
  if (col.parentName) {
    lines.push(`if ${pyStr(col.parentName)} in bpy.data.collections:`)
    lines.push(`    bpy.data.collections[${pyStr(col.parentName)}].children.link(col)`)
    lines.push(`else:`)
    lines.push(`    bpy.context.scene.collection.children.link(col)`)
  } else {
    lines.push(`bpy.context.scene.collection.children.link(col)`)
  }
  return lines.join('\n')
}

function generateCollections(collections: BlenderCollection[]): string {
  const lines = ['', '# Create collections']
  for (const col of collections) {
    if (col.name === 'Scene Collection') continue
    lines.push(generateCollection(col))
    lines.push('')
  }
  return lines.join('\n')
}

function generateMeshData(name: string, meshData: BlenderMeshData): string {
  const lines: string[] = []
  const verts = meshData.vertices.map(v => `(${v.x}, ${v.y}, ${v.z})`)
  const faces = meshData.faces.map(f => `(${f.vertices.join(', ')})`)

  lines.push(`mesh_data = bpy.data.meshes.new(${pyStr(name + '_mesh')})`)
  lines.push(`verts = [${verts.join(', ')}]`)
  lines.push(`faces = [${faces.join(', ')}]`)
  lines.push(`mesh_data.from_pydata(verts, [], faces)`)
  lines.push(`mesh_data.update()`)

  if (meshData.uvLayers.length > 0) {
    const uv = meshData.uvLayers[0]
    lines.push(`uv_layer = mesh_data.uv_layers.new(name=${pyStr(uv.name)})`)
    const uvCoords = uv.data.map(d => `(${d.u}, ${d.v})`)
    lines.push(`uv_coords = [${uvCoords.join(', ')}]`)
    lines.push(`for i, loop in enumerate(mesh_data.loops):`)
    lines.push(`    if i < len(uv_coords):`)
    lines.push(`        uv_layer.data[i].uv = uv_coords[i]`)
  }

  return lines.join('\n')
}

function generateMeshObject(obj: BlenderObject): string {
  const lines: string[] = []

  if (obj.meshData && obj.meshData.vertices.length > 0) {
    lines.push(generateMeshData(obj.name, obj.meshData))
    lines.push(`obj = bpy.data.objects.new(${pyStr(obj.name)}, mesh_data)`)
  } else {
    lines.push(`mesh_data = bpy.data.meshes.new(${pyStr(obj.name + '_mesh')})`)
    lines.push(`obj = bpy.data.objects.new(${pyStr(obj.name)}, mesh_data)`)
  }

  lines.push(generateTransform(obj))
  lines.push(generateLinkToCollection(obj))
  lines.push(generateCustomProperties(obj))

  if (obj.materialName) {
    lines.push(`if ${pyStr(obj.materialName)} in bpy.data.materials:`)
    lines.push(`    obj.data.materials.append(bpy.data.materials[${pyStr(obj.materialName)}])`)
  }

  lines.push(`obj.hide_set(${pyBool(!obj.visible)})`)
  return lines.join('\n')
}

function generateEmptyObject(obj: BlenderObject): string {
  const lines: string[] = []
  lines.push(`obj = bpy.data.objects.new(${pyStr(obj.name)}, None)`)
  lines.push(`obj.empty_display_type = 'PLAIN_AXES'`)
  lines.push(`obj.empty_display_size = 0.5`)
  lines.push(generateTransform(obj))
  lines.push(generateLinkToCollection(obj))
  lines.push(generateCustomProperties(obj))
  return lines.join('\n')
}

function generateCamera(obj: BlenderObject): string {
  const lines: string[] = []
  const cam = obj.cameraData!

  lines.push(`cam_data = bpy.data.cameras.new(${pyStr(obj.name + '_cam')})`)
  lines.push(`cam_data.type = ${pyStr(cam.type)}`)
  lines.push(`cam_data.lens_unit = 'FOV'`)
  lines.push(`cam_data.angle = ${cam.fov}`)
  lines.push(`cam_data.clip_start = ${cam.clipStart}`)
  lines.push(`cam_data.clip_end = ${cam.clipEnd}`)
  lines.push(`obj = bpy.data.objects.new(${pyStr(obj.name)}, cam_data)`)
  lines.push(generateTransform(obj))
  lines.push(generateLinkToCollection(obj))
  lines.push(generateCustomProperties(obj))
  return lines.join('\n')
}

function generateLight(obj: BlenderObject): string {
  const lines: string[] = []
  const light = obj.lightData!

  lines.push(`light_data = bpy.data.lights.new(${pyStr(obj.name + '_light')}, type=${pyStr(light.type)})`)
  lines.push(`light_data.color = (${light.color[0]}, ${light.color[1]}, ${light.color[2]})`)
  lines.push(`light_data.energy = ${light.energy}`)
  lines.push(`light_data.use_shadow = ${pyBool(light.useShadow)}`)

  if (light.type === 'SPOT') {
    lines.push(`light_data.spot_size = ${light.spotSize ?? Math.PI / 4}`)
    lines.push(`light_data.spot_blend = ${light.spotBlend ?? 0.15}`)
  }

  if (light.type === 'AREA' && light.areaSize) {
    lines.push(`light_data.shape = 'RECTANGLE'`)
    lines.push(`light_data.size = ${light.areaSize[0]}`)
    lines.push(`light_data.size_y = ${light.areaSize[1]}`)
  }

  lines.push(`obj = bpy.data.objects.new(${pyStr(obj.name)}, light_data)`)
  lines.push(generateTransform(obj))
  lines.push(generateLinkToCollection(obj))
  lines.push(generateCustomProperties(obj))
  return lines.join('\n')
}

function generateTransform(obj: BlenderObject): string {
  const loc = obj.transform.location
  const rot = obj.transform.rotation
  const scl = obj.transform.scale
  const lines: string[] = []
  lines.push(`obj.location = (${loc.x}, ${loc.y}, ${loc.z})`)
  lines.push(`obj.rotation_euler = Euler((${rot.x}, ${rot.y}, ${rot.z}), 'XYZ')`)
  lines.push(`obj.scale = (${scl.x}, ${scl.y}, ${scl.z})`)
  return lines.join('\n')
}

function generateLinkToCollection(obj: BlenderObject): string {
  const col = obj.collectionName
  if (col === 'Scene Collection') {
    return `bpy.context.scene.collection.objects.link(obj)`
  }
  return `if ${pyStr(col)} in bpy.data.collections:\n    bpy.data.collections[${pyStr(col)}].objects.link(obj)\nelse:\n    bpy.context.scene.collection.objects.link(obj)`
}

function generateCustomProperties(obj: BlenderObject): string {
  if (obj.customProperties.length === 0) return ''
  const lines: string[] = []
  for (const prop of obj.customProperties) {
    if (typeof prop.value === 'string') {
      lines.push(`obj[${pyStr(prop.key)}] = ${pyStr(prop.value)}`)
    } else if (typeof prop.value === 'boolean') {
      lines.push(`obj[${pyStr(prop.key)}] = ${prop.value ? 1 : 0}`)
    } else {
      lines.push(`obj[${pyStr(prop.key)}] = ${prop.value}`)
    }
  }
  return lines.join('\n')
}

function generateMaterial(mat: BlenderMaterial): string {
  const lines: string[] = []
  lines.push(`mat = bpy.data.materials.new(${pyStr(mat.name)})`)

  lines.push(`bsdf = mat.node_tree.nodes.get('Principled BSDF')`)
  lines.push(`if bsdf:`)
  lines.push(`    bsdf.inputs['Base Color'].default_value = (${mat.color[0]}, ${mat.color[1]}, ${mat.color[2]}, ${mat.color[3]})`)
  lines.push(`    bsdf.inputs['Roughness'].default_value = ${mat.roughness}`)
  lines.push(`    bsdf.inputs['Metallic'].default_value = ${mat.metallic}`)
  lines.push(`    bsdf.inputs['Alpha'].default_value = ${mat.alpha}`)

  if (mat.blendMode !== 'OPAQUE') {
    lines.push(`mat.blend_method = ${pyStr(mat.blendMode)}`)
  }
  lines.push(`mat.use_backface_culling = ${pyBool(mat.useBackfaceCulling)}`)

  for (const prop of mat.customProperties) {
    if (typeof prop.value === 'string') {
      lines.push(`mat[${pyStr(prop.key)}] = ${pyStr(prop.value)}`)
    } else if (typeof prop.value === 'boolean') {
      lines.push(`mat[${pyStr(prop.key)}] = ${prop.value ? 1 : 0}`)
    } else {
      lines.push(`mat[${pyStr(prop.key)}] = ${prop.value}`)
    }
  }

  return lines.join('\n')
}

function generateParenting(objects: BlenderObject[]): string {
  const lines = ['', '# Set parent-child relationships']
  for (const obj of objects) {
    if (!obj.parentName) continue
    lines.push(`if ${pyStr(obj.name)} in bpy.data.objects and ${pyStr(obj.parentName)} in bpy.data.objects:`)
    lines.push(`    bpy.data.objects[${pyStr(obj.name)}].parent = bpy.data.objects[${pyStr(obj.parentName)}]`)
  }
  return lines.join('\n')
}

function generateSaveBlend(outputPath: string): string {
  return `
# Save .blend file
output_path = ${pyStr(outputPath)}
os.makedirs(os.path.dirname(output_path), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=output_path)
print(f"BLEND_SAVED:{output_path}")
`
}

function generateFooter(): string {
  return `
print("SCRIPT_COMPLETE")
sys.exit(0)
`
}

export function generateBlenderScript(scene: BlenderScene, outputBlendPath: string): string {
  const sections: string[] = []

  sections.push(generateImports())
  sections.push(generateCleanScene())

  sections.push('\n# Create materials')
  for (const mat of scene.materials) {
    sections.push(generateMaterial(mat))
    sections.push('')
  }

  sections.push(generateCollections(scene.collections))

  sections.push('\n# Create objects')
  for (const obj of scene.objects) {
    switch (obj.type) {
      case 'MESH':
        sections.push(generateMeshObject(obj))
        break
      case 'EMPTY':
        sections.push(generateEmptyObject(obj))
        break
      case 'CAMERA':
        sections.push(generateCamera(obj))
        break
      case 'LIGHT':
        sections.push(generateLight(obj))
        break
    }
    sections.push('')
  }

  sections.push(generateParenting(scene.objects))
  sections.push(generateSaveBlend(outputBlendPath))
  sections.push(generateFooter())

  return sections.join('\n')
}
