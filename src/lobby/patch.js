import {
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  MeshStandardMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from 'three'
import { LOBBY } from '../config.js'
import { bakeInPlace } from '../bake.js'
import { solidBox } from '../propkit.js'
import { mulberry32 } from '../textures.js'
import { TITLE_FONT, titleFontReady } from './fonts.js'
import { mat } from './kit.js'
import { cubeTree } from './lanes.js'
import { part, pumpkin } from './props.js'

// The west end of the hub, on the terrace behind gauntlet row 2: the Pumpkin
// Patch (picket fence, dirt beds, plots that grow pumpkins you harvest for
// candy), its sign, two witch-hat scarecrows, a skeleton sitting on a crate,
// crates and hay bales with pumpkins, and big cube trees.

const PI = Math.PI
const BODY_FONT = '"Fredoka", "Arial Black", sans-serif'

function picketFence(g, x0, z0, x1, z1, gap = null) {
  const wood = mat('#6a3f1f', { roughness: 0.85 })
  const len = Math.hypot(x1 - x0, z1 - z0)
  const n = Math.round(len / 0.55)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = x0 + (x1 - x0) * t
    const z = z0 + (z1 - z0) * t
    if (gap && z > gap[0] && z < gap[1] && x0 === x1) continue
    part(g, new BoxGeometry(0.14, 1.0, 0.14), wood, x, 0.5, z)
    part(g, new ConeGeometry(0.1, 0.18, 4), wood, x, 1.08, z, 0, PI / 4, 0)
  }
  const along = x0 === x1 ? 'z' : 'x'
  for (const y of [0.35, 0.78]) {
    if (gap && along === 'z') {
      for (const [a, b] of [[z0, gap[0]], [gap[1], z1]]) part(g, new BoxGeometry(0.06, 0.1, Math.abs(b - a)), wood, x0, y, (a + b) / 2)
    } else if (along === 'z') part(g, new BoxGeometry(0.06, 0.1, len), wood, x0, y, (z0 + z1) / 2)
    else part(g, new BoxGeometry(len, 0.1, 0.06), wood, (x0 + x1) / 2, y, z0)
  }
}

function patchSign(g, x, z) {
  const wood = mat('#6a3f1f', { roughness: 0.85 })
  for (const s of [-1, 1]) part(g, new BoxGeometry(0.22, 3.2, 0.22), wood, x, 1.6, z + s * 1.6)
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 200
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  const draw = () => {
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#7a4a26'
    ctx.fillRect(0, 0, 512, 200)
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    for (let y = 0; y < 200; y += 40) ctx.fillRect(0, y, 512, 3)
    ctx.strokeStyle = '#4a2a12'
    ctx.lineWidth = 12
    ctx.strokeRect(6, 6, 500, 188)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.font = `76px ${TITLE_FONT}`
    ctx.lineWidth = 12
    ctx.strokeStyle = '#2a1206'
    ctx.strokeText('PUMPKIN PATCH', 256, 84)
    ctx.fillStyle = '#ff8a1c'
    ctx.fillText('PUMPKIN PATCH', 256, 84)
    ctx.font = `700 30px ${BODY_FONT}`
    ctx.lineWidth = 6
    ctx.strokeText('plant - grow - harvest Candy!', 256, 152)
    ctx.fillStyle = '#ffffff'
    ctx.fillText('plant - grow - harvest Candy!', 256, 152)
    tex.needsUpdate = true
  }
  draw()
  titleFontReady.then(draw)
  const face = new MeshStandardMaterial({ map: tex, roughness: 0.8 })
  const back = mat('#7a4a26', { roughness: 0.85 })
  // Board faces east (+X): BoxGeometry's +X face is material index 0.
  part(g, new BoxGeometry(0.16, 1.3, 3.4), [face, back, back, back, back, back], x + 0.05, 3.0, z)
  for (const s of [-1, 1]) {
    const p = pumpkin(0.3, true)
    p.position.set(x + 0.1, 3.7, z + s * 1.6)
    p.rotation.y = PI / 2
    g.add(p)
  }
}

