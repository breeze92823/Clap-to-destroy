// Every tunable constant lives here; the rest of src/ holds no theme values.

// --- Identity -------------------------------------------------------------
export const GAME_SLUG = 'bowling-roll' // slug registered on bloxity.io
export const GAME_TITLE = 'Clap to Destroy'

// Forces the Bloxity SDK and avatar CDN to be treated as unavailable (see .env.example).
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// --- World (metres: +X east, +Z south, +Y up; north = -Z) ---------------------
export const GROUND_Y = 0
// The lobby (lobby/): a lego-studded hub at y = 0 with the Clap Zone band on its
// north edge, then the beach corridor running north between two water channels
// and orange checkered cliffs. Everything outside is raised terrain.
export const LOBBY = {
  stud: 0.5, // m between studs on every plate
  hub: { minX: -50, maxX: 50, minZ: -6, maxZ: 36 }, // the ground-level plate inside the walls
  path: { halfWidth: 4.5 },
  // Hub plates as [minX, maxX, minZ, maxZ] (no overlaps): white = walkway, gauntlet
  // showroom (west) and the plaza in front of the leaderboards (south); the rest grass.
  whiteFloors: [[-4.5, 4.5, 0, 16], [-50, -4.5, 0, 26], [-4.5, 15, 16, 36], [-26, -4.5, 26, 36], [-50, -24, -6, 0]],
  grassFloors: [[4.5, 50, 0, 16], [15, 50, 16, 36], [-50, -26, 26, 36], [14, 50, -6, 0]],
  band: { minX: -24, maxX: 14, minZ: -6, maxZ: 0 }, // "CLAP ZONE" strip painted across the hub
  // Gauntlet plinths: two rows running south from the egg, the second on a white
  // terrace (stairs on its north face). GAUNTLETS[i] -> rows[floor(i / 5)], zs[i % 5].
  showroom: {
    rows: [{ x: -12, y: 0 }, { x: -20.5, y: 2.4 }],
    zs: [4, 9, 14, 19, 24],
    // The terrace also carries the Pumpkin Patch and the Candy Shop behind row 2.
    terrace: { minX: -41, maxX: -16, minZ: 1, maxZ: 27, height: 2.4 },
    stairX: [-24, -17], // stairs down the terrace's north face
    title: { x: -20.5, y: 9.6, z: 14 },
  },
  // Hidden collectible pumpkins (the level bar).
  pumpkinSpots: [
    [-7, 33], [14, 26], [47.5, 9], [-34, 20], [-44, 8], [44, 33], [-12, -40], [10, -72], [-6, -118], [12, -170], [-13, -220], [4, -280],
  ],
  beach: { halfWidth: 16, minZ: -300, maxZ: -6 }, // sand corridor (the zone you clap in)
  channel: { inner: 16, outer: 22, depth: 1.4, waterY: -0.45 }, // water both sides of the beach
  cliffLow: { inner: 22, outer: 34, height: 4.5 }, // first terrace beside the channels
  cliffHigh: { height: 9 }, // second terrace out to the horizon
  hubWalls: { side: 26, south: 46, square: 6 }, // tall brown checker walls round the hub (square = m per checker)
  far: 420, // half-size of the raised terrain
  chevrons: [5.2, 11.2, 17.2], // z of the floor arrows on the path
  egg: { x: -6.2, z: 2.6 },
  luckyBlock: { x: 7.6, z: 2.2, size: 3.3 },
  phoenix: { x: -7.4, z: 12 },
  // Pumpkin Patch on the terrace west of gauntlet row 2: fenced dirt beds of
  // plots that grow a pumpkin over PATCH.grow seconds; walk onto a ripe one to harvest.
  patch: { minX: -39.5, maxX: -28.5, minZ: 4.5, maxZ: 20.5, beds: 3, plotsPerBed: 4 },
  candyShop: { x: -31.5, z: 24.4 },
  gift: { x: 11.5, z: -3.8 },
  // South plaza: the egg row, the leaderboards against the wall, the waterfall above them.
  eggRow: { z: 20.5, common: 10.5, uncommon: 5.8, statue: 0, rare: -5.4, rainbow: -8.8 },
  boards: [
    { id: 'level', x: 13.5, z: 29.5 },
    { id: 'double', x: 0, z: 31 },
    { id: 'wins', x: -12.5, z: 29.5 },
  ],
  logoSign: { x: 8.4, z: 26.5 },
  portal: { x: -21.5, z: 31 },
  waterfall: { x: 0, width: 13, bottom: 7 },
  // Training lanes: themed treadmills running east from the hub to the wall,
  // stacked north (1x) to south (ADMIN 50x). Standing on one adds
  // TRAINING.rate x mult x clap power skill per second. `tag` is the plaque at
  // the lane's west end; theme picks the look (lobby/lanes.js).
  lanes: {
    minX: 16,
    maxX: 44,
    z0: -0.5,
    pitch: 3.4, // m between lane centres
    width: 2.5, // walkable floor width (z)
    list: [
      { mult: 1, rebirths: 0, theme: 'sand', tag: '1x' },
      { mult: 2, rebirths: 1, theme: 'ice', tag: '2x' },
      { mult: 4, rebirths: 3, theme: 'wood', tag: '4x' },
      { mult: 8, rebirths: 6, theme: 'crystal', tag: '8x' },
      { mult: 3, rebirths: 59, theme: 'sakura', tag: 'SAKURA\n3x', allWorlds: true },
      { mult: 15, rebirths: 139, theme: 'royal', tag: 'ROYAL\n15x', allWorlds: true },
      { mult: 50, rebirths: 339, theme: 'admin', tag: 'ADMIN\n50x', allWorlds: true },
    ],
  },
}
export const WATER = { color: '#2bbcf0', light: '#7fe3ff' }
export const SPAWN = { x: 0, y: 0.05, z: 7 }
export const SPAWN_FACING = Math.PI // yaw the character faces on spawn (PI = toward -Z, north)

