import { CanvasTexture, Color, Quaternion, Sprite, SpriteMaterial, SRGBColorSpace, Vector3 } from 'three'
import { INTERACT, ANIM, BOOSTS, PERM_BOOSTS, AUTO_CLAP_COST, CLAP, DAILY, DESTROYABLES, EGGS, GAUNTLETS, LOBBY, PET_KINDS, PETS, PLAYTIME, REBIRTH, REWARD_GAUNTLETS, TRAILS, TRAINING, WAVE, WORLD2_SKILL } from './config.js'
import { authState, displayName, getTopScores, submitScores } from './bloxity.js'
import { addFixed, RAPIER, removeCollider } from './physics.js'
import { player } from './player.js'
import { sfx } from './audio.js'
import { fmt } from './hud.js'
import { createWave } from './wave.js'
import { createHatchOverlay, createPetFollowers, petSvg, RARITY_COLOR } from './pets.js'

// The game rules: clapping, the beach props you clap apart, gauntlets, rebirth,
// training pools, the timed free reward, the hidden pumpkins of the level bar,
// and what the windows (windows.js) show: pets + eggs, boost potions, trails,
// Playtime and Daily Rewards. Progress lives on the server only (net.js: `hydrate` fills the
// state from the player's saved doc, `onSave` pushes `snapshot()` back, nothing is kept in the
// browser); the Playtime clock lasts the page. Daily Rewards are the server's calendar (`setDaily`).

// Little icons painted in front of popup numbers (ctx, centre x, centre y, size).
function boltIcon(ctx, x, y, s) {
  ctx.save()
  ctx.translate(x - s * 0.35, y - s * 0.5)
  ctx.scale(s / 32, s / 32)
  ctx.beginPath()
  ctx.moveTo(15, 1)
  ctx.lineTo(3, 18)
  ctx.lineTo(11, 18)
  ctx.lineTo(8, 31)
  ctx.lineTo(21, 12)
  ctx.lineTo(13, 12)
  ctx.lineTo(16, 1)
  ctx.closePath()
  ctx.lineWidth = 3.5
  ctx.strokeStyle = '#2a1405'
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.fillStyle = '#ffc21a'
  ctx.fill()
  ctx.restore()
}
function trophyIcon(ctx, x, y, s) {
  ctx.save()
  ctx.translate(x - s / 2, y - s / 2)
  ctx.scale(s / 32, s / 32)
  ctx.lineWidth = 3
  ctx.strokeStyle = '#2a1405'
  ctx.fillStyle = '#ffd23a'
  ctx.beginPath()
  ctx.moveTo(8, 4)
  ctx.lineTo(24, 4)
  ctx.lineTo(24, 11)
  ctx.arc(16, 11, 8, 0, Math.PI)
  ctx.closePath()
  ctx.stroke()
  ctx.fill()
  ctx.fillRect(13, 18, 6, 6)
  ctx.strokeRect(10, 24, 12, 5)
  ctx.fillRect(10, 24, 12, 5)
  ctx.restore()
}

// Health bar over a prop while it is being clapped.
function makeHpBar() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 48
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false }))
  sprite.scale.set(2.6, 0.49, 1)
  sprite.renderOrder = 9
  const draw = (hp, max) => {
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, 256, 48)
    ctx.fillStyle = '#16131f'
    ctx.beginPath()
    ctx.roundRect(2, 6, 252, 36, 12)
    ctx.fill()
    const t = Math.max(0, hp / max)
    ctx.fillStyle = t > 0.5 ? '#4ee35a' : t > 0.25 ? '#ffc21a' : '#ff4040'
    ctx.beginPath()
    ctx.roundRect(8, 12, Math.max(10, 240 * t), 24, 8)
    ctx.fill()
    ctx.font = '700 22px Fredoka, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 5
    ctx.strokeStyle = '#16131f'
    ctx.strokeText(`${fmt(Math.ceil(hp))} / ${fmt(max)}`, 128, 25)
    ctx.fillStyle = '#fff'
    ctx.fillText(`${fmt(Math.ceil(hp))} / ${fmt(max)}`, 128, 25)
    tex.needsUpdate = true
  }
  return { sprite, draw }
}

