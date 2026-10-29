import {
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  SRGBColorSpace,
} from 'three'
import { LOBBY } from '../config.js'
import { bakeInPlace } from '../bake.js'
import { neon, solidBox } from '../propkit.js'
import { mulberry32, toTexture } from '../textures.js'
import { titleFontReady } from './fonts.js'
import { mat } from './kit.js'
import { Billboard, ballIcon } from './labels.js'
import { part } from './props.js'

// The training lanes on the east side (LOBBY.lanes): long themed treadmills
// running from the hub to the east wall, each with its fence, a tilted plaque
// at the entrance, a sign over the far end and, for the special ones, a gate
// (crystal arch, torii + cherry tree, royal crown arch, neon ADMIN gate).
// The floors scroll toward the entrance like a running belt.

const PI = Math.PI
const TILE = 2.5 // m of lane per floor texture repeat
const BODY_FONT = '"Fredoka", "Arial Black", sans-serif'

// --- Floor painters (256 px square, u = along the lane) ------------------------------
function canvas(w = 256, h = 256) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function planks(a, b, seed) {
  const rand = mulberry32(seed)
  const c = canvas()
  const ctx = c.getContext('2d')
  const rows = 5
  const h = 256 / rows
  for (let r = 0; r < rows; r++) {
    let x = -rand() * 120
    while (x < 256) {
      const w = 90 + rand() * 90
      ctx.fillStyle = rand() < 0.5 ? a : b
      ctx.fillRect(x, r * h, w, h)
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(x, r * h, 3, h)
      x += w
    }
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(0, r * h, 256, 3)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(0, r * h + 3, 256, 3)
  }
  return c
}

function tiles(a, grout, shine) {
  const c = canvas()
  const ctx = c.getContext('2d')
  ctx.fillStyle = grout
  ctx.fillRect(0, 0, 256, 256)
  const n = 4
  const s = 256 / n
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const g = ctx.createLinearGradient(x * s, y * s, x * s + s, y * s + s)
      g.addColorStop(0, shine)
      g.addColorStop(0.45, a)
      g.addColorStop(1, a)
      ctx.fillStyle = g
      ctx.fillRect(x * s + 3, y * s + 3, s - 6, s - 6)
    }
  }
  return c
}

function petals() {
  const rand = mulberry32(88)
  const c = canvas()
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#ffe4ee'
  ctx.fillRect(0, 0, 256, 256)
  const cols = ['#ff9ec4', '#ffffff', '#ff7ab0', '#ffc6dc']
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = cols[i % cols.length]
    ctx.beginPath()
    ctx.ellipse(rand() * 256, rand() * 256, 3 + rand() * 4, 2 + rand() * 2, rand() * PI, 0, PI * 2)
    ctx.fill()
  }
  return c
}

function carpet() {
  const c = canvas()
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#d3141f'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = 'rgba(120,0,10,0.45)'
  ctx.lineWidth = 3
  for (let i = -256; i < 512; i += 42) {
    ctx.beginPath()
    ctx.moveTo(i, 30)
    ctx.lineTo(i + 196, 226)
    ctx.moveTo(i + 196, 30)
    ctx.lineTo(i, 226)
    ctx.stroke()
  }
  ctx.fillStyle = '#ffcf3a'
  ctx.fillRect(0, 8, 256, 10)
  ctx.fillRect(0, 238, 256, 10)
  return c
}

// Admin floor: black panels with a grid of green lights (second canvas = glow only).
function neonDots() {
  const c = canvas()
  const glow = canvas()
  const ctx = c.getContext('2d')
  const gtx = glow.getContext('2d')
  ctx.fillStyle = '#0d1210'
  ctx.fillRect(0, 0, 256, 256)
  gtx.fillStyle = '#000'
  gtx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#1c2a22'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, 252, 252)
  for (let y = 32; y < 256; y += 64) {
    for (let x = 32; x < 256; x += 64) {
      for (const g of [ctx, gtx]) {
        g.fillStyle = '#3dff6a'
        g.beginPath()
        g.arc(x, y, 7, 0, PI * 2)
        g.fill()
      }
    }
  }
  return { color: c, glow }
}

