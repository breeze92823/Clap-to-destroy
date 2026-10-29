import { CanvasTexture, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three'
import { LOBBY, WATER } from '../config.js'
import { drawStuds, paintLaneWater, paintWaterfall, toTexture } from '../textures.js'
import { titleFontReady } from './fonts.js'
import { Batcher, dirt, PLATES, wall, worldUV } from './kit.js'

// The ground of the lobby, all merged into a handful of meshes:
//  - the hub plate: white walkway + gauntlet showroom, two-tone green grass,
//    the CLAP ZONE band painted across its north edge
//  - the beach corridor running north (sand), a water channel on each side
//  - orange checkered cliffs with green studded tops: a low terrace beside the
//    channels, a high one behind it
//  - tall brown checker walls round the hub, a waterfall down the south one
// Every solid piece also gets a box collider.

const BOTTOM = -2.2 // underside of every plate (below the channel floors)
const LIP = 0.6 // the grass slab on top of each cliff, overhanging its face

// One cliff block: dirt body + a green studded lip that overhangs `over` metres.
function cliff(b, minX, maxX, minZ, maxZ, height, over = 0.25) {
  b.box(minX, maxX, BOTTOM, height - LIP, minZ, maxZ, dirt())
  b.box(minX - over, maxX + over, height - LIP, height, minZ - over, maxZ + over, PLATES.grass())
}

// A hub wall: brown checker body + the green studded lip on top.
function hubWall(b, minX, maxX, minZ, maxZ, height) {
  const tile = LOBBY.hubWalls.square * 2
  b.box(minX, maxX, BOTTOM, height - LIP, minZ, maxZ, wall(), true, tile)
  b.box(minX - 0.25, maxX + 0.25, height - LIP, height, minZ - 0.25, maxZ + 0.25, PLATES.grass())
}

// The band's own texture: studded sand, blue pill caps and the painted words.
function paintBand(lengthM, widthM) {
  const pxPerM = 44
  const c = document.createElement('canvas')
  c.width = Math.round(lengthM * pxPerM)
  c.height = Math.round(widthM * pxPerM)
  const draw = () => {
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#f2d995'
    ctx.fillRect(0, 0, c.width, c.height)
    drawStuds(ctx, c.width, c.height, LOBBY.stud * pxPerM)
    // Words centred on x = 0 (the walkway); the band starts at LOBBY.band.minX.
    const cx = (0 - LOBBY.band.minX) * pxPerM
    const cy = c.height / 2
    const textH = c.height * 0.62
    ctx.font = `${Math.round(textH)}px "Luckiest Guy", "Fredoka", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const text = 'CLAP ZONE'
    const w = ctx.measureText(text).width * 1.05
    // Blue pill caps either side of the words.
    for (const side of [-1, 1]) {
      const x = cx + side * (w / 2 + c.height * 0.55)
      ctx.save()
      ctx.translate(x, cy)
      ctx.beginPath()
      ctx.ellipse(0, 0, c.height * 0.55, c.height * 0.36, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(0, 0, c.height * 0.48, c.height * 0.29, 0, 0, Math.PI * 2)
      const g = ctx.createLinearGradient(0, -c.height * 0.3, 0, c.height * 0.3)
      g.addColorStop(0, '#5ab8ff')
      g.addColorStop(1, '#1f78d6')
      ctx.fillStyle = g
      ctx.fill()
      ctx.restore()
    }
    ctx.lineJoin = 'round'
    ctx.save()
    ctx.translate(cx, cy + textH * 0.06)
    ctx.scale(1.05, 1)
    ctx.fillStyle = 'rgba(60,50,40,0.35)' // drop shadow
    ctx.fillText(text, 6, 8)
    ctx.lineWidth = textH * 0.13
    ctx.strokeStyle = '#5d5d68'
    ctx.strokeText(text, 0, 0)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }
  draw()
  return { canvas: c, draw }
}

export function buildTerrain(root) {
  const b = new Batcher()
  const { hub, band, beach, channel, cliffLow, cliffHigh, hubWalls, far, showroom, waterfall } = LOBBY
  const W = PLATES.white()
  const G = PLATES.grass()

  // --- Hub plate (top at y = 0) ---
  for (const [x0, x1, z0, z1] of LOBBY.whiteFloors) b.box(x0, x1, BOTTOM, 0, z0, z1, W)
  for (const [x0, x1, z0, z1] of LOBBY.grassFloors) b.box(x0, x1, BOTTOM, 0, z0, z1, G)
  b.box(band.minX, band.maxX, BOTTOM, 0, band.minZ, band.maxZ, PLATES.sand())

  // Showroom terrace for the second gauntlet row, stairs down its north face.
  const t = showroom.terrace
  b.box(t.minX, t.maxX, 0, t.height, t.minZ, t.maxZ, W)
  const steps = Math.round(t.height / 0.4)
  const [sx0, sx1] = showroom.stairX
  for (let k = 1; k < steps; k++) b.box(sx0, sx1, 0, t.height - 0.4 * k, t.minZ - k * 0.6, t.minZ - (k - 1) * 0.6, W)

  // --- Beach corridor + channels ---
  b.box(-beach.halfWidth, beach.halfWidth, BOTTOM, 0, beach.minZ, beach.maxZ, PLATES.sand())
  for (const s of [-1, 1]) {
    const x0 = s * channel.inner
    const x1 = s * channel.outer
    b.box(Math.min(x0, x1), Math.max(x0, x1), BOTTOM, -channel.depth, beach.minZ, beach.maxZ, PLATES.sandDark())
  }

  // --- Cliffs beside the beach, walls round the hub ---
  for (const s of [-1, 1]) {
    const span = (a, c) => [Math.min(s * a, s * c), Math.max(s * a, s * c)]
    const [l0, l1] = span(cliffLow.inner, cliffLow.outer)
    cliff(b, l0, l1, beach.minZ, beach.maxZ, cliffLow.height)
    const [h0, h1] = span(cliffLow.outer, far)
    cliff(b, h0, h1, -far, beach.maxZ, cliffHigh.height, 0)
    const [e0, e1] = span(hub.maxX, far)
    hubWall(b, e0, e1, hub.minZ, far, hubWalls.side)
  }
  hubWall(b, hub.minX, hub.maxX, hub.maxZ, far, hubWalls.south)
  cliff(b, -cliffLow.inner, cliffLow.inner, -far, beach.minZ, cliffHigh.height, 0) // the north end of the beach

  // Waterfall pool at the foot of the south wall.
  const wf = waterfall
  b.box(wf.x - wf.width / 2 - 1.2, wf.x + wf.width / 2 + 1.2, 0, 0.5, hub.maxZ - 3.6, hub.maxZ - 3, W)
  for (const s of [-1, 1]) b.box(wf.x + s * (wf.width / 2 + 0.9) - 0.3, wf.x + s * (wf.width / 2 + 0.9) + 0.3, 0, 0.5, hub.maxZ - 3.6, hub.maxZ, W)

  b.build(root)

  // --- The CLAP ZONE paint ---
  const bandLen = band.maxX - band.minX
  const bandW = band.maxZ - band.minZ
  const art = paintBand(bandLen, bandW)
  const tex = new CanvasTexture(art.canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  titleFontReady.then(() => {
    art.draw()
    tex.needsUpdate = true
  })
  const bandMesh = new Mesh(new PlaneGeometry(bandLen, bandW), new MeshStandardMaterial({ map: tex, roughness: 0.75 }))
  bandMesh.rotation.x = -Math.PI / 2
  bandMesh.position.set((band.minX + band.maxX) / 2, 0.004, (band.minZ + band.maxZ) / 2)
  bandMesh.receiveShadow = true
  root.add(bandMesh)

  // --- Water in the channels (one material, world UVs, scrolled north) ---
  const waterTex = toTexture(paintLaneWater(WATER.color, 128), { srgb: true })
  const water = new MeshStandardMaterial({ map: waterTex, color: '#ffffff', emissive: WATER.color, emissiveIntensity: 0.18, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.9 })
  const wb = new Batcher()
  for (const s of [-1, 1]) {
    const g = new PlaneGeometry(channel.outer - channel.inner + 0.4, beach.maxZ - beach.minZ).rotateX(-Math.PI / 2)
    g.translate(s * (channel.inner + channel.outer) / 2, channel.waterY, (beach.minZ + beach.maxZ) / 2)
    wb.add(worldUV(g, 6), water)
  }
  const pool = new PlaneGeometry(wf.width + 1.2, 3).rotateX(-Math.PI / 2)
  pool.translate(wf.x, 0.3, hub.maxZ - 1.8)
  wb.add(worldUV(pool, 6), water)
  wb.build(root, { cast: false, receive: true })

  // --- The waterfall: scrolling streaks down the south wall, a little HDR so it glows ---
  const fallTex = toTexture(paintWaterfall(256), { srgb: true })
  const fallH = hubWalls.south - LIP
  fallTex.repeat.set(wf.width / 7, fallH / 14)
  const fallMat = new MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.96, fog: false })
  fallMat.color.setScalar(1.25)
  const fall = new Mesh(new PlaneGeometry(wf.width, fallH), fallMat)
  fall.position.set(wf.x, fallH / 2, hub.maxZ - 0.12)
  fall.rotation.y = Math.PI
  root.add(fall)
  // A lip of water bulging over the top edge.
  const lip = new Mesh(new PlaneGeometry(wf.width, 1.6), fallMat)
  lip.position.set(wf.x, fallH + 0.15, hub.maxZ - 0.75)
  lip.rotation.set(-0.5, Math.PI, 0)
  root.add(lip)

  return {
    waterMaterial: water,
    // Where the falling water hits the pool (splash + mist emitters).
    splash: { x: wf.x, y: 0.4, z: hub.maxZ - 1.2, width: wf.width },
    update(dt, elapsed) {
      waterTex.offset.set(0, elapsed * 0.25)
      fallTex.offset.y = elapsed * 0.9
    },
  }
}
