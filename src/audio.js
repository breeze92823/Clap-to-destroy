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
  master.connect(ctx.destination)
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
}
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

export const sfx = {
  clap() {
    burst(1300 + Math.random() * 400, 1.2, 0.11, 1.1)
    burst(2600, 0.8, 0.05, 0.5, 'highpass')
    tone(180, 0.06, 0.25, 'sine', 0, 0.5)
  },
  hit() {
    burst(500, 1, 0.12, 0.5)
  },
  smash() {
    burst(380, 0.7, 0.35, 1.0, 'lowpass')
    burst(900, 1.5, 0.2, 0.5)
    tone(110, 0.25, 0.4, 'triangle', 0, 0.4)
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
