import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector2 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { addFixed, RAPIER } from '../physics.js'
import { paintBlocks, paintStuds, paintWallChecker, toTexture } from '../textures.js'

// Shared pieces for the lobby: cached materials, world-space UVs (so one tiled
// stud texture covers plates of any size with studs the same size everywhere),
// and a batcher that merges static geometry into one mesh per material.

export const PLATE_TILE = 8 // m per stud texture tile (16 studs of 0.5 m)

// Planar UVs from world position, picked per vertex by its dominant normal axis.
// Call after the geometry has been moved to its world position.
export function worldUV(geo, tile = PLATE_TILE) {
  const pos = geo.attributes.position
  const nrm = geo.attributes.normal
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const ax = Math.abs(nrm.getX(i))
    const ay = Math.abs(nrm.getY(i))
    if (ay >= ax && ay >= Math.abs(nrm.getZ(i))) uv.setXY(i, x / tile, -z / tile)
    else if (ax >= Math.abs(nrm.getZ(i))) uv.setXY(i, -z * Math.sign(nrm.getX(i)) / tile, y / tile)
    else uv.setXY(i, x * Math.sign(nrm.getZ(i)) / tile, y / tile)
  }
  uv.needsUpdate = true
  return geo
}

// Plain shared materials: one instance per colour + options.
const matCache = new Map()
export function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra)
  let m = matCache.get(key)
  if (!m) matCache.set(key, (m = new MeshStandardMaterial({ color, roughness: 0.65, metalness: 0, ...extra })))
  return m
}

// Studded plates (world-UV'd: use with worldUV / the Batcher).
const plateCache = new Map()
export function plate(base, alt = null, { checker = 2, roughness = 0.72 } = {}) {
  const key = `${base}|${alt}|${checker}`
  let m = plateCache.get(key)
  if (!m) {
    const t = paintStuds({ base, alt, checker })
    m = new MeshStandardMaterial({
      map: toTexture(t.color, { srgb: true }),
      normalMap: toTexture(t.normal),
      normalScale: new Vector2(0.55, 0.55),
      roughness,
      metalness: 0,
    })
    plateCache.set(key, m)
  }
  return m
}

let dirtMat = null
export function dirt() {
  dirtMat ||= new MeshStandardMaterial({ map: toTexture(paintBlocks(['#dc964f', '#c97b3c', '#e5a862', '#d38a46'], 2, 4, 256), { srgb: true }), roughness: 0.9 })
  return dirtMat
}

// The hub's tall brown checker walls (use with worldUV tile = 2 squares).
let wallMat = null
export function wall() {
  wallMat ||= new MeshStandardMaterial({ map: toTexture(paintWallChecker(), { srgb: true }), roughness: 0.85 })
  return wallMat
}

// The palette every lobby plate uses.
export const PLATES = {
  white: () => plate('#ececf0', '#e3e3ea'),
  grass: () => plate('#8bd247', '#7cc43c'),
  sand: () => plate('#f4dea6', '#eed49a'),
  sandDark: () => plate('#e6c98a', null, { checker: 1 }),
  green: () => plate('#43dd45', '#3ccf3f'),
  red: () => plate('#d42a2a', '#c52222'),
}

export function boxGeo(minX, maxX, minY, maxY, minZ, maxZ) {
  return new BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ).translate((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2)
}

export function solidCuboid(minX, maxX, minY, maxY, minZ, maxZ) {
  addFixed(RAPIER.ColliderDesc.cuboid((maxX - minX) / 2, (maxY - minY) / 2, (maxZ - minZ) / 2), { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 })
}

// Collects world-space geometries per material, then merges each material's
// list into one mesh.
export class Batcher {
  constructor() {
    this.lists = new Map()
  }
  add(geo, material) {
    let l = this.lists.get(material)
    if (!l) this.lists.set(material, (l = []))
    l.push(geo.index ? geo.toNonIndexed() : geo)
    return geo
  }
  // An axis-aligned box with world UVs; `solid` also gives it a collider.
  box(minX, maxX, minY, maxY, minZ, maxZ, material, solid = true, tile = PLATE_TILE) {
    this.add(worldUV(boxGeo(minX, maxX, minY, maxY, minZ, maxZ), tile), material)
    if (solid) solidCuboid(minX, maxX, minY, maxY, minZ, maxZ)
  }
  build(parent, { cast = true, receive = true } = {}) {
    const group = new Group()
    for (const [material, geos] of this.lists) {
      const merged = mergeGeometries(geos)
      for (const g of geos) g.dispose()
      const mesh = new Mesh(merged, material)
      mesh.castShadow = cast
      mesh.receiveShadow = receive
      group.add(mesh)
    }
    this.lists.clear()
    parent.add(group)
    return group
  }
}
