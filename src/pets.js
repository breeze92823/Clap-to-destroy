import { BoxGeometry, ConeGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { PET_KINDS, PETS } from './config.js'
import { sfx } from './audio.js'
import { eggIcon } from './icons.js'

// Pets: cube-critter portraits for the windows, the blocky 3D companions that
// bob along behind the player, and the hatch overlay (the egg rattles, a white
// flash, the pet card pops in). Adapted from Wave Height Surf's pets.js.

export const RARITY_COLOR = { common: '#d8dce4', uncommon: '#5ff062', rare: '#4ab8ff', epic: '#c86aff', legendary: '#ffc21a', mythical: '#ff5fd0', unlimited: '#3dff6a' }
export const RARITY_NAME = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythical: 'Mythical', unlimited: 'Unlimited' }
export const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythical: 5, unlimited: 6 }

const INK = '#16131f'
const L = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`

// What sits on top of the head (drawn behind the face cube).
function topper(k) {
  const b = k.body
  const a = k.accent
  switch (k.top) {
    case 'bunny':
      return `<rect x="27" y="2" width="14" height="38" rx="7" fill="${b}" ${L}/><rect x="31" y="8" width="6" height="24" rx="3" fill="#ffb8cc"/><rect x="59" y="2" width="14" height="38" rx="7" fill="${b}" ${L}/><rect x="63" y="8" width="6" height="24" rx="3" fill="#ffb8cc"/>`
    case 'cat':
      return `<path d="M18 40L24 14 42 32z" fill="${b}" ${L}/><path d="M25 22l3 9 6-2z" fill="${a}"/><path d="M82 40L76 14 58 32z" fill="${b}" ${L}/><path d="M75 22l-3 9-6-2z" fill="${a}"/>`
    case 'dog':
      return `<path d="M14 34c-6 4-6 24 2 30l8-4V34z" fill="${a}" ${L}/><path d="M86 34c6 4 6 24-2 30l-8-4V34z" fill="${a}" ${L}/>`
    case 'bear':
      return `<circle cx="24" cy="30" r="10" fill="${a}" ${L}/><circle cx="76" cy="30" r="10" fill="${a}" ${L}/>`
    case 'pig':
      return `<path d="M20 38l4-16 14 10z" fill="${a}" ${L}/><path d="M80 38l-4-16-14 10z" fill="${a}" ${L}/>`
    case 'frog':
      return `<circle cx="32" cy="30" r="11" fill="${b}" ${L}/><circle cx="68" cy="30" r="11" fill="${b}" ${L}/>`
    case 'horn':
      return `<path d="M44 34l6-30 6 30z" fill="#ffd23a" ${L}/><path d="M47 24h6M46 30h8" stroke="#e0a010" stroke-width="2.5"/><path d="M22 36c-6-10 0-18 8-16 4 6 2 12-2 16z" fill="${a}" ${L}/>`
    case 'dragon':
      return `<path d="M6 44C2 30 10 22 20 26l2 20z" fill="${a}" ${L}/><path d="M94 44c4-14-4-22-14-18l-2 20z" fill="${a}" ${L}/><path d="M30 34l4-18 8 16zM70 34l-4-18-8 16z" fill="#ffd23a" ${L}/>`
    default:
      return ''
  }
}

function mark(k) {
  if (k.mark === 'clover') {
    const leaf = (x, y) => `<circle cx="${x}" cy="${y}" r="4.6" fill="#3cb84a" stroke="${INK}" stroke-width="1.8"/>`
    return `${leaf(46, 40)}${leaf(54, 40)}${leaf(46, 48)}${leaf(54, 48)}<path d="M50 50l3 7" stroke="#2a8a34" stroke-width="2.5" stroke-linecap="round"/>`
  }
  if (k.mark === 'coin') return `<circle cx="50" cy="44" r="7" fill="#ffd23a" ${L}/><path d="M50 40v8" stroke="#c88a10" stroke-width="2.5"/>`
  if (k.mark === 'star') return `<path d="M50 36l2.6 5.4 5.9.8-4.3 4.1 1 5.8L50 49.4 44.8 52l1-5.8-4.3-4.1 5.9-.8z" fill="#fff36a" stroke="${INK}" stroke-width="1.8"/>`
  return ''
}

// A 100x100 portrait: a rounded cube face with its topper, eyes, blush and mouth.
export function petSvg(kind) {
  const k = PET_KINDS[kind] ?? PET_KINDS.cloverBunny
  const snout = k.top === 'pig' ? `<ellipse cx="50" cy="72" rx="9" ry="6" fill="${k.accent}" ${L}/><circle cx="47" cy="72" r="1.8" fill="${INK}"/><circle cx="53" cy="72" r="1.8" fill="${INK}"/>` : `<path d="M44 72q3 4 6 0q3 4 6 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
  const panda = k.top === 'bear' && k.accent === '#2a2a32' ? `<ellipse cx="37" cy="62" rx="8" ry="9" fill="${k.accent}"/><ellipse cx="63" cy="62" rx="8" ry="9" fill="${k.accent}"/>` : ''
  return `<svg viewBox="0 0 100 100" class="pet-svg">${topper(k)}
    <rect x="16" y="32" width="68" height="60" rx="14" fill="${k.body}" stroke="${INK}" stroke-width="3.6"/>
    <path d="M24 40h30" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>
    <path d="M70 36v50" stroke="#000" stroke-width="10" opacity=".07"/>
    ${panda}${mark(k)}
    <ellipse cx="37" cy="62" rx="5" ry="6.2" fill="${INK}"/><circle cx="38.6" cy="59.6" r="1.9" fill="#fff"/>
    <ellipse cx="63" cy="62" rx="5" ry="6.2" fill="${INK}"/><circle cx="64.6" cy="59.6" r="1.9" fill="#fff"/>
    <ellipse cx="28" cy="72" rx="5" ry="3" fill="#ff8aa8" opacity=".75"/><ellipse cx="72" cy="72" rx="5" ry="3" fill="#ff8aa8" opacity=".75"/>
    ${snout}</svg>`
}

