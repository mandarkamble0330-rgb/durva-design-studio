import type { BoothBlueprint, ZoneDefinition, ObjectDefinition, LightDefinition, MaterialDefinition, BlueprintCamera, BrandingSpec } from '@/types/blueprint'
import type { Scene, SceneNode, SceneTransform, MeshReference, MaterialReference, LightReference, CameraReference } from '@/types/scene-graph'
import { getAsset } from '@/lib/asset-library'

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

const IDENTITY_TRANSFORM: SceneTransform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
}

function makeNode(partial: Partial<SceneNode> & Pick<SceneNode, 'id' | 'name' | 'type'>): SceneNode {
  return {
    parentId: null,
    transform: { ...IDENTITY_TRANSFORM },
    mesh: null,
    material: null,
    camera: null,
    light: null,
    visible: true,
    tags: [],
    metadata: {},
    ...partial,
  }
}

function resolveAssetMesh(assetId: string): { mesh: MeshReference; resolved: boolean } {
  const asset = getAsset(assetId)
  if (asset) {
    return {
      mesh: {
        assetId: asset.assetId,
        blendFile: asset.blendFile,
        objectName: asset.displayName,
      },
      resolved: true,
    }
  }
  return {
    mesh: {
      assetId,
      blendFile: null,
      objectName: null,
    },
    resolved: false,
  }
}

function buildMaterialRef(mat: MaterialDefinition): MaterialReference {
  return {
    materialId: mat.id,
    color: mat.color,
    roughness: mat.roughness,
    metalness: mat.metalness,
    opacity: mat.opacity,
    textureUrl: mat.textureUrl,
    normalMapUrl: mat.normalMapUrl,
  }
}

function buildLightRef(light: LightDefinition): LightReference {
  return {
    lightType: light.type,
    color: light.color,
    intensity: light.intensity,
    castShadow: light.castShadow,
    angle: light.angle,
    decay: light.decay,
    target: light.target,
  }
}

function buildCameraRef(cam: BlueprintCamera): CameraReference {
  return {
    viewId: cam.viewId,
    fov: cam.fov,
    near: cam.near,
    far: cam.far,
  }
}

function buildBoothShellNodes(bp: BoothBlueprint, rootId: string): SceneNode[] {
  const nodes: SceneNode[] = []
  const dims = bp.booth.dimensions
  const groupId = generateId('grp_shell')

  nodes.push(makeNode({
    id: groupId,
    name: 'Booth Shell',
    type: 'group',
    parentId: rootId,
    tags: ['booth', 'shell'],
  }))

  nodes.push(makeNode({
    id: generateId('floor'),
    name: 'Floor',
    type: 'mesh',
    parentId: groupId,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: dims.width, y: 0.01, z: dims.depth },
    },
    tags: ['floor', 'shell'],
    metadata: { flooringType: bp.booth.flooring.type, raised: bp.booth.flooring.raised },
  }))

  const allSides: Array<{ side: string; pos: { x: number; y: number; z: number }; rot: { x: number; y: number; z: number }; scaleX: number }> = [
    { side: 'rear', pos: { x: 0, y: dims.height / 2, z: -dims.depth / 2 }, rot: { x: 0, y: 0, z: 0 }, scaleX: dims.width },
    { side: 'front', pos: { x: 0, y: dims.height / 2, z: dims.depth / 2 }, rot: { x: 0, y: 180, z: 0 }, scaleX: dims.width },
    { side: 'left', pos: { x: -dims.width / 2, y: dims.height / 2, z: 0 }, rot: { x: 0, y: 90, z: 0 }, scaleX: dims.depth },
    { side: 'right', pos: { x: dims.width / 2, y: dims.height / 2, z: 0 }, rot: { x: 0, y: -90, z: 0 }, scaleX: dims.depth },
  ]

  const openSides = new Set(dims.openSides)
  for (const wall of allSides) {
    if (openSides.has(wall.side as 'front' | 'left' | 'right' | 'rear')) continue
    nodes.push(makeNode({
      id: generateId('wall'),
      name: `Wall ${wall.side}`,
      type: 'mesh',
      parentId: groupId,
      transform: {
        position: wall.pos,
        rotation: wall.rot,
        scale: { x: wall.scaleX, y: dims.height, z: 0.05 },
      },
      tags: ['wall', 'shell', wall.side],
    }))
  }

  return nodes
}

