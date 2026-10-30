// The other players in the room (net.js -> server WorldState.players): each one is the game's
// character wearing their Bloxity look, animated from the pose the server relays (run / jump /
// fall / clap), with their pets, a name tag, and their clap effects (bursts, rings, shockwave).
// Diffed against the roster every frame, so joins and leaves need no events.
//
// Kept cheap: only the nearest NET.maxRemotes players exist at all, far ones are hidden and
// frozen, shadows / name tags / pets only near the viewer, and every pooled effect is shared with
// the local player's.
import { Color, Group } from 'three'
import { ANIM, NET, PLAYER_DIMS, WAVE } from './config.js'
import { net, onFx } from './net.js'
import { Billboard } from './lobby/labels.js'
import { createPetFollowers } from './pets.js'
import { buildDefaultCharacter, loadBaseCharacter } from './avatar/character.js'
import { applyProportions, attachEquippedAccessories } from './avatar/loader.js'
import { disposeAnimator, makeAnimator } from './avatar/animator.js'
import { createRemoteWaves } from './remoteFx.js'

const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))
const TAG_Y = PLAYER_DIMS.height * 1.2

function setShadows(root, on) {
  root.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) o.castShadow = on
  })
}

// Loaded avatars own their materials (loader.js ownMaterials); the procedural default shares its.
function disposeAvatar(root) {
  if (!root?.userData.own) return
  root.traverse((o) => {
    if ((o.isMesh || o.isSkinnedMesh) && o.material) o.material.dispose()
  })
}

class Remote {
  constructor(root) {
    this.root = root
    this.group = new Group()
    this.group.visible = false
    root.add(this.group)
    this.avatar = null
    this.animator = null
    this.avatarJson = null // what the current rig was built from
    this.generation = 0
    this.shadows = true
    this.petKey = null
    this.pets = null
    this.nameText = null
    this.tag = null
    this.placed = false
    this.vy = 0
    this.timers = [] // { t, run } effects waiting for the clap's hands to meet
    this.setAvatar(buildDefaultCharacter())
  }

  setAvatar(next) {
    if (this.avatar) {
      this.group.remove(this.avatar)
      disposeAvatar(this.avatar)
    }
    disposeAnimator(this.animator)
    this.avatar = next
    setShadows(next, this.shadows)
    this.group.add(next)
    this.animator = makeAnimator(next)
  }

  // A signed-in player's look arrives as JSON { equipped, proportions, skin }; "" = default.
  async syncAvatar(json) {
    if (json === this.avatarJson) return
    this.avatarJson = json
    const mine = ++this.generation
    let look = null
    try {
      look = json ? JSON.parse(json) : null
    } catch {
      return
    }
    // The base rig either way (a guest wears it bare, like the local player); the procedural
    // character stands in until it has loaded.
    const group = await loadBaseCharacter()
    if (mine !== this.generation) return
    if (look) {
      await attachEquippedAccessories(group, look.equipped, { skinTextureUrl: look.skin || undefined })
      if (mine !== this.generation) return
      applyProportions(group, look.proportions)
    }
    group.userData.own = true
    this.setAvatar(group)
  }

  syncName(name, near) {
    if (!near) {
      if (this.tag) this.tag.sprite.visible = false
      return
    }
    const line = [{ text: name, size: 46, font: 'body', color: '#ffffff', outline: '#16131f' }]
    if (!this.tag) {
      this.tag = new Billboard(line, 0.55)
      this.tag.sprite.position.y = TAG_Y
      this.group.add(this.tag.sprite)
      this.nameText = name
    } else if (name !== this.nameText) {
      this.nameText = name
      this.tag.set(line)
    }
    this.tag.sprite.visible = true
  }

  // kinds: "kind,kind" from the roster; only drawn while `show` (near, and among the nearest few).
  syncPets(kinds, show) {
    const key = show ? kinds : ''
    if (key === this.petKey) return
    this.petKey = key
    if (!key) return void this.pets?.set([])
    this.pets ||= createPetFollowers(this.root)
    this.pets.set(key.split(',').slice(0, NET.petsMax))
  }

  setShadow(on) {
    if (on === this.shadows) return
    this.shadows = on
    setShadows(this.avatar, on)
  }

  // Runs `run` once the clap's hands meet (or after `delay` more seconds for a shockwave's windup).
  after(delay, run) {
    this.timers.push({ t: delay, run })
  }