const THEMES = {
  sand: { floor: () => planks('#ecd5a2', '#e1c58a', 3), border: '#caa066', post: '#8a5a2e', plaque: '#2fbf4a', fence: true },
  ice: { floor: () => tiles('#7fd3ff', '#e8f8ff', '#c9f0ff'), border: '#45aef5', post: '#8a5a2e', plaque: '#22c3e6', fence: true },
  wood: { floor: () => planks('#9a6436', '#85532b', 7), border: '#8a4fd0', post: '#6e4224', plaque: '#8a4fd0', fence: true },
  crystal: { floor: () => tiles('#a8ecff', '#ffffff', '#e8fbff'), border: '#2f8fe8', post: '#dff4ff', plaque: '#2f6fe8', fence: true },
  sakura: { floor: petals, border: '#d8262b', post: '#c41e24', plaque: '#d8262b', fence: true },
  royal: { floor: carpet, border: '#ffc928', post: '#ffc928', plaque: '#d8262b', metal: true, fence: true },
  admin: { floor: neonDots, border: '#0f1a14', post: '#16301f', plaque: '#0b0f0d', neon: '#3dff6a', fence: true },
}

// --- Entrance plaque: a tilted slab with the lane's tag painted on top -----------------------
function plaque(theme, tag, width) {
  const g = new Group()
  const c = canvas(512, Math.round((512 * 1.8) / width))
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  const lines = tag.split('\n')
  const draw = () => {
    const ctx = c.getContext('2d')
    ctx.fillStyle = theme.plaque
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = theme.neon ?? 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 14
    ctx.strokeRect(7, 7, c.width - 14, c.height - 14)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    const big = c.height * (lines.length > 1 ? 0.42 : 0.6)
    lines.forEach((t, i) => {
      const size = lines.length > 1 && i === 0 ? big * 0.6 : big
      const y = lines.length > 1 ? c.height * (i === 0 ? 0.3 : 0.68) : c.height / 2
      ctx.font = `700 ${size}px ${BODY_FONT}`
      ctx.lineWidth = size * 0.16
      ctx.strokeStyle = '#16131f'
      ctx.strokeText(t, c.width / 2, y)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(t, c.width / 2, y)
    })
    tex.needsUpdate = true
  }
  draw()
  titleFontReady.then(draw)
  const slab = mat(theme.plaque, { roughness: 0.5 })
  part(g, new BoxGeometry(1.8, 0.24, width), slab, 0, 0, 0)
  const face = new Mesh(new PlaneGeometry(width - 0.08, 1.72), new MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: theme.neon ? 0.5 : 0.15 }))
  face.rotation.set(-PI / 2, -PI / 2, 0, 'YXZ') // lies on top, text upright for someone walking east
  face.position.y = 0.125
  g.add(face)
  g.rotation.z = 0.28 // top tipped toward the hub
  return g
}

// --- Far-end gates ----------------------------------------------------------------------
function crystalGate(g, x, z, w) {
  const white = mat('#eef9ff', { roughness: 0.3 })
  const blue = mat('#4fb4ff', { roughness: 0.3 })
  for (const s of [-1, 1]) {
    part(g, new BoxGeometry(0.32, 3.2, 0.32), white, x, 1.8, z + s * (w / 2 + 0.1))
    part(g, new ConeGeometry(0.22, 0.6, 4), blue, x, 3.7, z + s * (w / 2 + 0.1))
  }
  part(g, new BoxGeometry(0.4, 0.34, w + 0.9), blue, x, 3.3, z)
  part(g, new BoxGeometry(0.12, 0.12, w), neon('#9fe8ff', 2.4), x, 3.05, z).castShadow = false
}

function torii(g, x, z, w) {
  const red = mat('#d8262b', { roughness: 0.5 })
  const black = mat('#1d1a1d', { roughness: 0.6 })
  for (const s of [-1, 1]) part(g, new CylinderGeometry(0.17, 0.2, 3.8, 12), red, x, 2.1, z + s * (w / 2 + 0.05))
  part(g, new BoxGeometry(0.34, 0.28, w + 1.0), red, x, 3.45, z)
  part(g, new BoxGeometry(0.42, 0.24, w + 1.8), black, x, 4.05, z)
  for (const s of [-1, 1]) part(g, new BoxGeometry(0.42, 0.24, 0.6), black, x, 4.17, z + s * (w / 2 + 0.95), s * 0.25, 0, 0)
  part(g, new BoxGeometry(0.3, 0.3, w + 0.5), red, x, 3.8, z)
  part(g, new BoxGeometry(0.2, 0.55, 0.5), black, x - 0.05, 3.55, z)
}

