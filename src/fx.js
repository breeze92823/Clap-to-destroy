import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Points,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { GRAPHICS_PRESETS } from './config.js'
import { TITLE_FONT } from './lobby/fonts.js'
import { paintSoftDot, paintSparkle } from './textures.js'

// Pooled effects, all allocation-free per frame:
//  - Particles: one Points cloud per blend mode (soft glow, sparkles, shards),
//    each particle with its own colour, size, life, gravity and drag. Colours
//    above 1 are HDR, so additive sparks bloom.
//  - Debris: instanced little cubes that fly, bounce on the ground and shrink.
//  - Popups: "+12" style numbers that pop, rise and fade (sprite pool).
//  - Rings: flat shockwaves that expand and fade on the ground.

const vert = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  attribute float aSpin;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSpin;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vSpin = aSpin;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`
const frag = /* glsl */ `
  uniform sampler2D uMap;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSpin;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float c = cos(vSpin), s = sin(vSpin);
    p = mat2(c, -s, s, c) * p + 0.5;
    vec4 t = texture2D(uMap, p);
    if (t.a * vAlpha < 0.01) discard;
    gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`

// A hard-edged square shard (normal-blended: leaves, sand, green egg bits).
function paintShard(size = 32) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(size * 0.15, size * 0.15, size * 0.7, size * 0.7)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(size * 0.15, size * 0.6, size * 0.7, size * 0.25)
  return c
}

class ParticleSystem {
  constructor(scene, max, canvas, blending) {
    this.max = max
    this.count = 0
    this.pos = new Float32Array(max * 3)
    this.vel = new Float32Array(max * 3)
    this.col = new Float32Array(max * 3)
    this.size = new Float32Array(max)
    this.alpha = new Float32Array(max)
    this.spin = new Float32Array(max)
    this.spinRate = new Float32Array(max)
    this.life = new Float32Array(max)
    this.maxLife = new Float32Array(max)
    this.gravity = new Float32Array(max)
    this.drag = new Float32Array(max)
    this.grow = new Float32Array(max)
    this.baseSize = new Float32Array(max)
    const geo = new BufferGeometry()
    const attr = (name, arr, n) => {
      const a = new BufferAttribute(arr, n)
      a.setUsage(DynamicDrawUsage)
      geo.setAttribute(name, a)
      return a
    }
    this.aPos = attr('position', this.pos, 3)
    this.aCol = attr('aColor', this.col, 3)
    this.aSize = attr('aSize', this.size, 1)
    this.aAlpha = attr('aAlpha', this.alpha, 1)
    this.aSpin = attr('aSpin', this.spin, 1)
    geo.setDrawRange(0, 0)
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    this.material = new ShaderMaterial({
      uniforms: { uMap: { value: tex }, uScale: { value: 500 } },
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending,
    })
    this.points = new Points(geo, this.material)
    this.points.frustumCulled = false
    this.points.renderOrder = 4
    scene.add(this.points)
  }

  // o: { x, y, z, vx, vy, vz, color (Color), size, life, gravity, drag, grow, spin }
  emit(o) {
    if (this.count >= this.max) return
    const i = this.count++
    const i3 = i * 3
    this.pos[i3] = o.x
    this.pos[i3 + 1] = o.y
    this.pos[i3 + 2] = o.z
    this.vel[i3] = o.vx ?? 0
    this.vel[i3 + 1] = o.vy ?? 0
    this.vel[i3 + 2] = o.vz ?? 0
    this.col[i3] = o.color.r
    this.col[i3 + 1] = o.color.g
    this.col[i3 + 2] = o.color.b
    this.baseSize[i] = this.size[i] = o.size ?? 0.5
    this.alpha[i] = 1
    this.spin[i] = Math.random() * 6.28
    this.spinRate[i] = o.spin ?? 0
    this.life[i] = 0
    this.maxLife[i] = o.life ?? 1
    this.gravity[i] = o.gravity ?? 0
    this.drag[i] = o.drag ?? 0
    this.grow[i] = o.grow ?? 0
  }

  // Swap-remove dead particles so the live ones stay packed at the front.
  kill(i) {
    const last = --this.count
    if (i === last) return
    const copy3 = (a) => {
      a[i * 3] = a[last * 3]
      a[i * 3 + 1] = a[last * 3 + 1]
      a[i * 3 + 2] = a[last * 3 + 2]
    }
    copy3(this.pos)
    copy3(this.vel)
    copy3(this.col)
    for (const a of [this.size, this.alpha, this.spin, this.spinRate, this.life, this.maxLife, this.gravity, this.drag, this.grow, this.baseSize]) a[i] = a[last]
  }

  update(dt) {
    for (let i = this.count - 1; i >= 0; i--) {
      this.life[i] += dt
      const t = this.life[i] / this.maxLife[i]
      if (t >= 1) {
        this.kill(i)
        continue
      }
      const i3 = i * 3
      const d = Math.exp(-this.drag[i] * dt)
      this.vel[i3] *= d
      this.vel[i3 + 1] = this.vel[i3 + 1] * d + this.gravity[i] * dt
      this.vel[i3 + 2] *= d
      this.pos[i3] += this.vel[i3] * dt
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt
      this.size[i] = this.baseSize[i] * (1 + this.grow[i] * t)
      this.alpha[i] = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9
      this.spin[i] += this.spinRate[i] * dt
    }
    this.points.geometry.setDrawRange(0, this.count)
    for (const a of [this.aPos, this.aCol, this.aSize, this.aAlpha, this.aSpin]) {
      a.clearUpdateRanges?.()
      a.needsUpdate = true
    }
  }
}

// --- Debris ---------------------------------------------------------------------------
class Debris {
  constructor(scene, max = 160) {
    this.max = max
    this.mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ roughness: 0.7 }), max)
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(max * 3), 3)
    this.mesh.castShadow = true
    this.mesh.frustumCulled = false
    this.mesh.count = 0
    scene.add(this.mesh)
    this.items = Array.from({ length: max }, () => ({ p: new Vector3(), v: new Vector3(), q: new Quaternion(), axis: new Vector3(), spin: 0, size: 0, life: 0, max: 1, floor: 0 }))
    this.count = 0
    this.m = new Matrix4()
    this.s = new Vector3()
    this.dq = new Quaternion()
    this.tc = new Color()
  }
  emit(x, y, z, color, size, speed, floor = 0) {
    if (this.count >= this.max) return
    const it = this.items[this.count]
    const a = Math.random() * Math.PI * 2
    it.p.set(x, y, z)
    it.v.set(Math.cos(a) * speed * (0.4 + Math.random()), speed * (0.8 + Math.random() * 0.9), Math.sin(a) * speed * (0.4 + Math.random()))
    it.q.identity()
    it.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
    it.spin = 4 + Math.random() * 8
    it.size = size * (0.6 + Math.random() * 0.7)
    it.life = 0
    it.max = 1.4 + Math.random() * 0.6
    it.floor = floor
    this.mesh.setColorAt(this.count, color)
    this.count++
  }
  update(dt) {
    let n = 0
    for (let i = 0; i < this.count; i++) {
      const it = this.items[i]
      it.life += dt
      if (it.life >= it.max) continue
      it.v.y -= 22 * dt
      it.p.addScaledVector(it.v, dt)
      if (it.p.y < it.floor + it.size / 2) {
        it.p.y = it.floor + it.size / 2
        it.v.y *= -0.35
        it.v.x *= 0.6
        it.v.z *= 0.6
        it.spin *= 0.6
      }
      this.dq.setFromAxisAngle(it.axis, it.spin * dt)
      it.q.multiply(this.dq)
      const k = Math.min(1, (it.max - it.life) / 0.35)
      this.s.setScalar(it.size * k)
      this.m.compose(it.p, it.q, this.s)
      if (n !== i) {
        // Keep live debris packed (swap this item into slot n).
        const tmp = this.items[n]
        this.items[n] = it
        this.items[i] = tmp
        this.mesh.getColorAt(i, this.tc)
        this.mesh.setColorAt(n, this.tc)
      }
      this.mesh.setMatrixAt(n, this.m)
      n++
    }
    this.count = n
    this.mesh.count = n
    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }
}

// --- Number popups --------------------------------------------------------------------------
class Popups {
  constructor(scene, max = 24) {
    this.pool = Array.from({ length: max }, () => {
      const c = document.createElement('canvas')
      c.width = 512
      c.height = 128
      const tex = new CanvasTexture(c)
      tex.colorSpace = SRGBColorSpace
      const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false }))
      s.visible = false
      s.renderOrder = 10
      scene.add(s)
      return { sprite: s, canvas: c, tex, life: 0, max: 1, vy: 0, size: 1 }
    })
    this.next = 0
  }
  show(text, x, y, z, { color = '#ffe14a', outline = '#3a2408', size = 1, life = 1.1, icon = null } = {}) {
    const p = this.pool[this.next]
    this.next = (this.next + 1) % this.pool.length
    const ctx = p.canvas.getContext('2d')
    ctx.clearRect(0, 0, 512, 128)
    ctx.font = `86px ${TITLE_FONT}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.lineJoin = 'round'
    const w = ctx.measureText(text).width + (icon ? 90 : 0)
    const x0 = 256 - w / 2 + (icon ? 90 : 0)
    if (icon) icon(ctx, 256 - w / 2 + 40, 64, 80)
    ctx.lineWidth = 16
    ctx.strokeStyle = outline
    ctx.textAlign = 'left'
    ctx.strokeText(text, x0, 68)
    ctx.fillStyle = color
    ctx.fillText(text, x0, 68)
    p.tex.needsUpdate = true
    p.sprite.position.set(x + (Math.random() - 0.5) * 0.8, y, z + (Math.random() - 0.5) * 0.8)
    p.sprite.visible = true
    p.life = 0
    p.max = life
    p.vy = 2.4
    p.size = size
  }
  update(dt) {
    for (const p of this.pool) {
      if (!p.sprite.visible) continue
      p.life += dt
      const t = p.life / p.max
      if (t >= 1) {
        p.sprite.visible = false
        continue
      }
      p.sprite.position.y += p.vy * dt
      p.vy *= Math.exp(-2.5 * dt)
      const pop = t < 0.12 ? 0.5 + (t / 0.12) * 0.7 : t < 0.22 ? 1.2 - ((t - 0.12) / 0.1) * 0.2 : 1
      const s = p.size * pop
      p.sprite.scale.set(s * 4, s, 1)
      p.sprite.material.opacity = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1
    }
  }
}

