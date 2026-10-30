import {
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Path,
  PlaneGeometry,
  PointLight,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { EGGS as EGG_DEFS, LOBBY, PET_KINDS } from '../config.js'
import { fmt } from '../hud.js'
import { bakeInPlace } from '../bake.js'
import { neon, solidBox } from '../propkit.js'
import { TITLE_FONT, titleFontReady } from './fonts.js'
import { mat, PLATES } from './kit.js'
import { Billboard, hexIcon, trophyIcon } from './labels.js'
import { part } from './props.js'

// The south end of the hub, in front of the waterfall wall: four leaderboards,
// the pet egg row with the golden cat statue in the middle, the WORLD 2 portal
// and the game's logo sign.

const PI = Math.PI
const BODY_FONT = '"Fredoka", "Arial Black", sans-serif'
const faceToward = (x, z, tx, tz) => Math.atan2(tx - x, tz - z) // yaw that turns local +Z toward (tx, tz)

// --- Leaderboards ------------------------------------------------------------------
const BOARD_W = 8
const BOARD_H = 6
const BOARD_BOTTOM = 2.3

function hashColor(name) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `hsl(${h % 360}, 70%, 60%)`
}

function boardTexture(title) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 768
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  let rows = []
  const draw = () => {
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, 768)
    g.addColorStop(0, '#22893d')
    g.addColorStop(1, '#176b2f')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 1024, 768)
    ctx.strokeStyle = '#46b860'
    ctx.lineWidth = 10
    ctx.strokeRect(14, 14, 996, 740)
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.font = `700 64px ${BODY_FONT}`
    ctx.textAlign = 'center'
    ctx.lineWidth = 10
    ctx.strokeStyle = '#0d3a18'
    ctx.strokeText(title, 512, 70)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(title, 512, 70)
    const top = 130
    const rh = (768 - top - 24) / 9
    for (let i = 0; i < 9; i++) {
      const r = rows[i]
      const y = top + rh * (i + 0.5)
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)'
        ctx.fillRect(28, y - rh / 2, 968, rh)
      }
      ctx.textAlign = 'left'
      ctx.font = `700 40px ${BODY_FONT}`
      ctx.lineWidth = 7
      ctx.strokeStyle = '#0d3a18'
      const rank = `#${i + 1}`
      ctx.strokeText(rank, 40, y)
      ctx.fillStyle = i === 0 ? '#ffd23a' : i === 1 ? '#e6e6f0' : i === 2 ? '#ffae5c' : '#ffffff'
      ctx.fillText(rank, 40, y)
      if (!r) continue
      // Little avatar head.
      ctx.fillStyle = hashColor(r.name)
      ctx.beginPath()
      ctx.arc(140, y, 24, 0, PI * 2)
      ctx.fill()
      ctx.lineWidth = 4
      ctx.strokeStyle = '#0d3a18'
      ctx.stroke()
      ctx.fillStyle = '#16131f'
      ctx.fillRect(130, y - 6, 5, 8)
      ctx.fillRect(146, y - 6, 5, 8)
      ctx.font = `${r.you ? 700 : 600} 40px ${BODY_FONT}`
      ctx.lineWidth = 7
      ctx.strokeText(r.name, 180, y)
      ctx.fillStyle = r.you ? '#ffe14a' : '#9fe6ff'
      ctx.fillText(r.name, 180, y)
      ctx.textAlign = 'right'
      ctx.strokeText(r.value, 990, y)
      ctx.fillStyle = '#ffe68a'
      ctx.fillText(r.value, 990, y)
    }
    tex.needsUpdate = true
  }
  draw()
  titleFontReady.then(draw)
  return {
    tex,
    set(next) {
      rows = next
      draw()
    },
  }
}

