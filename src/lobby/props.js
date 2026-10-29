import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { neon } from '../propkit.js'
import { mat } from './kit.js'

// Hand-built props, each a Group with its origin on the ground at its centre.
// Shapes follow the reference: chunky toy-like parts, flat colours, a few
// glowing bits (jack-o'-lantern faces). Static ones are baked by the caller.

export function part(parent, geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new Mesh(geo, material)
  m.position.set(x, y, z)
  m.rotation.set(rx, ry, rz)
  m.castShadow = true
  m.receiveShadow = true
  parent.add(m)
  return m
}

// Per-triangle vertex colours from a function of the triangle's centroid.
function paintTriangles(geo, colorAt) {
  const g = geo.index ? geo.toNonIndexed() : geo
  const pos = g.attributes.position
  const cols = []
  const c = new Color()
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3
    c.set(colorAt(cx, cy, cz))
    for (let k = 0; k < 3; k++) cols.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(cols, 3))
  return g
}
const vcMat = (extra = {}) => new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, ...extra })

// --- Trees -------------------------------------------------------------------------

// Palm: curved ringed trunk, coconuts, seven drooping serrated fronds.
const frondGeo = (() => {
  const s = new Shape()
  const L = 3.4
  s.moveTo(0, 0)
  for (let i = 1; i <= 8; i++) s.lineTo((i / 8) * L, 0.42 * Math.sin((i / 8) * Math.PI) * (i % 2 ? 1 : 0.6))
  for (let i = 8; i >= 0; i--) s.lineTo((i / 8) * L, -0.42 * Math.sin((i / 8) * Math.PI) * (i % 2 ? 1 : 0.6))
  const g = new ShapeGeometry(s, 1)
  g.rotateX(-Math.PI / 2)
  // Droop: bend down along the frond's length.
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    p.setY(i, 0.5 * x - 0.32 * x * x)
  }
  g.computeVertexNormals()
  return g
})()
export function palm(rand, height = 6) {
  const g = new Group()
  const bark = mat('#8a5a2e', { roughness: 0.85 })
  const ring = mat('#6e4423', { roughness: 0.9 })
  const segs = 7
  const lean = (rand() - 0.5) * 0.5
  let x = 0
  let y = 0
  for (let i = 0; i < segs; i++) {
    const h = height / segs
    const r = 0.32 - i * 0.022
    const m = part(g, new CylinderGeometry(r * 0.92, r, h, 9), i % 2 ? bark : ring, x, y + h / 2, 0)
    m.rotation.z = -lean * (i / segs)
    x += Math.sin(lean * (i / segs)) * h
    y += h * 0.98
  }
  const top = new Group()
  top.position.set(x, y, 0)
  g.add(top)
  const leafA = mat('#2f8a2a', { side: DoubleSide, roughness: 0.7 })
  const leafB = mat('#3fa636', { side: DoubleSide, roughness: 0.7 })
  for (let i = 0; i < 7; i++) {
    const f = new Mesh(frondGeo, i % 2 ? leafA : leafB)
    f.rotation.set(0, (i / 7) * Math.PI * 2 + rand() * 0.4, -0.1 + rand() * 0.2)
    f.castShadow = true
    top.add(f)
  }
  const nut = mat('#5a3a1a', { roughness: 0.6 })
  for (let i = 0; i < 3; i++) part(top, new SphereGeometry(0.2, 10, 8), nut, Math.cos(i * 2.1) * 0.25, -0.25, Math.sin(i * 2.1) * 0.25)
  return g
}

// Blocky lollipop tree from the cliff tops: square trunk, two flat leaf slabs.
export function blockTree(rand, scale = 1) {
  const g = new Group()
  const h = (3 + rand() * 2) * scale
  part(g, new BoxGeometry(0.6 * scale, h, 0.6 * scale), mat('#7a4b25', { roughness: 0.85 }), 0, h / 2, 0)
  const w = (3.6 + rand() * 1.6) * scale
  part(g, new BoxGeometry(w, 0.9 * scale, w), mat('#3fbf2a'), 0, h + 0.2 * scale, 0)
  part(g, new BoxGeometry(w * 0.6, 0.8 * scale, w * 0.6), mat('#57d23a'), 0, h + 0.95 * scale, 0)
  g.rotation.y = rand() * Math.PI
  return g
}