// Pole-and-crossbar scarecrow with a pumpkin head and a witch hat, facing +X.
function scarecrow(g, x, z, rand) {
  const s = new Group()
  s.position.set(x, 0, z)
  s.rotation.y = PI / 2
  g.add(s)
  const wood = mat('#6e4224', { roughness: 0.9 })
  part(s, new BoxGeometry(0.16, 2.6, 0.16), wood, 0, 1.3, -0.1)
  part(s, new BoxGeometry(1.9, 0.14, 0.14), wood, 0, 1.95, -0.1)
  part(s, new BoxGeometry(0.85, 0.95, 0.42), mat('#c0743a', { roughness: 0.9 }), 0, 1.65, 0)
  part(s, new BoxGeometry(0.88, 0.12, 0.45), mat('#8a3a1e'), 0, 1.4, 0)
  for (const k of [-1, 1]) {
    part(s, new BoxGeometry(0.62, 0.3, 0.32), mat('#c0743a', { roughness: 0.9 }), k * 0.7, 1.95, 0)
    part(s, new ConeGeometry(0.12, 0.35, 6), mat('#f2d36a'), k * 1.08, 1.95, 0, 0, 0, k * PI / 2)
    part(s, new BoxGeometry(0.3, 0.75, 0.32), mat('#3a5aa8', { roughness: 0.9 }), k * 0.2, 0.85, 0)
    part(s, new ConeGeometry(0.1, 0.3, 6), mat('#f2d36a'), k * 0.2, 0.38, 0, PI, 0, 0)
  }
  const head = pumpkin(0.38, true, rand)
  head.position.y = 2.1
  s.add(head)
  const hat = mat('#5a2a8a', { roughness: 0.6 })
  part(s, new CylinderGeometry(0.55, 0.55, 0.06, 16), hat, 0, 2.78, 0)
  part(s, new ConeGeometry(0.32, 0.85, 12), hat, 0.05, 3.2, -0.05, -0.15, 0, 0.15)
  part(s, new CylinderGeometry(0.33, 0.33, 0.1, 14), mat('#ff8a1c'), 0, 2.86, 0)
}

// A skeleton sitting on a crate, facing +X.
function skeleton(g, x, z) {
  const s = new Group()
  s.position.set(x, 0, z)
  s.rotation.y = PI / 2
  g.add(s)
  const bone = mat('#f2ecdc', { roughness: 0.55 })
  const dark = mat('#2a2230')
  part(s, new BoxGeometry(0.9, 0.7, 0.9), mat('#9a6436', { roughness: 0.85 }), 0, 0.35, -0.15)
  part(s, new CylinderGeometry(0.05, 0.05, 0.75, 6), bone, 0, 1.12, -0.25)
  for (let i = 0; i < 4; i++) part(s, new TorusGeometry(0.2 - i * 0.02, 0.03, 5, 12, PI * 1.4), bone, 0, 0.95 + i * 0.13, -0.18, PI / 2, 0, PI * 0.3)
  part(s, new SphereGeometry(0.24, 14, 10), bone, 0, 1.68, -0.2)
  part(s, new BoxGeometry(0.26, 0.14, 0.2), bone, 0, 1.5, -0.1)
  for (const k of [-1, 1]) {
    part(s, new SphereGeometry(0.06, 8, 6), dark, k * 0.09, 1.7, -0.0)
    part(s, new CapsuleGeometry(0.04, 0.42, 4, 6), bone, k * 0.18, 0.8, 0.1, PI / 2, 0, 0)
    part(s, new CapsuleGeometry(0.035, 0.42, 4, 6), bone, k * 0.18, 0.5, 0.33)
    part(s, new CapsuleGeometry(0.035, 0.45, 4, 6), bone, k * 0.28, 1.08, -0.1, 0.4, 0, k * 0.25)
  }
}

function crate(g, x, y, z, rand, withPumpkin = true) {
  const c = new Group()
  c.position.set(x, y, z)
  c.rotation.y = rand() * PI
  g.add(c)
  part(c, new BoxGeometry(0.9, 0.7, 0.9), mat('#a8743e', { roughness: 0.85 }), 0, 0.35, 0)
  for (const s of [-1, 1]) {
    part(c, new BoxGeometry(0.94, 0.1, 0.94), mat('#7a4a26'), 0, s > 0 ? 0.66 : 0.05, 0)
  }
  if (withPumpkin) {
    const p = pumpkin(0.3, rand() < 0.5, rand)
    p.position.y = 0.7
    c.add(p)
  }
}

function hay(g, x, y, z, rand) {
  const h = new Group()
  h.position.set(x, y, z)
  h.rotation.y = rand() * PI
  g.add(h)
  part(h, new BoxGeometry(1.3, 0.7, 0.8), mat('#e6c35a', { roughness: 1 }), 0, 0.35, 0)
  for (const s of [-0.35, 0.35]) part(h, new BoxGeometry(0.06, 0.72, 0.82), mat('#a8743e'), s, 0.35, 0)
  const p = pumpkin(0.28, false, rand)
  p.position.set(0.2, 0.7, 0)
  h.add(p)
}

