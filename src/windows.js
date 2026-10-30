import './windows.css'
import { BOOSTS, DAILY, EGGS, PET_KINDS, PETS, PLAYTIME, REBIRTH, TRAILS } from './config.js'
import { fmt } from './hud.js'
import { sfx } from './audio.js'
import { ICON, eggIcon, gauntletIcon, potionIcon, rebirthIcon, trailIcon } from './icons.js'
import { petSvg, RARITY_NAME, RARITY_RANK } from './pets.js'
import { btn, closeTopWindow, createWindow, el, shake } from './ui.js'

// The popup windows, laid out like the reference screenshots:
//  - Rebirth: Before / After, the level bar, Level N | Skip Rebirth | Auto Rebirth
//  - Inventory (Gauntlets, Pets = "My Pets", Eggs, Boosts tabs down the left)
//  - Trails: coloured rows that tint the clap wave and boost Wins
//  - Playtime Rewards: 4 x 3 tiles, Claim or the time left
//  - Daily Rewards: days 1-6 and the tall Limited! day 7, the countdown under it
// The HUD buttons open them (hud.on); game.js owns the state and the rules.

const pad2 = (n) => String(n).padStart(2, '0')
const hms = (s) => `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`
const ms = (s) => `${Math.floor(s / 60)}:${pad2(s % 60)}`
const SORTS = ['Best', 'Rarity', 'Newest']
const TABS = [
  { id: 'gauntlets', label: 'Gauntlets', icon: ICON.glove, title: 'Inventory', winIcon: ICON.backpack },
  { id: 'pets', label: 'Pets', icon: ICON.dog, title: 'My Pets', winIcon: ICON.dog },
  { id: 'eggs', label: 'Eggs', icon: ICON.egg, title: 'Inventory', winIcon: eggIcon(EGGS.mythical) },
  { id: 'boosts', label: 'Boosts', icon: potionIcon(BOOSTS.skill.color), title: 'Inventory', winIcon: potionIcon(BOOSTS.skill.color) },
]

// A reward's caption and icon (Playtime and Daily tiles).
function rewardText(game, r) {
  if (r.kind === 'skill') return `+${fmt(game.rewardAmount(r))} SKILL`
  if (r.kind === 'wins') return `+${fmt(game.rewardAmount(r))} WINS`
  if (r.kind === 'egg') return EGGS[r.egg].name.toUpperCase()
  if (r.kind === 'boost') return `${r.n}X ${BOOSTS[r.boost].label.toUpperCase()} BOOST`
  return r.label ?? ''
}
function rewardIcon(game, r) {
  if (r.kind === 'skill') return ICON.bolt
  if (r.kind === 'wins') return ICON.trophy
  if (r.kind === 'egg') return eggIcon(EGGS[r.egg])
  if (r.kind === 'boost') return potionIcon(BOOSTS[r.boost].color)
  if (r.kind === 'pet') return petSvg(r.pet)
  if (r.kind === 'gauntlet') return gauntletIcon(game.gauntletOf(r.gauntlet)?.style)
  return ''
}