// --- Pumpkins ------------------------------------------------------------------------

const lobeGeo = new SphereGeometry(1, 10, 7)
const faceMat = () => neon('#ffb12e')
function faceShapes() {
  const shapes = []
  const tri = (x, y, w, h) => {
    const s = new Shape()
    s.moveTo(x - w / 2, y)
    s.lineTo(x + w / 2, y)
    s.lineTo(x, y + h)
    s.closePath()
    shapes.push(s)
  }
  tri(-0.32, 0.12, 0.3, 0.28)
  tri(0.32, 0.12, 0.3, 0.28)
  tri(0, -0.08, 0.16, 0.16)
  const m = new Shape()
  m.moveTo(-0.5, -0.2)
  const teeth = [[-0.36, -0.32], [-0.24, -0.22], [-0.1, -0.36], [0.04, -0.24], [0.18, -0.36], [0.32, -0.22], [0.5, -0.2]]
  for (const [x, y] of teeth) m.lineTo(x, y)
  m.lineTo(0.3, -0.52)
  m.lineTo(0, -0.58)
  m.lineTo(-0.3, -0.52)
  m.closePath()
  shapes.push(m)
  return new ShapeGeometry(shapes)
}
const faceGeo = faceShapes()

export function pumpkin(radius = 0.5, carved = true, rand = Math.random) {
  const g = new Group()
  const body = new Group()
  body.scale.setScalar(radius)
  g.add(body)
  const a = mat('#f27c16', { roughness: 0.55 })
  const b = mat('#e06a0d', { roughness: 0.55 })
  const lobes = 8
  for (let i = 0; i < lobes; i++) {
    const ang = (i / lobes) * Math.PI * 2
    const m = part(body, lobeGeo, i % 2 ? a : b, Math.sin(ang) * 0.38, 0.78, Math.cos(ang) * 0.38)
    m.scale.set(0.5, 0.78, 0.62)
    m.rotation.y = ang
  }
  part(body, new CylinderGeometry(0.07, 0.11, 0.42, 7), mat('#5f7a24'), 0.04, 1.62, 0, 0, 0, -0.25 + rand() * 0.2)
  part(body, new SphereGeometry(0.12, 8, 6), mat('#4e9a2c'), -0.15, 1.5, 0.05).scale.set(1.6, 0.4, 1)
  if (carved) {
    const f = new Mesh(faceGeo, faceMat())
    f.position.set(0, 0.84, 0.87)
    f.scale.setScalar(0.95)
    body.add(f)
  }
  return g
}

// Torch post: square wooden post, a little cap plate and a jack-o'-lantern on top.
export function pumpkinPost(rand = Math.random) {
  const g = new Group()
  const wood = mat('#6e4224', { roughness: 0.85 })
  part(g, new BoxGeometry(0.34, 2.6, 0.34), wood, 0, 1.3, 0)
  part(g, new BoxGeometry(0.62, 0.14, 0.62), mat('#5a361d'), 0, 2.62, 0)
  const p = pumpkin(0.44, true, rand)
  p.position.y = 2.66
  p.rotation.y = (rand() - 0.5) * 0.6
  g.add(p)
  return g
}

// --- Small hub dressing ----------------------------------------------------------------

export function chevron() {
  const g = new Group()
  const m = mat('#575862', { roughness: 0.7 })
  for (const s of [-1, 1]) {
    const arm = part(g, new BoxGeometry(0.75, 0.14, 4.4), m, s * 1.55, 0.07, 1.3)
    arm.rotation.y = s * 0.92
  }
  return g
}

