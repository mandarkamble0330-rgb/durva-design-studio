import type { BlenderMeshData } from '@/types/blender'

export function buildFloorGeometry(width: number, depth: number): BlenderMeshData {
  const hw = width / 2
  const hd = depth / 2

  return {
    vertices: [
      { x: -hw, y: -hd, z: 0 },
      { x: hw, y: -hd, z: 0 },
      { x: hw, y: hd, z: 0 },
      { x: -hw, y: hd, z: 0 },
    ],
    faces: [{ vertices: [0, 1, 2, 3] }],
    uvLayers: [{
      name: 'UVMap',
      data: [
        { u: 0, v: 0 },
        { u: 1, v: 0 },
        { u: 1, v: 1 },
        { u: 0, v: 1 },
      ],
    }],
  }
}

export function buildWallGeometry(wallWidth: number, wallHeight: number, thickness: number): BlenderMeshData {
  const hw = wallWidth / 2
  const ht = thickness / 2

  return {
    vertices: [
      { x: -hw, y: -ht, z: 0 },
      { x: hw, y: -ht, z: 0 },
      { x: hw, y: -ht, z: wallHeight },
      { x: -hw, y: -ht, z: wallHeight },
      { x: -hw, y: ht, z: 0 },
      { x: hw, y: ht, z: 0 },
      { x: hw, y: ht, z: wallHeight },
      { x: -hw, y: ht, z: wallHeight },
    ],
    faces: [
      { vertices: [0, 1, 2, 3] },
      { vertices: [5, 4, 7, 6] },
      { vertices: [0, 4, 5, 1] },
      { vertices: [2, 6, 7, 3] },
      { vertices: [0, 3, 7, 4] },
      { vertices: [1, 5, 6, 2] },
    ],
    uvLayers: [{
      name: 'UVMap',
      data: [
        { u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 1 }, { u: 0, v: 1 },
        { u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 1 }, { u: 0, v: 1 },
      ],
    }],
  }
}

export function buildShellGeometry(
  width: number,
  depth: number,
  height: number,
  openSides: string[]
): { floor: BlenderMeshData; walls: Array<{ side: string; mesh: BlenderMeshData; position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number } }> } {
  const floor = buildFloorGeometry(width, depth)
  const walls: Array<{ side: string; mesh: BlenderMeshData; position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number } }> = []
  const open = new Set(openSides)
  const thickness = 0.05

  if (!open.has('rear')) {
    walls.push({
      side: 'rear',
      mesh: buildWallGeometry(width, height, thickness),
      position: { x: 0, y: -depth / 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    })
  }

  if (!open.has('front')) {
    walls.push({
      side: 'front',
      mesh: buildWallGeometry(width, height, thickness),
      position: { x: 0, y: depth / 2, z: 0 },
      rotation: { x: 0, y: 0, z: Math.PI },
    })
  }

  if (!open.has('left')) {
    walls.push({
      side: 'left',
      mesh: buildWallGeometry(depth, height, thickness),
      position: { x: -width / 2, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
    })
  }

  if (!open.has('right')) {
    walls.push({
      side: 'right',
      mesh: buildWallGeometry(depth, height, thickness),
      position: { x: width / 2, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: -Math.PI / 2 },
    })
  }

  return { floor, walls }
}
