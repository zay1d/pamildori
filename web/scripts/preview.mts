// Dev-only offscreen preview/QA harness.
// Renders the procedural pixel-art scene + robot to PNGs (no browser needed)
// so we can eyeball the renderer and catch exceptions across every
// time-of-day × weather × costume combination.
//   run: node --experimental-strip-types web/scripts/preview.mts
import { createCanvas } from '@napi-rs/canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import {
  drawScene,
  drawRobot,
  type TimeOfDay,
  type Weather,
  type RobotState,
  type Costume,
} from '../src/render/pixelArt.ts'

// the renderer caches static layers via document.createElement('canvas');
// shim it onto @napi-rs/canvas so the same code runs headless in Node.
;(globalThis as any).document = {
  createElement: (tag: string) => (tag === 'canvas' ? createCanvas(1, 1) : {}),
}

const OUT = process.env.OUT || '/tmp/preview'
mkdirSync(OUT, { recursive: true })

const SCALE = 4
// upscale a small source canvas with nearest-neighbour into ctx at (dx,dy)
function blit(ctx: any, src: any, dx: number, dy: number, scale = SCALE) {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src, 0, 0, src.width, src.height, dx, dy, src.width * scale, src.height * scale)
}

function sceneCanvas(theme: 'night' | 'day', timeofday: TimeOfDay, weather: Weather, t = 1.2) {
  const W = 208, H = 176
  const c = createCanvas(W, H)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  drawScene(ctx as unknown as CanvasRenderingContext2D, W, H, { theme, timeofday, weather, fireplace: true, drape: true, t })
  return c
}
function robotCanvas(theme: 'night' | 'day', state: RobotState, costumes: Costume[], mmss = '25:00', t = 1.2) {
  const W = 72, H = 96
  const c = createCanvas(W, H)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  drawRobot(ctx as unknown as CanvasRenderingContext2D, W, H, { theme, state, costumes, mmss, t })
  return c
}

// composite hero = scene with the robot standing in front, bottom-centre
function hero(name: string, theme: 'night' | 'day', timeofday: TimeOfDay, weather: Weather, state: RobotState, costumes: Costume[], mmss: string) {
  const sc = sceneCanvas(theme, timeofday, weather)
  const ro = robotCanvas(theme, state, costumes, mmss)
  const W = sc.width * SCALE, H = sc.height * SCALE
  const c = createCanvas(W, H)
  const ctx = c.getContext('2d')
  blit(ctx, sc, 0, 0)
  // robot centred, sitting near the bottom of the window sill
  const rw = ro.width * SCALE, rh = ro.height * SCALE
  blit(ctx, ro, Math.round((W - rw) / 2), H - rh - 8 * SCALE)
  writeFileSync(`${OUT}/${name}.png`, c.toBuffer('image/png'))
  console.log('wrote', name)
}

// a labelled strip of small tiles
function strip(name: string, tiles: any[], cols = tiles.length) {
  const tw = tiles[0].width * SCALE, th = tiles[0].height * SCALE, gap = 6
  const rows = Math.ceil(tiles.length / cols)
  const c = createCanvas(cols * tw + (cols + 1) * gap, rows * th + (rows + 1) * gap)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#100d16'
  ctx.fillRect(0, 0, c.width, c.height)
  tiles.forEach((t, i) => {
    const cx = i % cols, cy = (i / cols) | 0
    blit(ctx, t, gap + cx * (tw + gap), gap + cy * (th + gap))
  })
  writeFileSync(`${OUT}/${name}.png`, c.toBuffer('image/png'))
  console.log('wrote', name)
}

// ---- representative heroes ----
hero('hero-night-clear', 'night', 'night', 'clear', 'focus', ['nightcap'], '25:00')
hero('hero-day-clear', 'day', 'day', 'clear', 'idle', [], '18:42')
hero('hero-dusk-rain', 'night', 'dusk', 'rain', 'break', ['nightcap', 'headphones'], '04:30')
hero('hero-night-storm', 'night', 'night', 'storm', 'idle', ['nightcap'], '12:00')

// ---- coverage strips (also exercises every combo for exceptions) ----
const tods: TimeOfDay[] = ['night', 'twilight', 'dawn', 'day', 'dusk']
const wx: Weather[] = ['clear', 'cloudy', 'rain', 'storm']
strip('scenes-timeofday', tods.map((d) => sceneCanvas(d === 'day' ? 'day' : 'night', d, 'clear')))
strip('scenes-weather', wx.map((w) => sceneCanvas('day', 'day', w)))
const states: RobotState[] = ['idle', 'focus', 'break', 'complete', 'dozing']
strip('robot-states', states.map((s) => robotCanvas('night', s, [])))
strip('robot-costumes', [robotCanvas('night', 'idle', []), robotCanvas('night', 'idle', ['nightcap']), robotCanvas('night', 'break', ['headphones']), robotCanvas('night', 'idle', ['nightcap', 'headphones'])])

// exhaustive exception sweep (no output, just ensure no throws)
for (const d of tods) for (const w of wx) sceneCanvas(d === 'day' ? 'day' : 'night', d, w)
console.log('all combinations rendered without exceptions →', OUT)