export function flower() {
  const g = new Group()
  const petal = mat('#ffe33a', { roughness: 0.5 })
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    part(g, new SphereGeometry(0.17, 8, 6), petal, Math.cos(a) * 0.17, 0.32, Math.sin(a) * 0.17).scale.set(1, 0.45, 1)
  }
  part(g, new SphereGeometry(0.1, 8, 6), mat('#ffb21e'), 0, 0.35, 0)
  part(g, new CylinderGeometry(0.03, 0.03, 0.3, 5), mat('#3fa136'), 0, 0.15, 0)
  return g
}

// The fat green 3D arrow on the grass, pointing at the training pools.
export function arrow3D() {
  const s = new Shape()
  s.moveTo(-0.5, -1.2)
  s.lineTo(0.5, -1.2)
  s.lineTo(0.5, 0.1)
  s.lineTo(1.1, 0.1)
  s.lineTo(0, 1.3)
  s.lineTo(-1.1, 0.1)
  s.lineTo(-0.5, 0.1)
  s.closePath()
  const g = new Group()
  const geo = new ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 })
  part(g, geo, mat('#2fd23c', { roughness: 0.45 }), 0, 0, 0)
  return g
}

// --- Beach props (destroyable) --------------------------------------------------------

const SAND = '#e8c98c'
const SAND_DARK = '#d9b574'

function crenellate(parent, w, d, y, material, size = 0.22) {
  const n = Math.max(2, Math.round(w / (size * 2)))
  for (let i = 0; i < n; i++) {
    const t = -w / 2 + size / 2 + (i * (w - size)) / (n - 1)
    part(parent, new BoxGeometry(size, size, size), material, t, y, d / 2 - size / 2)
    part(parent, new BoxGeometry(size, size, size), material, t, y, -d / 2 + size / 2)
  }
  const m = Math.max(2, Math.round(d / (size * 2)))
  for (let i = 1; i < m - 1; i++) {
    const t = -d / 2 + size / 2 + (i * (d - size)) / (m - 1)
    part(parent, new BoxGeometry(size, size, size), material, w / 2 - size / 2, y, t)
    part(parent, new BoxGeometry(size, size, size), material, -w / 2 + size / 2, y, t)
  }
}

export function sandCastle(rand, big = false) {
  const g = new Group()
  const s = big ? 2.2 : 1
  const a = mat(SAND, { roughness: 0.95 })
  const b = mat(SAND_DARK, { roughness: 0.95 })
  const W = 2.6 * s
  const H = 1.1 * s
  part(g, new BoxGeometry(W, H, W), a, 0, H / 2, 0)
  crenellate(g, W, W, H + 0.11 * s, b, 0.26 * s)
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const th = (1.9 + rand() * 0.4) * s
    part(g, new CylinderGeometry(0.46 * s, 0.52 * s, th, 10), b, (x * W) / 2, th / 2, (z * W) / 2)
    part(g, new CylinderGeometry(0.56 * s, 0.56 * s, 0.22 * s, 10), a, (x * W) / 2, th + 0.1 * s, (z * W) / 2)
    part(g, new ConeGeometry(0.42 * s, 0.6 * s, 10), b, (x * W) / 2, th + 0.5 * s, (z * W) / 2)
  }
  const kh = 2.4 * s
  part(g, new BoxGeometry(1.3 * s, kh, 1.3 * s), a, 0, kh / 2, 0)
  crenellate(g, 1.3 * s, 1.3 * s, kh + 0.1 * s, b, 0.22 * s)
  part(g, new BoxGeometry(0.6 * s, 0.8 * s, 0.1), mat('#8f6a3c'), 0, 0.4 * s, W / 2 + 0.02)
  part(g, new CylinderGeometry(0.03 * s, 0.03 * s, 1 * s, 5), mat('#ffffff'), 0, kh + 0.6 * s, 0)
  const flag = part(g, new BoxGeometry(0.5 * s, 0.3 * s, 0.03), mat('#e5312c'), 0.25 * s, kh + 0.95 * s, 0)
  flag.castShadow = false
  g.userData.radius = W * 0.75 + 0.4
  g.userData.height = kh + 1.2 * s
  return g
}