  update(p, d, dt, t, petsOk) {
    this.syncName(p.username || 'Player', d < NET.nameRange)
    this.syncAvatar(p.avatar)
    this.setShadow(d < NET.shadowRange)

    const g = this.group
    const snap = !this.placed || Math.hypot(p.x - g.position.x, p.z - g.position.z) > NET.snapDistance
    const k = snap ? 1 : 1 - Math.exp(-NET.remoteLerp * dt)
    const prevY = g.position.y
    g.position.x += (p.x - g.position.x) * k
    g.position.y += (p.y - g.position.y) * k
    g.position.z += (p.z - g.position.z) * k
    g.rotation.y += angleDelta(g.rotation.y, p.yaw) * k
    this.vy = snap ? 0 : this.vy + ((g.position.y - prevY) / dt - this.vy) * Math.min(1, dt * 10)
    this.placed = true

    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i]
      tm.t -= dt
      if (tm.t <= 0) {
        this.timers.splice(i, 1)
        tm.run()
      }
    }

    if (d < NET.animRange) {
      this.animator?.update(dt, { grounded: p.grounded, speed: p.speed, verticalVelocity: this.vy, turn: 0 })
    }
    this.syncPets(p.pets, petsOk)
    if (this.petKey) this.pets.update(dt, t, g.position, g.rotation.y)
  }

  dispose() {
    this.root.remove(this.group)
    disposeAnimator(this.animator)
    disposeAvatar(this.avatar)
    this.pets?.set([])
    if (this.tag) {
      this.tag.texture.dispose()
      this.tag.sprite.material.dispose()
    }
  }
}

export function createRemotePlayers(scene, fx) {
  const root = new Group()
  scene.add(root)
  const remotes = new Map() // sessionId -> Remote
  const waves = createRemoteWaves(scene, fx)
  const c = new Color()
  const viewerAt = { x: 0, z: 0 }

  // --- Their clap effects (net.js 'fx'), played only for players that are built (near enough) ---
  const hands = (r) => {
    const g = r.group
    return { x: g.position.x + Math.sin(g.rotation.y) * 0.7, y: g.position.y + PLAYER_DIMS.height * 0.72, z: g.position.z + Math.cos(g.rotation.y) * 0.7 }
  }
  const near = (r) => Math.hypot(r.group.position.x - viewerAt.x, r.group.position.z - viewerAt.z) < NET.fxRange
  onFx((m) => {
    const r = remotes.get(m.id)
    if (!r) return
    const roster = net.players?.get(m.id)
    if (m.kind === 'wave') {
      // CLAP in the Clap Zone: the hands start after the windup, meet, and the ring is off.
      r.after(WAVE.clapAt, () => r.animator?.clap())
      r.after(WAVE.clapAt + ANIM.clap.hit, () => {
        if (near(r)) {
          const h = hands(r)
          fx.clapBurst(h.x, h.y, h.z, 40)
          fx.rings.show(m.x, m.y, m.z, 6, c.setRGB(1.8, 1.7, 1.4))
          fx.rings.show(m.x, m.y, m.z, 10, c.setRGB(1.2, 1.15, 1))
        }
        waves.start({ x: m.x, z: m.z, range: m.range, trail: roster?.trail })
      })
      return
    }
    // A clap (or a training clap): hands meet after ANIM.clap.hit.
    const power = m.kind === 'train' ? 40 : 14
    r.animator?.clap()
    r.after(ANIM.clap.hit, () => {
      if (!near(r)) return
      const h = hands(r)
      fx.clapBurst(h.x, h.y, h.z, power)
      fx.rings.show(r.group.position.x, r.group.position.y, r.group.position.z, m.kind === 'train' ? 4 : 3.2, c.setRGB(1.3, 1.25, 1.1))
    })
  })

  return {
    // viewer: the local player's feet position.
    update(dt, t, viewer) {
      viewerAt.x = viewer.x
      viewerAt.z = viewer.z
      waves.update(dt, viewer)
      const players = net.players
      const mine = net.sessionId
      if (!players || !net.connected) {
        for (const r of remotes.values()) r.dispose()
        remotes.clear()
        return
      }
      // Nearest first, capped, so a full room of 50 does not drown the frame rate.
      const list = []
      players.forEach((p, id) => {
        if (id !== mine) list.push({ id, p, d: Math.hypot(p.x - viewer.x, p.z - viewer.z) })
      })
      list.sort((a, b) => a.d - b.d)
      const keep = new Set()
      let withPets = 0
      for (const { id, p, d } of list.slice(0, NET.maxRemotes)) {
        keep.add(id)
        let r = remotes.get(id)
        if (!r) remotes.set(id, (r = new Remote(root)))
        r.group.visible = d < NET.remoteFade
        if (r.group.visible) {
          const petsOk = d < NET.petRange && withPets < NET.petRemotes && !!p.pets
          if (petsOk) withPets++
          r.update(p, d, dt, t, petsOk)
        } else {
          r.placed = false // out of range: skip the work, snap into place when it comes back
          r.group.position.set(p.x, p.y, p.z)
          r.syncPets('', false)
          r.timers.length = 0
        }
      }
      for (const [id, r] of remotes) {
        if (keep.has(id)) continue
        r.dispose()
        remotes.delete(id)
      }
    },
  }
}
