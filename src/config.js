// Every tunable constant lives here; the rest of src/ holds no theme values.

// --- Identity -------------------------------------------------------------
export const GAME_SLUG = 'clap-to-distroy' // slug registered on bloxity.io
export const GAME_TITLE = 'Clap to Destroy'

// Forces the Bloxity SDK and avatar CDN to be treated as unavailable (see .env.example).
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// --- Multiplayer (net.js, remotePlayers.js, remoteFx.js) -------------------------
// A configured server (VITE_SERVER_URL, e.g. ws://localhost:2567) wins; otherwise the Bloxity SDK
// resolves this game's server. With neither, the game runs offline.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || ''
export const NET = {
  poseHz: 10, // pose messages per second (skipped while nothing changed)
  remoteLerp: 12, // 1/s: how fast a remote player eases to the last relayed pose
  snapDistance: 12, // m: a remote farther than this from its pose snaps (teleport / respawn)
  maxRemotes: 14, // nearest other players drawn; the rest are not built at all
  remoteFade: 140, // m: farther players are hidden
  animRange: 50, // m: farther players hold their pose (no animation work)
  shadowRange: 28, // m: farther players cast no shadow
  nameRange: 40, // m: name tags
  petsMax: 3, // pets drawn per remote player
  petRange: 36, // m: only players this close show their pets
  petRemotes: 6, // players (nearest first) that may show pets at once
  maxWaves: 3, // remote shockwaves alive at once
  fxRange: 90, // m: clap bursts farther than this are not played
  waveDustRange: 70, // m: a remote wave only kicks up dust while its crest is this close
  reconnect: [3000, 10000], // ms between connection tries (after a drop, after a failure)
}