const BALL_COLORS = [
  ['#ffffff', '#ee4f9e', '#ffffff', '#9c5cf0', '#ffffff', '#f2c230'],
  ['#ffffff', '#3a7cf0', '#ffffff', '#e8433a', '#ffffff', '#ffd23a'],
  ['#ffffff', '#ff7ac8', '#ffffff', '#ff7ac8', '#ffffff', '#c27bff'],
]
export function beachBall(rand) {
  const g = new Group()
  const r = 0.55 + rand() * 0.25
  const cols = BALL_COLORS[Math.floor(rand() * BALL_COLORS.length)]
  const geo = paintTriangles(new SphereGeometry(r, 18, 12), (x, y, z) => {
    if (Math.abs(y) > r * 0.93) return '#ffffff'
    const a = (Math.atan2(z, x) + Math.PI) / (Math.PI * 2)
    return cols[Math.floor(a * 6) % 6]
  })
  const ball = part(g, geo, vcMat({ roughness: 0.3 }), 0, r, 0)
  ball.rotation.set(rand() * 3, rand() * 3, rand() * 3)
  g.userData.radius = r + 0.3
  g.userData.height = r * 2
  g.userData.bob = { node: ball, base: r, amp: 0.08, speed: 2 + rand() }
  return g
}

export function umbrella(rand) {
  const g = new Group()
  const pairs = [['#3ccf4e', '#ffffff'], ['#ffd23a', '#ffffff'], ['#ef4b4b', '#ffffff'], ['#3aa8ff', '#ffffff']]
  const [c1, c2] = pairs[Math.floor(rand() * pairs.length)]
  part(g, new CylinderGeometry(0.06, 0.06, 2.7, 6), mat('#f4f4f4'), 0, 1.35, 0)
  const cone = paintTriangles(new ConeGeometry(1.8, 0.65, 16, 1, true), (x, y, z) => (Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 8) % 2 ? c1 : c2))
  const c = part(g, cone, vcMat({ side: DoubleSide }), 0, 2.75, 0)
  c.rotation.z = (rand() - 0.5) * 0.15
  part(g, new SphereGeometry(0.1, 8, 6), mat(c1), 0, 3.12, 0)
  g.add(towel(rand, 1.4))
  g.children.at(-1).position.set(0.9, 0, 0.4)
  g.userData.radius = 1.9
  g.userData.height = 3.2
  return g
}

export function towel(rand, scale = 1) {
  const g = new Group()
  const base = ['#df2a2e', '#e8392c', '#2f7fe0', '#ff8a1f'][Math.floor(rand() * 4)]
  part(g, new BoxGeometry(1.0 * scale, 0.06, 2.0 * scale), mat(base), 0, 0.03, 0)
  for (const z of [-0.6, 0.6]) part(g, new BoxGeometry(1.0 * scale + 0.01, 0.07, 0.14 * scale), mat('#ffffff'), 0, 0.03, z * scale)
  g.rotation.y = (rand() - 0.5) * 1.2
  g.userData.radius = 1.3 * scale
  g.userData.height = 0.4
  return g
}

export function cooler(rand) {
  const g = new Group()
  const body = ['#2f7fe0', '#e5312c', '#2cc06a'][Math.floor(rand() * 3)]
  part(g, new RoundedBoxGeometry(1.1, 0.7, 0.7, 2, 0.06), mat(body), 0, 0.35, 0)
  part(g, new RoundedBoxGeometry(1.16, 0.18, 0.76, 2, 0.06), mat('#ffffff'), 0, 0.76, 0)
  part(g, new TorusGeometry(0.22, 0.04, 6, 12, Math.PI), mat('#dddddd'), 0, 0.85, 0)
  g.rotation.y = rand() * Math.PI
  g.userData.radius = 1.0
  g.userData.height = 1.0
  return g
}

