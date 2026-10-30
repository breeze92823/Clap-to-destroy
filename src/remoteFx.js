import { CircleGeometry, Color, CylinderGeometry, Mesh, Vector3 } from 'three'
import { NET, TRAILS, WAVE } from './config.js'
import { BEACH, groundFrag, smooth, wallFrag, waveMaterial } from './wave.js'

// Another player's clap shockwave: the same ring of light as wave.js (shaders shared), minus
// everything that is only the local player's (camera, HUD, props, Wins). A few slots are pooled and
// built on the first remote wave, so a room where nobody uses the Clap Zone pays nothing. The beach
// props are this player's own to break, so a remote wave never touches them.
const wallGeometry = () => new CylinderGeometry(1, 1, 1, 96, 1, true).translate(0, 0.5, 0)
const groundGeometry = () => new CircleGeometry(1, 64).rotateX(-Math.PI / 2)

const trailWave = (id) => TRAILS.find((t) => t.id === id)?.wave ?? null

export function createRemoteWaves(scene, fx) {
  const slots = []
  let wallGeo = null
  let groundGeo = null
  const tint = new Color()
  const c = new Color()

  function makeSlot() {
    wallGeo ||= wallGeometry()
    groundGeo ||= groundGeometry()
    const uniforms = {
      uColor: { value: new Color() },
      uOrigin: { value: new Vector3() },
      uHalf: { value: BEACH.halfWidth },
      uBack: { value: 0 },
      uFade: { value: 1 },
      uRadius: { value: 1 },
    }
    const groundColor = { value: new Color() }
    const wall = new Mesh(wallGeo, waveMaterial(wallFrag, uniforms))
    const ground = new Mesh(groundGeo, waveMaterial(groundFrag, { ...uniforms, uColor: groundColor }))
    for (const m of [wall, ground]) {
      m.visible = false
      m.frustumCulled = false
      m.renderOrder = 5
      scene.add(m)
    }
    return { wall, ground, uniforms, groundColor, active: false, t: 0, ox: 0, oz: 0, range: 0, dur: 1, tint: null, dust: 0 }
  }

  function applyTint(s, time) {
    if (!s.tint) {
      s.uniforms.uColor.value.setRGB(2.6, 2.6, 2.45)
      s.groundColor.value.setRGB(1.1, 1.05, 0.9)
      return
    }
    if (s.tint === 'rainbow') tint.setHSL((time * 0.35) % 1, 1, 0.55)
    else tint.set(s.tint)
    s.uniforms.uColor.value.copy(tint).multiplyScalar(2.4).addScalar(0.25)
    s.groundColor.value.copy(tint).multiplyScalar(1.0).addScalar(0.1)
  }

  const radius = (s, d) => 0.8 + d

  return {
    // The ring leaves (x, z) and runs north `range` m. `trail`: the sender's equipped trail id.
    start({ x, z, range, trail }) {
      let s = slots.find((q) => !q.active)
      if (!s) {
        if (slots.length >= NET.maxWaves) return false
        slots.push((s = makeSlot()))
      }
      const D = WAVE.duration
      s.active = true
      s.t = 0
      s.ox = x
      s.oz = z
      s.range = Math.max(1, range)
      s.dur = Math.min(D.max, Math.max(D.min, s.range * D.perMetre))
      s.tint = trailWave(trail)
      s.dust = 0
      s.uniforms.uOrigin.value.set(x, 0, z)
      s.uniforms.uFade.value = 1
      s.uniforms.uBack.value = 0
      applyTint(s, 0)
      s.wall.visible = s.ground.visible = true
      return true
    },
    // viewer: the local player's position (dust is only kicked up while the crest is near).
    update(dt, viewer) {
      for (const s of slots) {
        if (!s.active) continue
        s.t += dt
        const running = s.t < s.dur
        const u = Math.min(1, s.t / s.dur)
        const d = s.range * (1 - (1 - u) * (1 - u))
        const r = radius(s, d)
        if (s.tint === 'rainbow') applyTint(s, performance.now() / 1000)
        s.wall.position.set(s.ox, 0, s.oz)
        s.wall.scale.set(r, WAVE.height * (1 - 0.35 * (d / Math.max(s.range, 1))), r)
        s.ground.position.set(s.ox, 0.04, s.oz)
        s.ground.scale.setScalar(r + 0.2)
        s.uniforms.uRadius.value = r
        s.uniforms.uBack.value = smooth((d - 3) / 8)
        if (!running) {
          s.uniforms.uFade.value = Math.max(0, 1 - (s.t - s.dur) / (WAVE.hold * 0.8))
          if (s.t - s.dur >= WAVE.hold) {
            s.active = false
            s.wall.visible = s.ground.visible = false
          }
          continue
        }
        // A light sprinkle of sand and sparks along the crest, only where the viewer can see it.
        if (Math.hypot(viewer.x - s.ox, viewer.z - (s.oz - r)) < NET.waveDustRange) {
          s.dust += dt * WAVE.dustRate * 0.3
          const n = Math.min(4, Math.floor(s.dust))
          s.dust -= n
          for (let i = 0; i < n; i++) {
            const x = Math.max(-BEACH.halfWidth, Math.min(BEACH.halfWidth, viewer.x + (Math.random() - 0.5) * 40))
            const dx = x - s.ox
            if (Math.abs(dx) >= r) continue
            const z = s.oz - Math.sqrt(r * r - dx * dx)
            if (i % 2 === 0) {
              c.setRGB(3, 2.8, 2.2)
              fx.sparks.emit({ x, y: 0.3 + Math.random() * 1.2, z, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 3, vz: -4 - Math.random() * 6, color: c, size: 0.3, life: 0.45, drag: 3, gravity: -6, spin: 6 })
            } else {
              c.setRGB(0.5, 0.45, 0.34)
              fx.glow.emit({ x, y: 0.25, z, vx: (Math.random() - 0.5) * 1.5, vy: 0.6 + Math.random() * 1.2, vz: -1 - Math.random() * 2, color: c, size: 1.1 + Math.random() * 0.8, life: 0.7, drag: 2, grow: 1.2 })
            }
          }
        }
      }
    },
  }
}
