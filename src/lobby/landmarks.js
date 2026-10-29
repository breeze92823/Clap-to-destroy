import {
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { bakeInPlace } from '../bake.js'
import { LOBBY } from '../config.js'
import { neon, solidBox } from '../propkit.js'
import { paintHexShell, paintPlanks, toTexture } from '../textures.js'
import { TITLE_FONT, titleFontReady } from './fonts.js'
import { mat, PLATES } from './kit.js'
import { Billboard, giftIcon, umbrellaIcon } from './labels.js'
import { part } from './props.js'

const PI = Math.PI

// --- Admin Egg --------------------------------------------------------------------
// A dark green hex-plated egg with glowing seams and a tilted gold crown, on a
// bright green studded pedestal.
export function buildEgg(root) {
  const { x, z } = LOBBY.egg
  const g = new Group()
  g.position.set(x, 0, z)
  root.add(g)
  part(g, new RoundedBoxGeometry(4.6, 0.5, 4.6, 2, 0.1), PLATES.green(), 0, 0.25, 0)
  for (const s of [-1, 1]) {
    part(g, new BoxGeometry(4.62, 0.08, 0.12), neon('#7dff7a'), 0, 0.5, s * 2.26).castShadow = false
    part(g, new BoxGeometry(0.12, 0.08, 4.62), neon('#7dff7a'), s * 2.26, 0.5, 0).castShadow = false
  }
  solidBox(2.3, 0.25, 2.3, x, 0.25, z)

  // Egg: a lathe profile, fatter at the bottom.
  const pts = []
  for (let i = 0; i <= 24; i++) {
    const t = -PI / 2 + (i / 24) * PI
    const top = t > 0
    pts.push(new Vector2(Math.cos(t) * (top ? 1.0 : 1.08), Math.sin(t) * (top ? 1.45 : 1.05)))
  }
  const shell = paintHexShell(512, 8)
  const eggMat = new MeshStandardMaterial({
    map: toTexture(shell.color, { srgb: true }),
    emissive: '#3dff6e',
    emissiveMap: toTexture(shell.emissive, { srgb: true }),
    emissiveIntensity: 2.6,
    roughness: 0.28,
    metalness: 0.15,
  })
  eggMat.map.repeat.set(1, 1)
  const egg = new Group()
  egg.position.y = 1.95
  g.add(egg)
  part(egg, new LatheGeometry(pts, 40), eggMat, 0, 0, 0).scale.setScalar(1.15)

  // Crown, tipped over to one side.
  const crown = new Group()
  crown.position.set(0.12, 1.52, 0)
  crown.rotation.set(0.1, 0, -0.28)
  egg.add(crown)
  const gold = mat('#ffc928', { metalness: 0.85, roughness: 0.28 })
  part(crown, new CylinderGeometry(0.52, 0.46, 0.34, 24, 1, true), gold, 0, 0.17, 0)
  part(crown, new TorusGeometry(0.49, 0.05, 8, 24), gold, 0, 0.02, 0, PI / 2)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2
    part(crown, new ConeGeometry(0.13, 0.45, 6), gold, Math.cos(a) * 0.48, 0.55, Math.sin(a) * 0.48)
    part(crown, new SphereGeometry(0.065, 8, 6), gold, Math.cos(a) * 0.48, 0.8, Math.sin(a) * 0.48)
    part(crown, new SphereGeometry(0.07, 8, 6), neon(i % 2 ? '#ff3a5a' : '#3ab6ff', 2.4), Math.cos(a + PI / 6) * 0.5, 0.17, Math.sin(a + PI / 6) * 0.5)
  }

  bakeInPlace(egg)
  egg.userData.live = true
  bakeInPlace(g)
  const label = new Billboard(
    [
      { text: 'Admin Egg', size: 64, color: '#ffffff', font: 'body' },
      { text: 'Limited · Special pets', size: 42, color: '#4dffd2', outline: '#0b2e5a', font: 'body' },
    ],
    1.55,
  )
  label.sprite.position.set(0, 5.4, 0)
  g.add(label.sprite)
  const light = new PointLight('#4dff7a', 6, 9, 2)
  light.position.set(0, 2.2, 1.8)
  g.add(light)

  return {
    emitter: { x, y: 1.2, z, radius: 2.0 },
    update(dt, elapsed) {
      egg.rotation.y += dt * 0.5
      egg.position.y = 1.95 + Math.sin(elapsed * 1.4) * 0.12
      eggMat.emissiveIntensity = 2.4 + Math.sin(elapsed * 2.2) * 0.8
    },
  }
}