// --- Player modes (modes.js) -------------------------------------------------
// 'character' = third-person chase cam with the avatar on screen.
// 'player' = first-person, the camera is the player's eyes and the avatar is hidden.
export const MODES = ['character', 'player']
export const START_MODE = 'character'

// --- Physics (physics.js, player.js) ------------------------------------------
export const PHYSICS = {
  gravity: -22, // m/s^2 for dynamic bodies and the player
  fixedStep: 1 / 60, // s per physics tick; rendering interpolates between ticks
  maxSubSteps: 5, // a long frame never runs more ticks than this
  walkSpeed: 8, // m/s
  sprintSpeed: 14, // m/s with Shift held
  accel: 70, // m/s^2 toward the target velocity on the ground
  airAccel: 22, // m/s^2 steering while airborne
  decel: 60, // m/s^2 when no key is held
  turnSpeed: 12, // rad/s the body turns toward its heading
  jumpSpeed: 8.5, // m/s
  coyoteTime: 0.1, // s after leaving a ledge a jump still counts
  jumpBuffer: 0.12, // s a jump pressed before landing is remembered
  stepHeight: 0.45, // m autostep
  maxSlope: 50, // degrees the player can walk up
  snapToGround: 0.4, // m the controller stays glued to downward steps and slopes
  pushMass: 80, // kg the character weighs when shoving crates
  killY: -6, // sank this far: respawn
}
export const PLAYER_DIMS = { radius: 0.75, height: 1.8 } // capsule the character controller moves