// onFx(kind, extra): tells the net layer a clap / shockwave / training clap started, so the other
// players play the same effects (net.js sendFx).
// onSave(snapshot): the whole saved state, when it changed (net.js saveProgress).
// onDailyClaim(day) / onDailyRefresh(): ask the server to claim a Daily Reward day / re-roll the calendar.
export function createGame({ scene, camera, lobby, fx, hud, onClap, onFx, onSave, onDailyClaim, onDailyRefresh }) {
  // The state a saved doc (or nothing, for a new player) describes.
  const fromSaved = (saved = {}) => ({
    skill: saved.skill ?? 0,
    wins: saved.wins ?? 0,
    candy: saved.candy ?? 0,
    rebirths: saved.rebirths ?? 0,
    level: saved.level ?? 1,
    pumpkins: saved.pumpkins ?? 0,
    owned: new Set(saved.owned ?? []),
    equipped: saved.equipped || null,
    playTime: saved.playTime ?? 0, // s
    pets: saved.pets ?? [], // { id, kind, equipped }
    petsSeen: saved.petsSeen ?? [],
    nextPetId: saved.nextPetId ?? 1,
    petSlots: saved.petSlots ?? PETS.slots,
    autoDelete: saved.autoDelete ?? false,
    eggs: saved.eggs ?? {}, // EGGS key -> count (reward eggs waiting in the Inventory)
    boosts: { skill: 0, wins: 0, ...saved.boosts }, // potions owned
    boostUntil: { skill: 0, wins: 0, ...saved.boostUntil }, // ms timestamps
    perm: { skill: false, wins: false, ...saved.perm }, // permanent 5X SKILL / 2x WINS bought
    autoClapOwned: saved.autoClapOwned ?? false,
    trails: saved.trails ?? [],
    trail: saved.trail || null,
    autoRebirth: saved.autoRebirth ?? false,
  })
  const S = fromSaved()
  // Playtime Rewards count this page's play only.
  const session = { playSeconds: 0, playtimeClaimed: [] }
  const listeners = new Set()
  let dirty = false
  let saveTimer = 0
  const snapshot = () => ({ ...S, owned: [...S.owned] })
  const save = () => {
    dirty = false
    onSave?.(snapshot())
  }
  window.addEventListener('beforeunload', save)
  document.addEventListener('visibilitychange', () => document.hidden && save())

  const ALL_GAUNTLETS = [...GAUNTLETS, ...REWARD_GAUNTLETS]
  const gauntletOf = (id) => ALL_GAUNTLETS.find((g) => g.id === id)
  const gauntlet = () => gauntletOf(S.equipped)
  const equippedPets = () => S.pets.filter((p) => p.equipped)
  // Equipped pets' multipliers add up; with none it is x1.
  const petMult = () => equippedPets().reduce((m, p) => m + (PET_KINDS[p.kind]?.mult ?? 0), 0) || 1
  const boostLeft = (type) => Math.max(0, Math.ceil((S.boostUntil[type] - Date.now()) / 1000))
  const boostMult = (type) => (boostLeft(type) > 0 ? BOOSTS[type].mult : 1)
  const rebirthMult = () => 1 + S.rebirths
  const multiplier = () => rebirthMult() * petMult() * boostMult('skill') * (S.perm.skill ? PERM_BOOSTS.skill.mult : 1)
  const power = () => (1 + (gauntlet()?.skill ?? 0)) * multiplier()
  const trailOf = (id = S.trail) => TRAILS.find((t) => t.id === id)
  const winsMult = () => (trailOf()?.boost ?? 1) * boostMult('wins') * (S.perm.wins ? PERM_BOOSTS.wins.mult : 1)
  const rebirthNeed = () => REBIRTH.base * REBIRTH.growth ** S.rebirths
  // 0..1 along the rebirth level bar (log scale of SKILL up to the need).
  const rebirthT = () => Math.min(1, Math.log1p(S.skill) / Math.log1p(rebirthNeed()))
  const canRebirth = () => S.skill >= rebirthNeed()
  const rebirthLevel = () => (canRebirth() ? REBIRTH.level : Math.min(REBIRTH.level - 1, 1 + Math.floor(rebirthT() * (REBIRTH.level - 1))))
  const skipCost = () => Math.ceil(REBIRTH.skipCost * REBIRTH.skipGrowth ** S.rebirths)

  // --- HUD sync ---
  function refresh() {
    hud.setSkill(S.skill)
    hud.setWins(S.wins)
    hud.setCandy(S.candy)
    hud.setRebirths(S.rebirths)
    hud.setMultiplier(multiplier())
    hud.setAutoPrice(AUTO_CLAP_COST, S.autoClapOwned)
    for (const t of Object.keys(PERM_BOOSTS)) hud.setPermBoost(t, PERM_BOOSTS[t].cost, S.perm[t])
    hud.setLevel(S.level, S.pumpkins, S.level)
    hud.setRebirthProgress(rebirthT())
    hud.setCalendarBadge(dailyReady())
    pets.set(equippedPets().map((p) => p.kind))
    wave.setColor(trailOf()?.wave ?? null)
    for (const it of lobby.showroom.items) {
      const id = it.def.id
      lobby.showroom.setState(it, S.equipped === id ? 'equipped' : S.owned.has(id) ? 'owned' : S.wins >= it.def.wins ? 'unlockable' : 'locked')
    }
    for (const p of lobby.pads) {
      const open = S.rebirths >= p.def.rebirths
      if (p.open !== open) {
        p.open = open
        p.setOpen(open, p.def.rebirths)
      }
    }
    dirty = true
    for (const fn of listeners) fn()
  }
  const addSkill = (n) => {
    S.skill += n
    hud.setSkill(S.skill)
    hud.setRebirthProgress(rebirthT())
    dirty = true
  }
  const addWins = (n) => {
    S.wins += n
    hud.pulse('wins')
    refresh()
  }

  // --- Destroyables ---
  // fly: the wave's break-up in progress (launched or crumbling), null otherwise.
  const props = lobby.destroyables.map((d) => ({ ...d, hp: d.maxHp, alive: true, respawn: 0, shake: 0, pop: 1, collider: null, bar: null, barShown: 0, fly: null, rest: d.group.quaternion.clone() }))
  const solidify = (p) => {
    if (!p.solid) return
    const q = p.group.quaternion
    p.collider = addFixed(RAPIER.ColliderDesc.cuboid(p.solid.hx, p.solid.hy, p.solid.hx), { x: p.x, y: p.solid.hy, z: p.z }, { x: q.x, y: q.y, z: q.z, w: q.w })
  }
  for (const p of props) solidify(p)

  // Returns the Wins the hit earned (0 unless it broke the prop). `defer`: the
  // clap wave pays them all at its end instead of now. `push` ({ x, z } unit,
  // the wave's direction): the prop is blown away (breakUp) instead of popping.
  function damage(p, amount, defer = false, push = null) {
    p.hp -= amount
    p.shake = 0.18
    if (p.hp > 0) {
      // Still standing: show (or make) its health bar.
      if (!p.bar) {
        p.bar = makeHpBar()
        p.bar.sprite.position.set(p.x, p.height + 0.9, p.z)
        scene.add(p.bar.sprite)
      }
      p.bar.sprite.visible = true
      p.barShown = 2.5
      p.bar.draw(p.hp, p.maxHp)
      sfx.hit()
      return 0
    }
    // Destroyed.
    p.alive = false
    if (p.bar) p.bar.sprite.visible = false
    p.respawn = DESTROYABLES.respawn
    if (p.collider) {
      removeCollider(p.collider)
      p.collider = null
    }
    const won = Math.ceil(p.wins * winsMult())
    // The wave's chase camera flies right past these, so it shows its own running tally instead.
    if (!push) fx.popups.show(`+${fmt(won)}`, p.x, p.height + 1.2, p.z, { color: '#ffd23a', size: 1.3, icon: trophyIcon, life: 1.4 })
    if (push) breakUp(p, push)
    else {
      p.group.visible = false
      fx.smash(p.x, 0.2, p.z, p.colors, Math.min(3, p.radius))
      fx.rings.show(p.x, 0, p.z, p.radius * 2.2, ringColor)
      sfx.smash()
    }
    if (!defer) addWins(won)
    return won
  }

  // --- The wave's break-up: big props crumble where they stand, the rest are
  // launched spinning down the beach and burst when they hit the sand. ---
  const ringColor = new Color(1.6, 1.4, 1)
  const spinStep = new Quaternion()
  const crumbleColor = new Color()
  function breakUp(p, push) {
    const size = Math.min(3, p.radius)
    fx.blast(p.x, 0.2, p.z, p.colors, size * 0.7, push) // the impact: chips, confetti, dust
    fx.rings.show(p.x, 0, p.z, p.radius * 2.6, ringColor)
    wave.smashed(size)
    if (p.radius >= WAVE.crumbleSize) {
      p.fly = { crumble: true, t: 0, push }
      return
    }
    const up = 7 + Math.random() * 4
    const fwd = (9 + Math.random() * 6) / Math.sqrt(Math.max(0.6, p.radius))
    p.fly = {
      crumble: false,
      t: 0,
      push,
      pos: new Vector3(p.x, p.group.position.y, p.z),
      // Out to the side it already stands on, so the chase camera's view down the middle stays clear.
      vel: new Vector3(push.x * fwd + Math.sign(push.x || Math.random() - 0.5) * (5 + Math.random() * 4), up, push.z * fwd * 0.7),
      axis: new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      spin: 7 + Math.random() * 8,
    }
  }
  function updateBreakUp(p, dt) {
    const f = p.fly
    f.t += dt
    const size = Math.min(3, p.radius)
    if (f.crumble) {
      // Squash and shudder into the sand, shedding chunks, then burst.
      const k = Math.min(1, f.t / 0.38)
      const jx = (Math.random() - 0.5) * 0.3 * (1 - k)
      p.group.position.set(p.x + jx, -k * p.height * 0.25, p.z + (Math.random() - 0.5) * 0.3 * (1 - k))
      p.group.scale.set(1 + 0.3 * k, 1 - 0.8 * k, 1 + 0.3 * k)
      for (let i = 0; i < 2; i++) {
        crumbleColor.set(p.colors[(Math.random() * p.colors.length) | 0])
        fx.debris.emit(p.x + (Math.random() - 0.5) * p.radius * 1.6, p.height * (1 - k) * 0.7, p.z + (Math.random() - 0.5) * p.radius * 1.6, crumbleColor, 0.35, 3, 0, { push: f.push, life: 2.4, chunky: true })
      }
      if (k < 1) return
      fx.blast(p.x, 0.3, p.z, p.colors, size, f.push)
      sfx.smash(size)
    } else {
      f.vel.y -= 26 * dt
      f.pos.addScaledVector(f.vel, dt)
      spinStep.setFromAxisAngle(f.axis, f.spin * dt)
      p.group.quaternion.premultiply(spinStep)
      p.group.position.copy(f.pos)
      if (f.t < 0.2 || (f.pos.y > 0 && f.t < 1.4)) return
      // Hit the sand: burst.
      fx.blast(f.pos.x, 0.2, f.pos.z, p.colors, size * 0.9, f.push)
      fx.rings.show(f.pos.x, 0, f.pos.z, p.radius * 2, ringColor)
      sfx.smash(size * 0.8)
    }
    p.fly = null
    p.group.visible = false
    p.group.scale.setScalar(1)
    p.group.quaternion.copy(p.rest)
  }

  // --- The clap wave: CLAP in the Clap Zone ---
  const band = LOBBY.band
  const inClapZone = (p) => p.x >= band.minX && p.x <= band.maxX && p.z >= band.minZ && p.z <= band.maxZ && p.y < 1
  const waveRange = () => Math.min(WAVE.maxRange, WAVE.base + WAVE.perDoubling * Math.log2(1 + S.skill / WAVE.skillUnit))
  const struck = new Set() // props the current wave has reached
  const wave = createWave(scene, fx, {
    onClap: () => onClap?.(),
    // The ring grew from r0 to r1 m around (ox, oz): it blows apart every prop
    // it reaches (SKILL already decided how far it goes).
    hits(ox, oz, r0, r1) {
      let wins = 0
      for (const d of props) {
        if (!d.alive || struck.has(d)) continue
        const dist = Math.hypot(d.x - ox, d.z - oz)
        if (dist - d.radius > r1) continue
        struck.add(d)
        const push = dist > 0.01 ? { x: (d.x - ox) / dist, z: (d.z - oz) / dist } : { x: 0, z: -1 }
        wins += damage(d, d.hp, true, push)
      }
      return wins
    },
    onPaid(wins) {
      struck.clear()
      if (wins <= 0) return
      addWins(wins)
      sfx.reward()
    },
    onCinematic(on) {
      hud.setCinematic(on)
      if (on) hud.setClapZone(false)
    },
  })
  function clapZone() {
    const p = player.renderPosition
    if (wave.busy || !inClapZone(p)) return
    const half = LOBBY.beach.halfWidth - 3
    const x = Math.max(-half, Math.min(half, p.x))
    const range = waveRange()
    if (wave.start({ x, z: p.z, range })) onFx?.('wave', { x, y: p.y, z: p.z, yaw: Math.PI, range })
  }
  hud.on('clapZone', clapZone)

  // --- Clapping ---
  let cooldown = 0
  let pendingHit = -1 // s until the hands meet
  let auto = false
  let autoTimer = 0
  const handPos = { x: 0, y: 0, z: 0 }

  function clap() {
    if (cooldown > 0 || wave.busy) return
    cooldown = CLAP.cooldown
    pendingHit = ANIM.clap.hit
    onClap?.()
    onFx?.('clap')
  }

  function land() {
    const f = player.facing
    const p = player.renderPosition
    handPos.x = p.x + Math.sin(f) * 0.7
    handPos.y = p.y + player.dims.height * 0.72
    handPos.z = p.z + Math.cos(f) * 0.7
    const pw = power()
    addSkill(pw)
    hud.pulse('skill')
    fx.clapBurst(handPos.x, handPos.y, handPos.z, pw)
    fx.rings.show(p.x, p.y, p.z, 3.2, new Color(1.3, 1.25, 1.1))
    fx.popups.show(`+${fmt(pw)}`, p.x, p.y + player.dims.height + 0.7, p.z, { color: '#ffd23a', size: 1, icon: boltIcon })
    sfx.clap()
    for (const d of props) {
      if (!d.alive) continue
      const dist = Math.hypot(d.x - p.x, d.z - p.z) - d.radius
      if (dist < CLAP.range) damage(d, pw)
    }
  }

  // The hands meet at a lane entrance: skill, burst, a ring here and a shockwave down the lane.
  function trainLand() {
    const pad = trainPad
    if (!pad) return
    const f = player.facing
    const p = player.renderPosition
    handPos.x = p.x + Math.sin(f) * 0.7
    handPos.y = p.y + player.dims.height * 0.72
    handPos.z = p.z + Math.cos(f) * 0.7
    const gain = TRAINING.rate * pad.def.mult * power() * TRAINING.cooldown
    addSkill(gain)
    hud.pulse('skill')
    fx.clapBurst(handPos.x, handPos.y, handPos.z, 40)
    fx.rings.show(p.x, p.y, p.z, 4, new Color(1.3, 1.25, 1.1))
    fx.popups.show(`+${fmt(gain)}`, p.x, p.y + player.dims.height + 0.7, p.z, { color: '#7fe9ff', size: 0.9, icon: boltIcon })
    sfx.clap()
    pad.pulse()
  }

  // --- Gauntlets: touching a plinth unlocks / equips ---
  function usePlinth(it) {
    const g = it.def
    if (S.owned.has(g.id)) {
      if (S.equipped !== g.id) {
        S.equipped = g.id
        hud.toast(`Equipped +${fmt(g.skill)} Skill gauntlet`, 'good')
        sfx.coin()
      }
    } else if (S.wins >= g.wins) {
      S.owned.add(g.id)
      S.equipped = g.id
      hud.toast(`Unlocked +${fmt(g.skill)} Skill gauntlet!`, 'gold')
      sfx.unlock()
      fx.clapBurst(it.x, it.y + 2, it.z, 30)
    } else {
      hud.toast(`Need ${fmt(g.wins)} Wins`, 'warn')
      sfx.deny()
    }
    refresh()
  }

  // --- Rebirth: returns null when done, else why not ---
  function reborn() {
    S.rebirths++
    hud.toast(`Rebirth! +${S.rebirths}x SKILL`, 'gold')
    sfx.unlock()
    refresh()
  }
  function doRebirth() {
    if (!canRebirth()) return `Reach Level ${REBIRTH.level} to rebirth`
    submitScores({ wins: S.wins, skill: S.skill, rebirths: S.rebirths + 1 }, true) // SKILL peak, before it resets
    S.skill = 0
    reborn()
    return null
  }
  // Skip Rebirth: paid with Wins at any level; SKILL is kept.
  function skipRebirth() {
    const cost = skipCost()
    if (S.wins < cost) return `Skip Rebirth costs ${fmt(cost)} Wins`
    S.wins -= cost
    reborn()
    return null
  }

  // --- Pets ---
  const pets = createPetFollowers(scene)
  const showHatch = createHatchOverlay()
  function addPet(kind) {
    const isNew = !S.petsSeen.includes(kind)
    if (isNew) S.petsSeen.push(kind)
    const dropped = S.autoDelete && PET_KINDS[kind].rarity === 'common' && !isNew
    if (!dropped) S.pets.push({ id: S.nextPetId++, kind, equipped: equippedPets().length < S.petSlots })
    return { isNew, dropped }
  }
  function rollPet(egg) {
    const entries = Object.entries(egg.hatches)
    let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0)
    for (const [k, w] of entries) {
      r -= w
      if (r <= 0) return k
    }
    return entries[0][0]
  }
  // Pays for `count` eggs (free = one from the Inventory) and rolls a pet by weight for
  // each; `auto` = an Auto hatch (quick overlay). Returns null or why not.
  function hatchEgg(key, free = false, count = 1, auto = false) {
    const egg = EGGS[key]
    if (S.pets.length + count > PETS.storage) return 'Pet storage is full! Delete a pet first.'
    if (free) {
      if (!S.eggs[key]) return 'No egg to open'
      S.eggs[key]--
    } else {
      if (egg.robux) return 'Robux eggs are coming soon'
      const cost = egg.price * count
      if (S.wins < cost) return `Need ${fmt(cost - S.wins)} more Wins`
      S.wins -= cost
    }
    const results = []
    for (let i = 0; i < count; i++) {
      const kind = rollPet(egg)
      const { isNew, dropped } = addPet(kind)
      results.push({ kind, isNew })
      if (dropped) hud.toast(`${PET_KINDS[kind].name} auto-deleted`)
    }
    showHatch(egg, results, auto)
    refresh()
    return null
  }

  // --- Egg panel: standing at a plaza egg shows its odds; E Hatch, R Multi, T Auto ---
  const eggStands = [...lobby.plaza.eggs.filter((e) => EGGS[e.key]), { key: 'admin', x: LOBBY.egg.x, z: LOBBY.egg.z }]
  const oddsOf = (egg) => {
    const entries = Object.entries(egg.hatches)
    const total = entries.reduce((s, [, w]) => s + w, 0)
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([kind, w]) => ({ svg: petSvg(kind), pct: `${+((w / total) * 100).toFixed(2)}%`, color: RARITY_COLOR[PET_KINDS[kind].rarity] }))
  }
  const eggOdds = {} // EGGS key -> oddsOf, built once
  let eggAt = null // the stand the player is at
  let autoEgg = null // key of the egg Auto is hatching
  let autoWait = 0
  let hatchLock = 0 // s until the panel takes another hatch (the egg is still rattling)
  const autoEvery = PETS.shake + PETS.autoReveal + 0.15
  function eggAction(which) {
    if (!eggAt) return false
    const key = eggAt.key
    if (which === 'auto') {
      autoEgg = autoEgg ? null : key
      autoWait = 0
      if (autoEgg && EGGS[key].robux) {
        autoEgg = null
        hud.toast('Robux eggs are coming soon', 'warn')
        sfx.deny()
      }
      return true
    }
    if (hatchLock > 0) return true
    const msg = hatchEgg(key, false, which === 'multi' ? PETS.multi : 1)
    if (msg) {
      hud.toast(msg, 'warn')
      sfx.deny()
    } else hatchLock = PETS.shake + 0.3
    return true
  }
  hud.on('eggHatch', () => eggAction('hatch'))
  hud.on('eggMulti', () => eggAction('multi'))
  hud.on('eggAuto', () => eggAction('auto'))
  function updateEggPanel(dt, pp) {
    hatchLock = Math.max(0, hatchLock - dt)
    let best = PETS.near
    eggAt = null
    for (const e of eggStands) {
      const d = Math.hypot(pp.x - e.x, pp.z - e.z)
      if (d < best) {
        best = d
        eggAt = e
      }
    }
    if (autoEgg && eggAt?.key !== autoEgg) autoEgg = null // walked away: Auto stops
    if (autoEgg) {
      autoWait -= dt
      if (autoWait <= 0) {
        autoWait = autoEvery
        const msg = hatchEgg(autoEgg, false, 1, true)
        if (msg) {
          autoEgg = null
          hud.toast(msg, 'warn')
          sfx.deny()
        }
      }
    }
    if (!eggAt || wave.busy) return hud.setEggPanel(null)
    const egg = EGGS[eggAt.key]
    screen.set(eggAt.x, 2.2, eggAt.z).project(camera)
    const behind = screen.z > 1
    hud.setEggPanel(
      { key: eggAt.key, title: egg.name.replace(/ Egg$/, ''), color: egg.color, odds: (eggOdds[eggAt.key] ??= oddsOf(egg)), price: egg.robux ?? egg.price, robux: !!egg.robux, multi: PETS.multi, auto: autoEgg === eggAt.key },
      behind ? window.innerWidth / 2 : ((screen.x + 1) / 2) * window.innerWidth,
      behind ? window.innerHeight * 0.4 : ((1 - screen.y) / 2) * window.innerHeight,
    )
  }
  function togglePet(id) {
    const p = S.pets.find((q) => q.id === id)
    if (!p) return null
    if (!p.equipped && equippedPets().length >= S.petSlots) return 'All pet slots are full!'
    p.equipped = !p.equipped
    refresh()
    return null
  }
  function equipBestPets() {
    for (const p of S.pets) p.equipped = false
    ;[...S.pets].sort((a, b) => PET_KINDS[b.kind].mult - PET_KINDS[a.kind].mult).slice(0, S.petSlots).forEach((p) => (p.equipped = true))
    refresh()
  }
  function deletePet(id) {
    S.pets = S.pets.filter((p) => p.id !== id || p.locked)
    refresh()
  }
  // A locked pet can't be deleted.
  function togglePetLock(id) {
    const p = S.pets.find((q) => q.id === id)
    if (p) p.locked = !p.locked
    refresh()
  }
  const petSlotCost = () => PETS.slotCosts[S.petSlots - PETS.slots] // undefined once maxed
  function buyPetSlot() {
    const cost = petSlotCost()
    if (cost === undefined) return 'All pet slots unlocked!'
    if (S.wins < cost) return `+1 pet slot costs ${fmt(cost)} Wins`
    S.wins -= cost
    S.petSlots++
    refresh()
    return null
  }

  // --- Gauntlets (Inventory), boosts, trails ---
  function equipGauntlet(id) {
    if (!S.owned.has(id)) return 'Not unlocked yet'
    S.equipped = id
    sfx.coin()
    refresh()
    return null
  }
  function useBoost(type) {
    if (!S.boosts[type]) return `No ${BOOSTS[type].label} boosts left`
    S.boosts[type]--
    S.boostUntil[type] = Math.max(Date.now(), S.boostUntil[type]) + BOOSTS[type].minutes * 60000
    sfx.unlock()
    refresh()
    return null
  }
  // Buys the trail if needed, then equips it.
  function chooseTrail(id) {
    const t = trailOf(id)
    if (!S.trails.includes(id)) {
      if (S.wins < t.cost) return `Need ${fmt(t.cost)} Wins`
      S.wins -= t.cost
      S.trails.push(id)
      sfx.unlock()
    } else sfx.coin()
    S.trail = id
    refresh()
    return null
  }

  // --- Rewards (Playtime, Daily) ---
  const rewardAmount = (r) => (r.kind === 'skill' || r.kind === 'wins' ? Math.ceil(r.k * rebirthMult()) : 0)
  function give(r) {
    if (r.kind === 'skill') addSkill(rewardAmount(r))
    else if (r.kind === 'wins') S.wins += rewardAmount(r)
    else if (r.kind === 'egg') S.eggs[r.egg] = (S.eggs[r.egg] ?? 0) + 1
    else if (r.kind === 'boost') S.boosts[r.boost] += r.n
    else if (r.kind === 'pet') addPet(r.pet)
    else if (r.kind === 'gauntlet') S.owned.add(r.gauntlet)
    sfx.unlock()
    refresh()
  }
  // Playtime: index -> seconds left (0 = ready, -1 = claimed).
  const playtimeLeft = (i) => (session.playtimeClaimed.includes(i) ? -1 : Math.max(0, Math.ceil(PLAYTIME[i].at * 60 - session.playSeconds)))
  // Seconds to the next unclaimed reward (0 = one is ready, -1 = all claimed).
  function nextPlaytime() {
    let best = -1
    PLAYTIME.forEach((_, i) => {
      const l = playtimeLeft(i)
      if (l >= 0 && (best < 0 || l < best)) best = l
    })
    return best
  }
  function claimPlaytime(i) {
    if (playtimeLeft(i) !== 0) return 'Not ready yet'
    session.playtimeClaimed.push(i)
    give(PLAYTIME[i])
    return null
  }
  // Daily: the server's 7-day calendar on its UTC clock (backend daily.ts). A day unlocks each new
  // day and stays claimable until claimed; the reward is only granted once the server says ok.
  let daily = null // { unlocked, claimed[], nextAt, skew } from the server's `daily` message
  const dailyClaimable = () => (daily ? Array.from({ length: Math.min(daily.unlocked, DAILY.days.length) }, (_, i) => i).filter((i) => !daily.claimed.includes(i)) : [])
  const dailyReady = () => dailyClaimable().length > 0
  const dailyIndex = () => dailyClaimable()[0] ?? Math.min(daily?.unlocked ?? 0, DAILY.days.length - 1) // the next day to claim
  const dailyClaimed = (i) => !!daily?.claimed.includes(i)
  // Seconds until the next day unlocks (0 = a day is ready now, or the server is not reachable).
  const dailyLeft = () => (!daily || dailyReady() ? 0 : Math.max(0, Math.ceil((daily.nextAt - (Date.now() + daily.skew)) / 1000)))
  let dailyAsked = false
  function setDaily(view) {
    daily = view && { unlocked: view.unlocked ?? 0, claimed: view.claimed ?? [], nextAt: view.nextAt ?? 0, skew: (view.serverTime ?? Date.now()) - Date.now() }
    dailyAsked = false
    refresh()
  }
  let dailyBusy = false
  function claimDaily(day) {
    if (!daily) return 'Daily Rewards need a connection'
    if (!dailyClaimable().includes(day)) return 'Come back tomorrow!'
    if (dailyBusy) return 'Claiming...'
    dailyBusy = true
    onDailyClaim?.(day)
    return null
  }
  // The server's answer to a claim: grant the reward only on ok.
  function dailyResult(m) {
    dailyBusy = false
    if (m?.unlocked !== undefined) setDaily(m)
    if (!m?.ok) return hud.toast(m?.reason === 'save' ? 'Could not save, try again' : 'Not ready yet', 'warn')
    const r = DAILY.days[m.day]
    if (!r) return
    give(r)
    hud.toast(`Day ${m.day + 1}: ${r.label}!`, 'good')
  }

  // --- HUD buttons ---
  const soon = (what) => () => hud.toast(`${what} coming soon`)
  hud.on('autoClap', () => {
    if (!S.autoClapOwned) {
      if (S.wins < AUTO_CLAP_COST) {
        hud.toast(`AUTO CLAP costs ${fmt(AUTO_CLAP_COST)} Wins`, 'warn')
        return sfx.deny()
      }
      S.wins -= AUTO_CLAP_COST
      S.autoClapOwned = true
      sfx.coin()
      hud.toast('AUTO CLAP unlocked! Tap to toggle', 'gold')
      refresh()
      return
    }
    auto = !auto
    hud.setAuto(auto)
  })
  for (const [name, what] of [['quests', 'Quests'], ['friends', 'Friend boost']]) hud.on(name, soon(what))
  // 5X SKILL / 2x WINS: one-time Wins purchase, then permanent.
  const buyPerm = (type) => () => {
    const b = PERM_BOOSTS[type]
    if (S.perm[type]) return hud.toast(`${b.label} is already yours`)
    if (S.wins < b.cost) {
      hud.toast(`${b.label} costs ${fmt(b.cost)} Wins`, 'warn')
      return sfx.deny()
    }
    S.wins -= b.cost
    S.perm[type] = true
    sfx.coin()
    hud.toast(`${b.label} unlocked forever!`, 'gold')
    refresh()
  }
  hud.on('skill5x', buyPerm('skill'))
  hud.on('wins2x', buyPerm('wins'))


  refresh()
  hud.setAuto(false)
  hud.setGift(nextPlaytime())

  // --- Leaderboards: you ranked among the offline rivals ---
  const timeText = (sec) => {
    const d = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
  }
  const boardFormat = { level: (v) => `Lv ${fmt(v)}`, time: timeText, skill: fmt, wins: fmt }
  // The Wins board shows the real Bloxity top list once it answers; the others (and offline play)
  // keep the made-up rivals.
  let realWins = null
  async function pullRealBoards() {
    const rows = await getTopScores('wins')
    if (rows?.length) {
      const myId = authState.user && String(authState.user._id || authState.user.id || authState.user.userId || '')
      realWins = rows.map((r) => ({ name: r.name, v: r.value, you: !!myId && r.userId === myId }))
      refreshBoards()
    }
  }
  // The server's top lists (backend leaderboard.ts): board id -> its stat. Top Skills is the saved SKILL.
  const BOARD_STAT = { level: 'level', time: 'playTime', skill: 'skill', wins: 'wins' }
  let serverBoards = null
  function setBoards(msg) {
    serverBoards = msg?.boards ?? null
    refreshBoards()
  }
  function refreshBoards() {
    const mine = { level: S.level, time: S.playTime, skill: S.skill, wins: S.wins }
    const me = displayName()
    for (const id of Object.keys(mine)) {
      const rows =
        id === 'wins' && realWins
          ? realWins.map((r) => ({ ...r }))
          : (serverBoards?.[BOARD_STAT[id]] ?? []).map((r) => ({ name: r.name, v: r.value, you: r.name === me }))
      if (!(id === 'wins' && realWins?.some((r) => r.you)) && !rows.some((r) => r.you)) rows.push({ name: me, v: mine[id], you: true })
      rows.sort((a, b) => b.v - a.v)
      lobby.plaza.setBoard(
        id,
        rows.slice(0, 9).map((r) => ({ name: r.name, value: boardFormat[id](r.v), you: r.you })),
      )
    }
  }
  refreshBoards()
  void pullRealBoards()
  let boardTimer = 0
  let realBoardTimer = 0

  // --- Proximity prompts: the unlimited pet statue, the WORLD 2 portal (eggs have the egg panel) ---
  const prompts = [
    { x: lobby.plaza.statue.x, z: lobby.plaza.statue.z, r: 3, say: () => hud.toast('Unlimited pets hatch from the Admin Egg', 'gold') },
    {
      x: lobby.plaza.portal.front.x,
      z: lobby.plaza.portal.front.z,
      r: 2.8,
      say: () => (S.skill < WORLD2_SKILL ? (hud.toast(`Reach ${fmt(WORLD2_SKILL)} SKILL to enter WORLD 2`, 'warn'), sfx.deny()) : hud.toast('WORLD 2 is coming soon', 'gold')),
    },
  ]
  let promptAt = null

  // --- Proximity prompt (the reference's "E  Royal Phoenix Gauntlet  Buy") ---
  const phoenixDef = gauntletOf('phoenix')
  function usePhoenix() {
    if (S.owned.has(phoenixDef.id)) {
      if (S.equipped !== phoenixDef.id) {
        S.equipped = phoenixDef.id
        hud.toast(`Equipped +${fmt(phoenixDef.skill)} Skill gauntlet`, 'good')
        sfx.coin()
      }
    } else if (S.wins >= phoenixDef.wins) {
      S.wins -= phoenixDef.wins
      S.owned.add(phoenixDef.id)
      S.equipped = phoenixDef.id
      hud.toast(`Unlocked the ${phoenixDef.name}! +${fmt(phoenixDef.skill)} Skill`, 'gold')
      sfx.unlock()
      fx.clapBurst(lobby.phoenix.x, 3, lobby.phoenix.z, 60)
    } else {
      hud.toast(`Need ${fmt(phoenixDef.wins - S.wins)} more Wins`, 'warn')
      sfx.deny()
    }
    refresh()
  }
  const actions = [
    {
      id: 'phoenix',
      x: lobby.phoenix.x,
      y: 1.2,
      z: lobby.phoenix.z,
      r: 4.6,
      get title() {
        return `+${fmt(phoenixDef.skill)} Skill • ${phoenixDef.name}`
      },
      get action() {
        return S.owned.has(phoenixDef.id) ? (S.equipped === phoenixDef.id ? 'Equipped' : 'Equip') : `Buy • ${fmt(phoenixDef.wins)} Wins`
      },
      run: usePhoenix,
    },
  ]
  let activeAction = null
  const screen = new Vector3()
  // E (or a held tap on the prompt) must be held INTERACT.holdMs before the action runs.
  let holdStart = -1
  // At a plaza egg, E hatches straight away (the egg panel).
  function interact(down = true) {
    if (down && eggAction('hatch')) return
    if (!down) holdStart = -1
    else if (activeAction && holdStart < 0) holdStart = performance.now()
  }
  hud.on('prompt', () => interact(true))
  hud.on('promptUp', () => interact(false))

  let trainWait = 0 // s until the next training clap
  let trainHit = -1 // s until the training clap's hands meet
  let trainPad = null
  let padWarned = null
  let giftShown = -1

  let zoneShown = false

  let autoRebirthTimer = 0
  let tileTick = 0

  // The player's saved doc arrived (net.js): replace the fresh state with it. null = a new player.
  function hydrate(doc) {
    Object.assign(S, fromSaved(doc ?? {}))
    refresh()
    hud.setGift(nextPlaytime())
    refreshBoards()
    dirty = false
  }

  return {
    clap,
    clapZone,
    interact,
    // What the other players draw on this player (net.js sends it when it changes).
    loadout: () => ({ gauntlet: S.equipped ?? '', trail: S.trail ?? '', pets: equippedPets().map((p) => ({ kind: p.kind })) }),
    eggAction, // 'hatch' | 'multi' | 'auto'; false when not at a plaza egg
    // --- For the windows (windows.js) ---
    state: S,
    onChange: (fn) => listeners.add(fn),
    gauntletOf,
    allGauntlets: ALL_GAUNTLETS,
    equippedPets,
    petMult,
    petSlotCost,
    boostLeft,
    rebirthMult,
    rebirthT,
    rebirthLevel,
    canRebirth,
    skipCost,
    rewardAmount,
    playtimeLeft,
    dailyReady,
    dailyIndex,
    dailyClaimed,
    dailyLeft,
    doRebirth,
    skipRebirth,
    toggleAutoRebirth() {
      S.autoRebirth = !S.autoRebirth
      refresh()
    },
    hatchEgg,
    togglePet,
    equipBestPets,
    deletePet,
    togglePetLock,
    buyPetSlot,
    toggleAutoDelete() {
      S.autoDelete = !S.autoDelete
      refresh()
    },
    equipGauntlet,
    useBoost,
    chooseTrail,
    claimPlaytime,
    claimDaily,
    snapshot,
    hydrate,
    setDaily,
    dailyResult,
    setBoards,
    // While the wave is out: where lighting should centre, and its camera.
    focus: () => wave.focus(),
    applyCamera: (cam) => wave.applyCamera(cam),
    update(dt) {
      wave.update(dt)
      const zoneNow = !wave.busy && inClapZone(player.renderPosition)
      if (zoneNow !== zoneShown) {
        zoneShown = zoneNow
        hud.setClapZone(zoneNow)
      }
      cooldown = Math.max(0, cooldown - dt)
      if (pendingHit >= 0) {
        pendingHit -= dt
        if (pendingHit < 0) land()
      }
      if (trainHit >= 0) {
        trainHit -= dt
        if (trainHit < 0) trainLand()
      }
      if (auto) {
        autoTimer -= dt
        if (autoTimer <= 0) {
          autoTimer = CLAP.autoInterval
          clap()
        }
      }
      const pp = player.renderPosition
      const viewZ = wave.focus()?.z ?? pp.z // the wave's camera may be far up the beach

      // Props: shake, respawn pop, bob, health bar timeout.
      for (const d of props) {
        if (!d.alive) {
          if (d.fly) updateBreakUp(d, dt)
          d.respawn -= dt
          if (d.respawn <= 0 && !d.fly && !struck.has(d) && Math.hypot(d.x - pp.x, d.z - pp.z) > d.radius + 1) {
            d.alive = true
            d.hp = d.maxHp
            d.pop = 0
            d.group.visible = true
            solidify(d)
          }
          continue
        }
        // Far down the beach they are specks: skip drawing them.
        const far = Math.abs(d.z - viewZ) > 150
        d.group.visible = !far
        if (far) continue
        let ox = 0
        let oz = 0
        if (d.shake > 0) {
          d.shake -= dt
          ox = (Math.random() - 0.5) * 0.25
          oz = (Math.random() - 0.5) * 0.25
        }
        if (d.pop < 1) {
          d.pop = Math.min(1, d.pop + dt * 3.5)
          const t = d.pop
          d.group.scale.setScalar(t < 0.7 ? (t / 0.7) * 1.12 : 1.12 - ((t - 0.7) / 0.3) * 0.12)
        }
        const by = d.bob ? Math.abs(Math.sin(performance.now() * 0.001 * d.bob.speed + d.bob.phase)) * 0.25 : 0
        d.group.position.set(d.x + ox, by, d.z + oz)
        if (d.barShown > 0) {
          d.barShown -= dt
          if (d.barShown <= 0) d.bar.sprite.visible = false
        }
      }

      // Showroom plinths: standing on one offers a hold-E buy / equip prompt.
      let plinth = null
      for (const it of lobby.showroom.items) {
        if (Math.abs(pp.x - it.x) < 2.2 && Math.abs(pp.z - it.z) < 2.2 && Math.abs(pp.y - it.y - 0.7) < 1.5) plinth = it
      }

      // Training lanes: stand at a lane's entrance and the player claps by itself every TRAINING.cooldown s.
      trainWait = Math.max(0, trainWait - dt)
      let inPad = null
      for (const p of lobby.pads) if (Math.abs(pp.x - p.x) < p.halfW && Math.abs(pp.z - p.z) < p.halfD) inPad = p
      if (inPad) {
        if (inPad.open) {
          if (trainWait <= 0 && trainHit < 0 && !wave.busy) {
            trainWait = TRAINING.cooldown
            trainHit = ANIM.clap.hit
            trainPad = inPad
            player.facing = Math.PI / 2 // face down the lane (east)
            onClap?.()
            onFx?.('train')
          }
        } else if (padWarned !== inPad) {
          hud.toast(`Needs ${inPad.def.rebirths} rebirth${inPad.def.rebirths > 1 ? 's' : ''}`, 'warn')
          sfx.deny()
        }
      }
      padWarned = inPad

      // Playtime clock (the Gifts tile shows the next reward), boost timers, Auto Rebirth.
      session.playSeconds += dt
      const next = nextPlaytime()
      if (next !== giftShown) {
        giftShown = next
        hud.setGift(next)
      }
      tileTick -= dt
      if (tileTick <= 0) {
        tileTick = 1
        hud.setMultiplier(multiplier()) // a boost may have run out
        hud.setCalendarBadge(dailyReady())
        if (daily && !dailyReady() && !dailyAsked && dailyLeft() === 0) {
          dailyAsked = true
          onDailyRefresh?.() // midnight (server clock) passed: ask for the new day
        }
      }
      if (S.autoRebirth && canRebirth() && !wave.busy) {
        autoRebirthTimer -= dt
        if (autoRebirthTimer <= 0) {
          autoRebirthTimer = 1
          doRebirth()
        }
      }
      pets.update(dt, performance.now() / 1000, pp, player.facing)

      updateEggPanel(dt, pp)

      let near = null
      for (const p of prompts) if (Math.hypot(pp.x - p.x, pp.z - p.z) < p.r) near = p
      if (near && near !== promptAt) near.say()
      promptAt = near

      let act = null
      for (const a of actions) if (Math.hypot(pp.x - a.x, pp.z - a.z) < a.r) act = a
      if (plinth) {
        const g = plinth.def
        const owned = S.owned.has(g.id)
        act = {
          id: `plinth:${g.id}`,
          x: plinth.x,
          y: plinth.y + 1.2,
          z: plinth.z,
          title: `+${fmt(g.skill)} Skill • ${g.name}`,
          action: owned ? (S.equipped === g.id ? 'Equipped' : 'Equip') : `Buy • ${fmt(g.wins)} Wins`,
          run: () => usePlinth(plinth),
        }
      }
      if ((act?.id ?? act) !== (activeAction?.id ?? activeAction)) holdStart = -1 // moved to another prompt: restart the hold
      activeAction = act
      if (act) {
        let progress = 0
        if (holdStart >= 0) {
          progress = Math.min(1, (performance.now() - holdStart) / INTERACT.holdMs)
          if (progress >= 1) {
            holdStart = -1
            progress = 0
            act.run()
          }
        }
        screen.set(act.x, act.y, act.z).project(camera)
        hud.setPrompt({ title: act.title, action: act.action }, ((screen.x + 1) / 2) * window.innerWidth, ((1 - screen.y) / 2) * window.innerHeight, progress)
      } else {
        holdStart = -1
        hud.setPrompt(null)
      }

      S.playTime += dt
      boardTimer += dt
      if (boardTimer > 5) {
        boardTimer = 0
        refreshBoards()
      }
      realBoardTimer += dt
      if (realBoardTimer > 30) {
        realBoardTimer = 0
        submitScores({ wins: S.wins, skill: S.skill, rebirths: S.rebirths })
        void pullRealBoards()
      }

      saveTimer += dt
      if (dirty && saveTimer > 3) {
        saveTimer = 0
        save()
      }
    },
  }
}