// --- 3D companions ------------------------------------------------------------------
const box = new BoxGeometry(1, 1, 1)
const cone = new ConeGeometry(0.5, 1, 4)
const mats = new Map()
const mat = (color) => {
  if (!mats.has(color)) mats.set(color, new MeshStandardMaterial({ color, roughness: 0.6 }))
  return mats.get(color)
}

// A chunky cube pet about 1 m tall facing +Z (the player's forward).
export function petModel(kind) {
  const k = PET_KINDS[kind]
  const g = new Group()
  const part = (geo, c, w, h, d, x, y, z, rz = 0) => {
    const m = new Mesh(geo, mat(c))
    m.scale.set(w, h, d)
    m.position.set(x, y, z)
    m.rotation.z = rz
    m.castShadow = true
    g.add(m)
    return m
  }
  part(box, k.body, 0.8, 0.72, 0.72, 0, 0.36, 0)
  part(box, '#16131f', 0.1, 0.13, 0.03, -0.17, 0.4, 0.37)
  part(box, '#16131f', 0.1, 0.13, 0.03, 0.17, 0.4, 0.37)
  part(box, '#ff8aa8', 0.12, 0.06, 0.02, -0.27, 0.28, 0.365)
  part(box, '#ff8aa8', 0.12, 0.06, 0.02, 0.27, 0.28, 0.365)
  const top = k.top
  if (top === 'bunny') {
    part(box, k.body, 0.16, 0.5, 0.12, -0.18, 0.96, 0)
    part(box, k.body, 0.16, 0.5, 0.12, 0.18, 0.96, 0)
  } else if (top === 'cat' || top === 'pig') {
    part(cone, k.body, 0.24, 0.26, 0.24, -0.26, 0.84, 0, 0.25)
    part(cone, k.body, 0.24, 0.26, 0.24, 0.26, 0.84, 0, -0.25)
  } else if (top === 'dog') {
    part(box, k.accent, 0.12, 0.4, 0.3, -0.46, 0.48, 0)
    part(box, k.accent, 0.12, 0.4, 0.3, 0.46, 0.48, 0)
  } else if (top === 'bear' || top === 'frog') {
    part(box, top === 'frog' ? k.body : k.accent, 0.2, 0.2, 0.16, -0.26, 0.8, 0)
    part(box, top === 'frog' ? k.body : k.accent, 0.2, 0.2, 0.16, 0.26, 0.8, 0)
  } else if (top === 'horn') {
    part(cone, '#ffd23a', 0.14, 0.4, 0.14, 0, 0.92, 0.14)
  } else if (top === 'dragon') {
    part(box, k.accent, 0.08, 0.34, 0.46, -0.48, 0.5, -0.1, 0.5)
    part(box, k.accent, 0.08, 0.34, 0.46, 0.48, 0.5, -0.1, -0.5)
    part(cone, '#ffd23a', 0.1, 0.22, 0.1, -0.2, 0.82, 0)
    part(cone, '#ffd23a', 0.1, 0.22, 0.1, 0.2, 0.82, 0)
  }
  if (top === 'pig') part(box, k.accent, 0.2, 0.13, 0.06, 0, 0.22, 0.38)
  if (k.mark) part(box, k.mark === 'clover' ? '#3cb84a' : '#ffd23a', 0.14, 0.14, 0.03, 0, 0.6, 0.37)
  return g
}

