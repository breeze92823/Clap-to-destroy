// Colyseus link to Clap-to-distroy-backend (room "world"): relays this player's pose, loadout,
// Bloxity look and clap effects, exposes the roster of the other players (remotePlayers.js draws
// them), and is the ONLY place progress is kept: the server's Mongo doc is the player's save, the
// browser stores nothing. A guest's (or an offline) progress lasts the page. Never throws and never
// blocks play: with no server (or an unreachable one) the game simply runs offline.
import { Callbacks, Client } from '@colyseus/sdk'
import { NET, SERVER_URL } from './config.js'
import { authState, canResolveServer, displayName, getEquippedAvatar, getPfp, getProportions, getSkinTextureUrl, launchRoomId, locateRoom, reportPlayer, resolveServerEndpoint, subscribeAuth, updateRoom } from './bloxity.js'
import { player } from './player.js'

const AVATAR_MAX = 3000 // backend AVATAR_MAX_LEN

export const net = {
  room: null,
  connected: false,
  loaded: false, // the save question is settled (answered, or there is no server): safe to start
  canSave: false, // the server answered for this identity, so saves may be sent
  get sessionId() {
    return this.room?.sessionId ?? null
  },
  get players() {
    return this.room?.state?.players ?? null
  },
}

// Server -> client messages: fn(msg) per type ('fx', 'progress', 'noProgress', 'serverError',
// 'daily', 'dailyResult', 'leaderboard'). Survives reconnects.
const handlers = new Map()
export function onServer(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set())
  handlers.get(type).add(fn)
  return () => handlers.get(type).delete(fn)
}
const emit = (type, msg) => {
  for (const fn of handlers.get(type) ?? []) {
    try {
      fn(msg)
    } catch (err) {
      console.warn('[net] handler failed', type, err)
    }
  }
}
// fn({ id, kind: 'clap' | 'wave' | 'train', x, y, z, yaw, range }) for each effect another player
// started.
export const onFx = (fn) => onServer('fx', fn)

// --- Identity ----------------------------------------------------------------
// Signed-in players use their Bloxity id; everyone else a per-page guest id (never saved).
// A guest id lasts the page (nothing is stored in the browser); the server never saves guests.
const GUEST = `guest-${Math.random().toString(36).slice(2, 10)}`

function identity() {
  const u = authState.user
  const id = u && (u._id || u.id || u.userId || u.uid)
  return { userId: id ? String(id) : GUEST, username: displayName(), pfp: getPfp() }
}

// Bloxity look as the server relays it: JSON { equipped, proportions, skin }, length-capped (the
// skin URL is the first thing dropped when it does not fit). "" = the default character.
function avatarJson() {
  if (!authState.user) return ''
  const equipped = getEquippedAvatar()
  if (!equipped) return ''
  for (const skin of [getSkinTextureUrl(), null]) {
    try {
      const json = JSON.stringify({ equipped, proportions: getProportions(), skin })
      if (json.length <= AVATAR_MAX) return json
    } catch {
      return ''
    }
  }
  return ''
}

// --- Messages out ------------------------------------------------------------
function send(type, payload) {
  try {
    net.room?.send(type, payload)
  } catch (err) {
    console.warn('[net] send failed', type, err)
  }
}

const r2 = (n) => Math.round(n * 100) / 100
let lastPose = ''
let lastPoseAt = 0
// Throttled to NET.poseHz; skips repeats while standing still.
export function sendPose(speed) {
  if (!net.connected) return
  const now = performance.now()
  if (now - lastPoseAt < 1000 / NET.poseHz) return
  lastPoseAt = now
  const p = player.position
  const msg = { x: r2(p.x), y: r2(p.y), z: r2(p.z), yaw: r2(player.facing), speed: r2(speed), grounded: player.grounded }
  const key = JSON.stringify(msg)
  if (key === lastPose) return
  lastPose = key
  send('pose', msg)
}

// A clap / shockwave / training clap started here (game.js onFx): the others play it at this spot.
// `extra` overrides the position / adds the wave's range.
export function sendFx(kind, extra) {
  if (!net.connected) return
  const p = player.position
  send('fx', { kind, x: r2(p.x), y: r2(p.y), z: r2(p.z), yaw: r2(player.facing), ...extra })
}

// --- Saving ------------------------------------------------------------------
let lastSaved = ''
let snapshotNow = null // () => the game's whole saved state (game.js snapshot)

// The game's state, when it changed. game.js calls this on its own debounce, on tab hide and unload.
export function saveProgress(snap = snapshotNow?.()) {
  if (!net.connected || !net.canSave || !snap || isGuest()) return
  const json = JSON.stringify(snap)
  if (json === lastSaved) return
  lastSaved = json
  send('saveProgress', snap)
}
const isGuest = () => sentId.startsWith('guest-')
export const bindSnapshot = (fn) => (snapshotNow = fn)
export const claimDaily = (day) => send('claimDaily', { day })
export const refreshDaily = () => send('dailyRefresh', {})

let sentLoadout = ''
// Equipped gauntlet / trail / pets, when they changed. Cheap to call often.
export function syncLoadout(loadout) {
  if (!net.connected || !loadout) return
  const key = JSON.stringify(loadout)
  if (key === sentLoadout) return
  sentLoadout = key
  send('loadout', loadout)
}