// --- Look ------------------------------------------------------------------
export const RENDER = { exposure: 1.0 }
export const FOG = { near: 260, far: 950 }
// The two lighting moods lighting.js blends between (key N toggles).
export const TIME_OF_DAY = {
  transition: 2.5, // s to blend day <-> night
  // The lobby look: a deep blue night sky with mountains, but the plates are lit
  // bright and neutral like a daytime toy set (no sun disc in the sky).
  day: {
    zenith: '#06143f',
    horizon: '#3256a6',
    sunColor: '#fff6e8',
    sunDisc: 0, // 0 hides the sun disc + halo in the sky shader
    sunIntensity: 2.6,
    sunElevation: 62, // degrees above the horizon
    sunAzimuth: 28, // degrees, 0 = from +Z
    hemiSky: '#f2f6ff',
    hemiGround: '#b9c79c',
    hemiIntensity: 1.25,
    envIntensity: 0.3,
    lampIntensity: 0,
    stars: 0.25,
    exposure: 1.0,
    fogColor: '#4a6cba',
  },
  night: {
    zenith: '#02061a',
    horizon: '#142650',
    sunColor: '#9fb4ff', // the moon
    sunDisc: 1,
    sunIntensity: 0.55,
    sunElevation: 38,
    sunAzimuth: -60,
    hemiSky: '#3a4c80',
    hemiGround: '#1a1a22',
    hemiIntensity: 0.45,
    envIntensity: 0.25,
    lampIntensity: 26,
    stars: 1,
    exposure: 1.15,
    fogColor: '#142650',
  },
}
export const LIGHT = {
  shadowRange: 40, // half-width of the sun's shadow box around the player
  lampColor: '#ffb35c',
  lampDistance: 22,
}

// Default (fallback) character look, used only when player.glb cannot load.
export const CHARACTER_COLORS = { skin: '#f2c79a', suit: '#1d1d24', hair: '#d8661e' }

export const MATERIAL_PBR = {
  PLAYER: { roughness: 0.7, metalness: 0 },
  GROUND: { roughness: 0.95, metalness: 0 },
}

// --- Graphics presets, picked by the Bloxity graphics_quality setting ----------
export const GRAPHICS_PRESETS = {
  Low: { shadows: false, shadowMap: 512, antialias: false, dpr: 1, bloom: false, particles: 0.35 },
  Medium: { shadows: true, shadowMap: 1024, antialias: false, dpr: 1.25, bloom: false, particles: 0.6 },
  High: { shadows: true, shadowMap: 2048, antialias: true, dpr: 2, bloom: true, particles: 1 },
  Ultra: { shadows: true, shadowMap: 4096, antialias: true, dpr: 2, bloom: true, particles: 1 },
}

// Bloom (postfx.js): only HDR-bright pixels (above threshold, linear, before
// tone mapping) glow: neon rails, waterfall, VIP gate, particles. Sunlit sand
// stays under the threshold.
export const BLOOM = { strength: 0.6, radius: 0.35, threshold: 2.0 }
// Neon materials (propkit.js): k = HDR colour multiplier with bloom on; with
// bloom off they are capped at plainMax so they stay coloured, not white.
export const NEON = { k: 3.5, plainMax: 1.2 }

// Phones and tablets default to a lighter preset when the portal sends no value,
// and any preset is capped there (a phone at DPR 3 renders 9x the pixels; bloom
// is a full-screen multi-pass blur, so it stays off on phones).
export const COARSE_POINTER = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
export const DEFAULT_GRAPHICS = COARSE_POINTER ? 'Medium' : 'High'
export const MOBILE_GRAPHICS_CAP = { dpr: 1.5, shadowMap: 1024, particles: 0.6 }

// The preset to render with on this device.
export function graphicsPreset(name) {
  const p = GRAPHICS_PRESETS[name] ?? GRAPHICS_PRESETS[DEFAULT_GRAPHICS]
  if (!COARSE_POINTER) return p
  const cap = MOBILE_GRAPHICS_CAP
  return { ...p, dpr: Math.min(p.dpr, cap.dpr), shadowMap: Math.min(p.shadowMap, cap.shadowMap), bloom: false, particles: Math.min(p.particles, cap.particles) }
}

// --- Touch controls (touch.js) --------------------------------------------------
export const TOUCH = {
  deadZone: 0.12, // fraction of the joystick radius that does nothing
  lookScale: 1.5, // touch drag pixels -> look, relative to a mouse pixel
  pinchPixelsPerNotch: 30, // finger spread change that equals one wheel notch
}