// --- Ground shockwave rings ---------------------------------------------------------------------
class Rings {
  constructor(scene, max = 8) {
    const geo = new RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2)
    this.pool = Array.from({ length: max }, () => {
      const m = new Mesh(geo, new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false }))
      m.visible = false
      m.renderOrder = 3
      scene.add(m)
      return { mesh: m, life: 0, max: 0.5, radius: 5 }
    })
    this.next = 0
  }
  show(x, y, z, radius, color) {
    const r = this.pool[this.next]
    this.next = (this.next + 1) % this.pool.length
    r.mesh.position.set(x, y + 0.06, z)
    r.mesh.material.color.copy(color)
    r.mesh.visible = true
    r.life = 0
    r.radius = radius
  }
  update(dt) {
    for (const r of this.pool) {
      if (!r.mesh.visible) continue
      r.life += dt
      const t = r.life / r.max
      if (t >= 1) {
        r.mesh.visible = false
        continue
      }
      const e = 1 - (1 - t) * (1 - t)
      r.mesh.scale.setScalar(0.3 + e * r.radius)
      r.mesh.material.opacity = (1 - t) * 0.9
    }
  }
}

export function createFx(scene, preset = GRAPHICS_PRESETS.High) {
  const glow = new ParticleSystem(scene, 900, paintSoftDot(64), AdditiveBlending)
  const sparks = new ParticleSystem(scene, 500, paintSparkle(64), AdditiveBlending)
  const shards = new ParticleSystem(scene, 500, paintShard(32), NormalBlending)
  const debris = new Debris(scene)
  const popups = new Popups(scene)
  const rings = new Rings(scene)
  let density = preset.particles ?? 1
  const c = new Color()

  // Continuous emitters (flames, egg shards, lucky block sparkles) accumulate
  // fractional particles per frame so the rate is frame-rate independent.
  const emitters = []

  return {
    glow,
    sparks,
    shards,
    debris,
    popups,
    rings,
    setPreset(p) {
      density = p.particles ?? 1
    },
    // Keeps point sizes in metres whatever the canvas height / FOV.
    setViewport(heightPx, fovDeg) {
      const scale = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360))
      for (const s of [glow, sparks, shards]) s.material.uniforms.uScale.value = scale
    },
    // spawn(sys, dt) is called with how many particles to emit this frame.
    addEmitter(rate, spawn) {
      emitters.push({ rate, spawn, acc: 0 })
    },
    // The clap: a white-gold burst of sparks between the hands + a ground ring.
    clapBurst(x, y, z, power = 1) {
      const n = Math.round((14 + Math.min(20, power)) * density)
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const e = (Math.random() - 0.3) * 1.2
        const sp = 4 + Math.random() * 5
        c.setRGB(3, 2.7, 1.6)
        if (i % 3 === 0) c.setRGB(3.2, 2.2, 0.5)
        sparks.emit({ x, y, z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + 1, vz: Math.sin(a) * Math.cos(e) * sp, color: c, size: 0.35 + Math.random() * 0.35, life: 0.35 + Math.random() * 0.25, drag: 5, spin: 8 })
      }
      c.setRGB(2.6, 2.6, 2.6)
      glow.emit({ x, y, z, color: c, size: 2.4, life: 0.18, grow: 1.5 })
    },
    // A prop breaking: its colours as flying cubes + dust + a flash.
    smash(x, y, z, colors, size = 1, floor = 0) {
      const n = Math.round((10 + size * 10) * density)
      for (let i = 0; i < n; i++) {
        c.set(colors[i % colors.length])
        debris.emit(x + (Math.random() - 0.5) * size, y + Math.random() * size, z + (Math.random() - 0.5) * size, c, 0.18 + size * 0.14, 4 + size * 1.5, floor)
      }
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        c.setRGB(0.95, 0.88, 0.72)
        glow.emit({ x: x + Math.cos(a) * size * 0.5, y: y + 0.3, z: z + Math.sin(a) * size * 0.5, vx: Math.cos(a) * 2.5, vy: 0.6 + Math.random(), vz: Math.sin(a) * 2.5, color: c, size: 1.4 + size * 0.6, life: 0.8, drag: 2.5, grow: 1.4 })
      }
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        c.setRGB(3, 2.6, 1.2)
        sparks.emit({ x, y: y + size * 0.6, z, vx: Math.cos(a) * 7, vy: 3 + Math.random() * 5, vz: Math.sin(a) * 7, color: c, size: 0.5, life: 0.5, drag: 3, gravity: -9, spin: 6 })
      }
    },
    update(dt) {
      for (const e of emitters) {
        e.acc += e.rate * density * dt
        const n = Math.floor(e.acc)
        e.acc -= n
        if (n > 0) e.spawn(n)
      }
      glow.update(dt)
      sparks.update(dt)
      shards.update(dt)
      debris.update(dt)
      popups.update(dt)
      rings.update(dt)
    },
  }
}
