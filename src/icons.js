import { STYLES } from './lobby/gauntlets.js'

// SVG icons for the popup windows (windows.js): chunky dark outlines, flat bright
// fills, like the HUD's ICONS in hud.js.

const INK = '#16131f'
const OUT = `stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"`
let uid = 0
const id = (p) => `${p}${++uid}`

// The Rebirth icon (public/ui/rebirth.png, the same image as Bowling Roll's).
export const rebirthIcon = () => `<svg viewBox="0 0 64 64"><image href="${import.meta.env.BASE_URL}ui/rebirth.png" width="64" height="64"/></svg>`

// A boxing-glove gauntlet in a showroom style's colours (lobby/gauntlets.js STYLES).
// `style` is a STYLES name or a { hand, cuff, rim, strap } object.
export function gauntletIcon(style) {
  const s = typeof style === 'object' ? style : STYLES[style] ?? STYLES.classic
  return `<svg viewBox="0 0 64 64">
    <path d="M17 33C12 16 24 5 37 6c13 1 20 11 18 24-1 8-6 13-11 15H24c-4-2-6-6-7-12z" fill="${s.hand}" ${OUT}/>
    <path d="M18 29c-9-2-12 9-4 13 2 1 5 1 7 0" fill="${s.hand}" ${OUT}/>
    <path d="M27 14c5-4 13-4 18 1" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>
    <rect x="20" y="43" width="26" height="16" rx="4" fill="${s.cuff}" ${OUT}/>
    <path d="M20 49h26" stroke="${s.rim}" stroke-width="3.5"/>
    <path d="M28 43v16" stroke="${s.strap}" stroke-width="4"/></svg>`
}

// Eggs: spotted (plain), scaled (legendary) or a cluster of crystals (mythical).
export function eggIcon(egg) {
  const { color, spots, look } = egg
  if (look === 'crystal') {
    return `<svg viewBox="0 0 64 72">
      <path d="M32 3l12 18-4 40H24l-4-40z" fill="${color}" ${OUT}/>
      <path d="M14 18l10 12-2 30-10-4-6-26z" fill="#5a22b8" ${OUT}/>
      <path d="M50 18l-10 12 2 30 10-4 6-26z" fill="#5a22b8" ${OUT}/>
      <path d="M32 3l-6 18h12z" fill="${spots}" opacity=".8"/>
      <path d="M28 26l-2 26M10 26l4 20M54 26l-4 20" stroke="${spots}" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
      <path d="M8 62q24 12 48 0l-4-8H12z" fill="#3a1a7a" ${OUT}/></svg>`
  }
  const g = id('eg')
  const scales = look === 'scales'
    ? [14, 26, 38, 50].map((y, r) => [0, 1, 2, 3].map((c) => `<path d="M${10 + c * 12 + (r % 2) * 6} ${y}q6 7 12 0" fill="none" stroke="${spots}" stroke-width="3"/>`).join('')).join('')
    : `<circle cx="22" cy="30" r="5" fill="${spots}"/><circle cx="41" cy="44" r="6.5" fill="${spots}"/><circle cx="24" cy="56" r="4" fill="${spots}"/><circle cx="42" cy="22" r="3.5" fill="${spots}"/>`
  return `<svg viewBox="0 0 64 80"><defs><clipPath id="${g}"><path d="M32 4C16 4 6 30 6 48a26 26 0 0 0 52 0C58 30 48 4 32 4z"/></clipPath></defs>
    <path d="M32 4C16 4 6 30 6 48a26 26 0 0 0 52 0C58 30 48 4 32 4z" fill="${color}"/>
    <g clip-path="url(#${g})">${scales}</g>
    <path d="M32 4C16 4 6 30 6 48a26 26 0 0 0 52 0C58 30 48 4 32 4z" fill="none" ${OUT}/>
    <path d="M17 40c0-10 4-20 9-26" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/></svg>`
}