// Red cabin on white stilts with a ladder and a flag (the reference's tower).
export function lifeguardTower(rand) {
  const g = new Group()
  const white = mat('#f6f6f6')
  const red = mat('#d8262b')
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const leg = part(g, new BoxGeometry(0.18, 3.2, 0.18), white, x * 1.05, 1.6, z * 1.05)
    leg.rotation.set(z * 0.06, 0, -x * 0.06)
  }
  part(g, new BoxGeometry(2.6, 0.18, 2.6), white, 0, 3.15, 0)
  part(g, new BoxGeometry(2.2, 1.4, 2.0), red, 0, 3.95, -0.2)
  part(g, new BoxGeometry(1.4, 0.6, 0.06), mat('#1d2b45'), 0, 4.1, 0.82)
  part(g, new BoxGeometry(2.6, 0.16, 2.4), white, 0, 4.72, -0.2).rotation.x = -0.12
  for (const x of [-0.35, 0.35]) part(g, new BoxGeometry(0.08, 3.4, 0.08), white, x, 1.6, 1.75).rotation.x = -0.32
  for (let i = 0; i < 6; i++) part(g, new BoxGeometry(0.7, 0.06, 0.1), white, 0, 0.4 + i * 0.5, 1.88 - i * 0.165)
  for (const x of [-1.25, 1.25]) part(g, new BoxGeometry(0.08, 0.6, 2.6), white, x, 3.5, 0)
  part(g, new CylinderGeometry(0.04, 0.04, 1.4, 5), white, 1.0, 5.3, -1.0)
  part(g, new BoxGeometry(0.7, 0.4, 0.04), red, 1.35, 5.75, -1.0)
  g.rotation.y = (rand() - 0.5) * 0.6
  g.userData.radius = 2.4
  g.userData.height = 5.6
  return g
}

// Beach hut / snack kiosk: plank walls, counter, striped awning.
export function hut(rand) {
  const g = new Group()
  const variants = [
    { wall: '#b98150', trim: '#8a5a32', roof: '#c9312e', stripe: ['#e5312c', '#ffffff'] },
    { wall: '#9a7fd0', trim: '#6c55a6', roof: '#5b4a9a', stripe: ['#ffffff', '#ff7ab6'] },
    { wall: '#e7b25a', trim: '#b5823a', roof: '#2f8fe0', stripe: ['#2f8fe0', '#ffffff'] },
  ]
  const v = variants[Math.floor(rand() * variants.length)]
  part(g, new BoxGeometry(3.2, 2.4, 2.6), mat(v.wall, { roughness: 0.85 }), 0, 1.2, 0)
  part(g, new BoxGeometry(2.4, 1.0, 0.1), mat('#2a2030'), 0, 1.65, 1.31)
  part(g, new BoxGeometry(3.4, 0.16, 0.7), mat(v.trim), 0, 1.05, 1.5)
  for (let i = 0; i < 8; i++) {
    const s = part(g, new BoxGeometry(0.44, 0.08, 1.1), mat(v.stripe[i % 2]), -1.54 + i * 0.44, 2.45, 1.6)
    s.rotation.x = 0.35
  }
  const roof = part(g, new BoxGeometry(3.6, 0.3, 3.0), mat(v.roof), 0, 2.6, 0)
  roof.rotation.x = -0.05
  part(g, new BoxGeometry(1.8, 0.5, 0.12), mat('#ffffff'), 0, 3.0, 1.2)
  g.rotation.y = (rand() - 0.5) * 0.5
  g.userData.radius = 2.4
  g.userData.height = 3.4
  return g
}

// Builder per DESTROYABLES kind.
export const BEACH_PROPS = {
  ball: beachBall,
  towel: (rand) => towel(rand),
  cooler,
  umbrella,
  castle: (rand) => sandCastle(rand, false),
  bigCastle: (rand) => sandCastle(rand, true),
  hut,
  lifeguard: lifeguardTower,
}

