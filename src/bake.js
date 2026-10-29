import { BufferAttribute, Group, Matrix4, Mesh, MeshStandardMaterial } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// --- Baking: as few meshes as possible ----------------------------------------------
// Props are built from many small meshes (a palm is ~20). Baking merges them:
// every plain-coloured standard material (no maps, no emission, opaque) is
// folded into vertex colours, so all of a prop's flat colours share ONE
// material per (roughness, metalness, side) look; everything else (neon,
// textured, transparent) merges per material as before. A whole prop then
// draws in one to three calls (mobile).
const matKey = (m) => [m.type, m.color?.getHexString(), m.emissive?.getHexString(), m.vertexColors, m.side, m.flatShading, m.transparent, m.opacity, m.blending, m.map?.uuid, m.roughness, m.metalness, m.userData.k].join('|')

const foldable = (m) => m.isMeshStandardMaterial && !m.map && !m.emissiveMap && !m.normalMap && !m.transparent && m.emissive.getHex() === 0
const vcMats = new Map()
function vcMaterial(m) {
  const key = `${m.roughness.toFixed(2)}|${m.metalness.toFixed(2)}|${m.side}|${m.flatShading}`
  let out = vcMats.get(key)
  if (!out) vcMats.set(key, (out = new MeshStandardMaterial({ vertexColors: true, roughness: m.roughness, metalness: m.metalness, side: m.side, flatShading: m.flatShading })))
  return out
}

// Vertex colours = the geometry's own colours (if any) x the material colour.
function withColor(g, color) {
  const n = g.attributes.position.count
  const own = g.attributes.color
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    out[i * 3] = (own ? own.getX(i) : 1) * color.r
    out[i * 3 + 1] = (own ? own.getY(i) : 1) * color.g
    out[i * 3 + 2] = (own ? own.getZ(i) : 1) * color.b
  }
  g.setAttribute('color', new BufferAttribute(out, 3))
  return g
}

const rel = new Matrix4()
function merge(meshes, root, castShadow) {
  root.updateMatrixWorld(true)
  const inv = root.matrixWorld.clone().invert()
  const groups = new Map() // key -> { mat, geos }
  const out = new Group()
  for (const o of meshes) {
    rel.multiplyMatrices(inv, o.matrixWorld)
    if (Array.isArray(o.material)) {
      out.add(new Mesh(o.geometry.clone().applyMatrix4(rel), o.material)) // multi-material: kept as is
      continue
    }
    let g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(rel)
    if (rel.determinant() < 0) g = flipWinding(g)
    let mat = o.material
    let key
    if (foldable(mat)) {
      g = withColor(g, mat.color)
      mat = vcMaterial(mat)
      key = `vc|${mat.uuid}`
    } else key = matKey(mat)
    let e = groups.get(key)
    if (!e) groups.set(key, (e = { mat, geos: [] }))
    e.geos.push(g)
  }
  for (const { mat, geos } of groups.values()) {
    const names = Object.keys(geos[0].attributes).filter((n) => geos.every((g) => g.attributes[n]))
    for (const g of geos) {
      for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n)
      g.morphAttributes = {}
      g.clearGroups()
    }
    const merged = mergeGeometries(geos)
    for (const g of geos) g.dispose()
    if (merged) out.add(new Mesh(merged, mat))
  }
  out.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = castShadow
      o.receiveShadow = true
    }
  })
  return out
}

// Mirrored transforms (negative scale) turn faces inside out; swap two corners back.
function flipWinding(g) {
  for (const a of Object.values(g.attributes)) {
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < a.itemSize; k++) {
        const t = a.array[(i + 1) * a.itemSize + k]
        a.array[(i + 1) * a.itemSize + k] = a.array[(i + 2) * a.itemSize + k]
        a.array[(i + 2) * a.itemSize + k] = t
      }
    }
  }
  return g
}

// Every mesh under `root` merged into a new Group (in root's local space).
export function bake(root, castShadow = false) {
  const meshes = []
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o)
  })
  return merge(meshes, root, castShadow)
}

// Bakes `root`'s meshes where they are: sprites, lights and any subtree marked
// userData.live (animated parts, per-instance materials) are left untouched.
export function bakeInPlace(root, castShadow = true) {
  const meshes = []
  const walk = (o) => {
    for (const c of o.children) {
      if (c.userData.live) continue
      if (c.isMesh) meshes.push(c)
      walk(c)
    }
  }
  walk(root)
  if (!meshes.length) return null
  const baked = merge(meshes, root, castShadow)
  for (const m of meshes) m.parent?.remove(m)
  root.add(baked)
  return baked
}
