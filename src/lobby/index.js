import { BoxGeometry, Color, Group } from 'three'
import { DESTROYABLES, LOBBY } from '../config.js'
import { bake, bakeInPlace } from '../bake.js'
import { mulberry32 } from '../textures.js'
import { buildPhoenix, buildShowroom, showroomFloor } from './gauntlets.js'
import { buildCandyCorner, buildEgg, buildGiftSpot, buildLuckyBlock, buildSigns } from './landmarks.js'
import { buildLanes } from './lanes.js'
import { buildPatch } from './patch.js'
import { buildPlaza } from './plaza.js'
import { arrow3D, BEACH_PROPS, blockTree, chevron, flower, palm, part, pumpkin, pumpkinPost } from './props.js'
import { buildSkyline } from './skyline.js'
import { buildTerrain } from './terrain.js'
import { mat } from './kit.js'

// Builds the whole lobby and hands game.js the interactive parts:
// destroyables (beach props), showroom plinths, training pads, the gift spot
// and the hidden pumpkins. Static dressing is baked to a few meshes.

const SMASH_COLORS = {
  ball: ['#ffffff', '#ee4f9e', '#9c5cf0', '#f2c230'],
  towel: ['#df2a2e', '#ffffff'],
  cooler: ['#2f7fe0', '#ffffff'],
  umbrella: ['#3ccf4e', '#ffffff', '#ffd23a'],
  castle: ['#e8c98c', '#d9b574'],
  bigCastle: ['#e8c98c', '#d9b574', '#c9a464'],
  hut: ['#b98150', '#e5312c', '#ffffff'],
  lifeguard: ['#d8262b', '#f6f6f6'],
}
const SOLID_KINDS = new Set(['castle', 'bigCastle', 'hut', 'lifeguard'])

// Kinds by how deep into the beach a row is (later rows get the big ones).
function pickKind(rand, depth) {
  const r = rand()
  if (depth < 60) return r < 0.3 ? 'ball' : r < 0.5 ? 'towel' : r < 0.68 ? 'umbrella' : r < 0.82 ? 'cooler' : r < 0.95 ? 'castle' : 'bigCastle'
  if (depth < 150) return r < 0.2 ? 'ball' : r < 0.32 ? 'umbrella' : r < 0.44 ? 'cooler' : r < 0.66 ? 'castle' : r < 0.8 ? 'bigCastle' : r < 0.92 ? 'hut' : 'lifeguard'
  return r < 0.12 ? 'ball' : r < 0.3 ? 'castle' : r < 0.55 ? 'bigCastle' : r < 0.78 ? 'hut' : 'lifeguard'
}