// --- Lucky block -----------------------------------------------------------------------
// The big orange cube with glowing yellow edges and a yellow square on every face.
export function buildLuckyBlock(root) {
  const { x, z, size } = LOBBY.luckyBlock
  const g = new Group()
  g.position.set(x, size / 2 + 0.45, z)
  root.add(g)
  const cube = new Group()
  g.add(cube)
  const s = size
  part(cube, new BoxGeometry(s * 0.94, s * 0.94, s * 0.94), mat('#ff7a0a', { roughness: 0.45, emissive: '#ff4a00', emissiveIntensity: 0.12 }), 0, 0, 0)
  const edge = neon('#ffd21f', 2.5)
  const e = s * 0.1
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      part(cube, new BoxGeometry(s + e * 0.4, e, e), edge, 0, (a * s) / 2, (b * s) / 2).castShadow = false
      part(cube, new BoxGeometry(e, s + e * 0.4, e), edge, (a * s) / 2, 0, (b * s) / 2).castShadow = false
      part(cube, new BoxGeometry(e, e, s + e * 0.4), edge, (a * s) / 2, (b * s) / 2, 0).castShadow = false
    }
  }
  const inner = mat('#e05a00', { roughness: 0.5 })
  const face = neon('#ffcc12', 2.2)
  const dirs = [[0, 0, 1, 0, 0], [0, 0, -1, 0, PI], [1, 0, 0, 0, PI / 2], [-1, 0, 0, 0, -PI / 2], [0, 1, 0, -PI / 2, 0], [0, -1, 0, PI / 2, 0]]
  for (const [dx, dy, dz, rx, ry] of dirs) {
    const f = new Group()
    f.position.set((dx * s) / 2, (dy * s) / 2, (dz * s) / 2)
    f.rotation.set(rx, ry, 0)
    cube.add(f)
    part(f, new PlaneGeometry(s * 0.56, s * 0.56), inner, 0, 0, 0.003)
    part(f, new PlaneGeometry(s * 0.3, s * 0.3), face, 0, 0, 0.006).castShadow = false
  }
  bakeInPlace(cube)
  solidBox(s / 2, s / 2 + 0.22, s / 2, x, s / 2 + 0.22, z)
  const light = new PointLight('#ff9a1a', 8, 12, 2)
  g.add(light)
  return {
    emitter: { x, y: s / 2 + 0.45, z, radius: s * 0.7 },
    update(dt, elapsed) {
      cube.rotation.y += dt * 0.35
      cube.position.y = Math.sin(elapsed * 1.2) * 0.15
      light.intensity = 7 + Math.sin(elapsed * 3) * 2
    },
  }
}

// --- Signs ------------------------------------------------------------------------------

// Wooden board on two posts with painted text + an icon (the BEACH signs).
let plankTex = null
function boardSign(text, icon, width = 6.5, height = 1.7) {
  plankTex ||= toTexture(paintPlanks(256, 4, 21).color, { srgb: true })
  const g = new Group()
  const wood = mat('#6e4224', { roughness: 0.85 })
  for (const s of [-1, 1]) part(g, new BoxGeometry(0.28, 3.2, 0.28), wood, s * width * 0.36, 1.6, 0)
  const c = document.createElement('canvas')
  c.width = 512
  c.height = Math.round((512 * height) / width)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  const draw = () => {
    const ctx = c.getContext('2d')
    ctx.drawImage(plankTex.image, 0, 0, c.width, c.height)
    ctx.fillStyle = 'rgba(70,40,15,0.25)'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#4a2a12'
    ctx.lineWidth = 10
    ctx.strokeRect(5, 5, c.width - 10, c.height - 10)
    const fs = c.height * 0.58
    ctx.font = `${fs}px ${TITLE_FONT}`
    ctx.textBaseline = 'middle'
    const tw = ctx.measureText(text).width
    const x0 = (c.width - tw - fs) / 2
    ctx.save()
    ctx.translate(x0 + fs * 0.4, c.height / 2)
    icon(ctx, fs)
    ctx.restore()
    ctx.lineJoin = 'round'
    ctx.lineWidth = fs * 0.16
    ctx.strokeStyle = '#2a1608'
    ctx.strokeText(text, x0 + fs, c.height / 2 + fs * 0.05)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(text, x0 + fs, c.height / 2 + fs * 0.05)
    tex.needsUpdate = true
  }
  draw()
  titleFontReady.then(draw)
  const boardMat = new MeshStandardMaterial({ map: tex, roughness: 0.8 })
  const back = mat('#7a4a26', { roughness: 0.85 })
  part(g, new BoxGeometry(width, height, 0.22), [back, back, back, back, boardMat, back], 0, 3.0, 0)
  bakeInPlace(g)
  return g
}