function cherryTree(g, x, z, rand) {
  part(g, new CylinderGeometry(0.22, 0.34, 3.6, 8), mat('#6e4224', { roughness: 0.9 }), x, 1.8, z, 0, 0, 0.12)
  part(g, new CylinderGeometry(0.12, 0.16, 1.6, 6), mat('#6e4224', { roughness: 0.9 }), x - 0.5, 3.6, z + 0.4, 0.5, 0, 0.6)
  const pinks = [mat('#ffb3d1', { flatShading: true, roughness: 0.6 }), mat('#ff8fbf', { flatShading: true, roughness: 0.6 }), mat('#ffe0ec', { flatShading: true, roughness: 0.6 })]
  for (let i = 0; i < 11; i++) {
    const a = rand() * PI * 2
    const r = rand() * 1.5
    part(g, new DodecahedronGeometry(0.7 + rand() * 0.7), pinks[i % 3], x - 0.3 + Math.cos(a) * r, 4.3 + rand() * 1.4, z + Math.sin(a) * r)
  }
}

function royalArch(g, x, z, w) {
  const gold = mat('#ffc928', { metalness: 0.8, roughness: 0.28 })
  for (const s of [-1, 1]) {
    part(g, new CylinderGeometry(0.2, 0.24, 3.6, 12), gold, x, 2.0, z + s * (w / 2 + 0.1))
    part(g, new SphereGeometry(0.3, 12, 10), gold, x, 3.95, z + s * (w / 2 + 0.1))
  }
  part(g, new BoxGeometry(0.36, 0.36, w + 0.7), gold, x, 3.6, z)
  part(g, new BoxGeometry(0.1, 1.6, w - 0.2), mat('#b0101a', { roughness: 0.8 }), x + 0.05, 2.75, z)
  part(g, new CylinderGeometry(0.55, 0.5, 0.4, 16, 1, true), gold, x, 4.15, z)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2
    part(g, new ConeGeometry(0.12, 0.4, 6), gold, x + Math.cos(a) * 0.5, 4.55, z + Math.sin(a) * 0.5)
  }
  part(g, new SphereGeometry(0.12, 8, 6), neon('#ff3a5a', 2.6), x - 0.5, 4.15, z)
}

function handScreen() {
  const c = canvas(256, 256)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#04140a'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#3dff6a'
  ctx.lineWidth = 8
  ctx.strokeRect(10, 10, 236, 236)
  ctx.fillStyle = '#3dff6a'
  // A raised palm: four fingers, a thumb, the palm.
  ctx.beginPath()
  ctx.roundRect(78, 120, 100, 80, 26)
  ctx.fill()
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.roundRect(80 + i * 25, 52 + (i === 0 || i === 3 ? 18 : 0), 20, 90, 10)
    ctx.fill()
  }
  ctx.save()
  ctx.translate(180, 150)
  ctx.rotate(0.6)
  ctx.beginPath()
  ctx.roundRect(-10, -48, 22, 60, 11)
  ctx.fill()
  ctx.restore()
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function adminGate(g, x, z, w) {
  const dark = mat('#0f1a14', { roughness: 0.4, metalness: 0.4 })
  const glowM = neon('#3dff6a', 3)
  for (const s of [-1, 1]) {
    part(g, new BoxGeometry(0.4, 3.8, 0.4), dark, x, 1.9, z + s * (w / 2 + 0.15))
    part(g, new BoxGeometry(0.08, 3.8, 0.08), glowM, x - 0.22, 1.9, z + s * (w / 2 + 0.15)).castShadow = false
  }
  part(g, new BoxGeometry(0.4, 0.4, w + 0.7), dark, x, 3.9, z)
  part(g, new BoxGeometry(0.08, 0.08, w + 0.7), glowM, x - 0.22, 3.9, z).castShadow = false
  const screenMat = new MeshBasicMaterial({ map: handScreen() })
  screenMat.color.setScalar(1.6)
  const screen = new Mesh(new PlaneGeometry(1.6, 1.6), screenMat)
  screen.position.set(x - 0.21, 2.85, z)
  screen.rotation.y = -PI / 2
  g.add(screen)
}