// The slanted handwritten-style title floating over a board.
function headerPlane(text, width) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 220
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  const draw = () => {
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, 1024, 220)
    ctx.save()
    ctx.translate(512, 120)
    ctx.rotate(-0.04)
    ctx.font = `italic 700 118px ${BODY_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 20
    ctx.strokeStyle = '#16131f'
    ctx.strokeText(text, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(text, 0, 0)
    ctx.restore()
    tex.needsUpdate = true
  }
  draw()
  titleFontReady.then(draw)
  const m = new Mesh(new PlaneGeometry(width, (width * 220) / 1024), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
  m.userData.live = true
  return m
}

function buildBoard(root, def, titles) {
  const g = new Group()
  g.position.set(def.x, 0, def.z)
  g.rotation.y = faceToward(def.x, def.z, 0, 4)
  root.add(g)
  const n = titles.length
  const W = BOARD_W * n + 0.3 * (n - 1)
  const wood = mat('#7a4a26', { roughness: 0.85 })
  const woodDark = mat('#5a3519', { roughness: 0.9 })
  part(g, new BoxGeometry(W + 0.7, BOARD_H + 0.7, 0.4), wood, 0, BOARD_BOTTOM + BOARD_H / 2, -0.2)
  part(g, new BoxGeometry(W + 1.1, 0.35, 0.7), woodDark, 0, BOARD_BOTTOM + BOARD_H + 0.45, -0.1)
  for (const s of [-1, 1]) part(g, new BoxGeometry(0.45, BOARD_BOTTOM + 0.4, 0.45), woodDark, s * (W / 2 - 0.4), (BOARD_BOTTOM + 0.4) / 2, -0.2)
  if (n > 1) part(g, new BoxGeometry(0.3, BOARD_H, 0.45), wood, 0, BOARD_BOTTOM + BOARD_H / 2, -0.05)
  const screens = titles.map((title, i) => {
    const t = boardTexture(title)
    const x = -W / 2 + BOARD_W / 2 + i * (BOARD_W + 0.3)
    const screen = new Mesh(new PlaneGeometry(BOARD_W, BOARD_H), new MeshStandardMaterial({ map: t.tex, emissive: '#ffffff', emissiveMap: t.tex, emissiveIntensity: 0.35, roughness: 0.9 }))
    screen.position.set(x, BOARD_BOTTOM + BOARD_H / 2, 0.01)
    screen.userData.live = true
    g.add(screen)
    const head = headerPlane(title, BOARD_W * 0.92)
    head.position.set(x, BOARD_BOTTOM + BOARD_H + 1.6, 0)
    g.add(head)
    return t
  })
  bakeInPlace(g)
  const half = (W + 0.7) / 2
  const c = Math.cos(g.rotation.y)
  const s = Math.sin(g.rotation.y)
  solidBox(half, (BOARD_BOTTOM + BOARD_H) / 2 + 0.3, 0.35, def.x - s * 0.2, (BOARD_BOTTOM + BOARD_H) / 2 + 0.3, def.z - c * 0.2, g.rotation.y)
  return screens
}

// --- Eggs -------------------------------------------------------------------------------
function eggGeometry(rx = 0.95, top = 1.3, bottom = 0.95) {
  const pts = []
  for (let i = 0; i <= 22; i++) {
    const t = -PI / 2 + (i / 22) * PI
    pts.push(new Vector2(Math.cos(t) * rx * (t > 0 ? 1 : 1.06), Math.sin(t) * (t > 0 ? top : bottom)))
  }
  return new LatheGeometry(pts, 36)
}

// Rainbow: horizontal colour bands as vertex colours.
function rainbowEgg() {
  const g = eggGeometry()
  const bands = ['#ff4d6d', '#ff9a3a', '#ffe14a', '#5cff8a', '#4ac8ff', '#9a6bff']
  const pos = g.attributes.position
  const cols = []
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + 0.95) / 2.25
    c.set(bands[Math.min(bands.length - 1, Math.floor(t * bands.length))])
    cols.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(cols, 3))
  return g
}

const EGGS = [
  { key: 'common', name: 'COMMON', shell: '#efe3d0', spots: '#d8c4a6', top: '#ffffff', side: '#3a8fe0', cost: `${fmt(EGG_DEFS.common.price)} Wins`, nameColor: '#ffffff' },
  { key: 'uncommon', name: 'UNCOMMON', shell: '#58e35c', spots: '#3cc444', top: '#5ff062', side: '#2aa834', cost: `${fmt(EGG_DEFS.uncommon.price)} Wins`, nameColor: '#7dff7a' },
  { key: 'rare', name: 'RARE', shell: '#5fe0ff', spots: '#3cc4ef', top: '#4ad8ff', side: '#2a7fe0', cost: `${fmt(EGG_DEFS.rare.price)} Wins`, nameColor: '#4ad8ff' },
  { key: 'rainbow', name: 'RAINBOW EGG', top: '#ff5fd0', side: '#c42aa8', cost: '45', premium: true },
]

function buildEgg(root, def, x, z) {
  const g = new Group()
  g.position.set(x, 0, z)
  root.add(g)
  part(g, new RoundedBoxGeometry(3.2, 0.5, 3.2, 2, 0.08), mat(def.side, { roughness: 0.5 }), 0, 0.25, 0)
  part(g, new BoxGeometry(2.8, 0.08, 2.8), mat(def.top, { roughness: 0.45 }), 0, 0.52, 0)
  solidBox(1.6, 0.25, 1.6, x, 0.25, z)
  const egg = new Group()
  egg.position.y = 1.55
  g.add(egg)
  if (def.premium) part(egg, rainbowEgg(), new MeshStandardMaterial({ vertexColors: true, roughness: 0.25 }))
  else {
    part(egg, eggGeometry(), mat(def.shell, { roughness: 0.3 }))
    // A few darker spots on the shell.
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4
      const y = -0.4 + (i % 4) * 0.4
      const r = Math.cos(Math.asin(Math.max(-0.95, Math.min(0.95, y / 1.2)))) * 0.93
      part(egg, new SphereGeometry(0.16, 10, 8), mat(def.spots, { roughness: 0.35 }), Math.cos(a) * r, y, Math.sin(a) * r).scale.set(1, 1, 0.35)
    }
  }
  bakeInPlace(egg)
  egg.userData.live = true
  bakeInPlace(g)
  const label = new Billboard(
    def.premium
      ? [
          { text: def.name, size: 40, gradient: ['#ff6b8a', '#ffd23a', '#5cff8a', '#4ad8ff'], outline: '#16131f' },
          { text: def.cost, size: 34, color: '#ffffff', icon: hexIcon, font: 'body' },
        ]
      : [
          { text: def.name, size: 40, color: def.nameColor },
          { text: def.cost, size: 34, color: '#ffd23a', icon: trophyIcon, font: 'body' },
        ],
    1.3,
  )
  label.sprite.position.set(0, 3.25, 0)
  g.add(label.sprite)
  return { key: def.key, egg, x, z, phase: x }
}

// --- The golden cat on its throne (the limited pet showcase) ------------------------------
function buildStatue(root, x, z) {
  const g = new Group()
  g.position.set(x, 0, z) // the face is on local -Z: north, toward the hub
  root.add(g)
  const gold = mat('#ffc928', { metalness: 0.8, roughness: 0.28 })
  const goldDark = mat('#d99a12', { metalness: 0.8, roughness: 0.35 })
  part(g, new BoxGeometry(4.4, 0.6, 3.6), goldDark, 0, 0.3, 0)
  part(g, new BoxGeometry(3.8, 0.5, 3.0), gold, 0, 0.85, 0)
  part(g, new RoundedBoxGeometry(3.2, 0.35, 2.4, 2, 0.12), mat('#d8263b', { roughness: 0.6 }), 0, 1.25, 0)
  solidBox(2.2, 0.7, 1.8, x, 0.7, z)
  const cat = new Group()
  cat.position.y = 2.75
  g.add(cat)
  // Sun-ray spikes fanning out behind the head.
  for (let i = 0; i < 11; i++) {
    const a = -1.25 + (i / 10) * 2.5
    const sp = part(cat, new ConeGeometry(0.28, 1.7, 6), i % 2 ? gold : goldDark, Math.sin(a) * 1.7, 0.2 + Math.cos(a) * 1.5, 0.75)
    sp.rotation.z = -a
  }
  const fur = mat('#ffae2e', { roughness: 0.5 })
  part(cat, new RoundedBoxGeometry(2.7, 2.2, 2.1, 4, 0.55), fur, 0, 0, 0)
  for (const s of [-1, 1]) {
    part(cat, new ConeGeometry(0.5, 0.9, 4), fur, s * 0.85, 1.25, 0, 0, PI / 4, -s * 0.25)
    part(cat, new ConeGeometry(0.28, 0.5, 4), mat('#ff8fb0'), s * 0.85, 1.2, -0.12, 0, PI / 4, -s * 0.25)
    // Eyes: big black ovals with two white glints.
    part(cat, new SphereGeometry(0.3, 16, 12), mat('#16131f', { roughness: 0.2 }), s * 0.5, 0.15, -1.03).scale.set(0.9, 1.15, 0.4)
    part(cat, new SphereGeometry(0.09, 8, 6), mat('#ffffff'), s * 0.5 + 0.09, 0.27, -1.13)
    part(cat, new SphereGeometry(0.2, 10, 8), mat('#ff8fb0'), s * 0.92, -0.35, -0.98).scale.set(1, 0.6, 0.3)
  }
  part(cat, new RoundedBoxGeometry(1.1, 0.6, 0.3, 2, 0.12), mat('#ffe2a8'), 0, -0.45, -1.02)
  part(cat, new SphereGeometry(0.09, 8, 6), mat('#ff6b8a'), 0, -0.3, -1.18)
  // Crown with gems.
  part(cat, new CylinderGeometry(0.75, 0.68, 0.45, 20, 1, true), gold, 0, 1.3, 0)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2
    part(cat, new ConeGeometry(0.17, 0.5, 6), gold, Math.cos(a) * 0.7, 1.75, Math.sin(a) * 0.7)
    part(cat, new SphereGeometry(0.09, 8, 6), neon(i % 2 ? '#ff3a5a' : '#3ab6ff', 2.4), Math.cos(a + 0.45) * 0.73, 1.3, Math.sin(a + 0.45) * 0.73)
  }
  bakeInPlace(cat)
  cat.userData.live = true
  bakeInPlace(g)
  const label = new Billboard(
    [
      { text: 'NEW UNLIMITED', size: 40, gradient: ['#b6ff5c', '#2fe06a'], outline: '#06301a' },
      { text: `Admin Egg · x${PET_KINDS.adminPhoenix.mult} SKILL`, size: 30, color: '#ffffff', font: 'body' },
    ],
    1.4,
  )
  label.sprite.position.set(0, 5.6, 0)
  g.add(label.sprite)
  const light = new PointLight('#ffc040', 6, 9, 2)
  light.position.set(0, 3, -2)
  g.add(light)
  return { cat, x, z }
}

// --- WORLD 2 portal -------------------------------------------------------------------------
function swirlTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.25, '#7fe8ff')
  g.addColorStop(0.7, '#2a9cf0')
  g.addColorStop(1, '#1250b8')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  ctx.lineCap = 'round'
  for (let arm = 0; arm < 4; arm++) {
    ctx.strokeStyle = arm % 2 ? 'rgba(255,255,255,0.75)' : 'rgba(150,235,255,0.6)'
    ctx.lineWidth = 9
    ctx.beginPath()
    for (let r = 4; r < 128; r += 2) {
      const a = (arm / 4) * PI * 2 + r * 0.05
      const px = 128 + Math.cos(a) * r
      const py = 128 + Math.sin(a) * r
      if (r === 4) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

function ring(outer, inner, sides, depth) {
  const s = new Shape()
  const hole = new Path()
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * PI * 2 + PI / sides
    const fn = i === 0 ? 'moveTo' : 'lineTo'
    s[fn](Math.cos(a) * outer, Math.sin(a) * outer)
    hole[fn](Math.cos(a) * inner, Math.sin(a) * inner)
  }
  s.holes.push(hole)
  return new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 1 }).translate(0, 0, -depth / 2)
}

function buildPortal(root, x, z) {
  const g = new Group()
  g.position.set(x, 0, z)
  g.rotation.y = faceToward(x, z, 0, 6)
  root.add(g)
  const R = 3.6
  const cy = R + 0.9
  part(g, new BoxGeometry(R * 2 + 1.5, 0.9, 2.4), PLATES.white(), 0, 0.45, 0)
  part(g, ring(R, R - 0.85, 8, 1.1), mat('#e8893a', { roughness: 0.55 }), 0, cy, 0)
  part(g, ring(R - 0.75, R - 1.15, 8, 1.3), mat('#ffb45a', { roughness: 0.5 }), 0, cy, 0)
  part(g, ring(R + 0.15, R - 0.05, 8, 0.6), mat('#a8561c', { roughness: 0.6 }), 0, cy, -0.1)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8
    part(g, new SphereGeometry(0.16, 8, 6), mat('#ffd28a', { roughness: 0.4 }), Math.cos(a) * (R - 0.42), cy + Math.sin(a) * (R - 0.42), 0.62)
  }
  bakeInPlace(g)
  const swirlMat = new MeshBasicMaterial({ map: swirlTexture() })
  swirlMat.color.setScalar(1.5)
  const swirl = new Mesh(new CylinderGeometry(R - 1.05, R - 1.05, 0.1, 40).rotateX(PI / 2), swirlMat)
  swirl.position.set(0, cy, 0)
  g.add(swirl)
  solidBox(R + 0.75, cy, 1.2, x, cy, z, g.rotation.y)
  const label = new Billboard(
    [
      { text: 'WORLD 2', size: 66, gradient: ['#fff27a', '#ffc21a', '#ff9a0a'], outline: '#3a2408' },
      { text: 'Reach 100M Skill', size: 44, color: '#ffffff', font: 'body' },
    ],
    2.1,
  )
  label.sprite.position.set(0, cy + R + 0.6, 0)
  g.add(label.sprite)
  const light = new PointLight('#4ac8ff', 8, 12, 2)
  light.position.set(0, cy, 1.5)
  g.add(light)
  const c = Math.cos(g.rotation.y)
  const s = Math.sin(g.rotation.y)
  return { swirl, x, z, center: { x, y: cy, z }, front: { x: x + s * 1.6, z: z + c * 1.6 }, radius: R - 1.05, yaw: g.rotation.y }
}

// --- CLAP TO DESTROY logo sign --------------------------------------------------------------
function buildLogoSign(root, x, z) {
  const g = new Group()
  g.position.set(x, 0, z)
  g.rotation.y = faceToward(x, z, 0, 4)
  root.add(g)
  part(g, new BoxGeometry(0.3, 2.2, 0.3), mat('#5a3519'), 0, 1.1, -0.1)
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 320
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  const draw = () => {
    const ctx = c.getContext('2d')
    const gr = ctx.createLinearGradient(0, 0, 0, 320)
    gr.addColorStop(0, '#3ab0ff')
    gr.addColorStop(1, '#1a6fd8')
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, 512, 320)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 12
    ctx.strokeRect(6, 6, 500, 308)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.font = `92px ${TITLE_FONT}`
    for (const [t, y] of [['CLAP TO', 92], ['DESTROY', 190]]) {
      ctx.lineWidth = 16
      ctx.strokeStyle = '#0a2a6a'
      ctx.strokeText(t, 256, y)
      ctx.fillStyle = '#ffe14a'
      ctx.fillText(t, 256, y)
    }
    ctx.font = `700 30px ${BODY_FONT}`
    ctx.fillStyle = '#d6efff'
    ctx.fillText('CLAP · SMASH · UPGRADE', 256, 270)
    tex.needsUpdate = true
  }
  draw()
  titleFontReady.then(draw)
  const face = new MeshStandardMaterial({ map: tex, roughness: 0.6 })
  const edge = mat('#ffffff')
  part(g, new BoxGeometry(3.6, 2.25, 0.2), [edge, edge, edge, edge, face, edge], 0, 3.2, 0)
  bakeInPlace(g)
  solidBox(0.3, 1.1, 0.3, x, 1.1, z)
}

export function buildPlaza(root) {
  const { eggRow, boards, logoSign, portal } = LOBBY
  const screens = {}
  for (const b of boards) {
    const titles = b.id === 'double' ? ['Top Time Played', 'Top Robux Spent'] : [b.id === 'level' ? 'Top Level' : 'Top Wins']
    const made = buildBoard(root, b, titles)
    if (b.id === 'double') {
      screens.time = made[0]
      screens.spent = made[1]
    } else screens[b.id] = made[0]
  }
  const eggs = EGGS.map((def) => buildEgg(root, def, eggRow[def.key], eggRow.z))
  const statue = buildStatue(root, eggRow.statue, eggRow.z)
  const gate = buildPortal(root, portal.x, portal.z)
  buildLogoSign(root, logoSign.x, logoSign.z)

  return {
    // rows: [{ name, value (string), you }] in rank order, up to 9.
    setBoard(id, rows) {
      screens[id]?.set(rows)
    },
    eggs,
    statue,
    portal: gate,
    update(dt, elapsed) {
      for (const e of eggs) {
        e.egg.rotation.y += dt * 0.6
        e.egg.position.y = 1.55 + Math.sin(elapsed * 1.5 + e.phase) * 0.1
      }
      statue.cat.position.y = 2.75 + Math.sin(elapsed * 1.2) * 0.08
      gate.swirl.rotation.z -= dt * 1.4
    },
  }
}