export function buildSigns(root) {
  const { channel, cliffLow } = LOBBY
  for (const s of [-1, 1]) {
    const sign = boardSign('BEACH', umbrellaIcon)
    sign.position.set(s * (channel.outer + 4.5), cliffLow.height, -7.6)
    sign.rotation.y = s * -0.25
    root.add(sign)
  }
}

// FREE REWARD: a red post with a gift on top and its floating label; standing
// next to it claims the timed gift (game.js).
export function buildGiftSpot(root) {
  const { x, z } = LOBBY.gift
  const g = new Group()
  g.position.set(x, 0, z)
  root.add(g)
  part(g, new CylinderGeometry(0.16, 0.2, 1.6, 10), mat('#d8262b'), 0, 0.8, 0)
  part(g, new CylinderGeometry(0.7, 0.8, 0.2, 16), mat('#d8262b'), 0, 0.1, 0)
  const box = new Group()
  box.position.y = 2.05
  g.add(box)
  part(box, new RoundedBoxGeometry(0.9, 0.7, 0.9, 2, 0.05), mat('#e8262d', { roughness: 0.4 }), 0, 0, 0)
  part(box, new BoxGeometry(0.2, 0.72, 0.92), mat('#ffd23a', { metalness: 0.3, roughness: 0.4 }), 0, 0, 0)
  part(box, new BoxGeometry(0.92, 0.72, 0.2), mat('#ffd23a', { metalness: 0.3, roughness: 0.4 }), 0, 0, 0)
  part(box, new TorusGeometry(0.16, 0.06, 6, 12), mat('#ffd23a'), -0.14, 0.44, 0, 0, 0, 0.6)
  part(box, new TorusGeometry(0.16, 0.06, 6, 12), mat('#ffd23a'), 0.14, 0.44, 0, 0, 0, -0.6)
  bakeInPlace(box)
  box.userData.live = true
  bakeInPlace(g)
  const label = new Billboard([{ text: 'FREE REWARD', size: 60, color: '#ffe68a', outline: '#9a0c12', icon: giftIcon }], 1.7)
  label.sprite.position.set(0, 2.7, 0)
  g.add(label.sprite)
  return {
    x,
    z,
    label,
    update(dt, elapsed) {
      box.rotation.y += dt * 1.2
      box.position.y = 2.05 + Math.sin(elapsed * 2) * 0.1
    },
  }
}

// --- Candy shop (on the terrace, south of the Pumpkin Patch, facing the hub) -------------------
export function buildCandyCorner(root) {
  const { x, z } = LOBBY.candyShop
  const y = LOBBY.showroom.terrace.height
  const g = new Group()
  g.position.set(x, y, z)
  g.rotation.y = PI / 2 // counter (local +Z) toward the hub (east)
  root.add(g)
  part(g, new BoxGeometry(4.6, 1.1, 2.0), mat('#ff8fc8', { roughness: 0.5 }), 0, 0.55, 0)
  part(g, new BoxGeometry(4.8, 0.14, 2.2), mat('#ffffff'), 0, 1.15, 0)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) part(g, new CylinderGeometry(0.1, 0.1, 0.4, 8), mat(i % 2 ? '#ffffff' : '#e8262d'), s * 2.1, 1.4 + i * 0.4, -0.8)
  }
  for (let i = 0; i < 10; i++) {
    const r = part(g, new BoxGeometry(0.5, 0.12, 2.4), mat(i % 2 ? '#ffffff' : '#ff4fa0'), -2.25 + i * 0.5, 3.75, 0)
    r.rotation.x = 0.28
  }
  for (let i = 0; i < 4; i++) {
    const lx = -1.5 + i
    part(g, new CylinderGeometry(0.03, 0.03, 0.6, 5), mat('#ffffff'), lx, 1.5, 0.3)
    part(g, new CylinderGeometry(0.22, 0.22, 0.08, 16), mat(['#ff4fa0', '#4dc6ff', '#ffd23a', '#7aff6a'][i], { roughness: 0.3 }), lx, 1.85, 0.3, PI / 2)
  }
  bakeInPlace(g)
  solidBox(1.0, 0.6, 2.3, x, y + 0.6, z)
  const label = new Billboard([{ text: 'Candy Shop', size: 56, gradient: ['#ffffff', '#ffd6ef'], outline: '#9a1660', font: 'body' }], 1.5)
  label.sprite.position.set(0, 4.3, 0)
  g.add(label.sprite)
}