export function buildPatch(root) {
  const P = LOBBY.patch
  const T = LOBBY.showroom.terrace
  const y = T.height
  const rand = mulberry32(77)
  const g = new Group()
  g.position.y = y
  root.add(g)

  // Fence round the patch; the gate is in the east side.
  const gate = [(P.minZ + P.maxZ) / 2 - 1.4, (P.minZ + P.maxZ) / 2 + 1.4]
  picketFence(g, P.minX, P.minZ, P.maxX, P.minZ)
  picketFence(g, P.minX, P.maxZ, P.maxX, P.maxZ)
  picketFence(g, P.minX, P.minZ, P.minX, P.maxZ)
  picketFence(g, P.maxX, P.minZ, P.maxX, P.maxZ, gate)
  const midZ = (P.minZ + P.maxZ) / 2
  solidBox((P.maxX - P.minX) / 2, 0.6, 0.08, (P.minX + P.maxX) / 2, y + 0.6, P.minZ)
  solidBox((P.maxX - P.minX) / 2, 0.6, 0.08, (P.minX + P.maxX) / 2, y + 0.6, P.maxZ)
  solidBox(0.08, 0.6, (P.maxZ - P.minZ) / 2, P.minX, y + 0.6, midZ)
  for (const [a, b] of [[P.minZ, gate[0]], [gate[1], P.maxZ]]) solidBox(0.08, 0.6, (b - a) / 2, P.maxX, y + 0.6, (a + b) / 2)
  patchSign(g, P.maxX + 0.35, midZ)

  // Dirt beds (north-south) with furrow ridges, a plot every few metres.
  const soil = mat('#5a3a1e', { roughness: 1 })
  const ridge = mat('#6e4a28', { roughness: 1 })
  const leaf = mat('#3fa82e', { roughness: 0.6 })
  const plots = []
  const bedW = 1.9
  const span = P.maxX - P.minX
  for (let b = 0; b < P.beds; b++) {
    const bx = P.minX + (span * (b + 0.5)) / P.beds
    const z0 = P.minZ + 1
    const z1 = P.maxZ - 1
    part(g, new BoxGeometry(bedW, 0.22, z1 - z0), soil, bx, 0.11, (z0 + z1) / 2)
    for (const s of [-1, 1]) part(g, new BoxGeometry(0.16, 0.3, z1 - z0), ridge, bx + s * (bedW / 2 - 0.08), 0.15, (z0 + z1) / 2)
    for (let i = 0; i < P.plotsPerBed; i++) {
      const pz = z0 + ((z1 - z0) * (i + 0.5)) / P.plotsPerBed
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + rand()
        part(g, new BoxGeometry(0.42, 0.06, 0.26), leaf, bx + Math.cos(a) * 0.35, 0.26, pz + Math.sin(a) * 0.35, 0, -a, 0)
      }
      part(g, new CylinderGeometry(0.03, 0.03, 0.8, 5), leaf, bx + 0.3, 0.6, pz - 0.2, 0.4, 0, 0.3)
      const pk = pumpkin(0.42, true, rand)
      pk.position.set(bx, 0.22, pz)
      pk.rotation.y = PI / 2 + (rand() - 0.5) * 0.6
      bakeInPlace(pk)
      pk.userData.live = true
      g.add(pk)
      plots.push({ group: pk, x: bx, y: y + 0.22, z: pz })
    }
  }

  scarecrow(g, P.minX + 0.7, P.minZ + 1.4, rand)
  scarecrow(g, P.minX + 0.7, P.maxZ - 1.4, rand)
  skeleton(g, T.maxX - 1.6, T.minZ + 0.9)
  crate(g, T.maxX - 3.4, 0, T.minZ + 0.9, rand)
  crate(g, P.maxX + 1.4, 0, P.minZ - 0.6, rand)
  hay(g, P.maxX + 1.6, 0, P.maxZ + 0.9, rand)
  crate(g, -31, -y, -3.2, rand)
  hay(g, -36, -y, -3.6, rand)
  crate(g, -44.5, -y, -1, rand, false)
  // Cube trees: on the hub floor round the terrace, one on the terrace itself.
  const ground = new Group()
  root.add(ground)
  for (const [x, z, s] of [[-27.5, -3.6, 1], [-45, 6, 1.15], [-45.5, 19, 1.25], [-44.5, 31, 1.1]]) cubeTree(ground, x, z, s)
  cubeTree(g, -39.5, 25, 0.95)
  bakeInPlace(ground)
  bakeInPlace(g)

  return {
    plots,
    // t: 0..1 growth; a ripe pumpkin is full size and bobs a little.
    setGrowth(plot, t, elapsed) {
      const k = t >= 1 ? 1 + Math.sin(elapsed * 4 + plot.z) * 0.04 : 0.2 + 0.7 * t
      plot.group.scale.setScalar(k)
    },
  }
}