// --- Camera (camera.js) -------------------------------------------------------
export const CAMERA = {
  fov: 70,
  near: 0.1,
  far: 1200,
  startPitch: 0.36, // radians above the horizon
  minPitch: -0.35,
  maxPitch: 1.25,
  firstPersonPitch: 1.45, // |pitch| limit looking up/down in player mode
  eyeHeight: 0.92, // eye height as a fraction of player height (player mode)
  distance: 13, // resting boom length, m
  minDistance: 2.5, // wheel in past this enters player mode
  maxDistance: 26,
  followLerp: 14, // 1/s: the one smoothing stage, on the point the camera follows
  targetHeight: 1.2, // look-at point as a fraction of player height
  lookSensitivity: 0.0026, // rad per pixel of mouse movement
  zoomStep: 0.9, // m per wheel notch
  zoomEase: 12, // 1/s the zoom glides to its target
  speedFov: 6, // degrees the FOV widens at sprint speed
  speedEase: 3, // 1/s the speed framing eases in and out
  clearEase: 6, // 1/s the boom eases back out once a wall stops blocking it
}

// --- Bloxity (bloxity.js, avatar/) -------------------------------------------------
// SDK setting keys this game listens for; registering a listener makes the control
// appear in the portal's settings menu.
export const SETTINGS = {
  graphics_quality: { def: DEFAULT_GRAPHICS, type: 'enum', values: ['Low', 'Medium', 'High', 'Ultra'] },
  camera_sensitivity: { def: '1', type: 'number', min: 0.1, max: 5 },
  show_fps: { def: 'false', type: 'bool' },
  fullscreen: { def: 'false', type: 'bool' },
}

// The base rig, measured from player.glb: origin at the feet, 6.4 units tall at bind pose.
export const RIG_HEIGHT = 6.4
// Bind-pose values of the rig nodes the SDK proportions drive.
export const RIG = { armOffsetX: 2, legOffsetX: 0.6, neckOffsetY: 0.6 }
// getProportions() ranges, straight from the SDK spec; clamped before they reach the scene graph.
export const PROPORTIONS = {
  height: { def: 1, min: 0.5, max: 1.6 },
  shoulderWidth: { def: 1, min: 0.5, max: 1.5 },
  armLength: { def: 1, min: 0.05, max: 3 },
  legOffsetX: { def: 1, min: -0.7, max: 5 },
  torsoScaleX: { def: 1, min: 0.3, max: 2 },
  neckHeight: { def: 1, min: 0.94, max: 1.2 },
  headScale: { def: 1, min: 0.3, max: 2.6 },
}

