import { AdditiveBlending, CircleGeometry, Color, CylinderGeometry, DoubleSide, Mesh, MeshBasicMaterial, NormalBlending, PlaneGeometry, ShaderMaterial, TorusGeometry, Vector3 } from 'three'
import { ANIM, LOBBY, WAVE } from './config.js'
import { player } from './player.js'
import { addFixed, INVISIBLE_WALL, RAPIER } from './physics.js'
import { syncYawToPlayer } from './camera.js'
import { setMode } from './modes.js'
import { sfx } from './audio.js'
import { fmt, ICONS } from './hud.js'

// The clap shockwave, Clap to Destroy's version of Bowling Roll's Run Lane.
// CLAP in the Clap Zone: the camera swings in front of the player, the hands
// slap, a ring of light bursts out and runs north down the beach (fast, then
// slowing to a stop at the range SKILL buys) while the camera rides behind it
// and a distance counter ticks up. Props it reaches are hit through `hits`
// (game.js). After a beat the camera eases back behind the player and the
// Wins of everything it broke pop up as one big "+N".
//
// Phases: idle -> windup (front shot, clap) -> wave -> hold -> return -> pay -> idle.
//
// The beach is the wave's alone: an invisible wall on the north edge of the
// Clap Zone band keeps players out, shimmering into view as they walk up to it.
// Every prop the wave breaks reports back through smashed(size): combo counter,
// rising combo chime, camera shake, and a short hit-stop on the big ones.

export const BEACH = LOBBY.beach
const C = WAVE.camera
export const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))

const vert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`
// Shared by the wall and the ground glow: fade at the beach edges, and (once
// the ring has left the player) behind where it started.
const clip = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uOrigin;
  uniform float uHalf;
  uniform float uBack;
  uniform float uFade;
  uniform float uRadius;
  varying vec2 vUv;
  varying vec3 vWorld;
  float clipAlpha() {
    float edge = 1.0 - smoothstep(uHalf - 2.5, uHalf, abs(vWorld.x));
    float back = mix(1.0, 1.0 - smoothstep(uOrigin.z - 3.0, uOrigin.z + 0.5, vWorld.z), uBack);
    return edge * back * uFade;
  }`
export const wallFrag = /* glsl */ `
  ${clip}
  void main() {
    float v = vUv.y;
    float a = (pow(max(1.0 - v, 0.0), 2.4) * 0.6 + (1.0 - smoothstep(0.0, 0.1, v)) * 0.5) * clipAlpha();
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, min(a, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`
// A crescent on the sand just behind the wall: bright at the crest, trailing off.
export const groundFrag = /* glsl */ `
  ${clip}
  void main() {
    float t = (uRadius - length(vWorld.xz - uOrigin.xz)) / 3.5;
    if (t < 0.0 || t > 1.0) discard;
    float a = pow(max(1.0 - t, 0.0), 3.0) * 0.5 * clipAlpha();
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, min(a, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`

export function waveMaterial(frag, uniforms) {
  return new ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false })
}

// Blends camera A (position, look point) into camera B by t: the position glides
// (pushed `arc` m back from the view mid-way, so a half turn orbits round the
// side), the view direction turns by yaw and pitch. A half turn always goes
// through east, so the same blend reversed retraces its path.
const _a = new Vector3()
const _b = new Vector3()
const _p = new Vector3()
function blendPose(posA, lookA, posB, lookB, t, arc, outPos, outLook) {
  _a.subVectors(lookA, posA).normalize()
  _b.subVectors(lookB, posB).normalize()
  const ya = Math.atan2(_a.x, _a.z)
  let dy = Math.atan2(_b.x, _b.z) - ya
  dy = Math.atan2(Math.sin(dy), Math.cos(dy))
  if (Math.abs(dy) > Math.PI - 0.05) dy = Math.abs(dy)
  const yaw = ya + dy * t
  const pitch = Math.asin(Math.max(-1, Math.min(1, _a.y))) * (1 - t) + Math.asin(Math.max(-1, Math.min(1, _b.y))) * t
  const cp = Math.cos(pitch)
  _p.lerpVectors(posA, posB, t)
  const out = Math.sin(Math.PI * t) * arc
  _p.x -= Math.sin(yaw) * out
  _p.z -= Math.cos(yaw) * out
  outPos.copy(_p)
  outLook.set(_p.x + Math.sin(yaw) * cp, _p.y + Math.sin(pitch), _p.z + Math.cos(yaw) * cp)
}