// Followers for the equipped pets; update() eases each toward its slot behind the player.
export function createPetFollowers(scene) {
  const followers = []
  let key = ''
  return {
    // kinds: the equipped pets' kinds, in order.
    set(kinds) {
      const next = kinds.slice(0, PETS.follow.length).join(',')
      if (next === key) return
      key = next
      for (const f of followers) scene.remove(f.mesh)
      followers.length = 0
      next && next.split(',').forEach((kind, i) => {
        const mesh = petModel(kind)
        mesh.visible = false // placed on the first update
        scene.add(mesh)
        followers.push({ mesh, slot: PETS.follow[i], placed: false })
      })
    },
    // pos: the feet; facing: yaw (0 = +Z).
    update(dt, t, pos, facing) {
      const c = Math.cos(facing)
      const s = Math.sin(facing)
      const k = 1 - Math.exp(-6 * dt)
      followers.forEach((f, i) => {
        const [ox, oz] = f.slot
        const tx = pos.x + ox * c + oz * s
        const tz = pos.z - ox * s + oz * c
        const m = f.mesh
        if (!f.placed || Math.hypot(tx - m.position.x, tz - m.position.z) > 40) {
          m.position.set(tx, pos.y, tz) // first frame, or after a teleport
          f.placed = m.visible = true
        }
        m.position.x += (tx - m.position.x) * k
        m.position.z += (tz - m.position.z) * k
        m.position.y = pos.y + 0.3 + Math.abs(Math.sin(t * 5 + i * 1.7)) * 0.3
        m.rotation.y = facing
      })
    },
  }
}

// --- Hatch overlay ----------------------------------------------------------------------
// show(egg, results, auto): one egg per result ({ kind, isNew }) rattles, the screen
// flashes, the pet cards pop in. Tap anywhere to close it once it is revealed. `auto`
// (Auto hatch) lets clicks through and keeps the cards up only PETS.autoReveal s.
export function createHatchOverlay() {
  const root = document.createElement('div')
  root.className = 'hatch'
  document.body.appendChild(root)
  let timer = 0
  root.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    if (root.classList.contains('reveal')) root.classList.remove('show')
  })
  return (egg, results, auto = false) => {
    clearTimeout(timer)
    const slots = results.map(({ kind, isNew }) => {
      const k = PET_KINDS[kind]
      return `<div class="hatch-slot"><div class="hatch-egg">${eggIcon(egg)}</div>
        <div class="hatch-card r-${k.rarity}">${isNew ? '<span class="new stroke">NEW!</span>' : ''}<span class="hatch-pet">${petSvg(kind)}</span>
        <span class="name stroke">${k.name}</span><span class="rarity stroke">${RARITY_NAME[k.rarity]}</span><span class="mult stroke">x${k.mult} SKILL</span></div></div>`
    })
    root.innerHTML = `<div class="hatch-flash"></div><div class="hatch-row">${slots.join('')}</div>`
    root.className = `hatch show${results.length > 1 ? ' multi' : ''}${auto ? ' auto' : ''}`
    sfx.hit()
    timer = setTimeout(() => {
      root.classList.add('reveal')
      sfx.unlock()
      timer = setTimeout(() => root.classList.remove('show'), (auto ? PETS.autoReveal : PETS.reveal) * 1000)
    }, PETS.shake * 1000)
  }
}