let sentAvatar = null
let avatarTimer = 0
// Sends the current Bloxity look (debounced: the SDK fires several change events per edit).
export function syncAvatar() {
  clearTimeout(avatarTimer)
  avatarTimer = setTimeout(() => {
    if (!net.connected) return
    const avatar = avatarJson()
    if (avatar === sentAvatar) return
    sentAvatar = avatar
    send('setAvatar', { avatar })
  }, 300)
}

// --- Connection --------------------------------------------------------------
// Tells the Bloxity menu who else is in this room: the roster present at the first state sync is
// "already there" (playerInRoom), later arrivals "joined" (playerJoined).
function reportRoster(room) {
  try {
    let synced = false
    room.onStateChange.once(() => (synced = true))
    Callbacks.get(room).onAdd('players', (player, sessionId) => {
      if (sessionId !== room.sessionId) reportPlayer(player.username, !synced)
    })
  } catch (err) {
    console.warn('[net] could not watch the roster', err)
  }
}

function attach(room) {
  net.room = room
  net.connected = true
  for (const type of ['fx', 'daily', 'dailyResult', 'leaderboard']) room.onMessage(type, (msg) => emit(type, msg))
  // The save answer. `progress` (a saved doc): the first one for an identity fills the game from it;
  // after a reconnect the game already holds newer progress, which is kept and pushed instead.
  // `noProgress` (new account, guest, no database): the game keeps its state and it is saved as is.
  // `serverError` (the doc could not be read): saving stays off, so it is never overwritten.
  const answered = (type) => (msg) => {
    const first = loadedFor !== sentId
    net.loaded = true
    net.canSave = type !== 'serverError'
    lastSaved = ''
    if (type === 'progress' && first) emit('progress', msg)
    else if (type === 'serverError') console.warn('[net] the server could not read the saved progress; saving is off for this session')
    else saveProgress()
    if (type !== 'serverError') loadedFor = sentId
  }
  for (const type of ['progress', 'noProgress', 'serverError']) room.onMessage(type, answered(type))
  reportRoster(room)
  room.onLeave(() => {
    if (net.room !== room) return
    net.room = null
    net.connected = false
    net.canSave = false
    updateRoom('')
    setTimeout(connect, NET.reconnect[0]) // keep trying; local play is unaffected meanwhile
  })
  sentAvatar = sentLoadout = null
  lastPose = ''
  // Friend invites carry "<relayRoomId>~<colyseusRoomId>" so the joiner reaches this pod.
  updateRoom(relayRoomId ? `${relayRoomId}~${room.roomId}` : room.roomId)
}

// Bloxity hosting has no fixed socket URL: the SDK resolves the endpoint of this game's server (a
// dev-channel page reaches the dev backend, prod the prod one) on every connect, and each resolve
// needs its own Client. A configured SERVER_URL (VITE_SERVER_URL) wins.
async function serverUrl(userId) {
  if (SERVER_URL) return { endpoint: SERVER_URL, relayRoomId: '' }
  return resolveServerEndpoint(userId)
}

// The ?roomId= the page was opened with (Open Rooms Join / friend invite) is tried once, on the
// first connect; if that room is gone or full we fall back to the matchmaker's pick.
let pendingLaunchRoom = launchRoomId()
let relayRoomId = ''

let connecting = false
let sentId = '' // identity the server currently attributes this connection to
let loadedFor = '' // identity whose saved doc the game was last filled from
async function connect() {
  if (!(SERVER_URL || canResolveServer()) || connecting || net.connected) return
  connecting = true
  try {
    const id = identity()
    sentId = id.userId
    const p = player.position
    const options = { ...id, avatar: avatarJson(), pose: { x: p.x, y: p.y, z: p.z, yaw: player.facing } }
    let room = null
    const launch = pendingLaunchRoom
    pendingLaunchRoom = ''
    if (launch && !SERVER_URL) {
      try {
        const target = await locateRoom(launch)
        if (target) {
          relayRoomId = target.relayRoomId || ''
          room = await new Client(target.endpoint).joinById(target.roomId, options)
        }
      } catch (err) {
        console.warn('[net] could not join the launch room; using the matchmaker', err?.message ?? err)
      }
    }
    if (!room) {
      const resolved = await serverUrl(id.userId)
      relayRoomId = resolved.relayRoomId || ''
      room = await new Client(resolved.endpoint).joinOrCreate('world', options)
    }
    attach(room)
    syncAvatar()
  } catch (err) {
    console.warn('[net] could not reach the server; playing offline', err?.message ?? err)
    net.loaded = true // no save to wait for: start on a fresh state, saves resume if it connects later
    setTimeout(connect, NET.reconnect[1])
  } finally {
    connecting = false
  }
}

export function initNet() {
  if (!SERVER_URL && !canResolveServer()) {
    net.loaded = true
    return console.info('[net] no server configured; playing offline (progress is not kept)')
  }
  // The first ready call connects; later ones are sign-in / sign-out.
  subscribeAuth((s) => {
    if (!s.ready) return
    if (!net.connected) return void connect()
    const id = identity()
    if (id.userId === sentId) return send('identify', { username: id.username, pfp: id.pfp })
    saveProgress() // under the old identity, before switching
    net.canSave = false
    sentId = id.userId
    send('identify', id)
    syncAvatar()
  })
  window.addEventListener('beforeunload', () => {
    saveProgress()
    net.room?.leave?.(true)
  })
}