// A star-shaped potion bottle in the boost's colour.
export const potionIcon = (color) => `<svg viewBox="0 0 64 64"><rect x="27" y="3" width="10" height="9" rx="2" fill="#c98a4a" ${OUT}/><rect x="24" y="10" width="16" height="6" rx="2" fill="#8a96a8" ${OUT}/><path d="M32 14l6.6 13.4 14.8 2.2-10.7 10.4 2.5 14.7L32 47.8l-13.2 6.9 2.5-14.7L10.6 29.6l14.8-2.2z" fill="${color}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M24 31l4-1" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".8"/></svg>`

// A swept flame / wing in a trail's colours, with sparkles.
export function trailIcon(colors) {
  const g = id('tr')
  const stops = colors.map((c, i) => `<stop offset="${colors.length > 1 ? i / (colors.length - 1) : 0}" stop-color="${c}"/>`).join('')
  const spark = (x, y, r) => `<path d="M${x} ${y - r}l${r * 0.3} ${r * 0.7} ${r * 0.7} ${r * 0.3}-${r * 0.7} ${r * 0.3}-${r * 0.3} ${r * 0.7}-${r * 0.3}-${r * 0.7}-${r * 0.7}-${r * 0.3} ${r * 0.7}-${r * 0.3}z" fill="#fff6c0" stroke="${INK}" stroke-width="1.6"/>`
  return `<svg viewBox="0 0 72 64"><defs><linearGradient id="${g}" x1="1" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>
    <path d="M6 60C12 42 24 31 38 27 33 22 31 15 35 6c5 9 11 13 19 12-3-6-1-12 6-17 2 10 0 17-5 23 6 1 11-1 15-5-3 13-14 22-29 24-9 1-20 6-35 17z" fill="url(#${g})" ${OUT}/>
    <path d="M14 52c8-9 18-15 30-17M40 22c3 3 7 4 11 3M55 26c3 1 6 0 8-2" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>
    ${spark(50, 40, 6)}${spark(14, 30, 5)}${spark(60, 54, 4)}</svg>`
}