// --- World (metres: +X east, +Z south, +Y up; north = -Z) ---------------------
export const GROUND_Y = 0
// The lobby (lobby/): a lego-studded hub at y = 0 with the Clap Zone band on its
// north edge, then the beach corridor running north between two water channels
// and orange checkered cliffs. Everything outside is raised terrain.
export const LOBBY = {
  stud: 0.5, // m between studs on every plate
  hub: { minX: -50, maxX: 50, minZ: -6, maxZ: 42 }, // the ground-level plate inside the walls
  path: { halfWidth: 4.5 },
  // Hub plates as [minX, maxX, minZ, maxZ] (no overlaps): white = walkway, gauntlet
  // showroom (west) and the plaza in front of the leaderboards (south); the rest grass.
  whiteFloors: [[-4.5, 4.5, 0, 16], [-50, -4.5, 0, 26], [-4.5, 15, 16, 42], [-26, -4.5, 26, 42], [-50, -24, -6, 0]],
  grassFloors: [[4.5, 50, 0, 16], [15, 50, 16, 42], [-50, -26, 26, 42], [14, 50, -6, 0]],
  band: { minX: -24, maxX: 14, minZ: -6, maxZ: 0 }, // "CLAP ZONE" strip painted across the hub
  // Gauntlet plinths: two rows running south from the egg, the second on a white
  // terrace (stairs on its north face). GAUNTLETS[i] -> rows[floor(i / 5)], zs[i % 5].
  showroom: {
    rows: [{ x: -12, y: 0 }, { x: -20.5, y: 2.4 }],
    zs: [4, 9, 14, 19, 24],
    terrace: { minX: -41, maxX: -16, minZ: 1, maxZ: 27, height: 2.4 },
    stairX: [-24, -17], // stairs down the terrace's north face
    title: { x: -20.5, y: 9.6, z: 14 },
  },
  // Sand corridor (the zone you clap in): 1 km, so the wave keeps finding new ground
  // all the way to the 100M SKILL goal (~880 m, see WAVE) and a little past it.
  beach: { halfWidth: 16, minZ: -1000, maxZ: -6 },
  distanceSigns: 100, // m between the distance / Wins multiplier signs along the beach
  channel: { inner: 16, outer: 22, depth: 1.4, waterY: -0.45 }, // water both sides of the beach
  cliffLow: { inner: 22, outer: 34, height: 4.5 }, // first terrace beside the channels
  cliffHigh: { height: 9 }, // second terrace out to the horizon
  hubWalls: { side: 26, south: 46, square: 6 }, // tall brown checker walls round the hub (square = m per checker)
  far: 420, // half-size of the raised terrain
  chevrons: [5.2, 11.2, 17.2], // z of the floor arrows on the path
  egg: { x: -6.2, z: 2.6 },
  phoenix: { x: -7.4, z: 12 },
  // South plaza: the egg row, the leaderboards against the wall, the waterfall above them.
  eggRow: { z: 20.5, common: 10.5, uncommon: 5.8, statue: 0, rare: -5.4, rainbow: -8.8 },
  boards: [
    { id: 'level', x: 13.5, z: 35.5 },
    { id: 'double', x: 0, z: 37 },
    { id: 'wins', x: -12.5, z: 35.5 },
  ],
  logoSign: { x: 8.4, z: 26.5 },
  portal: { x: -21.5, z: 37 },
  waterfall: { x: 0, width: 13, bottom: 7 },
  // Training lanes: themed treadmills running east from the hub to the wall,
  // stacked north (1x) to south (ADMIN 50x). Standing on one adds
  // TRAINING.rate x mult x clap power skill per second. `tag` is the plaque at
  // the lane's west end; theme picks the look (lobby/lanes.js).
  lanes: {
    minX: 16,
    maxX: 44,
    z0: -1.5, // z of the first lane; the 7 lanes span z -4.25..34.25 inside the hub (-6..36)
    pitch: 5.5, // m between lane centres
    width: 5, // walkable floor width (z)
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
// --- Economy pacing ---
// Tuned with a playthrough sim so an efficient player needs ~2h20m (never under ~2h) to
// hold WORLD2_SKILL (100M) at once, a casual one 2.5-3h. The first ~10 min hand out a
// gauntlet, AUTO CLAP or a rebirth every minute or so; from then on the gaps widen to
// 10-20 min, carried by the wave reaching further down the 1 km beach (WAVE, DESTROYABLES.zone).
// Gauntlets on the showroom plinths: owning one needs `wins` total wins (they are
// not spent); touching an owned one equips it. `style` picks the model (lobby/gauntlets.js).
// Clap power is (1 + skill) x the multiplier, so the bonuses stay small: the
// multiplier (rebirths x pets x boosts) does the heavy lifting.
export const GAUNTLETS = [
  { id: 'classic', name: 'Classic Gauntlet', skill: 1, wins: 0, style: 'classic' },
  { id: 'aloha', name: 'Aloha Gauntlet', skill: 2, wins: 10, style: 'aloha' },
  { id: 'leather', name: 'Leather Gauntlet', skill: 3, wins: 75, style: 'leather' },
  { id: 'blossom', name: 'Blossom Gauntlet', skill: 4, wins: 400, style: 'pink' },
  { id: 'gold', name: 'Golden Gauntlet', skill: 5, wins: 2500, style: 'gold' },
  { id: 'rust', name: 'Rusty Gauntlet', skill: 6, wins: 15e3, style: 'rust' },
  { id: 'ruby', name: 'Ruby Gauntlet', skill: 8, wins: 90e3, style: 'ruby' },
  { id: 'knight', name: 'Knight Gauntlet', skill: 10, wins: 500e3, style: 'knight' },
  { id: 'magma', name: 'Magma Gauntlet', skill: 13, wins: 2.5e6, style: 'magma' },
  { id: 'blaze', name: 'Blaze Gauntlet', skill: 16, wins: 6e6, style: 'blaze' },
]
// Beach props you clap apart. hp and wins grow with how far north they stand:
// x zone.growth ^ (depth / zone.length), depth = metres past the Clap Zone
// (x1.65 per 100 m: x12 at 500 m, x90 at 900 m, x150 at the end of the beach).
export const DESTROYABLES = {
  zone: { length: 100, growth: 1.65 },
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
// The clap shockwave (wave.js): standing in the Clap Zone band shows the CLAP
// button; pressing it claps a wave that runs north down the beach while the
// camera rides behind it. SKILL sets how far it goes: base + perDoubling x
// log2(1 + skill / skillUnit) m, up to maxRange. Every prop it reaches breaks;
// their Wins are paid in one "+N" at the end. Range by SKILL: 1K 66 m, 10K 194 m,
// 100K 360 m, 1M 532 m, 10M 705 m, 100M 878 m (the WORLD 2 goal), ~1B the end of the beach.
export const WAVE = {
  base: 14, // m with 0 SKILL
  perDoubling: 52, // m more per doubling of SKILL / skillUnit
  skillUnit: 1000,
  maxRange: 988, // m, the end of the beach (LOBBY.beach.minZ, from the Clap Zone)
  height: 1.7, // m, the wall of light
  duration: { min: 2.4, perMetre: 1 / 70, max: 10 }, // s the wave takes to run its range (fast, then slowing)
  clapAt: 0.38, // s after CLAP the hands start (the camera has swung in front)
  hold: 1.0, // s the camera lingers where the wave died
  returnTime: 1.0, // s back to the player
  payTime: 1.8, // s the "+N" reward stays up
  countUp: 0.7, // s the "+N" counts up from 0
  countTicks: 14, // ticks heard while it counts
  hitStop: { size: 2.2, time: 0.07 }, // props this big (radius, m) freeze the wave this long when they break
  dustRate: 70, // sand puffs + sparks per second along the crest
  crumbleSize: 2.4, // props this big crumble where they stand; smaller ones are launched and burst on landing
  // The invisible wall on the band's north edge that keeps players off the beach,
  // and its force-field glow (shown within `showWithin` m of it).
  gate: { z: LOBBY.band.minZ, minX: LOBBY.hub.minX, maxX: LOBBY.hub.maxX, height: 14, glowHalf: LOBBY.channel.outer, glowHeight: 3.2, showWithin: 4.5 },
  camera: {
    front: { back: 6, up: 1.5, lookUp: 1.15 }, // facing the player for the clap
    chase: { back: 7.5, up: 2.6, ahead: 26, lookUp: 0.5 }, // riding behind the wave
    enter: 0.35, // s to swing from the player camera to the front shot
    swingDelay: 0.3, // s into the wave before it turns to chase
    swing: 0.55, // s the turn takes
    arc: 7, // m the camera swings out to the side while it turns round the player
  },
}
// Rebirth: SKILL climbs the rebirth level from 1 to `level`, spaced on a log scale
// up to `base * growth^rebirths` skill. Reaching it lets you rebirth: SKILL resets,
// +1x SKILL multiplier forever. Skip Rebirth buys one with Wins at any level:
// skipCost * skipGrowth^rebirths. Auto Rebirth rebirths as soon as it is ready.
// 200 x 2.2^r: the first ten come about a minute apart, then 17 rebirths before 100M.
export const REBIRTH = { base: 200, growth: 2.2, level: 15, skipCost: 2000, skipGrowth: 4 }
// Training lanes (LOBBY.lanes): standing at a lane's entrance auto-claps every `cooldown` s for `rate * mult * clap power` skill per second.
export const TRAINING = { rate: 1.25, cooldown: 1 } // skill gained = rate x mult x clap power x cooldown, once per clap
// Hold-E interactions (gauntlet plinths, egg stands): the prompt's ring fills over holdMs.
export const INTERACT = { holdMs: 1200 }
export const WORLD2_SKILL = 100e6 // skill the WORLD 2 portal asks for

// --- Inventory: pets, eggs, boosts, trails, rewards (game.js, windows.js) ---------
// Gauntlets that are not on a showroom plinth (rewards only); they sit in the
// Inventory with the showroom ones and are equipped from there.
// The Royal Phoenix is the top tier: the only one past the showroom that Wins buy (at its
// red carpet, hold E). 150M Wins is 25x Blaze (6M): a goal for after WORLD 2's 100M SKILL,
// and +30 Skill is 1.5x the Dragon Gauntlet (Daily day 7).
export const REWARD_GAUNTLETS = [
  { id: 'dragon', name: 'Dragon Gauntlet', skill: 20, style: 'dragon' },
  { id: 'phoenix', name: 'Royal Phoenix Gauntlet', skill: 30, wins: 150e6, style: 'phoenix' },
]
// Cube pets. Each equipped pet multiplies SKILL by `mult`; several add up (x1.25 + x1.1 = x2.35).
// body / accent colours, `top` = what sits on the head (bunny, cat, dog, bear, pig,
// frog, horn, dragon), `mark` = a badge on the face (clover, coin, star).
export const PET_KINDS = {
  cloverBunny: { name: 'Clover Bunny', rarity: 'common', mult: 1.25, body: '#cdf3d6', accent: '#59c96a', top: 'bunny', mark: 'clover' },
  puppy: { name: 'Puppy', rarity: 'common', mult: 1.1, body: '#e0a468', accent: '#7a4322', top: 'dog' },
  kitty: { name: 'Kitty', rarity: 'common', mult: 1.15, body: '#f6f1ea', accent: '#ff9ab8', top: 'cat' },
  piggy: { name: 'Piggy', rarity: 'uncommon', mult: 1.3, body: '#ffb8cc', accent: '#ff7aa0', top: 'pig' },
  froggy: { name: 'Froggy', rarity: 'uncommon', mult: 1.4, body: '#7ee05a', accent: '#3a9a2a', top: 'frog' },
  foxy: { name: 'Foxy', rarity: 'uncommon', mult: 1.6, body: '#ff8a3a', accent: '#fff3e0', top: 'cat' },
  bear: { name: 'Teddy Bear', rarity: 'rare', mult: 1.8, body: '#9a6438', accent: '#e0b484', top: 'bear' },
  panda: { name: 'Panda', rarity: 'rare', mult: 2.2, body: '#ffffff', accent: '#2a2a32', top: 'bear' },
  lavaPup: { name: 'Lava Pup', rarity: 'epic', mult: 2.6, body: '#ff5a2a', accent: '#ffd23a', top: 'dog', mark: 'star' },
  frostCat: { name: 'Frost Cat', rarity: 'epic', mult: 3, body: '#bfe8ff', accent: '#3fa8ff', top: 'cat', mark: 'star' },
  fortuneCat: { name: 'Fortune Cat', rarity: 'legendary', mult: 3.5, body: '#ffffff', accent: '#ff5a3a', top: 'cat', mark: 'coin' },
  unicorn: { name: 'Unicorn', rarity: 'legendary', mult: 5, body: '#fff2fb', accent: '#c86aff', top: 'horn' },
  dragon: { name: 'Baby Dragon', rarity: 'legendary', mult: 6, body: '#e2361c', accent: '#ffcf3a', top: 'dragon' },
  voidDragon: { name: 'Void Dragon', rarity: 'mythical', mult: 10, body: '#5a2ad0', accent: '#ff5fd0', top: 'dragon', mark: 'star' },
  // Top tier ('unlimited', above mythical): only the Admin Egg hatches it.
  adminPhoenix: { name: 'Admin Phoenix', rarity: 'unlimited', mult: 25, body: '#12301c', accent: '#3dff6a', top: 'dragon', mark: 'coin' },
}
// Eggs. The plaza stands (lobby/plaza.js, matched by key) sell common / uncommon /
// rare for Wins and rainbow for Robux (`robux`: purchases are not in yet, so it only
// shows its odds); the rest only come from rewards and wait in the Inventory.
// `look`: plain (spotted), scales (legendary) or crystal (mythical).
export const EGGS = {
  rainbow: { name: 'Rainbow Egg', robux: 45, color: '#ff5fd0', spots: '#ffe14a', look: 'plain', hatches: { unicorn: 50, dragon: 35, voidDragon: 15 } },
  common: { name: 'Common Egg', price: 50, color: '#f4ecdc', spots: '#d8c4a6', look: 'plain', hatches: { cloverBunny: 45, puppy: 35, kitty: 20 } },
  uncommon: { name: 'Uncommon Egg', price: 1500, color: '#62e866', spots: '#3cc444', look: 'plain', hatches: { kitty: 30, piggy: 35, froggy: 25, foxy: 10 } },
  rare: { name: 'Rare Egg', price: 40e3, color: '#62e2ff', spots: '#3cc4ef', look: 'plain', hatches: { foxy: 40, bear: 40, panda: 20 } },
  epic: { name: 'Epic Egg', color: '#a86aff', spots: '#7a3ad8', look: 'plain', hatches: { bear: 40, panda: 30, lavaPup: 20, frostCat: 10 } },
  legendary: { name: 'Legendary Egg', color: '#ff9a2a', spots: '#c8501a', look: 'scales', hatches: { lavaPup: 40, frostCat: 35, unicorn: 18, dragon: 7 } },
  mythical: { name: 'Mythical Egg', color: '#7a3ad8', spots: '#c88aff', look: 'crystal', hatches: { frostCat: 40, unicorn: 30, dragon: 22, voidDragon: 8 } },
  // The Admin Egg (lobby/landmarks.js, stand at LOBBY.egg): the top-tier egg, bought with Wins.
  // 500M a hatch is past the 100M SKILL goal (~3.3x the Phoenix), a long-term Wins sink;
  // 15% unlimited (x25) with Void Dragon (x10) the usual pull keeps it worth the price.
  admin: { name: 'Admin Egg', price: 500e6, color: '#12301c', spots: '#3dff6a', look: 'crystal', hatches: { voidDragon: 60, dragon: 25, adminPhoenix: 15 } },
}
export const PETS = {
  storage: 200,
  slots: 3, // equipped at once to start
  slotCosts: [40e3, 3e6, 80e6], // Wins for each extra slot (the green + in My Pets)
  follow: [[-1.6, -1.4], [1.6, -1.4], [0, -2.4], [-2.8, -2.6], [2.8, -2.6], [0, -3.6]], // [side, back] m from the player
  shake: 1.1, // s the egg rattles before the reveal
  reveal: 2.2, // s the pet card stays up
  autoReveal: 0.9, // s the card stays up between Auto hatches
  // The egg panel (hud.js setEggPanel) opens within `near` m of a plaza stand (the nearest one):
  // E hatches one, R `multi` at once (multi x the price), T toggles Auto.
  near: 4,
  multi: 3,
}
// Boost potions (Inventory > Boosts): using one gives `mult`x for `minutes`; another of
// the same kind while one runs adds its time.
export const BOOSTS = {
  skill: { label: 'SKILL', mult: 2, minutes: 10, color: '#3aa8ff', card: '#2f86e8' },
  wins: { label: 'Wins', mult: 2, minutes: 10, color: '#ffc21a', card: '#f0b21a' },
}
// Permanent boosts (the 5X SKILL / 2x WINS HUD buttons): bought once with Wins, then always on
// (they stack with the potions above). 2x WINS lands ~35 min in; 5X SKILL is the big
// late goal (bought before 100M it would end the climb early, so it sits past it).
export const PERM_BOOSTS = {
  skill: { label: '5X SKILL', mult: 5, cost: 40e6 },
  wins: { label: '2x WINS', mult: 2, cost: 400e3 },
}
// AUTO CLAP (top-centre HUD button): bought once with Wins, then it toggles on and off.
export const AUTO_CLAP_COST = 1e3
// Trails colour the clap wave (wave.js) and multiply every Win. Bought with Wins.
// `wave` = the ring's colour (HDR-bright), `row` = the row's colour in the window.
export const TRAILS = [
  { id: 'white', name: 'White', boost: 1.25, cost: 50, colors: ['#ffffff', '#c8d4ff'], wave: '#ffffff', row: '#e4e7ee' },
  { id: 'red', name: 'Red', boost: 1.5, cost: 50e3, colors: ['#ff3a4a', '#a8101e'], wave: '#ff3040', row: '#e2475a' },
  { id: 'blue', name: 'Blue', boost: 1.75, cost: 2e6, colors: ['#3aa8ff', '#1040d0'], wave: '#2a8cff', row: '#2e7fe6' },
  { id: 'yellow', name: 'Yellow', boost: 2, cost: 40e6, colors: ['#ffe14a', '#f0a010'], wave: '#ffd21a', row: '#e6b62a' },
  { id: 'green', name: 'Green', boost: 2.5, cost: 1e9, colors: ['#6af04a', '#1a9a2a'], wave: '#40ff50', row: '#3cc048' },
  { id: 'purple', name: 'Purple', boost: 3, cost: 50e9, colors: ['#c86aff', '#6a1fd8'], wave: '#a040ff', row: '#8a4ae0' },
  { id: 'rainbow', name: 'Rainbow', boost: 4, cost: 2e15, colors: ['#ff4a5a', '#ffd23a', '#4ae86a', '#3aa8ff', '#c86aff'], wave: 'rainbow', row: 'rainbow' },
]
// Playtime Rewards: minutes played this session (the clock restarts with the page).
// skill / wins amounts grow with the rebirth multiplier. Tiles are coloured by row.
export const PLAYTIME = [
  { at: 1, kind: 'skill', k: 60 },
  { at: 2, kind: 'wins', k: 637 },
  { at: 2.5, kind: 'egg', egg: 'epic' },
  { at: 5, kind: 'boost', boost: 'skill', n: 2 },
  { at: 9, kind: 'wins', k: 1270 },
  { at: 13, kind: 'skill', k: 180 },
  { at: 17, kind: 'boost', boost: 'wins', n: 2 },
  { at: 22, kind: 'egg', egg: 'legendary' },
  { at: 27, kind: 'skill', k: 360 },
  { at: 37, kind: 'wins', k: 4780 },
  { at: 47, kind: 'skill', k: 840 },
  { at: 57, kind: 'egg', egg: 'mythical' },
]
// Daily Rewards, one a day; miss two days and the streak restarts at day 1.
export const DAILY = {
  every: 24 * 3600, // s
  days: [
    { label: '1x SKILL BOOST', kind: 'boost', boost: 'skill', n: 1 },
    { label: 'FORTUNE CAT', kind: 'pet', pet: 'fortuneCat' },
    { label: '1x WIN BOOST', kind: 'boost', boost: 'wins', n: 1 },
    { label: '2x WIN BOOST', kind: 'boost', boost: 'wins', n: 2 },
    { label: '3x SKILL BOOST', kind: 'boost', boost: 'skill', n: 3 },
    { label: '3x WIN BOOST', kind: 'boost', boost: 'wins', n: 3 },
    { label: 'DRAGON GAUNTLET', kind: 'gauntlet', gauntlet: 'dragon' },
  ],
}

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
