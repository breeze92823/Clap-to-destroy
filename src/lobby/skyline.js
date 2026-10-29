import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import { mulberry32, paintSoftDot } from '../textures.js'

// The backdrop behind the cliffs: two rings of jagged dark-blue mountains
// (vertex-coloured, unlit, no fog) and a few faint cloud wisps. The group
// follows the player in x/z like the sky dome, so it never gets closer.

function ridge(radius, minH, maxH, bottom, top, seed, segments = 220) {
  const rand = mulberry32(seed)
  // Height profile: a few big peaks + noise, wrapped round the circle.
  const peaks = Array.from({ length: 14 }, () => ({ at: rand() * Math.PI * 2, w: 0.12 + rand() * 0.25, h: rand() }))
  const heights = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    let h = 0.15 + rand() * 0.06
    for (const p of peaks) {
      let d = Math.abs(a - p.at)
      d = Math.min(d, Math.PI * 2 - d)
      h = Math.max(h, p.h * Math.max(0, 1 - d / p.w))
    }
    heights.push(minH + (maxH - minH) * h)
  }
  const pos = []
  const col = []
  const cb = new Color(bottom)
  const ct = new Color(top)
  const c = new Color()
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2
    const a1 = ((i + 1) / segments) * Math.PI * 2
    const p = (a, y) => [Math.cos(a) * radius, y, Math.sin(a) * radius]
    const h0 = heights[i]
    const h1 = heights[i + 1]
    const quad = [p(a0, -40), p(a1, -40), p(a1, h1), p(a0, -40), p(a1, h1), p(a0, h0)]
    for (const v of quad) {
      pos.push(...v)
      c.copy(cb).lerp(ct, Math.max(0, v[1]) / maxH)
      col.push(c.r, c.g, c.b)
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new Float32BufferAttribute(col, 3))
  const mesh = new Mesh(geo, new MeshBasicMaterial({ vertexColors: true, fog: false, side: DoubleSide }))
  mesh.frustumCulled = false
  return mesh
}

export function buildSkyline(scene) {
  const group = new Group()
  group.add(ridge(468, 40, 150, '#14275e', '#2a4690', 11))
  group.add(ridge(440, 20, 95, '#0b183f', '#1c3270', 23))

  // Faint wisps of cloud above the ridges.
  const tex = new CanvasTexture(paintSoftDot(128))
  const cloudMat = new MeshBasicMaterial({ map: tex, color: '#6f8fd8', transparent: true, opacity: 0.22, depthWrite: false, fog: false, blending: AdditiveBlending, side: DoubleSide })
  const rand = mulberry32(5)
  for (let i = 0; i < 18; i++) {
    const a = rand() * Math.PI * 2
    const r = 400
    const m = new Mesh(new PlaneGeometry(1, 1), cloudMat)
    m.scale.set(90 + rand() * 120, 14 + rand() * 18, 1)
    m.position.set(Math.cos(a) * r, 120 + rand() * 90, Math.sin(a) * r)
    m.lookAt(0, m.position.y, 0)
    group.add(m)
  }
  group.renderOrder = -1
  scene.add(group)
  return {
    update(focus) {
      group.position.set(focus.x, 0, focus.z)
    },
  }
}
