import './hud.css'

// The on-screen HUD, laid out like the reference: AUTO CLAP up top, starter
// pack + the 2x3 menu grid on the left, currencies bottom-left, SKILL / level
// bar / skill packs bottom-centre, 5X SKILL + 2x WINS on the right, quest and
// calendar buttons top-right. Plain DOM; game.js pushes numbers in and listens
// for button presses with on(name, fn).

const grad = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`
const OUT = 'stroke="#1b1424" stroke-width="2.4" stroke-linejoin="round"'

export const ICONS = {
  bolt: `<svg viewBox="0 0 24 32"><defs>${grad('gb', [[0, '#ffe46a'], [1, '#ff8a00']])}</defs><path d="M15 1 L3 18 h8 l-3 13 L21 12 h-8 l3-11z" fill="url(#gb)" ${OUT}/></svg>`,
  trophy: `<svg viewBox="0 0 32 32"><defs>${grad('gt', [[0, '#fff17a'], [1, '#f0a400']])}</defs><path d="M9 4h14v6a7 7 0 0 1-14 0z M9 6H4a5 5 0 0 0 6 7 M23 6h5a5 5 0 0 1-6 7" fill="url(#gt)" ${OUT}/><path d="M14 17h4v5h-4z M10 22h12v5H10z" fill="url(#gt)" ${OUT}/></svg>`,
  candy: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="#f5f1ff" ${OUT}/><path d="M16 16 m0-8 a8 8 0 0 1 8 8 a6 6 0 0 1-6 6 a4 4 0 0 1-4-4 a2.5 2.5 0 0 1 2.5-2.5" fill="none" stroke="#ff4fa0" stroke-width="3" stroke-linecap="round"/><path d="M16 16 m0 8 a8 8 0 0 1-8-8 a6 6 0 0 1 6-6" fill="none" stroke="#7a5cff" stroke-width="3" stroke-linecap="round"/></svg>`,
  ball: `<svg viewBox="0 0 32 32"><path d="M5 16a11 11 0 0 1 22 0z" fill="#ef3340"/><path d="M5 16a11 11 0 0 0 22 0z" fill="#fff"/><circle cx="16" cy="16" r="11" fill="none" ${OUT}/><path d="M5 16h22" ${OUT}/><circle cx="16" cy="16" r="3.6" fill="#fff" ${OUT}/></svg>`,
  shop: `<svg viewBox="0 0 48 48"><defs>${grad('gs', [[0, '#ff6b7a'], [1, '#c8102e']])}</defs><path d="M6 20 L24 8 L42 20 L24 30z" fill="#ff8a96" ${OUT}/><path d="M6 20 V34 L24 44 V30z" fill="url(#gs)" ${OUT}/><path d="M42 20 V34 L24 44 V30z" fill="#a10c22" ${OUT}/><path d="M17 14 l7 6 l7-6" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/></svg>`,
  rebirth: `<svg viewBox="0 0 48 48"><path d="M8 24a16 16 0 0 1 32 0z" fill="#ef3340"/><path d="M8 24a16 16 0 0 0 32 0z" fill="#3fa9ff"/><circle cx="24" cy="24" r="16" fill="none" ${OUT}/><path d="M8 24h32" ${OUT}/><circle cx="24" cy="24" r="5" fill="#fff" ${OUT}/><path d="M12 14a14 14 0 0 1 8-4" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/></svg>`,
  pets: `<svg viewBox="0 0 48 48"><path d="M8 12 q-4 14 6 18 M40 12 q4 14-6 18" fill="#7a4a24" ${OUT}/><ellipse cx="24" cy="26" rx="14" ry="13" fill="#c88a4c" ${OUT}/><ellipse cx="24" cy="32" rx="8" ry="6" fill="#f5e2c8" ${OUT}/><circle cx="18" cy="23" r="2.4" fill="#1b1424"/><circle cx="30" cy="23" r="2.4" fill="#1b1424"/><ellipse cx="24" cy="29" rx="3" ry="2" fill="#1b1424"/><path d="M24 31v3" stroke="#1b1424" stroke-width="2"/></svg>`,
  trails: `<svg viewBox="0 0 48 48"><defs>${grad('gtr', [[0, '#d48bff'], [1, '#6a1fd8']])}</defs><path d="M6 40 Q20 30 22 18 L30 26 L32 8 L42 30 L34 24 L30 40 L24 30 Q18 38 6 40z" fill="url(#gtr)" ${OUT}/></svg>`,
  inventory: `<svg viewBox="0 0 48 48"><defs>${grad('gi', [[0, '#ffbf3a'], [1, '#f07a10']])}</defs><path d="M18 10a6 6 0 0 1 12 0" fill="none" ${OUT}/><rect x="9" y="10" width="30" height="32" rx="9" fill="url(#gi)" ${OUT}/><rect x="15" y="26" width="18" height="12" rx="4" fill="#ffd36a" ${OUT}/></svg>`,
  gift: `<svg viewBox="0 0 48 48"><defs>${grad('gg', [[0, '#7fd0ff'], [1, '#2a7fe0']])}</defs><rect x="8" y="20" width="32" height="22" rx="3" fill="url(#gg)" ${OUT}/><rect x="6" y="14" width="36" height="8" rx="3" fill="#5ab6ff" ${OUT}/><rect x="21" y="14" width="6" height="28" fill="#ff4fa0" ${OUT}/><path d="M24 14 q-10-10-12-2 q0 4 12 2 q10-10 12-2 q0 4-12 2" fill="#ff4fa0" ${OUT}/></svg>`,
  scroll: `<svg viewBox="0 0 32 32"><rect x="8" y="5" width="17" height="22" rx="2" fill="#f4dca0" ${OUT}/><path d="M12 11h9M12 15h9M12 19h6" stroke="#8a5a2e" stroke-width="2"/><rect x="6" y="3" width="21" height="5" rx="2.5" fill="#d9a85a" ${OUT}/><rect x="6" y="24" width="21" height="5" rx="2.5" fill="#d9a85a" ${OUT}/></svg>`,
  hex: `<svg viewBox="0 0 24 24"><path d="M12 2 L21 7 V17 L12 22 L3 17 V7z" fill="#ff5fb4" stroke="#fff" stroke-width="2"/><path d="M12 7 L16 9.5 V14.5 L12 17 L8 14.5 V9.5z" fill="#fff"/></svg>`,
  starter: `<svg viewBox="0 0 120 120"><defs>${grad('gm', [[0, '#ff5f6d'], [0.3, '#ffc93a'], [0.6, '#5cff8a'], [1, '#5c9dff']])}</defs>
    <g transform="translate(6 2)"><path d="M44 8 l5 11 l12 1 l-9 8 l3 12 l-11-6 l-11 6 l3-12 l-9-8 l12-1z" fill="#ffd23a" ${OUT}/></g>
    <path d="M70 4 L56 30 h10 l-4 18 L82 20 h-10 l6-16z" fill="#ff9a1a" ${OUT}/>
    <g transform="translate(78 14)"><path d="M2 14a14 14 0 0 1 28 0z" fill="#ef3340"/><path d="M2 14a14 14 0 0 0 28 0z" fill="#fff"/><circle cx="16" cy="14" r="14" fill="none" ${OUT}/><path d="M2 14h28" ${OUT}/><circle cx="16" cy="14" r="4" fill="#fff" ${OUT}/></g>
    <path d="M24 54 q-10 10-6 28 q8-6 14-4" fill="url(#gm)" ${OUT}/>
    <rect x="28" y="46" width="62" height="60" rx="18" fill="#ffffff" ${OUT}/>
    <path d="M34 50 l4-14 l10 12z M84 50 l-4-14 l-10 12z" fill="#ffffff" ${OUT}/>
    <path d="M30 60 q-4-18 18-20 q-10 8-6 16z" fill="url(#gm)" ${OUT}/>
    <ellipse cx="48" cy="78" rx="6" ry="7.5" fill="#1b1424"/><ellipse cx="72" cy="78" rx="6" ry="7.5" fill="#1b1424"/>
    <circle cx="50" cy="75" r="2.2" fill="#fff"/><circle cx="74" cy="75" r="2.2" fill="#fff"/>
    <ellipse cx="40" cy="90" rx="5" ry="3" fill="#ffb3cf"/><ellipse cx="80" cy="90" rx="5" ry="3" fill="#ffb3cf"/>
    <path d="M56 89 q4 4 8 0" fill="none" stroke="#1b1424" stroke-width="2.4" stroke-linecap="round"/></svg>`,
}