// Big cube-canopy trees (between the lane ends and the wall; also used west).
export function cubeTree(g, x, z, s) {
  part(g, new BoxGeometry(0.7 * s, 4 * s, 0.7 * s), mat('#7a4b25', { roughness: 0.9 }), x, 2 * s, z)
  part(g, new BoxGeometry(3.6 * s, 2.6 * s, 3.6 * s), mat('#86dd36'), x, 4.6 * s, z)
  part(g, new BoxGeometry(2.4 * s, 1.4 * s, 2.4 * s), mat('#9cec4a'), x + 0.3 * s, 6.4 * s, z - 0.2 * s)
}

export function buildLanes(root, fx) {
  const L = LOBBY.lanes
  const len = L.maxX - L.minX
  const cx = (L.minX + L.maxX) / 2
  const border = (L.pitch - L.width) / 2 - 0.07
  const g = new Group()
  root.add(g)
  const rand = mulberry32(31)
  const scrolls = []
  const ends = []

  const lanes = L.list.map((def, i) => {
    const theme = THEMES[def.theme]
    const z = L.z0 + i * L.pitch
    const floorArt = theme.floor()
    const colorCanvas = floorArt.color ?? floorArt
    const map = toTexture(colorCanvas, { srgb: true })
    map.repeat.set(len / TILE, 1)
    const floorMat = new MeshStandardMaterial({ map, roughness: def.theme === 'ice' || def.theme === 'crystal' ? 0.18 : 0.7, metalness: 0 })
    if (floorArt.glow) {
      const em = toTexture(floorArt.glow, { srgb: true })
      em.repeat.copy(map.repeat)
      floorMat.emissive.set('#ffffff')
      floorMat.emissiveMap = em
      floorMat.emissiveIntensity = 2.2
      scrolls.push(em)
    }
    scrolls.push(map)
    const floor = new Mesh(new PlaneGeometry(len, L.width).rotateX(-PI / 2), floorMat)
    floor.position.set(cx, 0.21, z)
    floor.receiveShadow = true
    floor.userData.live = true
    g.add(floor)

    const borderMat = theme.metal ? mat(theme.border, { metalness: 0.75, roughness: 0.3 }) : mat(theme.border, { roughness: 0.55 })
    const postMat = theme.metal ? mat(theme.post, { metalness: 0.75, roughness: 0.3 }) : mat(theme.post, { roughness: 0.8 })
    part(g, new BoxGeometry(len + 0.3, 0.2, L.width + 0.1), mat('#5a5a66'), cx, 0.1, z)
    for (const s of [-1, 1]) {
      const bz = z + s * (L.width / 2 + border / 2)
      part(g, new BoxGeometry(len + 0.3, 0.42, border), borderMat, cx, 0.21, bz)
      if (theme.neon) part(g, new BoxGeometry(len + 0.3, 0.05, 0.08), neon(theme.neon, 3), cx, 0.44, bz).castShadow = false
      // Fence: posts + two rails along the outer side of the border.
      const fz = bz + s * (border / 2 - 0.1)
      for (let k = 0; k <= Math.floor(len / 2.8); k++) {
        const px = L.minX + 0.2 + k * 2.8
        if (px > L.maxX) break
        part(g, new BoxGeometry(0.16, 0.95, 0.16), postMat, px, 0.9, fz)
        if (theme.neon) part(g, new BoxGeometry(0.18, 0.08, 0.18), neon(theme.neon, 3), px, 1.42, fz).castShadow = false
      }
      part(g, new BoxGeometry(len, 0.09, 0.09), postMat, cx, 1.25, fz)
      part(g, new BoxGeometry(len, 0.09, 0.09), postMat, cx, 0.85, fz)
      solidBox(len / 2, 0.7, border / 2, cx, 0.7, bz)
    }
    const pq = plaque(theme, def.tag, L.width + 0.5)
    pq.position.set(L.minX - 1.05, 0.38, z)
    g.add(pq)

    const ex = L.maxX - 0.8
    if (def.theme === 'crystal') crystalGate(g, ex, z, L.width)
    if (def.theme === 'sakura') {
      torii(g, ex, z, L.width)
      cherryTree(g, L.maxX + 2.6, z + 0.6, rand)
    }
    if (def.theme === 'royal') royalArch(g, ex, z, L.width)
    if (def.theme === 'admin') adminGate(g, ex, z, L.width)
    if (def.theme === 'admin' || def.theme === 'royal') {
      const light = new PointLight(def.theme === 'admin' ? '#3dff6a' : '#ffc040', 7, 10, 2)
      light.position.set(ex - 1, 2.6, z)
      g.add(light)
    }
    ends.push({ theme: def.theme, x: ex, z })

    const label = new Billboard([], 1.15)
    label.sprite.position.set(L.maxX - 3.2, 3.2, z)
    root.add(label.sprite)
    const setOpen = (open) => {
      const lines = [
        { text: `${def.rebirths}`, size: 32, color: '#ffffff', icon: ballIcon, font: 'body', pill: 'rgba(22,22,30,0.85)' },
        { text: open ? 'UNLOCKED' : 'LOCKED', size: 28, color: open ? '#5cff6a' : '#ff3b3b' },
        { text: `${def.mult}x SKILL`, size: 60, color: '#ffffff' },
      ]
      if (def.allWorlds) lines.unshift({ text: 'ALL WORLDS', size: 22, color: '#ffffff', font: 'body' })
      label.set(lines)
    }
    setOpen(def.rebirths === 0)
    return { def, x: cx, z, halfW: len / 2, halfD: L.width / 2, setOpen, open: null }
  })

  // Trees between the lane ends and the east wall.
  const zMin = L.z0 - L.pitch / 2
  const zMax = L.z0 + (L.list.length - 0.5) * L.pitch
  for (let z = zMin; z <= zMax; z += 5.2) cubeTree(g, L.maxX + 4 + rand() * 1.5, z + rand(), 0.9 + rand() * 0.35)
  cubeTree(g, L.minX - 3, zMin - 2.5, 1)
  bakeInPlace(g)

  // --- Effects: sakura petals drifting off the tree, admin sparks, royal glints, crystal frost ---
  const c = new Color()
  const at = (theme) => ends.find((e) => e.theme === theme)
  const sak = at('sakura')
  const adm = at('admin')
  const roy = at('royal')
  const cry = at('crystal')
  fx.addEmitter(16, (n) => {
    for (let i = 0; i < n; i++) {
      c.set(i % 3 ? '#ff9ec4' : '#ffe0ec')
      fx.shards.emit({ x: sak.x + 2 + Math.random() * 2, y: 4 + Math.random() * 2, z: sak.z + (Math.random() - 0.5) * 3, vx: -1.2 - Math.random() * 1.5, vy: -0.6, vz: (Math.random() - 0.5) * 0.6, color: c, size: 0.22, life: 5, spin: 5 })
    }
  })
  fx.addEmitter(14, (n) => {
    for (let i = 0; i < n; i++) {
      c.setRGB(0.6, 3.2, 1.0)
      fx.sparks.emit({ x: L.minX + Math.random() * len, y: 0.35, z: adm.z + (Math.random() - 0.5) * L.width, vy: 1 + Math.random() * 1.5, color: c, size: 0.3, life: 1, spin: 3 })
    }
  })
  fx.addEmitter(7, (n) => {
    for (let i = 0; i < n; i++) {
      c.setRGB(3.2, 2.5, 0.7)
      fx.sparks.emit({ x: L.minX + Math.random() * len, y: 0.4 + Math.random(), z: roy.z + (Math.random() - 0.5) * L.width, vy: 0.5, color: c, size: 0.35, life: 1.1, spin: 3 })
    }
  })
  fx.addEmitter(6, (n) => {
    for (let i = 0; i < n; i++) {
      c.setRGB(2, 2.6, 3)
      fx.sparks.emit({ x: cry.x + (Math.random() - 0.5) * 0.6, y: 0.5 + Math.random() * 3, z: cry.z + (Math.random() - 0.5) * L.width, vy: 0.3, color: c, size: 0.3, life: 1.2, spin: 2 })
    }
  })

  return {
    lanes,
    update(dt, elapsed) {
      for (const t of scrolls) t.offset.x = elapsed * 0.35 // belts run toward the entrance
    },
  }
}