export function createWindows(game, hud) {
  const S = game.state
  const now = new Date()
  const W = {
    rebirth: createWindow({ title: 'Rebirth', icon: rebirthIcon(), className: 'rebirth-win', onOpen: () => render() }),
    inv: createWindow({ title: 'Inventory', icon: ICON.backpack, className: 'inv-win', onOpen: () => render() }),
    trails: createWindow({ title: 'Trails', icon: ICON.trails, className: 'trails-win', onOpen: () => render() }),
    playtime: createWindow({ title: 'Playtime Rewards', icon: ICON.gift, className: 'playtime-win', onOpen: () => render() }),
    daily: createWindow({ title: 'Daily Rewards', icon: ICON.calendar(now.toLocaleString('en', { month: 'short' }).toUpperCase(), now.getDate()), className: 'daily-win', onOpen: () => render() }),
  }
  let tab = 'gauntlets' // Inventory tab
  let petView = 'grid' // 'grid' | 'index'
  let selPet = null // pet id shown in the detail card
  let deleting = false // tap a pet to delete it
  let sortBy = 0 // index in SORTS

  const current = () => Object.values(W).find((w) => w.isOpen())
  // Runs a game action: a message back means "no" (toast + shake).
  const act = (fn, node) => () => {
    const msg = fn()
    if (msg) {
      hud.toast(msg, 'warn')
      sfx.deny()
      if (node) shake(node)
    }
  }

  function open(id, t) {
    if (id === 'inv') {
      tab = t ?? tab
      petView = 'grid'
      deleting = false
    }
    if (W[id].isOpen()) render()
    else W[id].open()
  }

  // --- Redraw the open window. Scroll positions survive; a redraw that lands
  // while a finger / mouse button is down waits for the release so the click
  // still reaches its button.
  let pressing = false
  let pending = false
  document.addEventListener('pointerdown', (e) => (pressing = !!e.target.closest?.('.uiw')), true)
  document.addEventListener(
    'pointerup',
    () => {
      pressing = false
      if (pending) setTimeout(render, 0)
    },
    true,
  )
  function render() {
    const w = current()
    if (!w) return
    if (pressing) {
      pending = true
      return
    }
    pending = false
    const scrolls = [...w.root.querySelectorAll('[data-scroll]')].map((n) => [n.dataset.scroll, n.scrollTop])
    w.body.replaceChildren()
    w.side.replaceChildren()
    w.foot.replaceChildren()
    if (w === W.rebirth) renderRebirth(w)
    else if (w === W.inv) renderInventory(w)
    else if (w === W.trails) renderTrails(w)
    else if (w === W.playtime) renderPlaytime(w)
    else renderDaily(w)
    for (const [key, top] of scrolls) {
      const n = w.root.querySelector(`[data-scroll="${key}"]`)
      if (n) n.scrollTop = top
    }
  }

  // --- Rebirth ------------------------------------------------------------------------
  function renderRebirth(w) {
    const n = S.rebirths
    const t = game.rebirthT()
    const ready = game.canRebirth()
    const level = game.rebirthLevel()
    const card = (head, v) => `<div class="rb-col"><div class="rb-head stroke">${head}</div><div class="rb-card dots"><span class="rb-bolt">${ICON.bolt}</span><span class="rb-val stroke">+${v}x SKILL</span></div></div>`
    w.body.append(
      el('div', 'rb-cols', card('Before', n) + card('After', n + 1)),
      el('div', 'rb-bar', `<div class="rb-fill" style="width:${(t * 100).toFixed(1)}%"></div><span class="rb-label stroke">Level ${level} / Level ${REBIRTH.level}</span><span class="rb-pct stroke">${Math.floor(t * 100)}%</span>`),
      el('div', 'rb-need stroke', ready ? 'Ready to rebirth!' : `Reach Level ${REBIRTH.level} to rebirth`),
    )
    const btns = el('div', 'rb-btns')
    const go = btn(`rb-btn ${ready ? 'green' : 'grey'}`, `<span class="stroke">${ready ? 'Rebirth' : `Level ${REBIRTH.level}`}</span>`, () => act(game.doRebirth, w.body)())
    const skip = btn('rb-btn purple', '<span class="stroke">Skip Rebirth</span>', () => act(game.skipRebirth, w.body)())
    skip.title = `${fmt(game.skipCost())} Wins`
    const auto = btn(`rb-btn blue${S.autoRebirth ? ' on' : ''}`, '<span class="stroke">Auto Rebirth</span>', () => {
      game.toggleAutoRebirth()
      hud.toast(`Auto Rebirth ${S.autoRebirth ? 'ON' : 'OFF'}`, S.autoRebirth ? 'good' : '')
    })
    btns.append(go, skip, auto)
    w.body.append(btns)
  }

  // --- Inventory: Gauntlets, Pets, Eggs, Boosts ---------------------------------------
  function renderInventory(w) {
    const info = TABS.find((x) => x.id === tab)
    w.setTitle(info.title)
    w.setIcon(info.winIcon)
    for (const x of TABS) {
      w.side.append(btn(`uiw-tab${x.id === tab ? ' active' : ''}`, `<span class="icon">${x.icon}</span><span class="label stroke">${x.label}</span>`, () => {
        tab = x.id
        petView = 'grid'
        deleting = false
        render()
      }))
    }
    w.body.className = `uiw-body tab-${tab}`
    ;({ gauntlets: renderGauntlets, pets: renderPets, eggs: renderEggs, boosts: renderBoosts })[tab](w)
  }

  function renderGauntlets(w) {
    const all = game.allGauntlets
    const owned = all.filter((g) => S.owned.has(g.id))
    w.body.append(el('div', 'inv-head stroke', `${owned.length} / ${all.length} Gauntlets`))
    const well = el('div', 'inv-well item-grid')
    well.dataset.scroll = 'gauntlets'
    for (const g of [...owned].sort((a, b) => b.skill - a.skill)) {
      const on = S.equipped === g.id
      const card = btn(`item-card glove${on ? ' sel' : ''}`, `<span class="item-img">${gauntletIcon(g.style)}</span><span class="item-mult stroke">${ICON.bolt}+${fmt(g.skill)}</span>${on ? `<span class="item-check">${ICON.check}</span>` : ''}`, () => {
        if (!on) act(() => game.equipGauntlet(g.id))()
      })
      card.title = g.name
      well.append(card)
    }
    w.body.append(well)
  }

  function petOrder() {
    const by = SORTS[sortBy]
    return [...S.pets].sort((a, b) => {
      const ka = PET_KINDS[a.kind]
      const kb = PET_KINDS[b.kind]
      if (by === 'Newest') return b.id - a.id
      if (by === 'Rarity') return RARITY_RANK[kb.rarity] - RARITY_RANK[ka.rarity] || kb.mult - ka.mult
      return b.equipped - a.equipped || kb.mult - ka.mult
    })
  }

  function renderPets(w) {
    const index = petView === 'index'
    const kinds = Object.keys(PET_KINDS)
    const head = el('div', 'pets-head')
    if (index) head.append(el('span', 'stroke', `${ICON.glove}${S.petsSeen.length} / ${kinds.length} Discovered`))
    else {
      head.append(el('span', 'stroke', `${ICON.glove}${S.pets.length} / ${PETS.storage}`), el('span', 'eq stroke', `Equipped: ${game.equippedPets().length} / ${S.petSlots}`))
      const plus = btn('pets-plus', ICON.plus, () => {
        const msg = game.buyPetSlot()
        if (msg) {
          hud.toast(msg, 'warn')
          sfx.deny()
        } else hud.toast(`Pet slot ${S.petSlots} unlocked!`, 'good')
      })
      const cost = game.petSlotCost()
      plus.title = cost === undefined ? 'All slots unlocked' : `+1 slot: ${fmt(cost)} Wins`
      head.append(plus)
    }
    w.body.append(head)

    const split = el('div', 'pets-split')
    const detail = el('div', 'pet-detail')
    const grid = el('div', `inv-well pets-grid${deleting ? ' deleting' : ''}`)
    grid.dataset.scroll = index ? 'index' : 'pets'
    const order = petOrder()
    const sel = order.find((p) => p.id === selPet) ?? order[0]
    const petCard = (kind, badge = '') => `<span class="item-img">${petSvg(kind)}</span><span class="item-mult stroke">${ICON.bolt}x${PET_KINDS[kind].mult}</span>${badge}`
    if (index) {
      for (const kind of kinds) grid.append(el('div', `item-card r-${PET_KINDS[kind].rarity}${S.petsSeen.includes(kind) ? '' : ' unseen'}`, petCard(kind)))
    } else if (!order.length) {
      grid.classList.add('empty')
      grid.append(el('div', 'inv-empty stroke', 'Walk up to an egg in the plaza to hatch pets!'))
    } else {
      for (const p of order) {
        const badge = deleting ? (p.locked ? `<span class="item-lock">${ICON.lock}</span>` : '<span class="item-del stroke">✕</span>') : p.equipped ? `<span class="item-check">${ICON.check}</span>` : ''
        grid.append(btn(`item-card${p.id === sel?.id ? ' sel' : ''}`, petCard(p.kind, badge), () => {
          if (deleting) {
            if (p.locked) return hud.toast('Unlock this pet to delete it', 'warn')
            game.deletePet(p.id)
            return
          }
          selPet = p.id
          render()
        }))
      }
    }
    if (sel && !index) {
      const k = PET_KINDS[sel.kind]
      detail.innerHTML = `<span class="pd-name stroke">${k.name}</span><span class="pd-img"><span class="pd-rays"></span>${petSvg(sel.kind)}</span><span class="pd-rarity stroke r-${k.rarity}">${RARITY_NAME[k.rarity]}</span><span class="pd-mult stroke">${ICON.bolt}x${k.mult}</span>`
      const lock = btn(`pd-lock${sel.locked ? ' on' : ''}`, ICON.lock, () => {
        game.togglePetLock(sel.id)
        hud.toast(sel.locked ? 'Pet locked' : 'Pet unlocked')
      })
      lock.title = sel.locked ? 'Locked: can\'t be deleted' : 'Lock this pet'
      detail.querySelector('.pd-img').append(lock)
      detail.append(btn(`pd-btn ${sel.equipped ? 'red' : 'green'}`, `<span class="stroke">${sel.equipped ? 'UNEQUIP' : 'EQUIP'}</span>`, act(() => game.togglePet(sel.id), detail)))
    } else {
      detail.classList.add('empty')
      detail.append(el('span', 'stroke', index ? 'Hatch eggs to discover every pet!' : 'No pets yet! Hatch eggs in the plaza'))
    }
    split.append(detail, grid)
    w.body.append(split)

    const bar = el('div', 'pets-actions')
    bar.append(
      btn('pa blue index', `<span class="stroke">${index ? 'BACK' : 'INDEX'}</span>`, () => {
        petView = index ? 'grid' : 'index'
        deleting = false
        render()
      }),
      btn(`pa red auto${S.autoDelete ? ' on' : ''}`, '<span class="stroke">Auto Delete</span>', () => {
        game.toggleAutoDelete()
        hud.toast(S.autoDelete ? 'Auto Delete ON: duplicate commons are deleted' : 'Auto Delete OFF')
      }),
      btn(`pa red trash${deleting ? ' on' : ''}`, ICON.trash, () => {
        deleting = !deleting
        petView = 'grid'
        if (deleting) hud.toast('Tap a pet to delete it')
        render()
      }),
      btn('pa green best', '<span class="stroke">Equip Best</span>', () => {
        game.equipBestPets()
        hud.toast('Best pets equipped!', 'good')
      }),
      btn('pa gold sort', ICON.sort, () => {
        sortBy = (sortBy + 1) % SORTS.length
        hud.toast(`Sorted by ${SORTS[sortBy]}`)
        render()
      }),
    )
    w.body.append(bar)
  }

  function renderEggs(w) {
    const mine = Object.entries(S.eggs).filter(([, n]) => n > 0)
    const total = mine.reduce((s, [, n]) => s + n, 0)
    w.body.append(el('div', 'inv-head stroke', `${total} Eggs`))
    const well = el('div', `inv-well${mine.length ? ' item-grid eggs' : ''}`)
    well.dataset.scroll = 'eggs'
    if (!mine.length) well.append(el('div', 'inv-note top stroke', 'Eggs from the Shop and Playtime Rewards wait here.'))
    for (const [key, n] of mine) {
      const e = EGGS[key]
      const card = el('div', 'egg-card', `<span class="egg-count stroke">x${n}</span><span class="egg-img">${eggIcon(e)}</span><span class="egg-name stroke">${e.name}</span>`)
      card.append(btn('egg-open', '<span class="stroke">Open</span>', () => {
        const msg = game.hatchEgg(key, true)
        if (msg) {
          hud.toast(msg, 'warn')
          sfx.deny()
          shake(card)
        } else W.inv.close()
      }))
      well.append(card)
    }
    w.body.append(well)
  }

  function renderBoosts(w) {
    const types = Object.keys(BOOSTS)
    const total = types.reduce((s, t) => s + S.boosts[t], 0)
    w.body.append(el('div', 'inv-head stroke', `${total} Boosts`))
    const well = el('div', 'inv-well boosts')
    const grid = el('div', 'item-grid')
    for (const type of types) {
      const b = BOOSTS[type]
      const left = game.boostLeft(type)
      const card = btn(`boost-card${left ? ' on' : ''}`, `<span class="item-img">${potionIcon(b.color)}</span><span class="boost-n stroke">x${S.boosts[type]}</span>${left ? `<span class="boost-time stroke">${ms(left)}</span>` : ''}`, () => {
        const msg = game.useBoost(type)
        if (msg) {
          hud.toast(msg, 'warn')
          sfx.deny()
          shake(card)
        } else hud.toast(`${b.mult}x ${b.label} for ${b.minutes} min!`, 'good')
      })
      card.style.setProperty('--card', b.card)
      card.title = `${b.mult}x ${b.label} for ${b.minutes} min`
      grid.append(card)
    }
    well.append(grid, el('div', 'inv-note bottom stroke', 'Click a boost to use it'))
    w.body.append(well)
  }

  // --- Trails -------------------------------------------------------------------------
  function renderTrails(w) {
    const list = el('div', 'trails-list')
    list.dataset.scroll = 'trails'
    for (const t of TRAILS) {
      const owned = S.trails.includes(t.id)
      const on = S.trail === t.id
      const row = el('div', `trail-row dots${t.row === 'rainbow' ? ' rainbow' : ''}${on ? ' on' : ''}`, `<span class="trail-icon">${trailIcon(t.colors)}</span><span class="trail-name stroke">${t.name}</span><span class="trail-boost stroke">${ICON.trophy}x${t.boost} Wins Boost</span><span class="trail-note stroke">${ICON.sparkle}Colours your clap wave</span>`)
      if (t.row !== 'rainbow') row.style.setProperty('--row', t.row)
      const label = on ? 'Equipped' : owned ? 'Equip' : `${fmt(t.cost)} Wins`
      const look = on ? 'blue' : owned || S.wins >= t.cost ? 'green' : 'dark'
      row.append(btn(`trail-btn ${look}`, `<span class="stroke">${label}</span>`, () => {
        if (on) return
        const msg = game.chooseTrail(t.id)
        if (msg) {
          hud.toast(msg, 'warn')
          sfx.deny()
          shake(row)
        } else hud.toast(`${t.name} trail equipped!`, 'good')
      }))
      list.append(row)
    }
    w.body.append(list)
  }

  // --- Playtime Rewards ----------------------------------------------------------------
  function renderPlaytime(w) {
    const grid = el('div', 'play-grid')
    PLAYTIME.forEach((r, i) => {
      const left = game.playtimeLeft(i)
      const look = i === PLAYTIME.length - 1 ? 'rainbow' : ['blue', 'purple', 'gold'][Math.floor(i / 4)]
      const tile = el('div', `play-tile dots ${look}${left < 0 ? ' claimed' : ''}`, `<span class="play-lbl stroke">${rewardText(game, r)}</span><span class="play-icon">${rewardIcon(game, r)}</span>`)
      tile.append(left === 0
        ? btn('play-btn claim', '<span class="stroke">Claim</span>', () => {
          const msg = game.claimPlaytime(i)
          if (msg) hud.toast(msg, 'warn')
          else hud.toast(`${rewardText(game, r)}!`, 'good')
        })
        : el('span', `play-btn ${left < 0 ? 'done' : 'wait'}`, `<span class="stroke">${left < 0 ? 'Claimed' : hms(left)}</span>`))
      grid.append(tile)
    })
    w.body.append(grid)
  }

  // --- Daily Rewards -------------------------------------------------------------------
  function renderDaily(w) {
    const days = DAILY.days
    const at = game.dailyIndex() // the next day to claim
    const left = game.dailyLeft() // 0 = a day is ready now
    const grid = el('div', 'daily-grid')
    days.forEach((r, i) => {
      const last = i === days.length - 1
      const claimed = game.dailyClaimed(i)
      const ready = game.dailyReady() && i === at
      const html = last
        ? `<span class="day-tab special stroke">DAY ${i + 1}</span><span class="day-limited">Limited!</span><span class="day-icon">${rewardIcon(game, r)}</span><span class="day-lbl stroke">${r.label.replace(' ', '<br>')}</span>`
        : `<span class="day-tab stroke">DAY ${i + 1}</span><span class="day-lbl stroke">${r.label.replace(/ (?=\S+$)/, '<br>')}</span><span class="day-icon">${rewardIcon(game, r)}</span>`
      const cls = `day-card${last ? ' special' : ' dots'}${claimed ? ' claimed' : ''}${ready ? ' ready' : ''}`
      const card = ready
        ? btn(cls, html, () => {
          const msg = game.claimDaily(i) // the reward (and its toast) comes once the server says ok
          if (msg) hud.toast(msg, 'warn')
        })
        : el('div', cls, html)
      if (claimed) card.append(el('span', 'day-tick', ICON.check))
      if (ready) card.append(el('span', 'day-claim stroke', 'CLAIM!'))
      grid.append(card)
    })
    w.body.append(grid)
    w.foot.append(el('div', 'daily-next stroke', game.dailyReady() ? `Claim Day ${at + 1} now!` : left ? `Next reward in: ${hms(left)}` : 'Connecting...'))
  }

  // --- Wiring ---------------------------------------------------------------------------
  hud.on('rebirth', () => open('rebirth'))
  hud.on('inventory', () => open('inv', 'gauntlets'))
  hud.on('pets', () => open('inv', 'pets'))
  hud.on('trails', () => open('trails'))
  hud.on('gifts', () => open('playtime'))
  hud.on('calendar', () => open('daily'))
  game.onChange(() => current() && render())
  // Timers (Playtime, Daily, boosts, the rebirth bar as SKILL climbs) tick once a second.
  setInterval(() => {
    const w = current()
    if (w && w !== W.trails && !(w === W.inv && tab !== 'boosts')) render()
  }, 1000)

  return { open, closeTop: closeTopWindow }
}
