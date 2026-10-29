import { CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace } from 'three'
import { TITLE_FONT, titleFontReady } from './fonts.js'

// Floating billboard text like the reference's overhead signs: several lines,
// each with its own size, colour (or vertical gradient), outline and optional
// icon drawn before the text. Anchored at the bottom centre, so it grows
// upward from its position. `set(lines)` repaints (state changes, counters).
//
// line: { text, size (px), color | gradient: [top, bottom], outline, font: 'title' | 'body', icon(ctx, s), pill (background colour) }
const BODY_FONT = '"Fredoka", "Arial Black", sans-serif'
const PAD = 16

export class Billboard {
  constructor(lines, metresPer100px = 1) {
    this.canvas = document.createElement('canvas')
    this.texture = new CanvasTexture(this.canvas)
    this.texture.colorSpace = SRGBColorSpace
    this.sprite = new Sprite(new SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false, fog: false }))
    this.sprite.center.set(0.5, 0)
    this.sprite.renderOrder = 5
    this.k = metresPer100px / 100
    this.set(lines)
    titleFontReady.then(() => this.set(this.lines))
  }

  set(lines) {
    this.lines = lines
    const c = this.canvas
    const ctx = c.getContext('2d')
    const fontOf = (l) => `${l.font === 'body' ? 700 : 400} ${l.size}px ${l.font === 'body' ? BODY_FONT : TITLE_FONT}`
    let width = 0
    let height = PAD
    for (const l of lines) {
      ctx.font = fontOf(l)
      const iconW = l.icon ? l.size * 1.1 : 0
      width = Math.max(width, ctx.measureText(l.text).width + iconW + (l.pill ? l.size * 1.2 : 0))
      height += l.size * (l.pill ? 1.3 : 1.08)
    }
    const w = Math.ceil(width + PAD * 2 + 20)
    const h = Math.ceil(height + PAD)
    if (c.width !== w || c.height !== h) {
      c.width = w
      c.height = h
      this.texture.dispose() // new size: re-upload
    }
    ctx.clearRect(0, 0, w, h)
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    let y = PAD
    for (const l of lines) {
      ctx.font = fontOf(l)
      const tw = ctx.measureText(l.text).width
      const iconW = l.icon ? l.size * 1.1 : 0
      const x0 = (w - tw - iconW) / 2
      const cy = y + l.size * (l.pill ? 0.68 : 0.56)
      if (l.pill) {
        const px = l.size * 0.55
        ctx.fillStyle = l.pill
        ctx.beginPath()
        ctx.roundRect(x0 - px, cy - l.size * 0.62, tw + iconW + px * 2, l.size * 1.24, l.size * 0.62)
        ctx.fill()
      }
      if (l.icon) {
        ctx.save()
        ctx.translate(x0 + l.size * 0.5, cy)
        l.icon(ctx, l.size)
        ctx.restore()
      }
      ctx.textAlign = 'left'
      ctx.lineWidth = Math.max(4, l.size * 0.2)
      ctx.strokeStyle = l.outline ?? '#16131f'
      ctx.strokeText(l.text, x0 + iconW, cy)
      if (l.gradient) {
        const g = ctx.createLinearGradient(0, cy - l.size / 2, 0, cy + l.size / 2)
        l.gradient.forEach((col, i) => g.addColorStop(i / (l.gradient.length - 1), col))
        ctx.fillStyle = g
      } else ctx.fillStyle = l.color ?? '#ffffff'
      ctx.fillText(l.text, x0 + iconW, cy)
      y += l.size * (l.pill ? 1.3 : 1.08)
    }
    this.texture.needsUpdate = true
    this.sprite.scale.set(w * this.k, h * this.k, 1)
  }
}

// --- Icons drawn into labels (centred on 0,0, about s px tall) ---------------------
export function giftIcon(ctx, s) {
  const r = s * 0.42
  ctx.fillStyle = '#e8262d'
  ctx.strokeStyle = '#16131f'
  ctx.lineWidth = s * 0.08
  ctx.beginPath()
  ctx.rect(-r, -r * 0.55, r * 2, r * 1.5)
  ctx.stroke()
  ctx.fill()
  ctx.fillStyle = '#ffd23a'
  ctx.fillRect(-r * 0.18, -r * 0.55, r * 0.36, r * 1.5)
  ctx.fillStyle = '#c51b22'
  ctx.fillRect(-r * 1.1, -r * 0.85, r * 2.2, r * 0.45)
  ctx.fillStyle = '#ffd23a'
  ctx.fillRect(-r * 0.18, -r * 0.85, r * 0.36, r * 0.45)
}

export function ballIcon(ctx, s) {
  const r = s * 0.4
  ctx.lineWidth = s * 0.08
  ctx.strokeStyle = '#16131f'
  ctx.fillStyle = '#ef3340'
  ctx.beginPath()
  ctx.arc(0, 0, r, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.moveTo(-r, 0)
  ctx.lineTo(r, 0)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

export function umbrellaIcon(ctx, s) {
  const r = s * 0.42
  ctx.lineWidth = s * 0.07
  ctx.strokeStyle = '#16131f'
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#e8262d'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, r, Math.PI + (i * Math.PI) / 4, Math.PI + ((i + 1) * Math.PI) / 4)
    ctx.closePath()
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(0, 0, r, Math.PI, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, r * 0.9)
  ctx.stroke()
}

export function trophyIcon(ctx, s) {
  const k = s / 32
  ctx.save()
  ctx.scale(k, k)
  ctx.translate(-16, -16)
  ctx.lineWidth = 3
  ctx.strokeStyle = '#16131f'
  ctx.fillStyle = '#ffd23a'
  ctx.beginPath()
  ctx.moveTo(8, 4)
  ctx.lineTo(24, 4)
  ctx.lineTo(24, 11)
  ctx.arc(16, 11, 8, 0, Math.PI)
  ctx.closePath()
  ctx.stroke()
  ctx.fill()
  ctx.strokeRect(13, 18, 6, 6)
  ctx.fillRect(13, 18, 6, 6)
  ctx.strokeRect(9, 24, 14, 5)
  ctx.fillRect(9, 24, 14, 5)
  ctx.restore()
}

// The premium currency hexagon (pink with a white core).
export function hexIcon(ctx, s) {
  const r = s * 0.42
  const hex = (rr) => {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    ctx.closePath()
  }
  hex(r)
  ctx.lineWidth = s * 0.1
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ff5fb4'
  ctx.fill()
  ctx.stroke()
  hex(r * 0.45)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
}
