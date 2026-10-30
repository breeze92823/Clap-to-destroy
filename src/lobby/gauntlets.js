import { BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, OctahedronGeometry, PointLight, SphereGeometry, TorusGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { bakeInPlace } from '../bake.js'
import { GAUNTLETS, LOBBY, REWARD_GAUNTLETS } from '../config.js'
import { fmt } from '../hud.js'
import { glow, neon, solidBox } from '../propkit.js'
import { paintSoftDot, toTexture } from '../textures.js'
import { mat } from './kit.js'
import { Billboard } from './labels.js'
import { part } from './props.js'

// The gauntlets: a boxing-glove style mitt on a cuff, dressed per style, and
// the showroom of white plinths they spin on (with LOCKED / +Skill / Wins
// billboards), plus the Royal Phoenix on its red carpet.

const sphere = new SphereGeometry(1, 20, 14)
const PI = Math.PI
const PHOENIX = REWARD_GAUNTLETS.find((g) => g.id === 'phoenix')

export const STYLES = {
  classic: { hand: '#f5f5f7', cuff: '#f5f5f7', rim: '#2a5bd7', strap: '#d8263a' },
  aloha: { hand: '#3cc94b', cuff: '#e8434f', rim: '#ffffff', strap: '#ffd23a' },
  leather: { hand: '#8a4a22', cuff: '#5e3216', rim: '#c98a4a', strap: '#4a2410' },
  iron: { hand: '#5c6274', cuff: '#7a5638', rim: '#3d4150', strap: '#2e3140', metal: true },
  bone: { hand: '#2b2533', cuff: '#3b3044', rim: '#efe9dc', strap: '#1d1924' },
  ruby: { hand: '#d01f2d', cuff: '#7c0f19', rim: '#ffc933', strap: '#ffc933', gloss: true },
  knight: { hand: '#3b4769', cuff: '#2c3552', rim: '#ffcf3a', strap: '#22283f', metal: true },
  royal: { hand: '#1d1b24', cuff: '#2a2633', rim: '#ffcf3a', strap: '#ffcf3a', gloss: true },
  pink: { hand: '#ffc9d2', cuff: '#ffb0c0', rim: '#ffffff', strap: '#ff8fa8' },
  rust: { hand: '#6e2e1a', cuff: '#4a1d10', rim: '#c9763a', strap: '#8a2a1a' },
  blaze: { hand: '#ff9a1a', cuff: '#e0560e', rim: '#ffe14a', strap: '#ff6a10', gloss: true },
  gold: { hand: '#ffd23a', cuff: '#e6a51c', rim: '#fff3b0', strap: '#c98a12', metal: true },
  magma: { hand: '#221c1e', cuff: '#2d2426', rim: '#ff7a1a', strap: '#1a1416' },
  phoenix: { hand: '#e2361c', cuff: '#a8180f', rim: '#ffcf3a', strap: '#ff8a1c', gloss: true },
  dragon: { hand: '#8a1a10', cuff: '#3a0a08', rim: '#ffcf3a', strap: '#e2361c', gloss: true },
}

function styleMat(color, s) {
  if (s.metal) return mat(color, { metalness: 0.75, roughness: 0.32 })
  if (s.gloss) return mat(color, { roughness: 0.3 })
  return mat(color, { roughness: 0.55 })
}

// A glove about 2.3 m tall (origin under the cuff, knuckles facing +Z).
export function glove(style) {
  const s = STYLES[style]
  const g = new Group()
  const hand = styleMat(s.hand, s)
  const cuff = styleMat(s.cuff, s)
  const rim = s.rim === '#ffc933' || s.rim === '#ffcf3a' ? mat(s.rim, { metalness: 0.85, roughness: 0.25 }) : styleMat(s.rim, s)
  const strap = styleMat(s.strap, s)
  const flare = style === 'knight' || style === 'royal' ? 0.72 : 0.58

  part(g, new CylinderGeometry(0.5, flare, 0.82, 28), cuff, 0, 0.41, 0)
  part(g, new TorusGeometry(0.52, 0.075, 10, 28), rim, 0, 0.82, 0, PI / 2)
  part(g, new TorusGeometry(flare, 0.07, 10, 28), rim, 0, 0.04, 0, PI / 2)
  part(g, new CylinderGeometry(0.57, 0.57, 0.24, 28), strap, 0, 1.0, 0)

  part(g, sphere, hand, 0, 1.5, 0).scale.set(0.7, 0.8, 0.62)
  part(g, sphere, hand, 0, 1.8, 0.2).scale.set(0.62, 0.48, 0.5)
  const knuckle = style === 'bone' ? mat('#efe9dc') : hand
  for (let i = 0; i < 4; i++) part(g, sphere, knuckle, -0.33 + i * 0.22, 2.1, 0.24).scale.set(0.14, 0.13, 0.2)
  part(g, new CapsuleGeometry(0.17, 0.42, 6, 12), hand, 0.55, 1.38, 0.32, -0.5, 0, 0.62)

  switch (style) {
    case 'classic':
      for (const [y, c] of [[0.22, '#2a5bd7'], [0.42, '#ffffff'], [0.6, '#d8263a']]) part(g, new CylinderGeometry(0.535, 0.55, 0.12, 28), mat(c), 0, y, 0)
      break
    case 'aloha': {
      const petal = mat('#ffffff')
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * PI * 2
        part(g, sphere, petal, Math.cos(a) * 0.17, 1.5 + Math.sin(a) * 0.17, 0.6).scale.set(0.14, 0.14, 0.05)
      }
      part(g, sphere, mat('#ffd23a'), 0, 1.5, 0.63).scale.set(0.08, 0.08, 0.05)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * PI * 2
        part(g, sphere, petal, Math.cos(a) * 0.54, 0.45 + (i % 2) * 0.18, Math.sin(a) * 0.54).scale.setScalar(0.06)
      }
      break
    }
    case 'leather':
      for (let i = 0; i < 4; i++) part(g, new BoxGeometry(0.34, 0.04, 0.04), mat('#f0dcb0'), 0, 0.2 + i * 0.16, 0.56, 0, 0, i % 2 ? 0.5 : -0.5)
      break
    case 'iron':
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * PI * 2
        part(g, sphere, mat('#c9ccd6', { metalness: 0.8, roughness: 0.3 }), Math.cos(a) * 0.58, 1.0, Math.sin(a) * 0.58).scale.setScalar(0.05)
      }
      break
    case 'bone': {
      const bone = mat('#efe9dc', { roughness: 0.6 })
      for (let i = 0; i < 4; i++) part(g, new CapsuleGeometry(0.05, 0.34, 4, 8), bone, -0.3 + i * 0.2, 1.72, 0.55, 0.3, 0, 0)
      part(g, sphere, bone, 0, 0.45, 0.5).scale.set(0.2, 0.2, 0.12)
      for (const x of [-0.07, 0.07]) part(g, sphere, mat('#16131f'), x, 0.47, 0.6).scale.setScalar(0.045)
      break
    }
    case 'ruby':
      part(g, new OctahedronGeometry(0.16), neon('#ff2a4a'), 0, 1.0, 0.6).scale.set(1, 1.3, 0.6)
      break
    case 'knight': {
      const plate = mat('#8d9ab8', { metalness: 0.85, roughness: 0.25 })
      for (let i = 0; i < 3; i++) part(g, new TorusGeometry(0.6 - i * 0.04, 0.06, 8, 24, PI), plate, 0, 1.35 + i * 0.22, 0, 0, 0, 0)
      for (let i = 0; i < 4; i++) part(g, new ConeGeometry(0.06, 0.2, 6), plate, -0.33 + i * 0.22, 2.15, 0.36, PI / 2.6, 0, 0)
      break
    }
    case 'royal':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2
        part(g, new ConeGeometry(0.09, 0.3, 6), mat('#ffcf3a', { metalness: 0.85, roughness: 0.25 }), Math.cos(a) * 0.52, 0.98, Math.sin(a) * 0.52)
      }
      part(g, new OctahedronGeometry(0.18), neon('#b45cff'), 0, 1.5, 0.62).scale.set(1, 1.2, 0.6)
      break
    case 'gold':
      for (let i = 0; i < 3; i++) part(g, new TorusGeometry(0.535, 0.03, 6, 28), mat('#fff3b0', { metalness: 0.9, roughness: 0.2 }), 0, 0.25 + i * 0.2, 0, PI / 2)
      part(g, new OctahedronGeometry(0.15), neon('#5cff8a'), 0, 1.0, 0.6).scale.set(1, 1.2, 0.6)
      break
    case 'magma': {
      // Glowing lava cracks over the dark rock.
      const lava = neon('#ff6a10', 2.6)
      const veins = [[-0.3, 1.3, 0.55, 0.6], [0.15, 1.55, 0.6, -0.4], [0.35, 1.2, 0.5, 1.1], [-0.1, 1.85, 0.48, 0.2], [0.0, 1.05, 0.62, -1.2], [-0.45, 1.6, 0.3, 1.4], [0.5, 1.7, 0.25, -0.9]]
      for (const [x, y, zz, r] of veins) {
        const v = part(g, new BoxGeometry(0.06, 0.34, 0.06), lava, x, y, zz, 0, 0, r)
        v.castShadow = false
      }
      for (let i = 0; i < 4; i++) part(g, sphere, lava, -0.33 + i * 0.22, 2.12, 0.33).scale.set(0.06, 0.05, 0.05)
      break
    }
    case 'pink':
      for (let i = 0; i < 4; i++) part(g, sphere, mat('#ff8fa8'), -0.33 + i * 0.22, 2.1, 0.36).scale.set(0.06, 0.05, 0.03)
      break
    case 'rust':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * PI * 2
        part(g, new ConeGeometry(0.07, 0.22, 5), mat('#c9763a', { metalness: 0.5, roughness: 0.4 }), Math.cos(a) * 0.58, 1.0, Math.sin(a) * 0.58, 0, 0, -PI / 2).rotation.y = -a
      }
      break
    case 'blaze': {
      const hot = [neon('#ffb21a', 2.4), neon('#ff6a10', 2.6)]
      for (let i = 0; i < 7; i++) {
        const a = -1 + (i / 6) * 2
        const f = part(g, new ConeGeometry(0.13, 0.8 + (i % 2) * 0.35, 6), hot[i % 2], Math.sin(a) * 0.5, 2.0, -0.2)
        f.rotation.set(-0.6, 0, -a * 0.7)
        f.castShadow = false
      }
      break
    }
    case 'phoenix': {
      // Flame feathers sweeping up and back off the hand, plus a frill round the cuff.
      const hot = [neon('#ff7a1a', 2.4), neon('#ffc928', 2.1), neon('#ff3d14', 2.6)]
      for (let i = 0; i < 9; i++) {
        const a = -1.1 + (i / 8) * 2.2
        const f = part(g, new ConeGeometry(0.16, 1.1 + (i % 3) * 0.3, 6), hot[i % 3], Math.sin(a) * 0.55, 2.0 + Math.cos(a) * 0.1, -0.25 + Math.cos(a) * -0.1)
        f.rotation.set(-0.7, 0, -a * 0.8)
        f.castShadow = false
      }
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * PI * 2
        const f = part(g, new ConeGeometry(0.1, 0.5, 5), hot[i % 3], Math.cos(a) * 0.62, 0.95, Math.sin(a) * 0.62)
        f.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6)
        f.castShadow = false
      }
      break
    }
  }
  return g
}