// Procedural animation (avatar/animator.js), ported from Clean Leaves for Loot.
// Rotations are radians in CHARACTER space: +X swings a limb backward, +Y yaws, +Z rolls.
const deg = (d) => (d * Math.PI) / 180
export const ANIM = {
  airborneDelay: 0.07, // s off the ground before the air pose (ignores a step down a ledge)
  // Walk -> run is one cycle at two depths; phase advances with distance travelled.
  locomotion: {
    minFrequency: 0.7,
    maxFrequency: 3.6,
    strideDistance: 3.8, // m per cycle
    idleSpeed: 0.6,
    walkSpeed: 2.5,
    runSpeed: 8,
    sprintSpeed: 13,
    hipSwing: { walk: deg(22), run: deg(42), sprint: deg(56) },
    kneeBend: { walk: deg(30), run: deg(58), sprint: deg(72) },
    armSwing: { walk: deg(18), run: deg(36), sprint: deg(52) },
    elbowBend: { walk: deg(14), run: deg(44), sprint: deg(70) },
    torsoTwist: { walk: deg(4), run: deg(7), sprint: deg(9) },
    torsoLean: { walk: deg(3), run: deg(10), sprint: deg(18) },
    headCounterTwist: { walk: deg(2), run: deg(4), sprint: deg(5) },
    torsoRoll: { walk: deg(2), run: deg(3), sprint: deg(3) },
    bob: { walk: 0.03, run: 0.07, sprint: 0.09 }, // m, on the avatar root
    bankAngle: deg(9),
    bankRate: 8,
  },
  idle: {
    breathFrequency: 0.35,
    breathAmount: deg(1.8),
    breathBob: 0.007,
    basePose: {
      ArmL1: { x: deg(-4), z: deg(8) },
      ArmL2: { x: deg(12) },
      ArmR1: { x: deg(-4), z: deg(-8) },
      ArmR2: { x: deg(12) },
      LegL1: { x: deg(-4) },
      LegR1: { x: deg(4) },
    },
  },
  airborne: {
    rise: {
      LegL1: { x: deg(-38) }, LegR1: { x: deg(8) }, LegL2: { x: deg(62) }, LegR2: { x: deg(40) },
      ArmL1: { x: deg(-40), z: deg(34) }, ArmR1: { x: deg(-30), z: deg(-34) },
      ArmL2: { x: deg(30) }, ArmR2: { x: deg(30) }, Spine1: { x: deg(6) },
    },
    fall: {
      LegL1: { x: deg(-14) }, LegR1: { x: deg(10) }, LegL2: { x: deg(22) }, LegR2: { x: deg(18) },
      ArmL1: { x: deg(-70), z: deg(40) }, ArmR1: { x: deg(-60), z: deg(-40) },
      ArmL2: { x: deg(20) }, ArmR2: { x: deg(20) }, Spine1: { x: deg(-4) },
    },
    velocityReference: 8, // m/s vertical speed that reads as fully rising / falling
  },
  landing: {
    duration: 0.16,
    pose: {
      LegL1: { x: deg(-34) }, LegR1: { x: deg(-34) }, LegL2: { x: deg(58) }, LegR2: { x: deg(58) },
      ArmL1: { x: deg(-18), z: deg(20) }, ArmR1: { x: deg(-18), z: deg(-20) }, Spine1: { x: deg(14) },
    },
    bobY: -0.2,
  },
  transitions: { toLocomotion: 0.14, toAirborne: 0.12, toLanding: 0.06 }, // s to blend a pose change
  // One clap, layered over whatever the legs are doing: the arms swing up in
  // front of the chest, open, then slap together at `hit` seconds.
  clap: {
    duration: 0.34, // s for the whole gesture
    hit: 0.1, // s in, the moment the hands meet (sound + particles)
    open: { ArmL1: { x: deg(-80), z: deg(34) }, ArmR1: { x: deg(-80), z: deg(-34) }, ArmL2: { x: deg(-28) }, ArmR2: { x: deg(-28) } },
    shut: { ArmL1: { x: deg(-86), z: deg(-12) }, ArmR1: { x: deg(-86), z: deg(12) }, ArmL2: { x: deg(-10) }, ArmR2: { x: deg(-10) } },
  },
}

