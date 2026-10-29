import { CanvasTexture, Color, Sprite, SpriteMaterial, SRGBColorSpace, Vector3 } from 'three'
import { ANIM, CLAP, DESTROYABLES, GAUNTLETS, GIFT, LEADERBOARD_RIVALS, PATCH, PUMPKINS, REBIRTH, SAVE_KEY, TRAINING, WORLD2_SKILL } from './config.js'
import { displayName } from './bloxity.js'
import { addFixed, RAPIER, removeCollider } from './physics.js'
import { player } from './player.js'
import { sfx } from './audio.js'
import { fmt } from './hud.js'

// The game rules: clapping, the beach props you clap apart, gauntlets, rebirth,
// training pools, the timed free reward and the hidden pumpkins of the level
// bar. Progress is saved to localStorage (never throws if storage is blocked).

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

function load() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}
  } catch {
    return {}
  }
}

export function createGame({ scene, camera, lobby, fx, hud, onClap }) {
  const saved = load()
  const S = {
    skill: saved.skill ?? 0,
    wins: saved.wins ?? 0,
    candy: saved.candy ?? 0,
    rebirths: saved.rebirths ?? 0,
    level: saved.level ?? 1,
    pumpkins: saved.pumpkins ?? 0,
    owned: new Set(saved.owned ?? []),
    equipped: saved.equipped ?? null,
    giftLeft: saved.giftLeft ?? GIFT.every,
    playTime: saved.playTime ?? 0, // s
  }
  let dirty = false
  let saveTimer = 0
  const save = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, owned: [...S.owned] }))
    } catch {
      // Storage blocked (private mode, sandbox): progress just isn't kept.
    }
    dirty = false
  }
  window.addEventListener('beforeunload', save)

  const gauntlet = () => GAUNTLETS.find((g) => g.id === S.equipped)
  const multiplier = () => 1 + S.rebirths
  const power = () => (1 + (gauntlet()?.skill ?? 0)) * multiplier()
  const rebirthNeed = () => REBIRTH.base * REBIRTH.growth ** S.rebirths

  // --- HUD sync ---
  function refresh() {
    hud.setSkill(S.skill)
    hud.setWins(S.wins)
    hud.setCandy(S.candy)
    hud.setRebirths(S.rebirths)
    hud.setMultiplier(multiplier())
    hud.setLevel(S.level, S.pumpkins, S.level)
    hud.setRebirthProgress(S.skill, rebirthNeed(), multiplier() + 1)
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
  }
  const addSkill = (n) => {
    S.skill += n
    hud.setSkill(S.skill)
    hud.setRebirthProgress(S.skill, rebirthNeed(), multiplier() + 1)
    dirty = true
  }
  const addWins = (n) => {
    S.wins += n
    hud.pulse('wins')
    refresh()
  }

  // --- Destroyables ---
  const props = lobby.destroyables.map((d) => ({ ...d, hp: d.maxHp, alive: true, respawn: 0, shake: 0, pop: 1, collider: null, bar: null, barShown: 0 }))
  const solidify = (p) => {
    if (!p.solid) return
    const q = p.group.quaternion
    p.collider = addFixed(RAPIER.ColliderDesc.cuboid(p.solid.hx, p.solid.hy, p.solid.hx), { x: p.x, y: p.solid.hy, z: p.z }, { x: q.x, y: q.y, z: q.z, w: q.w })
  }
  for (const p of props) solidify(p)

  function damage(p, amount) {
    p.hp -= amount
    p.shake = 0.18
    if (!p.bar) {
      p.bar = makeHpBar()
      p.bar.sprite.position.set(p.x, p.height + 0.9, p.z)
      scene.add(p.bar.sprite)
    }
    p.bar.sprite.visible = true
    p.barShown = 2.5
    p.bar.draw(Math.max(0, p.hp), p.maxHp)
    if (p.hp > 0) {
      sfx.hit()
      return
    }
    // Destroyed.
    p.alive = false
    p.group.visible = false
    p.bar.sprite.visible = false
    p.respawn = DESTROYABLES.respawn
    if (p.collider) {
      removeCollider(p.collider)
      p.collider = null
    }
    fx.smash(p.x, 0.2, p.z, p.colors, Math.min(3, p.radius))
    fx.rings.show(p.x, 0, p.z, p.radius * 2.2, new Color(1.6, 1.4, 1))
    fx.popups.show(`+${fmt(p.wins)}`, p.x, p.height + 1.2, p.z, { color: '#ffd23a', size: 1.3, icon: trophyIcon, life: 1.4 })
    sfx.smash()
    addWins(p.wins)
  }

  // --- Clapping ---
  let cooldown = 0
  let pendingHit = -1 // s until the hands meet
  let auto = false
  let autoTimer = 0
  const handPos = { x: 0, y: 0, z: 0 }

  function clap() {
    if (cooldown > 0) return
    cooldown = CLAP.cooldown
    pendingHit = ANIM.clap.hit
    onClap?.()
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

  // --- Gauntlets: touching a plinth unlocks / equips ---
  let touchingPlinth = null
  function touchPlinth(it) {
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

  // --- Rebirth ---
  function doRebirth() {
    if (S.skill < rebirthNeed()) {
      hud.toast(`Need ${fmt(rebirthNeed())} SKILL`, 'warn')
      sfx.deny()
      return
    }
    S.skill = 0
    S.rebirths++
    hud.toast(`Rebirth! x${multiplier()} Multiplier`, 'gold')
    sfx.unlock()
    hud.showRebirth(false)
    refresh()
  }

  // --- Gift + pumpkins ---
  function claimGift() {
    if (S.giftLeft > 0) {
      hud.toast(`Free reward in ${Math.ceil(S.giftLeft)}s`, 'warn')
      return
    }
    S.giftLeft = GIFT.every
    const sk = GIFT.skill * multiplier()
    addSkill(sk)
    S.candy += GIFT.candy
    hud.setCandy(S.candy)
    hud.toast(`Free reward: +${fmt(sk)} SKILL, +${GIFT.candy} candy`, 'gold')
    sfx.unlock()
    fx.clapBurst(lobby.gift.x, 2.2, lobby.gift.z, 30)
    dirty = true
  }
  const pumpkins = lobby.pumpkins.map((p) => ({ ...p, respawn: 0 }))
  function collect(p) {
    p.group.visible = false
    p.respawn = PUMPKINS.respawn
    S.candy += PUMPKINS.candy
    S.pumpkins++
    fx.clapBurst(p.x, p.y + 0.6, p.z, 20)
    fx.popups.show(`+${PUMPKINS.candy} candy`, p.x, p.y + 1.6, p.z, { color: '#ff9ad5', size: 0.9 })
    sfx.coin()
    hud.pulse('candy')
    if (S.pumpkins >= S.level) {
      S.level++
      S.pumpkins = 0
      hud.toast(`Level ${S.level}!`, 'gold')
      sfx.unlock()
    }
    refresh()
  }

  // --- HUD buttons ---
  const soon = (what) => () => hud.toast(`${what} coming soon`)
  hud.on('autoClap', () => {
    auto = !auto
    hud.setAuto(auto)
  })
  hud.on('rebirth', () => hud.showRebirth(true))
  hud.on('closeModal', () => hud.showRebirth(false))
  hud.on('doRebirth', doRebirth)
  hud.on('gifts', claimGift)
  for (const [name, what] of [['shop', 'Shop'], ['pets', 'Pets'], ['trails', 'Trails'], ['inventory', 'Inventory'], ['quests', 'Quests'], ['calendar', 'Daily rewards'], ['starter', 'Starter Pack'], ['friends', 'Friend boost'], ['pack1', 'Skill packs'], ['pack2', 'Skill packs'], ['pack3', 'Skill packs'], ['skill5x', '5X Skill'], ['wins2x', '2x Wins']]) hud.on(name, soon(what))

  refresh()
  hud.setAuto(false)
  hud.setGift(S.giftLeft)

  // --- Leaderboards: you ranked among the offline rivals ---
  const timeText = (sec) => {
    const d = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
  }
  const boardFormat = { level: (v) => `Lv ${fmt(v)}`, time: timeText, spent: (v) => `R$ ${v.toLocaleString('en')}`, wins: fmt }
  function refreshBoards() {
    const mine = { level: S.level, time: S.playTime, spent: 0, wins: S.wins }
    const me = displayName()
    for (const id of Object.keys(LEADERBOARD_RIVALS)) {
      const rows = LEADERBOARD_RIVALS[id].map(([name, v]) => ({ name, v, you: false }))
      rows.push({ name: me, v: mine[id], you: true })
      rows.sort((a, b) => b.v - a.v)
      lobby.plaza.setBoard(
        id,
        rows.slice(0, 9).map((r) => ({ name: r.name, value: boardFormat[id](r.v), you: r.you })),
      )
    }
  }
  refreshBoards()
  let boardTimer = 0

  // --- Proximity prompts: pet eggs, the WORLD 2 portal ---
  const prompts = [
    ...lobby.plaza.eggs.map((e) => ({ x: e.x, z: e.z, r: 2.6, say: () => hud.toast('Pets are coming soon') })),
    { x: lobby.plaza.statue.x, z: lobby.plaza.statue.z, r: 3, say: () => hud.toast('Limited pets are coming soon') },
    {
      x: lobby.plaza.portal.front.x,
      z: lobby.plaza.portal.front.z,
      r: 2.8,
      say: () => (S.skill < WORLD2_SKILL ? (hud.toast(`Reach ${fmt(WORLD2_SKILL)} SKILL to enter WORLD 2`, 'warn'), sfx.deny()) : hud.toast('WORLD 2 is coming soon', 'gold')),
    },
  ]
  let promptAt = null

  // --- Pumpkin Patch: plots grow, walk onto a ripe one to harvest candy ---
  const plots = lobby.patch.plots
  for (const p of plots) p.t = Math.random() // staggered so a few are ripe early
  function harvest(p) {
    p.t = 0
    p.ripe = false
    S.candy += PATCH.candy
    hud.setCandy(S.candy)
    hud.pulse('candy')
    fx.clapBurst(p.x, p.y + 0.5, p.z, 12)
    fx.popups.show(`+${PATCH.candy} candy`, p.x, p.y + 1.6, p.z, { color: '#ff9ad5', size: 0.85 })
    sfx.coin()
    dirty = true
  }

  // --- Proximity prompt (the reference's "E  Royal Phoenix Gauntlet  Buy") ---
  const actions = [
    { x: lobby.phoenix.x, y: 1.2, z: lobby.phoenix.z, r: 4.6, title: 'Royal Phoenix Gauntlet', action: 'Buy', run: () => hud.toast('Purchases are coming soon') },
  ]
  let activeAction = null
  const screen = new Vector3()
  function interact() {
    activeAction?.run()
  }
  hud.on('prompt', interact)

  let padTick = 0
  let padWarned = null
  let giftShown = -1

  return {
    clap,
    interact,
    update(dt) {
      cooldown = Math.max(0, cooldown - dt)
      if (pendingHit >= 0) {
        pendingHit -= dt
        if (pendingHit < 0) land()
      }
      if (auto) {
        autoTimer -= dt
        if (autoTimer <= 0) {
          autoTimer = CLAP.autoInterval
          clap()
        }
      }
      const pp = player.renderPosition

      // Props: shake, respawn pop, bob, health bar timeout.
      for (const d of props) {
        if (!d.alive) {
          d.respawn -= dt
          if (d.respawn <= 0 && Math.hypot(d.x - pp.x, d.z - pp.z) > d.radius + 1) {
            d.alive = true
            d.hp = d.maxHp
            d.pop = 0
            d.group.visible = true
            solidify(d)
          }
          continue
        }
        // Far down the beach they are specks: skip drawing them.
        const far = Math.abs(d.z - pp.z) > 150
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

      // Showroom plinths: edge-triggered touch.
      let touching = null
      for (const it of lobby.showroom.items) {
        if (Math.abs(pp.x - it.x) < 2.2 && Math.abs(pp.z - it.z) < 2.2 && Math.abs(pp.y - it.y - 0.7) < 1.5) touching = it
      }
      if (touching && touching !== touchingPlinth) touchPlinth(touching)
      touchingPlinth = touching

      // Training pools.
      let inPad = null
      for (const p of lobby.pads) if (Math.abs(pp.x - p.x) < p.halfW && Math.abs(pp.z - p.z) < p.halfD) inPad = p
      if (inPad) {
        if (inPad.open) {
          const gain = TRAINING.rate * inPad.def.mult * power()
          addSkill(gain * dt)
          padTick -= dt
          if (padTick <= 0) {
            padTick = 0.6
            fx.popups.show(`+${fmt(gain * 0.6)}`, pp.x, pp.y + 2.4, pp.z, { color: '#7fe9ff', size: 0.8, icon: boltIcon })
          }
        } else if (padWarned !== inPad) {
          hud.toast(`Needs ${inPad.def.rebirths} rebirth${inPad.def.rebirths > 1 ? 's' : ''}`, 'warn')
          sfx.deny()
        }
      }
      padWarned = inPad

      // Free reward timer + claiming at the gift post.
      if (S.giftLeft > 0) {
        S.giftLeft = Math.max(0, S.giftLeft - dt)
        const shown = Math.ceil(S.giftLeft)
        if (shown !== giftShown) {
          giftShown = shown
          hud.setGift(S.giftLeft)
        }
      } else if (Math.hypot(pp.x - lobby.gift.x, pp.z - lobby.gift.z) < 2.4) claimGift()

      for (const p of pumpkins) {
        if (!p.group.visible) {
          p.respawn -= dt
          if (p.respawn <= 0) p.group.visible = true
        } else if (Math.hypot(pp.x - p.x, pp.z - p.z) < PUMPKINS.radius && Math.abs(pp.y - p.y) < 2) collect(p)
      }

      let near = null
      for (const p of prompts) if (Math.hypot(pp.x - p.x, pp.z - p.z) < p.r) near = p
      if (near && near !== promptAt) near.say()
      promptAt = near

      for (const p of plots) {
        if (!p.ripe) {
          p.t += dt / PATCH.grow
          if (p.t >= 1) p.ripe = true
        } else if (Math.hypot(pp.x - p.x, pp.z - p.z) < PATCH.radius && Math.abs(pp.y - p.y) < 1.5) harvest(p)
        lobby.patch.setGrowth(p, Math.min(1, p.t), performance.now() / 1000)
      }

      let act = null
      for (const a of actions) if (Math.hypot(pp.x - a.x, pp.z - a.z) < a.r) act = a
      activeAction = act
      if (act) {
        screen.set(act.x, act.y, act.z).project(camera)
        hud.setPrompt({ title: act.title, action: act.action }, ((screen.x + 1) / 2) * window.innerWidth, ((1 - screen.y) / 2) * window.innerHeight)
      } else hud.setPrompt(null)

      S.playTime += dt
      boardTimer += dt
      if (boardTimer > 5) {
        boardTimer = 0
        refreshBoards()
      }

      saveTimer += dt
      if (dirty && saveTimer > 3) {
        saveTimer = 0
        save()
      }
    },
  }
}