// Floor height at (x, z): the showroom terrace, else the hub plate.
export function showroomFloor(x, z) {
  const t = LOBBY.showroom.terrace
  return x >= t.minX && x <= t.maxX && z >= t.minZ && z <= t.maxZ ? t.height : 0
}

const STATE_LINE = {
  locked: { text: 'LOCKED', color: '#ff3b3b' },
  unlockable: { text: 'TOUCH TO UNLOCK', color: '#5cff6a' },
  owned: { text: 'OWNED', color: '#5cff6a' },
  equipped: { text: 'EQUIPPED', color: '#4ad8ff' },
}

export function buildShowroom(root) {
  const { rows, zs, title: titlePos } = LOBBY.showroom
  const plinthMat = mat('#f3f3f7', { roughness: 0.45 })
  const topMat = mat('#dcdce4', { roughness: 0.5 })
  const discTex = toTexture(paintSoftDot(128))
  const items = GAUNTLETS.map((gdef, i) => {
    const row = rows[Math.floor(i / zs.length)]
    const x = row.x
    const z = zs[i % zs.length]
    const y = row.y
    const base = new Group()
    base.position.set(x, y, z)
    root.add(base)
    part(base, new RoundedBoxGeometry(2.6, 0.7, 2.6, 3, 0.12), plinthMat, 0, 0.35, 0)
    part(base, new BoxGeometry(2.2, 0.06, 2.2), topMat, 0, 0.72, 0)
    const disc = new Mesh(new CylinderGeometry(1.0, 1.0, 0.02, 32), glow('#ffffff', 0.45))
    disc.material = disc.material.clone()
    disc.material.map = discTex
    disc.position.y = 0.76
    disc.userData.live = true // its own material, recoloured per state
    base.add(disc)
    solidBox(1.3, 0.35 + y / 2, 1.3, x, (0.7 + y) / 2, z)
    const model = glove(gdef.style)
    model.scale.setScalar(0.85)
    model.position.y = 0.9
    model.rotation.y = i * 0.7
    bakeInPlace(model)
    model.userData.live = true
    base.add(model)
    const label = new Billboard([], 1.25)
    label.sprite.position.set(0, 3.25, 0)
    base.add(label.sprite)
    bakeInPlace(base)
    const item = { def: gdef, x, z, y, model, disc, label, state: null }
    setState(item, 'locked')
    return item
  })

  function setState(item, state) {
    if (item.state === state) return
    item.state = state
    const s = STATE_LINE[state]
    item.label.set([
      { text: s.text, size: 30, color: s.color },
      { text: `+${fmt(item.def.skill)} Skill`, size: 58, color: '#ffffff', font: 'body' },
      { text: `${fmt(item.def.wins)} Wins`, size: 38, color: '#ffd23a', font: 'body' },
    ])
    item.disc.material.color.set(state === 'equipped' ? '#4ad8ff' : state === 'locked' ? '#ffffff' : '#5cff6a')
    item.disc.material.opacity = state === 'locked' ? 0.25 : 0.6
  }

  // Big title over the row.
  const title = new Billboard([{ text: 'GAUNTLETS', size: 120, gradient: ['#fff27a', '#ffc21a', '#ff9a0a'], outline: '#3a2408' }], 2.1)
  title.sprite.position.set(titlePos.x, titlePos.y, titlePos.z)
  root.add(title.sprite)

  return {
    items,
    setState,
    update(dt, elapsed) {
      for (const it of items) {
        it.model.rotation.y += dt * 0.9
        it.model.position.y = 0.9 + Math.sin(elapsed * 1.6 + it.x + it.z) * 0.08
      }
    },
  }
}

