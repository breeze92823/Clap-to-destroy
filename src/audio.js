// Synthesised sound effects (no audio files). The context is created on the
// first user gesture (browsers keep audio locked until then) and every call is
// a no-op until it exists or if Web Audio is missing.
let ctx = null
let master = null
let noise = null

function unlock() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0.5
  // A compressor on the way out: a wave can smash a dozen props in one frame,
  // and the stacked hits should punch, not clip.
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.knee.value = 8
  comp.ratio.value = 5
  comp.attack.value = 0.003
  comp.release.value = 0.2
  master.connect(comp).connect(ctx.destination)
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
}
// Silent while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  try {
    if (!ctx) return
    if (document.hidden) ctx.suspend().catch(() => {})
    else ctx.resume().catch(() => {})
  } catch {
    // Audio is optional.
  }
})
window.addEventListener('pointerdown', unlock, { capture: true })
window.addEventListener('keydown', unlock, { capture: true })

function burst(freq, q, decay, gain, type = 'bandpass', at = 0) {
  if (!ctx) return
  const t = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.playbackRate.value = 0.8 + Math.random() * 0.4
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + decay)
  src.connect(f).connect(g).connect(master)
  src.start(t, Math.random() * 0.5, decay + 0.05)
}

function tone(freq, decay, gain, type = 'sine', at = 0, slide = 1) {
  if (!ctx) return
  const t = ctx.currentTime + at
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.frequency.exponentialRampToValueAtTime(freq * slide, t + decay)
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + decay)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + decay + 0.05)
}

// A noise sweep: bandpass gliding from f0 to f1 Hz (whooshes).
function sweep(f0, f1, dur, gain, q = 1.2, at = 0) {
  if (!ctx) return
  const t = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = q
  f.frequency.setValueAtTime(f0, t)
  f.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.25)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(f).connect(g).connect(master)
  src.start(t)
  src.stop(t + dur + 0.05)
}

// The wave's travelling roar: one looping noise voice whose loudness and
// brightness follow rumble(level) every frame.
let roar = null
function roarVoice() {
  if (roar || !ctx) return roar
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 300
  f.Q.value = 0.8
  const g = ctx.createGain()
  g.gain.value = 0
  src.connect(f).connect(g).connect(master)
  src.start()
  roar = { f, g }
  return roar
}

// Combo notes climb a major pentatonic scale, an octave every five smashes.
const PENTA = [0, 2, 4, 7, 9]
let lastSmash = 0

export const sfx = {
  clap() {
    burst(1300 + Math.random() * 400, 1.2, 0.11, 1.1)
    burst(2600, 0.8, 0.05, 0.5, 'highpass')
    tone(180, 0.06, 0.25, 'sine', 0, 0.5)
  },
  // The clap shockwave leaving: a low boom and a long rushing whoosh.
  wave() {
    tone(70, 0.9, 0.8, 'sine', 0, 0.4) // sub boom
    tone(140, 0.35, 0.35, 'triangle', 0, 0.5)
    burst(240, 0.6, 0.7, 1.1, 'lowpass')
    burst(5000, 0.7, 0.12, 0.5, 'highpass') // crack
    sweep(300, 2400, 0.7, 0.5, 1.1, 0.03) // whoosh away
  },
  // The "+N" Wins pop at the end of a wave.
  reward() {
    ;[659, 880, 1175, 1568].forEach((f, i) => tone(f, 0.22, 0.15, 'square', i * 0.06))
    tone(2093, 0.4, 0.1, 'triangle', 0.26)
  },
  hit() {
    burst(500, 1, 0.12, 0.5)
  },
  // A prop breaking. size ~ 0.5 (ball) .. 3 (big castle); step = its place in
  // the wave's combo (adds a rising chime), -1 = no chime.
  smash(size = 1, step = -1) {
    if (!ctx) return
    const now = ctx.currentTime
    const crowded = now - lastSmash < 0.035 // several in one frame: one body, every chime
    lastSmash = now
    if (!crowded) {
      const k = Math.min(1.4, 0.55 + size * 0.3)
      tone(150 - size * 18, 0.3 + size * 0.06, 0.55 * k, 'sine', 0, 0.3) // thump
      burst(380, 0.7, 0.3 + size * 0.08, 0.9 * k, 'lowpass') // body
      burst(700 + Math.random() * 900, 0.9, 0.16, 0.6 * k) // crunch
      for (let i = 0; i < 3 + Math.round(size * 2); i++) burst(2200 + Math.random() * 2600, 2, 0.035, 0.22, 'bandpass', 0.04 + Math.random() * 0.28) // clatter
    }
    if (step >= 0) {
      const n = Math.min(step, 14)
      const f = 523.25 * 2 ** ((PENTA[n % 5] + 12 * Math.floor(n / 5)) / 12)
      tone(f, 0.28, 0.11, 'triangle', 0.01)
      tone(f * 2, 0.16, 0.04, 'sine', 0.01)
    }
  },
  // The wave's roar, 0 (silent) .. 1 (full speed); call every frame.
  rumble(level) {
    const v = roarVoice()
    if (!v) return
    const t = ctx.currentTime
    v.g.gain.setTargetAtTime(level * 0.55, t, 0.08)
    v.f.frequency.setTargetAtTime(220 + level * 900, t, 0.08)
  },
  // One tick of the "+N" count-up; i climbs the pitch.
  tick(i = 0) {
    tone(1046 * 2 ** (Math.min(i, 24) / 24), 0.05, 0.08, 'square')
  },
  coin() {
    tone(880, 0.12, 0.18, 'square', 0)
    tone(1320, 0.18, 0.16, 'square', 0.07)
  },
  unlock() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 0.16, 'triangle', i * 0.08))
  },
  deny() {
    tone(220, 0.15, 0.2, 'square', 0, 0.8)
  },
}