function buildZoneNodes(zones: ZoneDefinition[], rootId: string): SceneNode[] {
  const nodes: SceneNode[] = []
  const groupId = generateId('grp_zones')

  nodes.push(makeNode({
    id: groupId,
    name: 'Zones',
    type: 'group',
    parentId: rootId,
    tags: ['zones'],
  }))

  for (const zone of zones) {
    const cx = (zone.bounds.min.x + zone.bounds.max.x) / 2
    const cy = 0
    const cz = (zone.bounds.min.z + zone.bounds.max.z) / 2

    nodes.push(makeNode({
      id: generateId('zone'),
      name: zone.label,
      type: 'empty',
      parentId: groupId,
      transform: {
        position: { x: cx, y: cy, z: cz },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      tags: ['zone', zone.type],
      metadata: {
        zoneId: zone.id,
        zoneType: zone.type,
        floorArea: zone.floorArea,
        bounds: zone.bounds,
        priority: zone.priority,
        adjacency: zone.adjacency ?? [],
      },
    }))
  }

  return nodes
}

function buildObjectNodes(objects: ObjectDefinition[], rootId: string, unresolvedAssets: string[]): SceneNode[] {
  const nodes: SceneNode[] = []

  if (objects.length === 0) return nodes

  const groupId = generateId('grp_objects')
  nodes.push(makeNode({
    id: groupId,
    name: 'Objects',
    type: 'group',
    parentId: rootId,
    tags: ['objects'],
  }))

  for (const obj of objects) {
    const { mesh, resolved } = resolveAssetMesh(obj.type)
    if (!resolved) unresolvedAssets.push(obj.type)

    let matRef: MaterialReference | null = null
    if (obj.materialId) {
      matRef = {
        materialId: obj.materialId,
        color: '#cccccc',
        roughness: 0.5,
        metalness: 0,
        opacity: 1,
      }
    }

    nodes.push(makeNode({
      id: generateId('obj'),
      name: obj.label,
      type: 'mesh',
      parentId: groupId,
      transform: obj.transform,
      mesh,
      material: matRef,
      tags: ['object', obj.type],
      metadata: { objectId: obj.id, zoneId: obj.zoneId },
    }))
  }

  return nodes
}

function buildLightNodes(lights: LightDefinition[], rootId: string): SceneNode[] {
  const nodes: SceneNode[] = []
  const groupId = generateId('grp_lights')

  nodes.push(makeNode({
    id: groupId,
    name: 'Lights',
    type: 'group',
    parentId: rootId,
    tags: ['lights'],
  }))

  for (const light of lights) {
    nodes.push(makeNode({
      id: generateId('light'),
      name: `${light.type} (${light.id})`,
      type: 'light',
      parentId: groupId,
      transform: {
        position: light.position,
        rotation: light.rotation ?? { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
      light: buildLightRef(light),
      tags: ['light', light.type],
      metadata: { lightId: light.id, ...light.metadata },
    }))
  }

  return nodes
}

function buildCameraNodes(cameras: BlueprintCamera[], rootId: string): SceneNode[] {
  const nodes: SceneNode[] = []
  const groupId = generateId('grp_cameras')

  nodes.push(makeNode({
    id: groupId,
    name: 'Cameras',
    type: 'group',
    parentId: rootId,
    tags: ['cameras'],
  }))

  for (const cam of cameras) {
    nodes.push(makeNode({
      id: generateId('cam'),
      name: `Camera ${cam.viewId}`,
      type: 'camera',
      parentId: groupId,
      transform: {
        position: cam.position,
        rotation: { x: cam.rotation.pitch, y: cam.rotation.yaw, z: cam.rotation.roll },
        scale: { x: 1, y: 1, z: 1 },
      },
      camera: buildCameraRef(cam),
      tags: ['camera', cam.viewId],
    }))
  }

  return nodes
}

function buildLogoNodes(branding: BrandingSpec, rootId: string): SceneNode[] {
  const nodes: SceneNode[] = []
  if (!branding.logoPlacement || branding.logoPlacement.length === 0) return nodes

  const groupId = generateId('grp_logos')
  nodes.push(makeNode({
    id: groupId,
    name: 'Logos',
    type: 'group',
    parentId: rootId,
    tags: ['logos', 'branding'],
  }))

  for (const logo of branding.logoPlacement) {
    nodes.push(makeNode({
      id: generateId('logo'),
      name: `Logo (${logo.surface})`,
      type: 'empty',
      parentId: groupId,
      transform: {
        position: logo.position,
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: logo.widthMeters, y: logo.heightMeters, z: 0.01 },
      },
      tags: ['logo', 'branding', logo.surface],
      metadata: {
        surface: logo.surface,
        logoUrl: branding.logoUrl,
        widthMeters: logo.widthMeters,
        heightMeters: logo.heightMeters,
      },
    }))
  }

  return nodes
}

function buildMaterialNodes(materials: MaterialDefinition[], rootId: string): SceneNode[] {
  const nodes: SceneNode[] = []
  const groupId = generateId('grp_materials')

  nodes.push(makeNode({
    id: groupId,
    name: 'Materials',
    type: 'group',
    parentId: rootId,
    tags: ['materials'],
  }))

  for (const mat of materials) {
    nodes.push(makeNode({
      id: generateId('mat'),
      name: mat.name,
      type: 'empty',
      parentId: groupId,
      material: buildMaterialRef(mat),
      tags: ['material', mat.type],
      metadata: { materialId: mat.id },
    }))
  }

  return nodes
}

export function buildScene(bp: BoothBlueprint): Scene {
  const rootId = generateId('root')
  const unresolvedAssets: string[] = []
  const now = new Date().toISOString()

  const rootNode = makeNode({
    id: rootId,
    name: bp.metadata.sourceProjectName || 'Booth Scene',
    type: 'root',
    tags: ['root'],
    metadata: { boothType: bp.booth.type, designTheme: bp.metadata.designTheme },
  })

  const allNodes: SceneNode[] = [
    rootNode,
    ...buildBoothShellNodes(bp, rootId),
    ...buildZoneNodes(bp.zones, rootId),
    ...buildObjectNodes(bp.objects, rootId, unresolvedAssets),
    ...buildLogoNodes(bp.branding, rootId),
    ...buildMaterialNodes(bp.materials, rootId),
    ...buildLightNodes(bp.lights, rootId),
    ...buildCameraNodes(bp.cameras, rootId),
  ]

  const dims = bp.booth.dimensions
  const meshCount = allNodes.filter(n => n.type === 'mesh').length
  const lightCount = allNodes.filter(n => n.type === 'light').length
  const cameraCount = allNodes.filter(n => n.type === 'camera').length

  return {
    version: '1.0.0',
    id: generateId('scene'),
    blueprintId: bp.id,
    projectId: bp.projectId,
    createdAt: now,
    updatedAt: now,
    nodes: allNodes,
    bounds: {
      min: { x: -dims.width / 2, y: 0, z: -dims.depth / 2 },
      max: { x: dims.width / 2, y: dims.height, z: dims.depth / 2 },
    },
    metadata: {
      nodeCount: allNodes.length,
      meshCount,
      lightCount,
      cameraCount,
      unresolvedAssets,
    },
  }
}