// --- Game rules (game.js) ---------------------------------------------------------
// Every clap adds the clap power (1 + gauntlet skill, times the multiplier) to
// SKILL and hits every destroyable whose edge is within `range` m of the player.
export const CLAP = { cooldown: 0.16, range: 3.8, autoInterval: 0.35 }
// Gauntlets on the showroom plinths: owning one needs `wins` total wins (they are
// not spent); touching an owned one equips it. `style` picks the model (lobby/gauntlets.js).
export const GAUNTLETS = [
  { id: 'classic', skill: 1, wins: 0, style: 'classic' },
  { id: 'aloha', skill: 3, wins: 2, style: 'aloha' },
  { id: 'leather', skill: 5, wins: 10, style: 'leather' },
  { id: 'blossom', skill: 12, wins: 40, style: 'pink' },
  { id: 'gold', skill: 30, wins: 150, style: 'gold' },
  { id: 'rust', skill: 75, wins: 500, style: 'rust' },
  { id: 'ruby', skill: 200, wins: 2250, style: 'ruby' },
  { id: 'knight', skill: 500, wins: 7000, style: 'knight' },
  { id: 'magma', skill: 1250, wins: 26000, style: 'magma' },
  { id: 'blaze', skill: 3500, wins: 90000, style: 'blaze' },
]
// Beach props you clap apart. hp and wins grow with how far north they stand:
// x (1 + depth / depthScale), depth = metres past the Clap Zone.
export const DESTROYABLES = {
  depthScale: 45,
  respawn: 14, // s before a destroyed prop pops back
  kinds: {
    ball: { hp: 3, wins: 1 },
    towel: { hp: 4, wins: 1 },
    cooler: { hp: 6, wins: 2 },
    umbrella: { hp: 8, wins: 2 },
    castle: { hp: 14, wins: 4 },
    bigCastle: { hp: 40, wins: 10 },
    hut: { hp: 60, wins: 14 },
    lifeguard: { hp: 90, wins: 20 },
  },
}
// Rebirth: needs `base * growth^rebirths` skill; resets skill, +1 to the multiplier.
export const REBIRTH = { base: 500, growth: 4 }
// Training pools (LOBBY.lanes): standing in one adds `rate * mult * clap power` skill per second.
export const TRAINING = { rate: 2 }
// Hidden pumpkins (the level bar): `level` pumpkins finish a level; each one is +candy.
export const PUMPKINS = { respawn: 40, candy: 5, radius: 1.4 }
export const GIFT = { every: 60, skill: 25, candy: 10 } // s between free rewards
export const PATCH = { grow: 30, candy: 3, radius: 1.1 } // Pumpkin Patch plots (LOBBY.patch)
export const SAVE_KEY = 'clap-to-destroy.save'
// Offline leaderboards (lobby/plaza.js): made-up rivals the local player is ranked
// among until the game has a server. Per board: [name, score] (seconds for time).
export const LEADERBOARD_RIVALS = {
  level: [['ClapChampion', 412], ['SandSmasher', 305], ['BeachBoss77', 220], ['GloveGuru', 168], ['PumpkinPro', 120], ['TidalTom', 84], ['CastleCrusher', 51], ['WaveRider_9', 30], ['HighFive', 12]],
  time: [['GloveGuru', 380000], ['ClapChampion', 302000], ['TidalTom', 240000], ['SandSmasher', 190000], ['HighFive', 151000], ['BeachBoss77', 98000], ['PumpkinPro', 72000], ['CastleCrusher', 40000], ['WaveRider_9', 12000]],
  spent: [['BeachBoss77', 10052], ['ClapChampion', 8303], ['GloveGuru', 8036], ['SandSmasher', 7752], ['PumpkinPro', 6788], ['TidalTom', 6418], ['HighFive', 6233], ['CastleCrusher', 4100], ['WaveRider_9', 2500]],
  wins: [['SandSmasher', 21.15e15], ['ClapChampion', 2.1e15], ['GloveGuru', 19.35e12], ['BeachBoss77', 17.65e12], ['TidalTom', 16.2e12], ['PumpkinPro', 10.5e12], ['HighFive', 1.05e12], ['CastleCrusher', 9.33e9], ['WaveRider_9', 7.46e9]],
}
export const WORLD2_SKILL = 100e6 // skill the WORLD 2 portal asks for

export const FONT_FAMILY = 'Fredoka'

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

// Coerce one raw SDK string against its SETTINGS entry.
export function coerceSetting(key, raw) {
  const spec = SETTINGS[key]
  if (!spec) return raw
  const value = raw === '' || raw == null ? spec.def : raw
  if (spec.type === 'bool') return value === 'true' || value === true
  if (spec.type === 'enum') return spec.values.includes(value) ? value : spec.def
  const n = Number(value)
  return clamp(Number.isFinite(n) ? n : Number(spec.def), spec.min, spec.max)
}