// The Royal Phoenix: an oversized flaming glove on a gold-trimmed red carpet.
export function buildPhoenix(root) {
  const { x, z } = LOBBY.phoenix
  const g = new Group()
  g.position.set(x, 0, z)
  root.add(g)
  const gold = mat('#f2b72a', { metalness: 0.7, roughness: 0.3 })
  part(g, new BoxGeometry(5.6, 0.5, 5.6), gold, 0, 0.25, 0)
  part(g, new BoxGeometry(5.0, 0.12, 5.0), mat('#c81c1c', { roughness: 0.8 }), 0, 0.55, 0)
  for (const s of [-1, 1]) {
    part(g, new BoxGeometry(5.0, 0.14, 0.12), gold, 0, 0.58, s * 2.15)
    part(g, new BoxGeometry(0.12, 0.14, 5.0), gold, s * 2.15, 0.58, 0)
  }
  part(g, new CylinderGeometry(1.5, 1.7, 0.4, 32), mat('#a3141a', { roughness: 0.5 }), 0, 0.8, 0)
  solidBox(2.8, 0.5, 2.8, x, 0.5, z)
  const model = glove('phoenix')
  model.scale.setScalar(1.75)
  model.position.y = 1.0
  model.rotation.y = 0.5
  bakeInPlace(model)
  model.userData.live = true
  g.add(model)
  bakeInPlace(g)
  const light = new PointLight('#ff5a1a', 10, 12, 2)
  light.position.set(0, 3.8, 1.8)
  g.add(light)
  const label = new Billboard(
    [
      { text: `${fmt(PHOENIX.wins)} WINS`, size: 44, color: '#ffe14a' },
      { text: `TOP TIER · +${fmt(PHOENIX.skill)} SKILL`, size: 40, gradient: ['#b6ff5c', '#2fe06a'] },
      { text: 'ROYAL', size: 46, color: '#ffffff' },
      { text: 'PHOENIX', size: 104, gradient: ['#ffe14a', '#ff8a1c', '#e8261a'], outline: '#3a0a06' },
    ],
    1.15,
  )
  label.sprite.position.set(0, 5.6, 0)
  g.add(label.sprite)
  return {
    // Where flames come from (world space) and how hot the flicker runs.
    emitter: { x, y: 4.3, z, radius: 1.2 },
    update(dt, elapsed) {
      model.rotation.y += dt * 0.6
      light.intensity = 9 + Math.sin(elapsed * 13) * 1.5 + Math.sin(elapsed * 31) * 1
    },
  }
}