export const ICON = {
  // window title icons
  backpack: `<svg viewBox="0 0 64 64"><path d="M22 16c0-9 20-9 20 0" fill="none" stroke="${INK}" stroke-width="7"/><path d="M22 16c0-9 20-9 20 0" fill="none" stroke="#e07a10" stroke-width="3.5"/><rect x="10" y="14" width="44" height="46" rx="14" fill="#ffb21a" ${OUT}/><path d="M16 22q16-6 32 0" fill="none" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/><path d="M18 38q14 8 28 0" fill="none" stroke="${INK}" stroke-width="3"/><path d="M23 41l3 8 4-6 4 6 3-8" fill="#ff4a2a" ${OUT}/></svg>`,
  dog: `<svg viewBox="0 0 64 64"><path d="M8 14c4-8 16-6 16 2l-4 18C10 34 4 22 8 14zM56 14c-4-8-16-6-16 2l4 18c10 0 16-12 12-20z" fill="#7a4322" ${OUT}/><rect x="12" y="16" width="40" height="38" rx="10" fill="#c88048" ${OUT}/><rect x="22" y="36" width="20" height="14" rx="6" fill="#f6dcc0"/><circle cx="24" cy="30" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="40" cy="30" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="25" cy="31" r="2.6" fill="${INK}"/><circle cx="39" cy="31" r="2.6" fill="${INK}"/><ellipse cx="32" cy="40" rx="4" ry="3" fill="${INK}"/><path d="M28 45q4 3 8 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></svg>`,
  calendar: (month, day) => `<svg viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="48" rx="7" fill="#fff" ${OUT}/><path d="M6 17a7 7 0 0 1 7-7h38a7 7 0 0 1 7 7v8H6z" fill="#e8324a" ${OUT}/><text x="25" y="22" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="10" fill="#fff">${month}</text><path d="M40 15h10M40 19h10" stroke="#fff" stroke-width="2" stroke-dasharray="2 2"/><text x="31" y="52" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="26" fill="#3a4a66">${day}</text></svg>`,
  gift: `<svg viewBox="0 0 64 64"><rect x="8" y="26" width="48" height="32" rx="4" fill="#3aa8ff" ${OUT}/><rect x="4" y="16" width="56" height="12" rx="3" fill="#6ac4ff" ${OUT}/><rect x="27" y="16" width="10" height="42" fill="#ff4a8a" ${OUT}/><path d="M32 16C26 4 12 6 16 14c2 3 10 2 16 2zM32 16c6-12 20-10 16-2-2 3-10 2-16 2z" fill="#ff4a8a" ${OUT}/></svg>`,
  trails: trailIcon(['#d48bff', '#6a1fd8']),
  // reward icons
  bolt: `<svg viewBox="0 0 24 32"><path d="M15 1 L3 18 h8 l-3 13 L21 12 h-8 l3-11z" fill="#ffc21a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/></svg>`,
  boltBlue: `<svg viewBox="0 0 24 32"><path d="M15 1 L3 18 h8 l-3 13 L21 12 h-8 l3-11z" fill="#3aa8ff" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/></svg>`,
  trophy: `<svg viewBox="0 0 48 48"><path d="M12 10H6v6a8 8 0 0 0 8 8M36 10h6v6a8 8 0 0 1-8 8" fill="none" stroke="${INK}" stroke-width="6"/><path d="M12 10H6v6a8 8 0 0 0 8 8M36 10h6v6a8 8 0 0 1-8 8" fill="none" stroke="#ffc21a" stroke-width="3"/><path d="M11 6h26v10a13 13 0 0 1-26 0z" fill="#ffc21a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M15 9v6a9 9 0 0 0 4 8" fill="none" stroke="#fff3b0" stroke-width="2.5" stroke-linecap="round"/><rect x="21" y="28" width="6" height="8" fill="#e8a410" stroke="${INK}" stroke-width="2"/><rect x="13" y="36" width="22" height="7" rx="2" fill="#ffc21a" stroke="${INK}" stroke-width="2.5"/></svg>`,
  glove: gauntletIcon({ hand: '#e8243a', cuff: '#ffffff', rim: '#d8dce4', strap: '#e8243a' }),
  egg: eggIcon({ color: '#f4ecdc', spots: '#e0d4bc', look: 'plain' }),
  // buttons
  check: `<svg viewBox="0 0 64 64"><path d="M6 34l18 18L58 14" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 34l18 18L58 14" fill="none" stroke="#3ccf3a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: `<svg viewBox="0 0 64 64"><path d="M32 12v40M12 32h40" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M32 12v40M12 32h40" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>`,
  trash: `<svg viewBox="0 0 64 64"><path d="M14 18h36l-3 40H17z" fill="#ffd0d4" ${OUT}/><rect x="8" y="10" width="48" height="9" rx="3" fill="#ffd0d4" ${OUT}/><path d="M25 26v24M32 26v24M39 26v24" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".55"/></svg>`,
  sort: `<svg viewBox="0 0 64 64"><path d="M20 52V12M8 24l12-12 12 12" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 12v40M32 40l12 12 12-12" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 52V12M8 24l12-12 12 12" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 12v40M32 40l12 12 12-12" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  lock: `<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#ffc21a" ${OUT}/><path d="M22 30v-6a10 10 0 0 1 20 0v6" fill="none" stroke="${INK}" stroke-width="5"/><rect x="16" y="29" width="32" height="24" rx="5" fill="#2a2b31"/></svg>`,
  sparkle: `<svg viewBox="0 0 16 16"><path d="M8 0l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#fff6c0"/></svg>`,
  x: `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8L8 24" stroke="${INK}" stroke-width="9.5" stroke-linecap="round"/><path d="M8 8l16 16M24 8L8 24" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
}