export function buildLobby(scene, lighting, fx) {
  const root = new Group()
  scene.add(root)
  const terrain = buildTerrain(root)
  const skyline = buildSkyline(scene)
  const rand = mulberry32(2026)

  // --- Landmarks ---
  const egg = buildEgg(root)
  const lucky = buildLuckyBlock(root)
  const phoenix = buildPhoenix(root)
  const showroom = buildShowroom(root)
  const gift = buildGiftSpot(root)
  const laneRow = buildLanes(root, fx)
  const pads = laneRow.lanes
  const plaza = buildPlaza(root)
  buildSigns(root)
  buildCandyCorner(root)
  const patch = buildPatch(root)

  // --- Static dressing (baked) ---
  const decor = new Group()
  for (const z of LOBBY.chevrons) {
    const c = chevron()
    c.position.set(0, 0, z)
    decor.add(c)
  }
  const hubPosts = [[-3.9, -0.9], [3.9, -0.9], [9.2, -0.4], [-5.2, 9.5], [5.2, 9.5], [-26, -1.2], [13.6, 1.2], [13.6, 7.8], [13.6, 14.6], [16.5, 25], [-6.5, 26], [-6.2, 16.5]]
  const beachPosts = []
  for (let z = -14; z > LOBBY.beach.minZ + 6; z -= 32) beachPosts.push([-14.6, z], [14.6, z - 16])
  for (const [x, z] of [...hubPosts, ...beachPosts]) {
    const p = pumpkinPost(rand)
    p.position.set(x, 0, z)
    decor.add(p)
  }
  // Night lamps in the first few hub posts (lighting.js switches them on).
  const bulb = { emissiveIntensity: 0 }
  for (const [x, z] of hubPosts.slice(0, 6)) lighting.addLamp(x, 3.1, z, bulb)

  // The pumpkin field on the east grass (not the Pumpkin Patch garden, see patch.js).
  const pumpkinField = [[9.8, 10.5, 1.25], [11.8, 8.8, 0.55], [8, 12.8, 0.6], [12.2, 11.8, 0.65], [10.6, 13.6, 0.5], [7.2, 8.6, 0.45], [12.4, 15.6, 0.5], [8.2, 16.4, 0.45], [6.6, 6.2, 0.4], [-28, 30, 0.6], [44, 26, 0.5], [45, 31, 0.7]]
  for (const [x, z, r] of pumpkinField) {
    const p = pumpkin(r, r > 0.5, rand)
    p.position.set(x, 0, z)
    p.rotation.y = -0.6 + (rand() - 0.5) * 0.8
    decor.add(p)
  }
  for (const [x, z] of [[-2.3, 7.4], [6.6, 16.5], [-7.2, 20.5], [14.6, 4.4], [-2, -3.8]]) {
    const f = flower()
    f.position.set(x, 0, z)
    decor.add(f)
  }
  part(decor, new BoxGeometry(0.95, 0.95, 0.95), mat('#ececf0'), 5.8, 0.475, 9.5, 0, 0.35, 0)
  const arrowWrap = new Group()
  arrowWrap.position.set(11.2, 0.08, 4.6)
  arrowWrap.rotation.y = -1.3
  const arr = arrow3D()
  arr.rotation.x = -Math.PI / 2 + 0.25
  arrowWrap.add(arr)
  decor.add(arrowWrap)
  root.add(bake(decor, true))

  // Palms by the beach entrance and along the sand edges.
  const palms = new Group()
  for (const [x, z] of [[-13, -9.5], [13.4, -9.2], [-12.8, -36], [13, -58], [-13.4, -84], [13.2, -112], [-13, -140], [13.4, -168], [-13.2, -196], [13, -226], [-13.4, -256], [13, -282]]) {
    const p = palm(rand, 5.5 + rand() * 1.5)
    p.position.set(x, 0, z)
    p.rotation.y = rand() * Math.PI * 2
    palms.add(p)
  }
  root.add(bake(palms, true))

  // Blocky trees on every cliff top.
  const trees = new Group()
  const tree = (x, y, z, s = 1) => {
    const t = blockTree(rand, s)
    t.position.set(x, y, z)
    trees.add(t)
  }
  const { cliffLow, cliffHigh, hubWalls, hub } = LOBBY
  for (const s of [-1, 1]) {
    for (let z = -12; z > -296; z -= 13 + rand() * 6) tree(s * (26 + rand() * 6), cliffLow.height, z)
    for (let i = 0; i < 26; i++) tree(s * (38 + rand() * 60), cliffHigh.height, -14 - rand() * 290, 1.2)
    for (let i = 0; i < 12; i++) tree(s * (hub.maxX + 4 + rand() * 40), hubWalls.side, -4 + rand() * 90, 1.4)
  }
  root.add(bake(trees, false)) // spans the whole map: no shadow pass for it

  // --- Destroyables on the beach ---
  const destroyables = []
  const placed = []
  const place = (kind, x, z) => {
    const g = BEACH_PROPS[kind](rand)
    const radius = g.userData.radius ?? 1.5
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + radius)) return
    placed.push({ x, z, r: radius })
    const baked = bake(g, true)
    baked.position.set(x, 0, z)
    baked.rotation.y = g.rotation.y
    root.add(baked)
    const depth = Math.max(0, -z + LOBBY.beach.maxZ)
    const k = 1 + depth / DESTROYABLES.depthScale
    const def = DESTROYABLES.kinds[kind]
    destroyables.push({
      kind,
      group: baked,
      x,
      z,
      radius,
      height: g.userData.height ?? 1.5,
      maxHp: Math.round(def.hp * k),
      wins: Math.max(1, Math.round(def.wins * k)),
      colors: SMASH_COLORS[kind],
      solid: SOLID_KINDS.has(kind) ? { hx: radius * 0.55, hy: (g.userData.height ?? 2) / 2 } : null,
      bob: kind === 'ball' ? { speed: 2 + rand(), phase: rand() * 6 } : null,
    })
  }
  // The entrance, as in the reference.
  place('bigCastle', -1.5, -19)
  place('ball', -4.8, -11)
  place('ball', 3.2, -10.5)
  place('ball', -9, -14.5)
  place('towel', 6, -11.5)
  place('towel', 3, -24)
  place('umbrella', 6.8, -19.5)
  place('umbrella', -10, -21)
  place('hut', 12, -18)
  place('lifeguard', 10.8, -27)
  place('castle', -7, -27)
  place('cooler', -12, -12)
  for (let z = -33; z > LOBBY.beach.minZ + 6; z -= 9 + rand() * 4) {
    const n = 2 + Math.floor(rand() * 2)
    for (let i = 0; i < n; i++) place(pickKind(rand, -z), -12.5 + rand() * 25, z - rand() * 4)
  }

  // --- Hidden pumpkins ---
  const pumpkins = LOBBY.pumpkinSpots.map(([x, z]) => {
    const y = showroomFloor(x, z)
    const p = pumpkin(0.42, true, rand)
    p.position.set(x, y, z)
    bakeInPlace(p)
    root.add(p)
    return { group: p, x, y, z }
  })

  // --- Ambient emitters ---
  const c = new Color()
  fx.addEmitter(45, (n) => {
    const e = phoenix.emitter
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const r = e.radius * (0.5 + Math.random() * 0.6)
      const hot = Math.random()
      c.setRGB(1.6, 0.35 + hot * 0.7, 0.05)
      fx.glow.emit({ x: e.x + Math.cos(a) * r, y: e.y - 0.4 + Math.random() * 1.2, z: e.z + Math.sin(a) * r, vx: Math.cos(a) * 0.4, vy: 1.8 + Math.random() * 2, vz: Math.sin(a) * 0.4, color: c, size: 0.5 + Math.random() * 0.5, life: 0.5 + Math.random() * 0.4, grow: -0.7, drag: 0.5 })
    }
  })
  fx.addEmitter(10, (n) => {
    const e = phoenix.emitter
    for (let i = 0; i < n; i++) {
      c.setRGB(3.4, 1.8, 0.4)
      fx.sparks.emit({ x: e.x + (Math.random() - 0.5) * 2, y: e.y, z: e.z + (Math.random() - 0.5) * 2, vx: (Math.random() - 0.5) * 1.5, vy: 3 + Math.random() * 3, vz: (Math.random() - 0.5) * 1.5, color: c, size: 0.25, life: 1.1, drag: 0.6, spin: 4 })
    }
  })
  fx.addEmitter(12, (n) => {
    const e = egg.emitter
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      c.setRGB(0.25, 0.95 + Math.random() * 0.3, 0.35)
      fx.shards.emit({ x: e.x + Math.cos(a) * e.radius, y: e.y + Math.random() * 2.2, z: e.z + Math.sin(a) * e.radius, vx: -Math.sin(a) * 0.5, vy: 0.5 + Math.random() * 0.5, vz: Math.cos(a) * 0.5, color: c, size: 0.22 + Math.random() * 0.2, life: 2.4, spin: 3 })
    }
  })
  fx.addEmitter(9, (n) => {
    const e = lucky.emitter
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      c.setRGB(3.2, 2.5, 0.6)
      fx.sparks.emit({ x: e.x + Math.cos(a) * e.radius, y: e.y + (Math.random() - 0.5) * 3, z: e.z + Math.sin(a) * e.radius, vy: 0.8, color: c, size: 0.4 + Math.random() * 0.3, life: 1.2, spin: 2 })
    }
  })
  fx.addEmitter(5, (n) => {
    for (let i = 0; i < n; i++) {
      const p = pumpkins[Math.floor(Math.random() * pumpkins.length)]
      if (!p.group.visible) continue
      c.setRGB(3, 1.6, 0.3)
      fx.sparks.emit({ x: p.x + (Math.random() - 0.5) * 1.2, y: p.y + 0.4 + Math.random() * 0.6, z: p.z + (Math.random() - 0.5) * 1.2, vy: 0.7, color: c, size: 0.35, life: 1, spin: 3 })
    }
  })

  // Waterfall splash + mist at the pool.
  const sp = terrain.splash
  fx.addEmitter(26, (n) => {
    for (let i = 0; i < n; i++) {
      const x = sp.x + (Math.random() - 0.5) * sp.width
      c.setRGB(1.4, 1.7, 1.9)
      fx.glow.emit({ x, y: sp.y, z: sp.z, vx: (Math.random() - 0.5) * 1.2, vy: 1.5 + Math.random() * 2.5, vz: -0.6 - Math.random() * 1.2, color: c, size: 1.2 + Math.random() * 1.2, life: 0.9, gravity: -4, drag: 0.8, grow: 1.2 })
    }
  })
  // Gold glints round the cat statue, rainbow sparkles on the rainbow egg, the portal's swirl.
  fx.addEmitter(6, (n) => {
    const s = plaza.statue
    for (let i = 0; i < n; i++) {
      c.setRGB(3.2, 2.5, 0.8)
      fx.sparks.emit({ x: s.x + (Math.random() - 0.5) * 3.4, y: 1.5 + Math.random() * 3.5, z: s.z + (Math.random() - 0.5) * 2, vy: 0.4, color: c, size: 0.45, life: 1.1, spin: 3 })
    }
  })
  const rainbow = [[3, 0.6, 0.8], [3, 1.8, 0.4], [1, 3, 1.2], [0.6, 1.8, 3], [2, 0.8, 3]]
  fx.addEmitter(6, (n) => {
    const e = plaza.eggs[plaza.eggs.length - 1]
    for (let i = 0; i < n; i++) {
      c.setRGB(...rainbow[Math.floor(Math.random() * rainbow.length)])
      fx.sparks.emit({ x: e.x + (Math.random() - 0.5) * 2.2, y: 0.8 + Math.random() * 2.2, z: e.z + (Math.random() - 0.5) * 2.2, vy: 0.5, color: c, size: 0.35, life: 1.2, spin: 3 })
    }
  })
  fx.addEmitter(16, (n) => {
    const p = plaza.portal
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const r = p.radius * (0.4 + Math.random() * 0.6)
      c.setRGB(0.8, 2.2, 3.2)
      // Spiral inward on the portal face.
      const lx = Math.cos(a) * r
      const ly = Math.sin(a) * r
      const cs = Math.cos(p.yaw)
      const sn = Math.sin(p.yaw)
      fx.sparks.emit({ x: p.center.x + lx * cs + sn * 0.3, y: p.center.y + ly, z: p.center.z - lx * sn + cs * 0.3, vx: -lx * 0.6 * cs, vy: -ly * 0.6, vz: lx * 0.6 * sn, color: c, size: 0.35, life: 0.9, spin: 4 })
    }
  })

  // Ripe patch pumpkins sparkle.
  fx.addEmitter(10, (n) => {
    for (let i = 0; i < n; i++) {
      const p = patch.plots[Math.floor(Math.random() * patch.plots.length)]
      if (!p.ripe) continue
      c.setRGB(3.2, 1.8, 0.4)
      fx.sparks.emit({ x: p.x + (Math.random() - 0.5), y: p.y + 0.3 + Math.random() * 0.8, z: p.z + (Math.random() - 0.5), vy: 0.8, color: c, size: 0.35, life: 0.9, spin: 3 })
    }
  })

  return {
    destroyables,
    plaza,
    patch,
    phoenix: LOBBY.phoenix,
    showroom,
    pads,
    gift,
    pumpkins,
    update(dt, elapsed, focus) {
      terrain.update(dt, elapsed)
      skyline.update(focus)
      egg.update(dt, elapsed)
      lucky.update(dt, elapsed)
      phoenix.update(dt, elapsed)
      showroom.update(dt, elapsed)
      gift.update(dt, elapsed)
      plaza.update(dt, elapsed)
      laneRow.update(dt, elapsed)
      for (const p of pumpkins) p.group.rotation.y += dt * 0.8
    },
  }
}