// The lane gate's force field: stripes drifting up, brightest at the floor and
// round where the player stands, faded out by uAlpha when nobody is near.
const gateFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  uniform float uTime;
  uniform float uPlayerX;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    float dx = vWorld.x - uPlayerX;
    float near = exp(-dx * dx / 110.0);
    float stripes = 0.5 + 0.5 * sin((vWorld.x + vWorld.y) * 3.0 - uTime * 4.0);
    float v = vUv.y;
    float body = pow(max(1.0 - v, 0.0), 1.1) * (0.3 + 0.5 * stripes);
    float edges = (1.0 - smoothstep(0.0, 0.07, v)) * 0.95 + smoothstep(0.93, 1.0, v) * 0.6;
    float a = uAlpha * near * (body + edges);
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, min(a, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`

// White streaks rushing out from the screen centre while the wave is fast.
function speedLines() {
  const c = document.createElement('canvas')
  c.className = 'wave-lines'
  document.body.appendChild(c)
  const ctx = c.getContext('2d')
  const lines = Array.from({ length: 30 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), v: 0.6 + Math.random() }))
  let shown = false
  return (dt, strength) => {
    if (strength <= 0.02) {
      if (shown) ctx.clearRect(0, 0, c.width, c.height)
      shown = false
      return
    }
    shown = true
    if (c.width !== window.innerWidth || c.height !== window.innerHeight) {
      c.width = window.innerWidth
      c.height = window.innerHeight
    }
    ctx.clearRect(0, 0, c.width, c.height)
    const cx = c.width / 2
    const cy = c.height * 0.45
    const R = Math.hypot(cx, cy)
    for (const l of lines) {
      l.r += dt * l.v * (1.2 + strength * 2.4)
      if (l.r > 1) {
        l.r = 0.25 + Math.random() * 0.2
        l.a = Math.random() * Math.PI * 2
      }
      const r0 = l.r * R
      const r1 = r0 + R * (0.06 + strength * 0.12)
      const ca = Math.cos(l.a)
      const sa = Math.sin(l.a)
      ctx.strokeStyle = `rgba(255,255,255,${(0.5 * strength * Math.min(1, (l.r - 0.25) * 4)).toFixed(3)})`
      ctx.lineWidth = 2 + l.v * 2.5
      ctx.beginPath()
      ctx.moveTo(cx + ca * r0, cy + sa * r0)
      ctx.lineTo(cx + ca * r1, cy + sa * r1)
      ctx.stroke()
    }
  }
}

function el(cls, html = '') {
  const e = document.createElement('div')
  e.className = cls
  e.innerHTML = html
  return e
}

// scene, fx: the effects pool. hooks: { onClap() the clap animation, hits(ox, oz, r0, r1)
// -> Wins broken by the ring growing from r0 to r1 m, onPaid(wins), onCinematic(on) }.
export function createWave(scene, fx, hooks) {
  const uniforms = {
    uColor: { value: new Color(2.6, 2.6, 2.45) },
    uOrigin: { value: new Vector3() },
    uHalf: { value: BEACH.halfWidth },
    uBack: { value: 0 },
    uFade: { value: 1 },
    uRadius: { value: 1 },
  }
  const wall = new Mesh(new CylinderGeometry(1, 1, 1, 180, 1, true).translate(0, 0.5, 0), waveMaterial(wallFrag, uniforms))
  const groundColor = { value: new Color(1.1, 1.05, 0.9) }
  const ground = new Mesh(new CircleGeometry(1, 120).rotateX(-Math.PI / 2), waveMaterial(groundFrag, { ...uniforms, uColor: groundColor }))
  // The equipped trail's colour (TRAILS `wave`): null = plain white light, 'rainbow' cycles.
  let tint = null
  const tintColor = new Color()
  function applyTint(time) {
    if (!tint) {
      uniforms.uColor.value.setRGB(2.6, 2.6, 2.45)
      groundColor.value.setRGB(1.1, 1.05, 0.9)
      return
    }
    if (tint === 'rainbow') tintColor.setHSL((time * 0.35) % 1, 1, 0.55)
    else tintColor.set(tint)
    uniforms.uColor.value.copy(tintColor).multiplyScalar(2.4).addScalar(0.25)
    groundColor.value.copy(tintColor).multiplyScalar(1.0).addScalar(0.1)
  }
  ground.position.y = 0.04
  for (const m of [wall, ground]) {
    m.visible = false
    m.frustumCulled = false
    m.renderOrder = 5
    scene.add(m)
  }
  // The vertical ring that bursts from the hands at the slap.
  const flash = new Mesh(new TorusGeometry(1, 0.06, 8, 64), new MeshBasicMaterial({ color: new Color(3, 3, 3), transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false }))
  flash.visible = false
  flash.renderOrder = 6
  scene.add(flash)

  // --- The lane gate ---
  const G = WAVE.gate
  addFixed(RAPIER.ColliderDesc.cuboid((G.maxX - G.minX) / 2, G.height / 2, 0.25), { x: (G.minX + G.maxX) / 2, y: G.height / 2 - 1, z: G.z - 0.25 }, null, { groups: INVISIBLE_WALL })
  const gateUniforms = { uColor: { value: new Color(0.12, 0.72, 1.15) }, uAlpha: { value: 0 }, uTime: { value: 0 }, uPlayerX: { value: 0 } }
  const gate = new Mesh(new PlaneGeometry(G.glowHalf * 2, G.glowHeight), waveMaterial(gateFrag, gateUniforms))
  gate.material.blending = NormalBlending // a cyan film reads on bright sand, where added light washes out
  gate.position.set(0, G.glowHeight / 2, G.z)
  gate.renderOrder = 5
  gate.visible = false
  scene.add(gate)

  const distanceEl = el('wave-distance')
  const comboEl = el('wave-combo', `<b class="wc-n"></b><span class="wc-w"><span class="wc-i">${ICONS.trophy}</span><span class="wc-v"></span></span>`)
  const rewardEl = el('wave-reward', `<span class="wr-num"></span><span class="wr-icon">${ICONS.trophy}</span>`)
  document.body.append(distanceEl, comboEl, rewardEl)
  const comboN = comboEl.querySelector('.wc-n')
  const comboW = comboEl.querySelector('.wc-v')
  const rewardN = rewardEl.querySelector('.wr-num')
  const lines = speedLines()
  // Restarts a one-shot CSS animation class.
  const bump = (node, cls = 'bump') => {
    node.classList.remove(cls)
    void node.offsetWidth
    node.classList.add(cls)
  }

  const W = {
    phase: 'idle',
    t: 0,
    ox: 0,
    oz: 0,
    range: 0,
    dur: 1,
    d: 0, // m the ring has run
    wins: 0,
    clapped: false,
    slapped: false,
    flashT: -1,
    combo: 0, // props broken this wave
    shownWins: -1,
    shake: 0, // m of camera shake, decays
    stop: 0, // s of hit-stop left (the wave crawls)
    speed: 0, // m/s the ring is running
    roar: 0, // last level sent to sfx.rumble
    ticks: 0, // count-up ticks played
    dustAcc: 0, // crest dust owed (fractional particles)
  }
  const focus = new Vector3()
  const frontPos = new Vector3()
  const frontLook = new Vector3()
  const chasePos = new Vector3()
  const chaseLook = new Vector3()
  const camPos = new Vector3()
  const camLook = new Vector3()
  const playerLook = new Vector3()
  const c = new Color()

  const radius = () => 0.8 + W.d

  function start({ x, z, range }) {
    if (W.phase !== 'idle') return false
    W.phase = 'windup'
    W.t = 0
    W.ox = x
    W.oz = z
    W.range = range
    const D = WAVE.duration
    W.dur = Math.min(D.max, Math.max(D.min, range * D.perMetre))
    W.d = 0
    W.wins = 0
    W.clapped = false
    W.slapped = false
    W.combo = 0
    W.shownWins = -1
    W.shake = 0
    W.stop = 0
    W.ticks = 0
    comboEl.classList.remove('show')
    setMode('character') // the front shot needs the avatar on screen
    player.frozen = true
    player.facing = Math.PI // face down the beach (north)
    syncYawToPlayer() // the player camera comes back behind them, looking where the wave went
    uniforms.uOrigin.value.set(x, 0, z)
    uniforms.uFade.value = 1
    uniforms.uBack.value = 0
    distanceEl.textContent = '0 m'
    hooks.onCinematic?.(true)
    return true
  }

  // The hands meet: burst, flash ring, boom; the wave is off.
  function slap() {
    const p = player.renderPosition
    const hy = p.y + player.dims.height * 0.72
    const hz = p.z - 0.7
    fx.clapBurst(p.x, hy, hz, 40)
    fx.rings.show(p.x, p.y, p.z, 6, new Color(1.8, 1.7, 1.4))
    fx.rings.show(p.x, p.y, p.z, 10, new Color(1.2, 1.15, 1))
    W.shake = 0.35
    flash.position.set(p.x, hy, hz)
    flash.visible = true
    W.flashT = 0
    sfx.clap()
    sfx.wave()
    W.phase = 'wave'
    W.t = 0
    wall.visible = ground.visible = true
    distanceEl.classList.add('show')
  }

  // Sand and sparks kicked up along the crest.
  function dust(dt) {
    const r = radius()
    // A steady rate whatever the frame rate (fractions carry over).
    W.dustAcc += dt * WAVE.dustRate
    const n = Math.min(12, Math.floor(W.dustAcc))
    W.dustAcc -= n
    for (let i = 0; i < n; i++) {
      const x = -BEACH.halfWidth + Math.random() * BEACH.halfWidth * 2
      const dx = x - W.ox
      if (Math.abs(dx) >= r) continue
      const z = W.oz - Math.sqrt(r * r - dx * dx)
      if (i % 3 === 0) {
        c.setRGB(3, 2.8, 2.2)
        fx.sparks.emit({ x, y: 0.3 + Math.random() * 1.2, z, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 3, vz: -4 - Math.random() * 6, color: c, size: 0.3, life: 0.45, drag: 3, gravity: -6, spin: 6 })
      } else {
        c.setRGB(0.5, 0.45, 0.34)
        fx.glow.emit({ x, y: 0.25, z, vx: (Math.random() - 0.5) * 1.5, vy: 0.6 + Math.random() * 1.2, vz: -1 - Math.random() * 2, color: c, size: 1.1 + Math.random() * 0.8, life: 0.7, drag: 2, grow: 1.2 })
      }
      // Sand clods flicked forward off the crest.
      if (i % 2 === 0) {
        c.setRGB(0.93, 0.82, 0.58)
        fx.debris.emit(x, 0.15, z, c, 0.14, 2.5, 0, { push: { x: 0, z: -(4 + W.speed * 0.15) }, life: 0.5 })
      }
    }
  }

  function placeRing() {
    const r = radius()
    wall.position.set(W.ox, 0, W.oz)
    wall.scale.set(r, WAVE.height * (1 - 0.35 * (W.d / Math.max(W.range, 1))), r)
    ground.position.set(W.ox, 0.04, W.oz)
    ground.scale.setScalar(r + 0.2)
    uniforms.uRadius.value = r
    uniforms.uBack.value = smooth((W.d - 3) / 8)
  }

  function finishPay() {
    W.phase = 'idle'
    rewardEl.classList.remove('show')
    distanceEl.classList.remove('show')
    comboEl.classList.remove('show')
    player.frozen = false
    hooks.onCinematic?.(false)
  }

  return {
    start,
    setColor(c) {
      tint = c
      applyTint(0)
    },
    // A prop the wave broke (game.js): size ~ its radius. Combo, chime, shake, hit-stop.
    smashed(size = 1) {
      const step = W.combo++
      W.shake = Math.min(0.6, W.shake + 0.05 + size * 0.06)
      if (size >= WAVE.hitStop.size) W.stop = WAVE.hitStop.time
      sfx.smash(size, step)
      comboN.textContent = `${W.combo}x SMASH!`
      comboEl.classList.add('show')
      bump(comboN)
    },
    // From the CLAP press until the reward is gone.
    get busy() {
      return W.phase !== 'idle'
    },
    // Where lighting, shadows and prop culling should centre while the camera is away.
    focus() {
      if (W.phase === 'wave' || W.phase === 'hold') return focus.set(W.ox, 0, W.oz - radius())
      return null
    },
    update(dt) {
      // The gate glows where the player is, only while they are close (never mid-wave).
      const toGate = player.renderPosition.z - G.z
      const want = W.phase === 'idle' ? 1 - smooth((toGate - 0.9) / G.showWithin) : 0
      const a = gateUniforms.uAlpha.value + (want - gateUniforms.uAlpha.value) * (1 - Math.exp(-8 * dt))
      gateUniforms.uAlpha.value = a
      gate.visible = a > 0.01
      if (gate.visible) {
        gateUniforms.uTime.value += dt
        gateUniforms.uPlayerX.value = player.renderPosition.x
      }
      W.shake *= Math.exp(-7 * dt)
      const roar = W.phase === 'wave' ? Math.min(1, W.speed / 40) : 0
      if (Math.abs(roar - W.roar) > 0.01) sfx.rumble((W.roar = roar))
      lines(dt, W.phase === 'wave' ? Math.min(1, W.speed / 55) : 0)
      if (W.flashT >= 0) {
        W.flashT += dt
        const t = W.flashT / 0.45
        if (t >= 1) {
          flash.visible = false
          W.flashT = -1
        } else {
          const s = 0.5 + (1 - (1 - t) * (1 - t)) * 2.6
          flash.scale.set(s, s * 1.3, s)
          flash.material.opacity = 1 - t
        }
      }
      if (W.phase === 'idle') return
      if (tint === 'rainbow') applyTint(performance.now() / 1000)
      // Hit-stop: a big prop breaking freezes the wave for a heartbeat.
      W.t += W.phase === 'wave' && W.stop > 0 ? dt * 0.1 : dt
      W.stop = Math.max(0, W.stop - dt)
      if (W.phase === 'windup') {
        if (!W.clapped && W.t >= WAVE.clapAt) {
          W.clapped = true
          hooks.onClap?.()
        }
        if (W.t >= WAVE.clapAt + ANIM.clap.hit) slap()
      } else if (W.phase === 'wave') {
        const u = Math.min(1, W.t / W.dur)
        const r0 = radius()
        W.d = W.range * (1 - (1 - u) * (1 - u))
        W.speed = ((2 * W.range) / W.dur) * (1 - u)
        W.wins += hooks.hits(W.ox, W.oz, r0, radius())
        placeRing()
        dust(dt)
        distanceEl.textContent = `${Math.floor(W.d)} m`
        if (W.wins !== W.shownWins) {
          W.shownWins = W.wins
          comboW.textContent = `+${fmt(W.wins)}`
        }
        if (u >= 1) {
          W.speed = 0
          W.phase = 'hold'
          W.t = 0
        }
      } else if (W.phase === 'hold') {
        uniforms.uFade.value = Math.max(0, 1 - W.t / (WAVE.hold * 0.8))
        if (W.t >= WAVE.hold) {
          wall.visible = ground.visible = false
          W.phase = 'return'
          W.t = 0
        }
      } else if (W.phase === 'return') {
        if (W.t >= WAVE.returnTime) {
          W.phase = 'pay'
          W.t = 0
          comboEl.classList.remove('show')
          if (W.wins > 0) {
            rewardN.textContent = '+0'
            bump(rewardEl, 'show')
            const p = player.renderPosition
            fx.confetti(p.x, p.y + player.dims.height + 0.6, p.z, 90)
          }
          hooks.onPaid?.(W.wins)
        }
      } else if (W.phase === 'pay') {
        // The "+N" counts up with rising ticks, then lands with a bump.
        if (W.wins > 0 && W.ticks <= WAVE.countTicks) {
          const k = Math.min(1, W.t / WAVE.countUp)
          const n = Math.floor(k * WAVE.countTicks)
          if (n >= W.ticks) {
            rewardN.textContent = `+${fmt(Math.round(W.wins * (1 - (1 - k) * (1 - k))))}`
            if (n < WAVE.countTicks) sfx.tick(n)
            else bump(rewardN, 'land')
            W.ticks = n + 1
          }
        }
        if (W.t >= (W.wins > 0 ? WAVE.payTime : 0.3)) finishPay()
      }
    },
    // After camera.js has placed the player camera: blend toward the wave shots.
    // Shots are blended as position + yaw/pitch, swinging round the side (never
    // through the player) when the view turns.
    applyCamera(camera) {
      let b = 0 // 1 = the wave's camera, 0 = the player camera
      let m = 0 // 0 = front shot, 1 = chase
      let arc = 0 // m the camera swings out sideways mid-blend
      if (W.phase === 'windup') {
        b = smooth(W.t / C.enter)
        arc = C.arc
      } else if (W.phase === 'wave') {
        b = 1
        m = smooth((W.t - C.swingDelay) / C.swing)
      } else if (W.phase === 'hold') {
        b = 1
        m = 1
      } else if (W.phase === 'return') {
        b = 1 - smooth(W.t / WAVE.returnTime)
        m = 1
      }
      if (b <= 0.001) return
      const p = player.renderPosition
      frontPos.set(p.x, p.y + C.front.up, p.z - C.front.back)
      frontLook.set(p.x, p.y + C.front.lookUp, p.z)
      const fz = W.oz - radius()
      const cx = W.ox * 0.6
      chasePos.set(cx, C.chase.up, fz + C.chase.back)
      chaseLook.set(cx, C.chase.lookUp, fz - C.chase.ahead)
      blendPose(frontPos, frontLook, chasePos, chaseLook, m, m > 0 && m < 1 ? C.arc * 0.6 : 0, camPos, camLook)
      camera.getWorldDirection(playerLook).add(camera.position)
      blendPose(camera.position, playerLook, camPos, camLook, b, arc, camPos, camLook)
      if (W.shake > 0.003) {
        const k = W.shake * b
        camPos.x += (Math.random() - 0.5) * 2 * k
        camPos.y += (Math.random() - 0.5) * 2 * k
        camLook.x += (Math.random() - 0.5) * k
      }
      camera.position.copy(camPos)
      camera.lookAt(camLook)
    },
  }
}