function el(tag, cls, html = '') {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  e.innerHTML = html
  return e
}

export const fmt = (n) => {
  n = Math.floor(n)
  if (n < 1000) return `${n}`
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi']
  let u = -1
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000
    u++
  }
  return `${n >= 100 ? Math.floor(n) : +n.toFixed(n >= 10 ? 1 : 2)}${units[u]}`
}

export function createHud() {
  const root = el('div', 'hud')
  const handlers = new Map()
  const fire = (name) => handlers.get(name)?.()
  const press = (node, name) => {
    node.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      e.preventDefault()
      node.classList.add('pressed')
      fire(name)
    })
    const up = () => node.classList.remove('pressed')
    node.addEventListener('pointerup', up)
    node.addEventListener('pointerleave', up)
    return node
  }

  // --- Top centre: AUTO CLAP ---
  const auto = press(el('button', 'hud-auto', `<span class="stroke big">AUTO CLAP</span><span class="price stroke">ONLY ${ICONS.hex}15</span><span class="auto-trophy">${ICONS.trophy}</span><span class="auto-state stroke">OFF</span>`), 'autoClap')
  root.append(auto)

  // --- Top right ---
  const now = new Date()
  const month = now.toLocaleString('en', { month: 'short' }).toUpperCase()
  const tr = el('div', 'hud-topright')
  tr.append(
    press(el('button', 'hud-round', ICONS.scroll), 'quests'),
    press(el('button', 'hud-round cal', `<span class="cal-m">${month}</span><span class="cal-d">${now.getDate()}</span><span class="badge">!</span>`), 'calendar'),
  )
  root.append(tr)

  // --- Left column: starter pack + menu grid ---
  const left = el('div', 'hud-left')
  const starter = press(el('button', 'hud-starter', `${ICONS.starter}<span class="starter-text stroke">STARTER PACK</span>`), 'starter')
  const grid = el('div', 'hud-grid')
  const tile = (name, label, icon, extra = '') => press(el('button', 'hud-tile', `${icon}<span class="stroke">${label}</span>${extra}`), name)
  const rebirthTile = tile('rebirth', 'Rebirth', ICONS.rebirth, '<span class="tile-pct stroke">0%</span>')
  const giftTile = tile('gifts', 'Gifts', ICONS.gift, '<span class="tile-timer">00:00</span>')
  grid.append(tile('shop', 'Shop', ICONS.shop), rebirthTile, tile('pets', 'Pets', ICONS.pets), tile('trails', 'Trails', ICONS.trails), tile('inventory', 'Inventory', ICONS.inventory), giftTile)
  left.append(starter, grid)
  root.append(left)

  // --- Bottom left: currencies ---
  const cur = el('div', 'hud-currency')
  const row = (icon, extra = '') => {
    const r = el('div', 'cur-row', `<span class="cur-icon">${icon}${extra}</span><span class="cur-val stroke">0</span>`)
    cur.append(r)
    return r.querySelector('.cur-val')
  }
  const candyVal = row(ICONS.candy)
  const ballVal = row(ICONS.ball)
  const winsVal = row(ICONS.trophy, '<span class="cur-plus">+</span>')
  const friend = el('div', 'cur-friend stroke', 'Friend Boost +0% <span class="plus">+</span>')
  press(friend, 'friends')
  cur.append(friend)
  root.append(cur)

  // --- Bottom centre: skill, level bar, skill packs ---
  const bottom = el('div', 'hud-bottom')
  const head = el('div', 'hud-head', `<span class="skill stroke">${ICONS.bolt}<b>0</b> SKILL</span><span class="mult stroke">x1 Multiplier</span>`)
  const bar = el('div', 'hud-bar', `<div class="bar-fill"></div><span class="bar-level stroke">Level 1</span><span class="bar-pumpkins"></span><span class="bar-count stroke">0/1</span>`)
  const packs = el('div', 'hud-packs')
  for (const [name, text, cls] of [['pack1', '+270', 'yellow'], ['pack2', '+1.08K', 'red'], ['pack3', '+2.7K', 'rainbow']]) packs.append(press(el('button', `hud-pack ${cls}`, `${ICONS.bolt}<span class="stroke">${text}</span>`), name))
  bottom.append(head, bar, packs)
  root.append(bottom)

  // --- Right: boosts ---
  const right = el('div', 'hud-right')
  right.append(
    press(el('button', 'hud-boost green', `<span class="boost-icon">${ICONS.bolt}</span><span class="stroke big">5X SKILL</span><span class="price stroke">ONLY ${ICONS.hex}5</span>`), 'skill5x'),
    press(el('button', 'hud-boost gold', `<span class="boost-icon">${ICONS.trophy}</span><span class="stroke big">2x WINS</span><span class="price stroke">ONLY ${ICONS.hex}35</span>`), 'wins2x'),
  )
  root.append(right)

  // --- Proximity prompt: key badge + object name + action, under the object ---
  const prompt = press(el('button', 'hud-prompt hidden', `<span class="pk">E</span><span class="pt"><small></small><b></b></span>`), 'prompt')
  root.append(prompt)

  // --- Toasts + the rebirth window ---
  const toasts = el('div', 'hud-toasts')
  root.append(toasts)
  const modal = el(
    'div',
    'hud-modal hidden',
    `<div class="modal-card"><div class="modal-title stroke">REBIRTH</div>
     <div class="modal-body"><div class="modal-line stroke">Reset your SKILL for a permanent <b class="m-next">x2</b> multiplier.</div>
     <div class="modal-bar"><div class="modal-fill"></div><span class="modal-need stroke">0 / 500</span></div></div>
     <div class="modal-actions"><button class="modal-btn go stroke">REBIRTH</button><button class="modal-btn close stroke">CLOSE</button></div></div>`,
  )
  press(modal.querySelector('.go'), 'doRebirth')
  press(modal.querySelector('.close'), 'closeModal')
  modal.addEventListener('pointerdown', (e) => {
    if (e.target === modal) fire('closeModal')
  })
  root.append(modal)
  document.body.append(root)

  const pumpkinIcons = bar.querySelector('.bar-pumpkins')
  const PUMPKIN = '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="14" rx="10" ry="8" fill="#f07a14" stroke="#5a2a08" stroke-width="1.6"/><path d="M12 6v-3" stroke="#4e7a24" stroke-width="2.4"/><path d="M8 12l2 2 M16 12l-2 2 M8 17q4 2 8 0" stroke="#3a1a04" stroke-width="1.6" fill="none"/></svg>'

  return {
    on(name, fn) {
      handlers.set(name, fn)
    },
    // Keeps the left column under the platform's reserved top-left rectangles.
    setReservedTop(px) {
      root.style.setProperty('--res-top', `${Math.round(px)}px`)
    },
    setSkill(n) {
      head.querySelector('b').textContent = fmt(n)
    },
    setMultiplier(m) {
      head.querySelector('.mult').textContent = `x${fmt(m)} Multiplier`
    },
    setWins(n) {
      winsVal.textContent = fmt(n)
    },
    setCandy(n) {
      candyVal.textContent = fmt(n)
    },
    setRebirths(n) {
      ballVal.textContent = fmt(n)
    },
    setLevel(level, have, need) {
      bar.querySelector('.bar-level').textContent = `Level ${level}`
      bar.querySelector('.bar-count').textContent = `${have}/${need}`
      bar.querySelector('.bar-fill').style.width = `${Math.min(100, (have / need) * 100)}%`
      const icons = Math.min(need, 6)
      if (pumpkinIcons.childElementCount !== icons) pumpkinIcons.innerHTML = PUMPKIN.repeat(icons)
      ;[...pumpkinIcons.children].forEach((c, i) => c.classList.toggle('got', i < have))
    },
    setRebirthProgress(skill, need, nextMult) {
      const pct = Math.min(100, Math.floor((skill / need) * 100))
      rebirthTile.querySelector('.tile-pct').textContent = `${pct}%`
      modal.querySelector('.modal-fill').style.width = `${pct}%`
      modal.querySelector('.modal-need').textContent = `${fmt(skill)} / ${fmt(need)} SKILL`
      modal.querySelector('.m-next').textContent = `x${nextMult}`
      modal.querySelector('.go').classList.toggle('ready', pct >= 100)
    },
    setGift(secondsLeft) {
      const t = giftTile.querySelector('.tile-timer')
      if (secondsLeft <= 0) {
        t.textContent = 'READY'
        t.classList.add('ready')
      } else {
        const s = Math.ceil(secondsLeft)
        t.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
        t.classList.remove('ready')
      }
    },
    // info: { title, action } or null to hide; x, y: screen px of the object.
    setPrompt(info, x = 0, y = 0) {
      prompt.classList.toggle('hidden', !info)
      if (!info) return
      if (prompt.dataset.title !== info.title) {
        prompt.dataset.title = info.title
        prompt.querySelector('small').textContent = info.title
        prompt.querySelector('b').textContent = info.action
      }
      prompt.style.left = `${Math.round(x)}px`
      prompt.style.top = `${Math.round(y)}px`
    },
    setAuto(on) {
      auto.classList.toggle('on', on)
      auto.querySelector('.auto-state').textContent = on ? 'ON' : 'OFF'
    },
    showRebirth(show) {
      modal.classList.toggle('hidden', !show)
    },
    toast(text, kind = '') {
      const t = el('div', `hud-toast stroke ${kind}`, text)
      toasts.append(t)
      while (toasts.childElementCount > 3) toasts.firstChild.remove()
      setTimeout(() => t.classList.add('out'), 1800)
      setTimeout(() => t.remove(), 2300)
    },
    // A quick bounce on a number when it goes up.
    pulse(which) {
      const node = { skill: head.querySelector('.skill'), wins: winsVal, candy: candyVal }[which]
      if (!node) return
      node.classList.remove('pulse')
      void node.offsetWidth
      node.classList.add('pulse')
    },
  }
}
