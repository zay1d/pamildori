// ============================================================
// pixelArt.ts — procedural pixel-art renderer (1:1 port of the
// design-ref `pixel-art.js`). Dithered skies · multi-tone stone ·
// warm/cool lighting · moonbeam · fire bloom · foreground depth ·
// vignette · dust. Static layers are cached to an offscreen canvas;
// only the living parts (stars, shooting stars, flames, rain, dust)
// redraw each frame.
//
//   drawScene(ctx, W, H, state)
//   drawRobot(ctx, W, H, state)
//
// Framework-free: plain functions + canvas only.
// ============================================================

export type TimeOfDay = 'night' | 'twilight' | 'dawn' | 'day' | 'dusk'
export type Weather = 'clear' | 'cloudy' | 'rain' | 'storm'
export type RobotState = 'idle' | 'focus' | 'break' | 'complete' | 'dozing'
export type Costume = 'nightcap' | 'headphones'

export interface SceneState {
  theme?: 'night' | 'day'
  timeofday?: TimeOfDay
  weather?: Weather
  fireplace?: boolean
  drape?: boolean
  t?: number
}

export interface RobotStateObj {
  theme?: 'night' | 'day'
  state?: RobotState
  costumes?: Costume[]
  mmss?: string
  t?: number
}

type Palette = Record<string, string | string[]>

// ---------------- palette ----------------
const PAL: Palette = {
  // cool grey-blue stone (5 tones + edge)
  stoneXD: '#171c28', stoneD: '#242c3c', stone: '#374052', stoneL: '#525d72', stoneHi: '#727f97', stoneEdge: '#929db4',
  moss: '#3a4a3a',
  // night sky, top -> horizon
  skyNight: ['#0e1430', '#141d3c', '#1b274c', '#243460', '#2f4470', '#43597e', '#6a7e84'],
  skyTwilight: ['#161634', '#272150', '#43355f', '#6a4763', '#965f5e', '#c08562', '#dcae7e'],
  skyDawn: ['#1f1c40', '#3a3160', '#6a4f6e', '#9c6a68', '#cf8c66', '#e7b074', '#f2cf94'],
  skyDay: ['#2f5d97', '#4574a8', '#6692bb', '#8fb1cc', '#b6cdda', '#d4e0df', '#e7ecdf'],
  skyDusk: ['#161433', '#332650', '#5d3358', '#90414b', '#c05f3c', '#dd8b4a', '#eab978'],
  starA: '#f4eecf', starB: '#cfd0b6', starC: '#8c97ac',
  shoot: '#fff6d8', shootB: '#ffd98a', shootC: '#caa45a',
  horizonGlow: '#6f8a86', land: '#1c3a38', landD: '#142a30',
  castle: '#0c1322', castleEdge: '#1a2536', castleLit: '#ffc24a',
  // crimson drape / bed
  redXD: '#27090f', redD: '#4d1119', red: '#7a1f25', redL: '#a32d2f', redHi: '#c8543f', redRim: '#e08a5a',
  // brass / gold
  brassXD: '#4a3614', brassD: '#7c5a22', brass: '#b78f38', brassL: '#dcb45e', brassHi: '#f6e3a0',
  // wood furniture
  woodXD: '#1f1409', woodD: '#3a2614', wood: '#54391f', woodL: '#75522c', woodHi: '#9a7440',
  // fire
  fire0: '#fff4b0', fire1: '#ffd24a', fire2: '#ff9a2a', fire3: '#ff5a1e', fire4: '#c0341a', ember: '#7a1e0c',
  // potion glows
  potT: '#56e6c4', potP: '#b27ce6', potG: '#9ae45e',
  // shelving woodwork (warmer than furniture wood, reads as panelled cabinetry)
  shelfXD: '#1a0f07', shelfD: '#2c1c10', shelf: '#43301c', shelfL: '#5e472a', shelfHi: '#825f38',
  // book spines (muted dark-academia: oxblood, forest, navy, tan, plum, teal, ochre) + gilt
  book: [
    '#7a2026', '#5a1418', '#2f4a32', '#1f3a2a', '#23365e', '#1a2848',
    '#8a6a34', '#6a4a22', '#5a3a52', '#3a2a48', '#2a5a58', '#6a3018',
  ],
  gilt: '#d8b45e', giltHi: '#f2dc9a',
  lampGlow: 'rgba(255,176,72,', shelfShade: '#0c0805',
  // robot
  rXD: '#241a10', rD: '#3a2a18', r: '#54401f', rL: '#74592c', rHi: '#9a7a44',
  rFrameD: '#7c5a22', rFrame: '#b78f38', rFrameL: '#e6c574',
  face: '#0a0d09', faceEdge: '#1b2316', eye: '#ffd45a', eyeHi: '#fff2c0', eyeGlow: 'rgba(255,190,80,',
  belly: '#0a0e08', amber: '#ffd45a', amberGlow: 'rgba(255,180,70,',
  knit: '#37563d', knitD: '#26402c', knitHi: '#4d7050',
  parch: '#e7d6ad',
}
const DAY: Palette = {
  stoneXD: '#5a4a30', stoneD: '#745e3a', stone: '#917442', stoneL: '#b0915a', stoneHi: '#cdb074', stoneEdge: '#e3cd92',
  moss: '#6a7444',
  redXD: '#3a1014', redD: '#6a1c1f', red: '#9a2f2a', redL: '#bd4a3c', redHi: '#d97a52', redRim: '#eaa86c',
  woodXD: '#3a2614', woodD: '#54391f', wood: '#75522c', woodL: '#9a7440', woodHi: '#bd9456',
  land: '#3a5a44', landD: '#2a4636', horizonGlow: '#a9c79a',
  // warmer, more lamplit cabinetry & spines for the day study
  shelfXD: '#2c1a0c', shelfD: '#43301c', shelf: '#5e472a', shelfL: '#825f38', shelfHi: '#a87f4c',
  book: [
    '#9a3030', '#7a2026', '#43603e', '#2f4a32', '#324a76', '#23365e',
    '#a8843e', '#8a6a34', '#6a4a62', '#4a3a58', '#3a6a66', '#8a4022',
  ],
  gilt: '#e6c87a', giltHi: '#fbeebb', shelfShade: '#160e06',
}

// Helpers for the heterogeneous palette object.
function S(C: Palette, k: string): string {
  return C[k] as string
}
function A(C: Palette, k: string): string[] {
  return C[k] as string[]
}

function pal(s: SceneState | RobotStateObj | undefined): Palette {
  return s && s.theme === 'day' ? Object.assign({}, PAL, DAY) : PAL
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]
function rnd(i: number): number {
  const x = Math.sin(i * 127.13 + 11.7) * 43758.5453
  return x - Math.floor(x)
}
const P = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string): void => {
  c.fillStyle = col
  c.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0))
}
// Knock 45° steps out of a rect's corners so a square panel reads as a soft,
// rounded chibi shell (corners cleared to transparent, drawn over the scene).
function clearCorners(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number): void {
  x = x | 0; y = y | 0; w = w | 0; h = h | 0
  for (let i = 0; i < rad; i++) {
    const len = rad - i
    c.clearRect(x, y + i, len, 1)
    c.clearRect(x + w - len, y + i, len, 1)
    c.clearRect(x, y + h - 1 - i, len, 1)
    c.clearRect(x + w - len, y + h - 1 - i, len, 1)
  }
}
// Filled pixel disk (used to grow smooth tapering tubes like the nightcap droop).
function fillBlob(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string): void {
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r)
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)))
    P(c, cx - w, cy + dy, 2 * w + 1, 1, col)
  }
}

// ---- 3x5 digit font ----
const DIG: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
  ':': ['0', '1', '0', '1', '0'],
}
export function textWidth(str: string, cell: number): number {
  let w = 0
  for (const ch of str) {
    const g = DIG[ch] || DIG['0']
    w += g[0].length * cell + cell
  }
  return w - cell
}
export function drawDigits(
  c: CanvasRenderingContext2D, x: number, y: number, str: string, cell: number, color: string,
): void {
  let cx = x
  for (const ch of str) {
    const g = DIG[ch] || DIG['0']
    for (let r = 0; r < g.length; r++)
      for (let k = 0; k < g[r].length; k++)
        if (g[r][k] === '1') {
          c.fillStyle = color
          c.fillRect(cx + k * cell, y + r * cell, cell, cell)
        }
    cx += g[0].length * cell + cell
  }
}

// dithered vertical gradient across a list of colors, clipped by caller
function ditherV(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, colors: string[]): void {
  const n = colors.length - 1, span = Math.max(1, y1 - y0)
  for (let y = y0; y < y1; y++) {
    const f = ((y - y0) / span) * n, i = Math.min(n - 1, Math.max(0, Math.floor(f))), frac = f - i
    for (let x = x0; x < x1; x++) {
      const th = BAYER[y & 3][x & 3] / 16
      c.fillStyle = frac > th ? colors[i + 1] : colors[i]
      c.fillRect(x, y, 1, 1)
    }
  }
}
// dithered solid wash (one color at given coverage) for soft glows/shadows
function ditherWash(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, cov: number): void {
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      if (BAYER[y & 3][x & 3] / 16 < cov) {
        c.fillStyle = color
        c.fillRect(x, y, 1, 1)
      }
    }
}

interface Geom {
  ox0: number; ox1: number; oyTop: number; oyBot: number
  ocx: number; orx: number; ory: number; apexY: number; horizon: number
}
function geom(W: number, H: number): Geom {
  const ox0 = Math.round(W * 0.275), ox1 = Math.round(W * 0.725)
  const oyTop = Math.round(H * 0.34), oyBot = Math.round(H * 0.7)
  const ocx = (ox0 + ox1) / 2, orx = (ox1 - ox0) / 2, ory = oyTop - Math.round(H * 0.11)
  const apexY = oyTop - ory, horizon = Math.round(H * 0.56)
  return { ox0, ox1, oyTop, oyBot, ocx, orx, ory, apexY, horizon }
}
function openingPath(c: CanvasRenderingContext2D, g: Geom): void {
  c.beginPath()
  c.moveTo(g.ox0, g.oyBot)
  c.lineTo(g.ox0, g.oyTop)
  c.ellipse(g.ocx, g.oyTop, g.orx, g.ory, 0, Math.PI, 2 * Math.PI, false)
  c.lineTo(g.ox1, g.oyBot)
  c.closePath()
}

// ---------------- STATIC LAYER (cached) ----------------
interface Cache {
  [sig: string]: HTMLCanvasElement | string[] | undefined
  _keys?: string[]
}
const _cache: Cache = {}

function buildStatic(W: number, H: number, state: SceneState): HTMLCanvasElement {
  const C = pal(state)
  const tod = state.timeofday || 'night', weather = state.weather || 'clear'
  const showFire = state.fireplace !== false, showDrape = state.drape !== false
  const off = document.createElement('canvas')
  off.width = W
  off.height = H
  const c = off.getContext('2d')!
  c.imageSmoothingEnabled = false
  const g = geom(W, H)
  const nightish = tod === 'night' || tod === 'twilight'

  // ----- back wall: textured stone bricks -----
  P(c, 0, 0, W, H, S(C, 'stoneXD'))
  const bh = Math.round(H * 0.052), bw = Math.round(W * 0.1)
  let row = 0
  for (let y = 0; y < H; y += bh) {
    const off2 = (row % 2) * Math.round(bw / 2)
    for (let x = -bw; x < W; x += bw) {
      const bx = x + off2, seed = bx * 13 + y * 7
      const tone = [S(C, 'stoneD'), S(C, 'stone'), S(C, 'stoneD'), S(C, 'stone'), S(C, 'stoneL')][Math.floor(rnd(seed) * 5)]
      P(c, bx + 1, y + 1, bw - 2, bh - 2, tone)
      // top sheen + bottom shade
      P(c, bx + 1, y + 1, bw - 2, 1, S(C, 'stoneL'))
      P(c, bx + 1, y + bh - 2, bw - 2, 1, S(C, 'stoneXD'))
      // occasional crack / moss
      if (rnd(seed + 3) > 0.86) P(c, bx + 3 + rnd(seed + 4) * (bw - 6), y + 2, 1, bh - 4, S(C, 'stoneXD'))
      if (rnd(seed + 9) > 0.92) P(c, bx + 2, y + bh - 3, 3, 2, S(C, 'moss'))
    }
    row++
  }
  // mortar grid darkening
  ditherWash(c, 0, 0, W, H, '#0a0c14', 0.06)

  // ----- flanking bookcases (dark-academia walls of colour-varied spines) -----
  const cwGuess = Math.max(5, Math.round((g.ox1 - g.ox0) / 10))
  const shelfTopY = Math.round(H * 0.06)
  const shelfBotY = g.oyBot + Math.round(H * 0.02)
  // left bookcase: from curtain edge to the left column
  const lShelfX0 = showDrape ? Math.round(W * 0.15) : Math.round(W * 0.02)
  drawBookcase(c, lShelfX0, shelfTopY, g.ox0 - cwGuess - 4, shelfBotY, C, 1, nightish)
  // right bookcase: from the right column to the fireplace (or wall edge)
  const rShelfX1 = showFire ? Math.round(W * 0.79) : Math.round(W * 0.98)
  drawBookcase(c, g.ox1 + cwGuess + 4, shelfTopY, rShelfX1, shelfBotY, C, 2, nightish)

  // ----- sky inside arched opening -----
  c.save()
  openingPath(c, g)
  c.clip()
  const bands = A(C, 'sky' + tod.charAt(0).toUpperCase() + tod.slice(1)) || A(C, 'skyNight')
  ditherV(c, g.ox0 - 3, g.apexY, g.ox1 + 3, g.oyBot, bands)
  // horizon glow band
  ditherWash(c, g.ox0 - 3, g.horizon - 6, g.ox1 + 3, g.horizon + 8, S(C, 'horizonGlow'), 0.4)
  // distant landscape + castle
  P(c, g.ox0 - 3, g.horizon + 2, g.ox1 - g.ox0 + 6, g.oyBot - g.horizon, S(C, 'landD'))
  P(c, g.ox0 - 3, g.horizon + 2, g.ox1 - g.ox0 + 6, 3, S(C, 'land'))
  drawCastleStatic(c, g.ocx + Math.round(W * 0.04), g.horizon + 3, C)
  // celestial body
  if (nightish) {
    const mx = g.ox1 - Math.round(W * 0.06), my = g.apexY + Math.round(H * 0.07), mr = Math.round(W * 0.028)
    for (let yy = -mr; yy <= mr; yy++)
      for (let xx = -mr; xx <= mr; xx++) {
        if (xx * xx + yy * yy <= mr * mr) {
          P(c, mx + xx, my + yy, 1, 1, xx * xx + yy * yy > (mr - 1) * (mr - 1) ? S(C, 'starB') : S(C, 'starA'))
        }
      }
    ditherWash(c, mx - mr - 3, my - mr - 3, mx + mr + 3, my + mr + 3, S(C, 'starA'), 0.12) // moon halo
    P(c, mx - mr + 2, my - mr, mr + 2, 2 * mr, bands[0]) // carve crescent
  } else {
    const sx = g.ox0 + Math.round(W * 0.07), sy = g.apexY + Math.round(H * 0.08), sr = Math.round(W * 0.032)
    const sun = tod === 'day' ? '#fff4cc' : '#ffcf86'
    for (let yy = -sr; yy <= sr; yy++)
      for (let xx = -sr; xx <= sr; xx++) {
        if (xx * xx + yy * yy <= sr * sr) P(c, sx + xx, sy + yy, 1, 1, sun)
      }
    ditherWash(c, sx - sr - 5, sy - sr - 5, sx + sr + 5, sy + sr + 5, sun, 0.16)
  }
  // weather darken baked in
  const dk = ({ clear: 0, cloudy: 0.14, rain: 0.3, storm: 0.46 } as Record<string, number>)[weather] || 0
  if (dk) ditherWash(c, g.ox0 - 3, g.apexY, g.ox1 + 3, g.oyBot, '#070a14', dk + 0.2)
  if (dk) P(c, g.ox0 - 3, g.apexY, g.ox1 - g.ox0 + 6, g.oyBot - g.apexY, 'rgba(7,10,20,' + dk * 0.5 + ')')
  c.restore()

  // ----- leaded / mullioned glazing (gothic tracery) -----
  // Drawn on its own clip so the bars hug the glass but the soft glass sheen
  // can be laid over the panes too. Many narrow panes like the references.
  drawGlazing(c, g, W, nightish)

  // ----- columns + arch frame (carved stone) -----
  drawColumns(c, g, C)

  // ----- moonbeam / cool light through glass onto foreground -----
  if (nightish) {
    // volumetric shaft slanting down from the upper window into the room
    c.save()
    c.beginPath()
    c.moveTo(g.ox0 + Math.round(W * 0.04), g.apexY + Math.round(H * 0.04))
    c.lineTo(g.ocx + Math.round(W * 0.06), g.apexY + Math.round(H * 0.04))
    c.lineTo(g.ox1 + Math.round(W * 0.04), H)
    c.lineTo(g.ox0 - Math.round(W * 0.14), H)
    c.closePath()
    c.clip()
    const beam = c.createLinearGradient(0, g.apexY, 0, H)
    beam.addColorStop(0, 'rgba(165,190,235,0.22)')
    beam.addColorStop(0.55, 'rgba(150,178,228,0.12)')
    beam.addColorStop(1, 'rgba(140,170,225,0.04)')
    c.fillStyle = beam
    c.fillRect(0, g.apexY, W, H - g.apexY)
    // dithered cool pool on the floor where the beam lands
    ditherWash(c, 0, g.oyBot, W, H, '#9fb6e0', 0.14)
    c.restore()
  }

  // ----- foreground: deep red draped sill / bed -----
  drawDrapedSill(c, g, C, W, H)

  // ----- left wall drape (curtain) -----
  if (showDrape) drawCurtain(c, 0, 0, Math.round(W * 0.16), g.oyBot + Math.round(H * 0.04), C, H)

  // ----- right wall: fireplace surround (static) + clutter -----
  if (showFire) drawHearthStatic(c, Math.round(W * 0.8), g.oyBot, W, H, C)
  drawClutter(c, g, C, W, H)

  // ----- warm fire glow wash on the right (static) -----
  if (showFire) {
    const fx = Math.round(W * 0.88), fy = g.oyBot - Math.round(H * 0.06)
    const grad = c.createRadialGradient(fx, fy, 4, fx, fy, Math.round(W * 0.42))
    grad.addColorStop(0, 'rgba(255,150,55,0.30)')
    grad.addColorStop(1, 'rgba(255,150,55,0)')
    c.fillStyle = grad
    c.fillRect(0, 0, W, H)
  }

  // ----- global warm/cool grade + vignette -----
  // cool top-left
  const gg = c.createLinearGradient(0, 0, W * 0.7, H * 0.7)
  gg.addColorStop(0, 'rgba(60,90,150,0.10)')
  gg.addColorStop(1, 'rgba(60,90,150,0)')
  c.fillStyle = gg
  c.fillRect(0, 0, W, H)
  // vignette
  const vg = c.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.85)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.55)')
  c.fillStyle = vg
  c.fillRect(0, 0, W, H)

  return off
}

// A panelled bookcase filling [x0,x1] x [y0,y1] with rows of colour-varied
// spines, gilt bands, little leaning books and a warm reading-lamp glow.
function drawBookcase(
  c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number,
  C: Palette, seed0: number, nightish: boolean,
): void {
  const w = x1 - x0, h = y1 - y0
  if (w < 8 || h < 8) return
  const spines = A(C, 'book')
  // carcass: dark cabinet back + side panels
  P(c, x0, y0, w, h, S(C, 'shelfD'))
  P(c, x0, y0, 3, h, S(C, 'shelfL')) // left stile (lit)
  P(c, x1 - 3, y0, 3, h, S(C, 'shelfXD')) // right stile (shade)
  P(c, x0, y0, w, 3, S(C, 'shelfL')) // top rail
  P(c, x0, y1 - 3, w, 3, S(C, 'shelfXD')) // base rail

  const rows = Math.max(3, Math.round(h / Math.max(14, h / 6)))
  const rh = Math.floor((h - 6) / rows)
  const ix0 = x0 + 4, ix1 = x1 - 4
  for (let r = 0; r < rows; r++) {
    const ry = y0 + 3 + r * rh
    const shelfTop = ry + rh - 3
    // recessed shelf interior shadow
    P(c, ix0, ry, ix1 - ix0, rh - 3, S(C, 'shelfShade'))
    // books standing along the row
    let bx = ix0 + 1
    let i = seed0 * 31 + r * 17
    while (bx < ix1 - 2) {
      i++
      const r1 = rnd(i), r2 = rnd(i + 7), r3 = rnd(i + 13)
      const bw = 2 + Math.floor(r1 * 3) // 2..4 px wide spine
      if (bx + bw > ix1 - 1) break
      const bookH = Math.round((rh - 4) * (0.7 + r2 * 0.28))
      const by = shelfTop - bookH
      const col = spines[Math.floor(r3 * spines.length) % spines.length]
      // gap / lean: occasionally tip a book or leave a slot
      if (r2 > 0.93) { bx += bw + 1; continue }
      P(c, bx, by, bw, bookH, col)
      // spine highlight (left) + shade (right)
      P(c, bx, by, 1, bookH, 'rgba(255,255,255,0.14)')
      P(c, bx + bw - 1, by, 1, bookH, 'rgba(0,0,0,0.32)')
      // gilt title band on taller spines
      if (bw >= 3 && rnd(i + 21) > 0.55) {
        P(c, bx, by + Math.round(bookH * 0.3), bw, 1, S(C, 'gilt'))
        if (rnd(i + 29) > 0.6) P(c, bx, by + Math.round(bookH * 0.6), bw, 1, S(C, 'gilt'))
      }
      // top cap highlight
      P(c, bx, by, bw, 1, 'rgba(255,236,200,0.16)')
      bx += bw + 1
    }
    // a couple of small horizontally-stacked books / leaning volume per shelf
    if (rnd(i + 41) > 0.4) {
      const sw = 5 + Math.floor(rnd(i + 43) * 4)
      const sx = ix1 - sw - 1
      const col = spines[Math.floor(rnd(i + 47) * spines.length) % spines.length]
      P(c, sx, shelfTop - 3, sw, 3, col)
      P(c, sx, shelfTop - 5, sw - 1, 2, spines[Math.floor(rnd(i + 51) * spines.length) % spines.length])
      P(c, sx, shelfTop - 3, sw, 1, S(C, 'gilt'))
    }
    // shelf board with front lip (depth)
    P(c, ix0 - 1, shelfTop, ix1 - ix0 + 2, 2, S(C, 'shelf'))
    P(c, ix0 - 1, shelfTop, ix1 - ix0 + 2, 1, S(C, 'shelfHi'))
    P(c, ix0 - 1, shelfTop + 2, ix1 - ix0 + 2, 1, S(C, 'shelfXD'))
  }
  // a small brass reading lamp glow on one shelf (warm pool) — adds cosiness
  const lampRow = 1 + (seed0 & 1)
  const ly = y0 + 3 + lampRow * rh + Math.round(rh * 0.5)
  const lx = seed0 % 2 ? x1 - Math.round(w * 0.3) : x0 + Math.round(w * 0.3)
  // little lamp base
  P(c, lx - 1, ly - 2, 4, 4, S(C, 'brassD'))
  P(c, lx, ly - 4, 2, 3, S(C, 'brass'))
  const lampA = nightish ? 0.5 : 0.4
  const lg = c.createRadialGradient(lx + 1, ly - 2, 1, lx + 1, ly - 2, Math.round(w * 0.7))
  lg.addColorStop(0, S(C, 'lampGlow') + lampA + ')')
  lg.addColorStop(1, S(C, 'lampGlow') + '0)')
  c.fillStyle = lg
  c.fillRect(x0 - 6, y0 - 6, w + 12, h + 12)
}

function drawCastleStatic(c: CanvasRenderingContext2D, cx: number, baseY: number, C: Palette): void {
  const tw = (x: number, w: number, h: number): void => {
    P(c, x, baseY - h, w, h, S(C, 'castle'))
    P(c, x, baseY - h, 1, h, S(C, 'castleEdge'))
    for (let i = 0; i < w; i += 3) P(c, x + i, baseY - h - 2, 2, 2, S(C, 'castle'))
  }
  tw(cx - 18, 5, 12)
  tw(cx - 11, 8, 20)
  P(c, cx - 9, baseY - 28, 4, 8, S(C, 'castle'))
  P(c, cx - 9, baseY - 26, 2, 2, S(C, 'castleLit'))
  tw(cx - 1, 11, 30)
  P(c, cx + 1, baseY - 34, 3, 5, S(C, 'castle')) // spire
  P(c, cx + 2, baseY - 20, 2, 2, S(C, 'castleLit'))
  P(c, cx + 5, baseY - 14, 2, 2, S(C, 'castleLit'))
  tw(cx + 11, 6, 16)
  P(c, cx + 13, baseY - 12, 2, 2, S(C, 'castleLit'))
  P(c, cx - 14, baseY - 6, 30, 6, S(C, 'castle'))
}

// Leaded glazing: a lattice of came bars dividing the arched opening into many
// narrow panes, plus a diagonal glass sheen and a hint of arched tracery near
// the apex. Each bar is a dark lead came with a thin lit edge so it reads 3D.
function drawGlazing(c: CanvasRenderingContext2D, g: Geom, W: number, nightish: boolean): void {
  c.save()
  openingPath(c, g)
  c.clip()
  const came = 'rgba(8,10,18,0.88)', cameHi = 'rgba(150,168,205,0.30)'
  const innerH = g.oyBot - g.oyTop
  // vertical bars — 5 lights across (4 interior mullions)
  const lights = 5
  for (let i = 1; i < lights; i++) {
    const gx = Math.round(g.ox0 + ((g.ox1 - g.ox0) * i) / lights)
    P(c, gx - 1, g.apexY - 2, 2, g.oyBot - g.apexY + 2, came)
    P(c, gx - 1, g.apexY - 2, 1, g.oyBot - g.apexY + 2, cameHi)
  }
  // horizontal transoms — evenly spaced rows down the window
  const rows = 7
  for (let r = 1; r < rows; r++) {
    const gy = Math.round(g.oyTop + (innerH * r) / rows)
    P(c, g.ox0 - 2, gy - 1, g.ox1 - g.ox0 + 4, 2, came)
    P(c, g.ox0 - 2, gy - 1, g.ox1 - g.ox0 + 4, 1, cameHi)
  }
  // outer frame came hugging the stone reveal
  P(c, g.ox0, g.oyTop - 2, 2, innerH + 2, came)
  P(c, g.ox1 - 2, g.oyTop - 2, 2, innerH + 2, came)
  P(c, g.ox0, g.oyBot - 2, g.ox1 - g.ox0, 2, came)
  // arched tracery: ribs following the curve, meeting at a small rose
  for (let k = -1; k <= 1; k++) {
    for (let a = Math.PI; a <= 2 * Math.PI + 0.01; a += 0.05) {
      const rr = g.ory - 3 - k * Math.round(g.ory * 0.34)
      const rx = g.orx - 3 - k * Math.round(g.orx * 0.18)
      if (rr <= 1 || rx <= 1) continue
      const x = g.ocx + Math.cos(a) * rx, y = g.oyTop + Math.sin(a) * rr
      P(c, x, y, 2, 2, came)
      P(c, x, y, 1, 1, cameHi)
    }
  }
  // little rose/quatrefoil at the apex
  const ax = g.ocx, ay = g.apexY + Math.round(g.ory * 0.42)
  for (let yy = -3; yy <= 3; yy++)
    for (let xx = -3; xx <= 3; xx++)
      if (xx * xx + yy * yy <= 9 && xx * xx + yy * yy >= 4) P(c, ax + xx, ay + yy, 1, 1, came)
  P(c, ax - 1, ay - 1, 2, 2, cameHi)
  // diagonal glass sheen — two soft parallel bands of cool reflection
  for (let b = 0; b < 2; b++) {
    const ox = b * Math.round(W * 0.07)
    for (let y = g.apexY; y < g.oyBot; y += 1) {
      const x = Math.round(g.ox0 + (y - g.apexY) * 0.55) + Math.round(W * 0.02) + ox
      if (x > g.ox0 && x < g.ox1 && (y & 1) === 0) {
        P(c, x, y, 2, 1, nightish ? 'rgba(150,175,220,0.10)' : 'rgba(225,238,250,0.14)')
      }
    }
  }
  c.restore()
}

function drawColumns(c: CanvasRenderingContext2D, g: Geom, C: Palette): void {
  const cw = Math.max(6, Math.round((g.ox1 - g.ox0) / 9))
  ;[g.ox0 - cw, g.ox1].forEach((x, side) => {
    // shaft built from coursed ashlar blocks (banded), not flat fluting
    const blkH = 7
    for (let y = g.oyTop - 2; y < g.oyBot + 4; y += blkH) {
      const seed = (x * 7 + y * 13) | 0
      const tone = [S(C, 'stoneD'), S(C, 'stone'), S(C, 'stone'), S(C, 'stoneL')][Math.floor(rnd(seed) * 4)]
      P(c, x, y, cw, blkH - 1, tone)
      P(c, x, y, cw, 1, S(C, 'stoneL')) // course top sheen
      P(c, x, y + blkH - 2, cw, 1, S(C, 'stoneXD')) // course shade
      if (rnd(seed + 5) > 0.8) P(c, x + 2, y + 2, 1, blkH - 4, S(C, 'stoneXD')) // hairline crack
    }
    P(c, x, g.oyTop - 2, 2, g.oyBot - g.oyTop + 6, S(C, 'stoneL')) // lit edge
    P(c, x + cw - 2, g.oyTop - 2, 2, g.oyBot - g.oyTop + 6, S(C, 'stoneXD')) // shade edge
    P(c, x + (side ? 0 : cw - 2), g.oyTop - 2, 2, g.oyBot - g.oyTop + 6, S(C, 'stoneHi')) // inner highlight toward glass
    // moulded capital (two steps)
    P(c, x - 3, g.oyTop - 8, cw + 6, 8, S(C, 'stoneL'))
    P(c, x - 3, g.oyTop - 8, cw + 6, 2, S(C, 'stoneHi'))
    P(c, x - 1, g.oyTop - 4, cw + 2, 2, S(C, 'stone'))
    P(c, x - 3, g.oyTop - 1, cw + 6, 1, S(C, 'stoneXD'))
    // moulded base (two steps)
    P(c, x - 2, g.oyBot, cw + 4, 4, S(C, 'stoneL'))
    P(c, x - 4, g.oyBot + 3, cw + 8, 4, S(C, 'stone'))
    P(c, x - 4, g.oyBot + 3, cw + 8, 1, S(C, 'stoneHi'))
    P(c, x - 4, g.oyBot + 6, cw + 8, 2, S(C, 'stoneXD'))
  })
  // voussoir arch — wedge blocks radiating, alternating tone, with joint lines
  let vi = 0
  for (let a = Math.PI; a <= 2 * Math.PI + 0.01; a += 0.07) {
    const cosA = Math.cos(a), sinA = Math.sin(a)
    // inner & outer radius of the wedge ring (kept tight so it reads as a band)
    const r0x = g.orx + 1, r0y = g.ory + 1, r1x = g.orx + 6, r1y = g.ory + 6
    const tone = vi % 2 ? S(C, 'stone') : S(C, 'stoneL')
    for (let s = 0; s <= 1.001; s += 0.2) {
      const rx = r0x + (r1x - r0x) * s, ry = r0y + (r1y - r0y) * s
      const x = g.ocx + cosA * rx, y = g.oyTop + sinA * ry
      P(c, x - 1, y - 1, 2, 2, tone)
      // light the upper-left of each wedge, shade the lower-right
      if (cosA < -0.2 && s < 0.6) P(c, x - 1, y - 1, 1, 1, S(C, 'stoneHi'))
      else if (cosA > 0.2 && s > 0.6) P(c, x, y, 1, 1, S(C, 'stoneXD'))
    }
    // dark joint line at the inner edge between wedges
    if (vi % 2) P(c, g.ocx + cosA * r0x, g.oyTop + sinA * r0y, 1, 2, S(C, 'stoneXD'))
    vi++
  }
  // chunky carved keystone at the apex
  P(c, g.ocx - 5, g.apexY - 11, 10, 13, S(C, 'stone'))
  P(c, g.ocx - 5, g.apexY - 11, 10, 2, S(C, 'stoneHi'))
  P(c, g.ocx - 4, g.apexY - 9, 8, 9, S(C, 'stoneL'))
  P(c, g.ocx - 2, g.apexY - 6, 4, 6, S(C, 'stoneEdge'))
  P(c, g.ocx + 3, g.apexY - 11, 2, 13, S(C, 'stoneXD')) // right shade
}

function drawCurtain(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, C: Palette, H: number): void {
  P(c, x, y, w, h, S(C, 'red'))
  const folds = 4, fw = w / folds
  for (let i = 0; i < folds; i++) {
    P(c, x + i * fw, y, 2, h, S(C, 'redXD'))
    P(c, x + i * fw + 2, y, Math.max(1, fw * 0.4), h, S(C, 'redD'))
    P(c, x + i * fw + fw - 3, y, 2, h, S(C, 'redHi'))
  }
  // valance scallops
  for (let i = 0; i < folds + 1; i++) {
    const sx = x + i * fw - fw / 2
    P(c, sx + 2, y + Math.round(H * 0.05), fw - 4, 4, S(C, 'redD'))
    P(c, sx + fw / 2 - 1, y + Math.round(H * 0.05) + 4, 2, 4, S(C, 'redXD'))
  }
  // brass rod + tieback
  P(c, x, y + 2, w, 3, S(C, 'brass'))
  P(c, x, y + 2, w, 1, S(C, 'brassHi'))
  P(c, x + w - 4, y + h * 0.46, 8, 5, S(C, 'brass'))
  P(c, x + w - 4, y + h * 0.46, 8, 2, S(C, 'brassHi'))
}

function drawDrapedSill(c: CanvasRenderingContext2D, g: Geom, C: Palette, W: number, H: number): void {
  const y0 = g.oyBot + Math.round(H * 0.02)
  P(c, 0, y0, W, H - y0, S(C, 'redD'))
  // folds via vertical bands of tone
  for (let x = 0; x < W; x += Math.round(W * 0.06)) {
    const s = rnd(x)
    P(c, x, y0, Math.round(W * 0.03), H - y0, s > 0.5 ? S(C, 'red') : S(C, 'redXD'))
    P(c, x + Math.round(W * 0.03), y0, 2, H - y0, S(C, 'redHi'))
  }
  // crest of the bed near the window (rolled edge)
  P(c, g.ox0 - Math.round(W * 0.06), y0 - 3, g.ox1 - g.ox0 + Math.round(W * 0.12), 6, S(C, 'redL'))
  P(c, g.ox0 - Math.round(W * 0.06), y0 - 3, g.ox1 - g.ox0 + Math.round(W * 0.12), 2, S(C, 'redRim'))
  ditherWash(c, 0, y0, W, H, '#1a0608', 0.18)

  // carved stone window sill with depth, sitting on the reveal under the glass
  const sx0 = g.ox0 - Math.round(W * 0.04), sx1 = g.ox1 + Math.round(W * 0.04)
  const syTop = g.oyBot - 2, slab = Math.max(5, Math.round(H * 0.035))
  P(c, sx0, syTop, sx1 - sx0, slab, S(C, 'stone')) // slab face
  P(c, sx0, syTop, sx1 - sx0, 2, S(C, 'stoneHi')) // lit top nosing
  P(c, sx0, syTop + 2, sx1 - sx0, 1, S(C, 'stoneL'))
  P(c, sx0, syTop + slab - 2, sx1 - sx0, 2, S(C, 'stoneXD')) // underside shadow
  // little overhang corbels at the ends
  P(c, sx0 - 2, syTop + 1, 3, slab - 1, S(C, 'stoneD'))
  P(c, sx1 - 1, syTop + 1, 3, slab - 1, S(C, 'stoneD'))
}

function drawHearthStatic(c: CanvasRenderingContext2D, x: number, baseY: number, W: number, H: number, C: Palette): void {
  const top = baseY - Math.round(H * 0.3)
  // surround
  P(c, x - 4, top, W - x + 4, baseY - top + 8, S(C, 'stone'))
  P(c, x - 4, top, W - x + 4, 3, S(C, 'stoneL'))
  for (let y = top; y < baseY; y += Math.round(H * 0.05)) P(c, x - 4, y, W - x + 4, 1, S(C, 'stoneXD'))
  // arched firebox opening
  const bx = x + 4, bw = W - x - 8, by = top + Math.round(H * 0.06), bh = baseY - by
  P(c, bx, by, bw, bh, '#0a0805')
  for (let i = 0; i < bw; i += 3) P(c, bx + i, by - 2, 2, 2, S(C, 'stoneL')) // arch lip
  // logs
  P(c, bx + 1, baseY - 7, bw - 2, 5, S(C, 'woodD'))
  P(c, bx + 3, baseY - 10, bw - 8, 4, S(C, 'wood'))
  P(c, bx + 5, baseY - 12, bw - 14, 3, S(C, 'woodL'))
  // mantel clock
  P(c, x + (W - x) / 2 - 5, top - 9, 10, 9, S(C, 'brassD'))
  P(c, x + (W - x) / 2 - 5, top - 9, 10, 2, S(C, 'brassHi'))
  P(c, x + (W - x) / 2 - 3, top - 7, 6, 5, '#15110a')
  P(c, x + (W - x) / 2, top - 5, 1, 2, S(C, 'brassL'))
}

function drawClutter(c: CanvasRenderingContext2D, g: Geom, C: Palette, W: number, H: number): void {
  const sy = g.oyBot + Math.round(H * 0.015)
  // ----- left: stacked books with a brass candelabra (warm reading nook) -----
  const bxx = g.ox0 - Math.round(W * 0.1), byy = sy
  // a slightly tilted stack of colour-varied volumes
  const spines = A(C, 'book')
  for (let i = 0; i < 4; i++) {
    const w = Math.round(W * 0.085) - i * 2, hh = Math.round(H * 0.022)
    const col = spines[(i * 5 + 2) % spines.length]
    const jx = i % 2 ? 1 : 0 // alternating overhang for a hand-stacked look
    P(c, bxx + i + jx, byy - (i + 1) * hh, w, hh, col)
    P(c, bxx + i + jx, byy - (i + 1) * hh, w, 1, 'rgba(255,236,200,0.20)') // top cap
    P(c, bxx + i + jx + w - 2, byy - (i + 1) * hh, 2, hh, S(C, 'parch')) // page block edge
    P(c, bxx + i + jx, byy - (i + 1) * hh + Math.round(hh / 2), 1, 1, S(C, 'gilt')) // spine band
  }
  // open book lying on top (parchment pages, a dark-academia touch)
  const obx = bxx + 1, oby = byy - 5 * Math.round(H * 0.022)
  P(c, obx, oby, Math.round(W * 0.09), 4, S(C, 'woodD'))
  P(c, obx + 1, oby - 1, Math.round(W * 0.04), 4, S(C, 'parch'))
  P(c, obx + 2 + Math.round(W * 0.04), oby - 1, Math.round(W * 0.04), 4, S(C, 'parch'))
  P(c, obx + 1 + Math.round(W * 0.04), oby - 1, 1, 4, S(C, 'woodXD')) // spine gutter
  // brass candelabra: footed stem + drip cup, candle on top
  const cax = bxx + Math.round(W * 0.03)
  const stemBot = oby - 1
  P(c, cax - 1, stemBot - 1, 6, 2, S(C, 'brassD')) // foot
  P(c, cax + 1, stemBot - Math.round(H * 0.03), 2, Math.round(H * 0.03), S(C, 'brass')) // stem
  P(c, cax + 1, stemBot - Math.round(H * 0.03), 1, Math.round(H * 0.03), S(C, 'brassHi'))
  P(c, cax - 1, stemBot - Math.round(H * 0.03), 6, 2, S(C, 'brassL')) // drip cup
  const candTop = stemBot - Math.round(H * 0.03) - Math.round(H * 0.05)
  P(c, cax, candTop, 4, Math.round(H * 0.05), S(C, 'parch')) // candle
  P(c, cax, candTop, 1, Math.round(H * 0.05), '#fff7e0')
  P(c, cax + 3, candTop, 1, Math.round(H * 0.05), S(C, 'woodD'))
  P(c, cax + 1, candTop, 2, 1, '#fffbe8') // melted top
  // ----- right: alchemist clutter (potion + inkwell + quill + small stack) -----
  const px = g.ox1 + Math.round(W * 0.05)
  // potion bottle with rounded shoulder + liquid + highlight
  P(c, px, sy - Math.round(H * 0.07), 7, Math.round(H * 0.065), 'rgba(40,60,55,0.55)')
  P(c, px + 1, sy - Math.round(H * 0.05), 5, Math.round(H * 0.04), S(C, 'potT'))
  P(c, px + 1, sy - Math.round(H * 0.05), 5, 1, '#dffaf0') // liquid meniscus
  P(c, px + 2, sy - Math.round(H * 0.03), 2, Math.round(H * 0.02), '#bff7e8')
  P(c, px + 1, sy - Math.round(H * 0.065), 1, Math.round(H * 0.05), 'rgba(220,255,245,0.4)') // glass glint
  P(c, px + 2, sy - Math.round(H * 0.085), 3, 3, S(C, 'woodD')) // cork
  ditherWash(c, px - 3, sy - Math.round(H * 0.09), px + 10, sy, S(C, 'potT'), 0.12) // glow
  // a small leaning book beside it
  P(c, px + 8, sy - Math.round(H * 0.05), 3, Math.round(H * 0.05), spines[1 % spines.length])
  P(c, px + 8, sy - Math.round(H * 0.05), 1, Math.round(H * 0.05), 'rgba(255,236,200,0.2)')
  // inkwell + quill (leaning)
  P(c, px + Math.round(W * 0.04), sy - 6, 5, 6, '#10100c')
  P(c, px + Math.round(W * 0.04), sy - 6, 5, 1, S(C, 'brassD')) // brass rim
  P(c, px + Math.round(W * 0.045), sy - 18, 1, 13, S(C, 'parch')) // quill shaft
  P(c, px + Math.round(W * 0.045) - 2, sy - 20, 4, 4, '#d8c9a0') // feather
  P(c, px + Math.round(W * 0.045) - 2, sy - 18, 3, 1, '#b8a878') // feather barb
}

// ---------------- DYNAMIC + COMPOSITE ----------------
export function drawScene(ctx: CanvasRenderingContext2D, W: number, H: number, state?: SceneState): void {
  state = state || {}
  const C = pal(state), t = state.t || 0
  const tod = state.timeofday || 'night', weather = state.weather || 'clear'
  const sig = [W, H, state.theme || 'night', tod, weather, state.fireplace !== false, state.drape !== false].join('|')
  if (!_cache[sig]) {
    _cache[sig] = buildStatic(W, H, state)
    _cache._keys = _cache._keys || []
    _cache._keys.push(sig)
    if (_cache._keys.length > 14) {
      const k = _cache._keys.shift()!
      delete _cache[k]
    }
  }
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, W, H)
  ctx.drawImage(_cache[sig] as HTMLCanvasElement, 0, 0)

  const g = geom(W, H)
  const nightish = tod === 'night' || tod === 'twilight'

  ctx.save()
  openingPath(ctx, g)
  ctx.clip()
  // stars (twinkle)
  if (nightish) {
    for (let i = 0; i < 58; i++) {
      const sx = g.ox0 + 3 + rnd(i) * (g.ox1 - g.ox0 - 6)
      const sy = g.apexY + 3 + rnd(i + 99) * (g.horizon - g.apexY - 4)
      const tw = Math.sin(t * 1.8 + i * 1.3)
      if (tw > -0.1) {
        const b = rnd(i + 5)
        P(ctx, sx, sy, b > 0.9 ? 2 : 1, b > 0.9 ? 2 : 1, tw > 0.6 ? S(C, 'starA') : b > 0.5 ? S(C, 'starB') : S(C, 'starC'))
      }
    }
    // shooting stars with glowing trail
    for (let s = 0; s < 3; s++) {
      const period = 6.5, ph = ((t + s * 2.4) % period) / period
      if (ph < 0.32) {
        const k = ph / 0.32
        const px = g.ox0 + 6 + k * (g.ox1 - g.ox0) * 1.3, py = g.apexY + 8 + k * (g.horizon - g.apexY) * 0.75
        for (let q = 0; q < 10; q++) {
          const a = 1 - q / 10
          const col = q < 2 ? S(C, 'shoot') : q < 5 ? S(C, 'shootB') : S(C, 'shootC')
          P(ctx, px - q * 2.4, py - q * 1.3, a > 0.4 ? 2 : 1, a > 0.4 ? 2 : 1, col)
        }
      }
    }
  }
  // drifting clouds with volume (body + shaded base + lit crown)
  if (weather !== 'clear') {
    const dark = weather === 'storm'
    const colD = dark ? '#1a1a24' : 'rgba(98,100,116,0.7)'
    const col = dark ? '#26262f' : 'rgba(126,128,144,0.72)'
    const colL = dark ? '#3a3a46' : 'rgba(162,164,180,0.75)'
    const span = g.ox1 - g.ox0 + 70
    const puffs = weather === 'cloudy' ? 4 : 3
    for (let i = 0; i < puffs; i++) {
      const drift = ((t * 4 + i * 55) % span) - 35
      const cx = g.ox0 + drift, cy = g.apexY + 6 + (i % 2) * Math.round(H * 0.05)
      // rounded billow built from stacked lozenges
      P(ctx, cx, cy + 2, 30, 6, col)
      P(ctx, cx + 5, cy - 2, 20, 7, col)
      P(ctx, cx + 12, cy - 5, 12, 6, col)
      P(ctx, cx + 2, cy + 6, 26, 2, colD) // shaded underside
      P(ctx, cx + 6, cy - 4, 14, 2, colL) // lit crown
      P(ctx, cx + 13, cy - 6, 8, 1, colL)
    }
  }
  // rain — two layers: faint distant drizzle + brighter near streaks
  if (weather === 'rain' || weather === 'storm') {
    const heavy = weather === 'storm'
    const far = heavy ? 40 : 30, near = heavy ? 34 : 24
    for (let i = 0; i < far; i++) {
      const baseX = g.ox0 + rnd(i) * (g.ox1 - g.ox0)
      const sp = 90 + rnd(i + 5) * 60
      const y = g.apexY + ((t * sp + rnd(i + 9) * 260) % (g.oyBot - g.apexY))
      P(ctx, baseX + (y - g.apexY) * 0.14, y, 1, 4, 'rgba(190,206,232,0.32)')
    }
    for (let i = 0; i < near; i++) {
      const baseX = g.ox0 + rnd(i + 200) * (g.ox1 - g.ox0)
      const sp = 130 + rnd(i + 205) * 70
      const y = g.apexY + ((t * sp + rnd(i + 209) * 300) % (g.oyBot - g.apexY))
      P(ctx, baseX + (y - g.apexY) * 0.18, y, 1, heavy ? 7 : 6, 'rgba(214,226,245,0.55)')
    }
  }
  ctx.restore()

  // rain splashes ticking on the stone sill (outside the glass clip)
  if (weather === 'rain' || weather === 'storm') {
    const sillY = g.oyBot - 1
    for (let i = 0; i < (weather === 'storm' ? 10 : 7); i++) {
      const ph = (t * 1.6 + rnd(i + 30) * 3) % 1
      if (ph < 0.45) {
        const splx = g.ox0 + 4 + rnd(i + 31) * (g.ox1 - g.ox0 - 8)
        const r = Math.round(ph * 5)
        P(ctx, splx - r, sillY, 1, 1, 'rgba(214,226,245,0.5)')
        P(ctx, splx + r, sillY, 1, 1, 'rgba(214,226,245,0.5)')
        if (ph < 0.2) P(ctx, splx, sillY - 1, 1, 1, 'rgba(230,238,250,0.6)')
      }
    }
  }

  // storm lightning — periodic flash illuminating the whole scene
  if (weather === 'storm') {
    const f = t % 6
    let flash = 0
    if (f > 5.4 && f < 5.52) flash = 0.5 // main strike
    else if (f > 5.56 && f < 5.62) flash = 0.32 // afterflash
    if (flash > 0) {
      ctx.fillStyle = 'rgba(228,234,255,' + flash + ')'
      ctx.fillRect(0, 0, W, H)
      // jagged bolt inside the window
      ctx.save()
      openingPath(ctx, g)
      ctx.clip()
      let lx = g.ocx + Math.round((rnd(Math.floor(t * 10)) - 0.5) * (g.ox1 - g.ox0) * 0.4)
      let ly = g.apexY
      for (let s = 0; s < 9; s++) {
        const nx = lx + Math.round((rnd(s + Math.floor(t * 10)) - 0.5) * 9)
        const ny = ly + Math.round((g.horizon - g.apexY) / 9)
        // thin diagonal segment: step the bolt one px at a time so it stays narrow
        const steps = Math.max(Math.abs(nx - lx), ny - ly)
        for (let k = 0; k <= steps; k++) {
          const px = lx + Math.round(((nx - lx) * k) / steps)
          const py = ly + Math.round(((ny - ly) * k) / steps)
          P(ctx, px, py, 2, 2, '#f4f6ff')
        }
        lx = nx
        ly = ny
      }
      ctx.restore()
    }
  }

  // fireplace flames (dynamic) + flicker glow
  if (state.fireplace !== false) {
    const fx = Math.round(W * 0.8), baseY = g.oyBot
    const bx = fx + 8, bw = W - fx - 16
    const cols = [S(C, 'fire4'), S(C, 'fire3'), S(C, 'fire2'), S(C, 'fire1'), S(C, 'fire0')]
    for (let i = 0; i < bw; i += 2) {
      const wob = Math.sin(t * 6 + i * 0.7) * 2
      const hgt = Math.round(H * 0.06) + Math.abs(Math.sin(t * 5 + i * 1.3)) * Math.round(H * 0.1)
      for (let l = 0; l < 5; l++) {
        const lh = hgt * (1 - l * 0.18)
        P(ctx, bx + i + wob * (l / 5), baseY - 7 - lh, 2, lh, cols[l])
      }
    }
    // embers
    for (let e = 0; e < 6; e++) {
      const ey = baseY - 7 - ((t * 20 + e * 30) % Math.round(H * 0.18))
      P(ctx, bx + 4 + rnd(e) * bw * 0.8, ey, 1, 1, S(C, 'fire1'))
    }
    // flicker bloom
    const fl = 0.22 + Math.abs(Math.sin(t * 7)) * 0.1
    const gr = ctx.createRadialGradient(fx + bw / 2, baseY - 10, 3, fx + bw / 2, baseY - 10, Math.round(W * 0.4))
    gr.addColorStop(0, 'rgba(255,150,55,' + fl + ')')
    gr.addColorStop(1, 'rgba(255,150,55,0)')
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, W, H)
  }

  // candle flame + halo (left candelabra) — teardrop flame with hot core
  {
    const cax = g.ox0 - Math.round(W * 0.07)
    const cay = g.oyBot + Math.round(H * 0.015) - Math.round(H * 0.03) - Math.round(H * 0.05)
    const fl = Math.sin(t * 9) * 0.7
    const sway = Math.round(Math.sin(t * 5) * 0.6)
    P(ctx, cax + 1 + sway, cay - 1 + fl, 2, 3, S(C, 'fire3')) // outer base
    P(ctx, cax + 1 + sway, cay - 4 + fl, 2, 4, S(C, 'fire2')) // body
    P(ctx, cax + 1 + sway, cay - 6 + fl, 2, 2, S(C, 'fire1')) // upper
    P(ctx, cax + 1 + sway, cay - 2 + fl, 1, 2, S(C, 'fire0')) // hot core
    P(ctx, cax + 1 + sway, cay + fl, 2, 1, '#6a86c8') // cool wick base
    const gr = ctx.createRadialGradient(cax + 2, cay - 2, 1, cax + 2, cay - 2, Math.round(W * 0.15))
    gr.addColorStop(0, 'rgba(255,186,92,0.40)')
    gr.addColorStop(0.5, 'rgba(255,160,70,0.16)')
    gr.addColorStop(1, 'rgba(255,160,70,0)')
    ctx.fillStyle = gr
    ctx.fillRect(0, 0, W, H)
  }

  // dust motes in the moonbeam
  if (nightish) {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(g.ox0 + 6, g.oyBot)
    ctx.lineTo(g.ox1 - 6, g.oyBot)
    ctx.lineTo(g.ox1 + Math.round(W * 0.06), H)
    ctx.lineTo(g.ox0 - Math.round(W * 0.12), H)
    ctx.closePath()
    ctx.clip()
    for (let i = 0; i < 14; i++) {
      const dx = g.ox0 + rnd(i) * (g.ox1 - g.ox0)
      const dy = g.oyBot + ((t * 6 + rnd(i + 3) * 120) % (H - g.oyBot))
      if (Math.sin(t * 2 + i) > 0) P(ctx, dx + Math.sin(t + i) * 3, dy, 1, 1, 'rgba(200,215,240,0.5)')
    }
    ctx.restore()
  }
}

// ============================================================
// ROBOT (res ~ 72x96) — chibi proportions: a big rounded head wearing the
// face screen sits on a small squat body wearing the belly clock, with stubby
// feet and little arms. Lit by moon (cool L) & fire (warm R).
// ============================================================
export function drawRobot(ctx: CanvasRenderingContext2D, W: number, H: number, state?: RobotStateObj): void {
  state = state || {}
  const C = pal(state)
  const st = state.state || 'idle', cos = state.costumes || [], t = state.t || 0
  const cx = Math.round(W / 2)
  const bob = st === 'idle' || st === 'break' ? Math.round(Math.sin(t * 2)) : 0
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, W, H)

  // chibi layout: big head, small body, stubby feet — stacked from the floor up
  const footY = H - 3 + bob
  const headW = 48, headH = 36, headX = cx - 24
  const bodyW = 40, bodyH = 22, bodyX = cx - 20
  const feetH = 5
  const bodyBot = footY - feetH
  const bodyTop = bodyBot - bodyH
  const headBot = bodyTop + 1
  const headTop = headBot - headH
  const hasCap = cos.includes('nightcap'), hasCans = cos.includes('headphones')

  // warm belly glow pooling on the floor
  const gr = ctx.createRadialGradient(cx, bodyBot, 2, cx, bodyBot, 32)
  gr.addColorStop(0, 'rgba(255,180,70,0.22)')
  gr.addColorStop(1, 'rgba(255,180,70,0)')
  ctx.fillStyle = gr
  ctx.fillRect(0, 0, W, H)

  // ground shadow (stays planted under the float)
  P(ctx, cx - 15, H - 4, 30, 3, 'rgba(0,0,0,0.45)')

  // ---- stubby feet ----
  for (const fxx of [cx - 13, cx + 4]) {
    P(ctx, fxx, bodyBot, 9, feetH, S(C, 'rFrameD'))
    P(ctx, fxx, bodyBot, 9, 1, S(C, 'rFrameL'))
    P(ctx, fxx, bodyBot + feetH - 1, 9, 1, '#000')
    clearCorners(ctx, fxx, bodyBot, 9, feetH, 2)
  }

  // ---- little arms tucked at the body sides ----
  for (const axx of [bodyX - 4, bodyX + bodyW - 1]) {
    P(ctx, axx, bodyTop + 6, 5, 10, S(C, 'rFrameD'))
    P(ctx, axx, bodyTop + 6, 5, 2, S(C, 'rFrameL'))
    P(ctx, axx, bodyTop + 15, 5, 1, S(C, 'rXD'))
    clearCorners(ctx, axx, bodyTop + 6, 5, 10, 2)
  }

  // ---- antenna with a softly pulsing bulb (bare head only) ----
  if (!hasCap && !hasCans) {
    P(ctx, cx - 1, headTop - 8, 2, 9, S(C, 'rFrame'))
    P(ctx, cx - 1, headTop - 8, 1, 9, S(C, 'rFrameL'))
    P(ctx, cx - 2, headTop - 12, 4, 5, S(C, 'redL'))
    P(ctx, cx - 2, headTop - 12, 4, 1, S(C, 'redRim'))
    P(ctx, cx - 1, headTop - 11, 2, 2, S(C, 'redRim'))
    P(ctx, cx - 2, headTop - 11, 1, 1, '#fff')
    const pulse = 0.32 + (Math.sin(t * 3) + 1) * 0.16
    const gl = ctx.createRadialGradient(cx, headTop - 10, 1, cx, headTop - 10, 9)
    gl.addColorStop(0, 'rgba(232,120,80,' + pulse + ')')
    gl.addColorStop(1, 'rgba(232,120,80,0)')
    ctx.fillStyle = gl
    ctx.fillRect(cx - 10, headTop - 20, 20, 18)
  }

  // ---- neck collar + small body shell ----
  P(ctx, cx - 7, bodyTop - 3, 14, 5, S(C, 'rFrameD'))
  P(ctx, cx - 7, bodyTop - 3, 14, 1, S(C, 'rFrameL'))
  P(ctx, cx - 7, bodyTop - 1, 14, 1, S(C, 'rXD'))
  metalPanel(ctx, C, bodyX, bodyTop, bodyW, bodyH, 4)

  // belly clock display
  {
    const xb = cx - 18, wb = 36, yb = bodyTop + 3, hb = 16
    P(ctx, xb - 2, yb - 2, wb + 4, hb + 4, S(C, 'rFrameD'))
    P(ctx, xb - 1, yb - 1, wb + 2, hb + 2, S(C, 'brassD'))
    P(ctx, xb, yb, wb, hb, S(C, 'belly'))
    P(ctx, xb, yb, wb, 1, 'rgba(255,180,70,0.25)')
    for (let yy = yb + 1; yy < yb + hb; yy += 2) P(ctx, xb, yy, wb, 1, 'rgba(0,0,0,0.25)')
    const mmss = state.mmss || '25:00', cell = 2, tw = textWidth(mmss, cell)
    const dg = ctx.createRadialGradient(cx, yb + hb / 2, 1, cx, yb + hb / 2, wb * 0.7)
    dg.addColorStop(0, 'rgba(255,180,70,0.5)')
    dg.addColorStop(1, 'rgba(255,180,70,0)')
    ctx.fillStyle = dg
    ctx.fillRect(xb - 4, yb - 4, wb + 8, hb + 8)
    drawDigits(ctx, Math.round(cx - tw / 2), yb + 4, mmss, cell, S(C, 'amber'))
  }

  // ---- big rounded head shell ----
  metalPanel(ctx, C, headX, headTop, headW, headH, 5)
  ;[[headX + 5, headTop + 5], [headX + headW - 7, headTop + 5], [headX + 5, headBot - 8], [headX + headW - 7, headBot - 8]].forEach(([rxx, ryy]) => {
    P(ctx, rxx, ryy, 2, 2, S(C, 'rFrameL'))
    P(ctx, rxx + 1, ryy + 1, 1, 1, S(C, 'rXD'))
  })

  // face screen (big, centred on the head)
  {
    const fx = headX + 6, fw = headW - 12, fy = headTop + 9, fh = 18
    P(ctx, fx - 2, fy - 2, fw + 4, fh + 4, S(C, 'rFrameD'))
    P(ctx, fx - 1, fy - 1, fw + 2, fh + 2, S(C, 'brassD'))
    P(ctx, fx, fy, fw, fh, S(C, 'face'))
    P(ctx, fx, fy, fw, 1, S(C, 'faceEdge'))
    P(ctx, fx, fy, fw, 2, 'rgba(255,255,255,0.05)')
    drawFace(ctx, cx, fy, st, C, t)
  }

  // ---- costumes (drawn over the head) ----
  if (hasCans) drawHeadphones(ctx, C, headX, headTop, headW, headH)
  if (hasCap) drawNightcap(ctx, C, cx, headX, headTop, headW)

  // ---- FX ----
  if (st === 'complete') {
    const tw2 = (Math.sin(t * 4) + 1) / 2
    const spark = (sx: number, sy: number, s: number): void => {
      P(ctx, sx - s, sy, s * 2 + 1, 1, S(C, 'brassHi'))
      P(ctx, sx, sy - s, 1, s * 2 + 1, S(C, 'brassHi'))
      P(ctx, sx, sy, 1, 1, '#fff')
    }
    if (tw2 > 0.3) spark(headX - 3, headTop + 4, 2)
    if (tw2 > 0.6) spark(headX + headW + 3, headTop + 10, 2)
    spark(cx, headTop - 6, Math.round(tw2 * 2) + 1)
  }
  if (st === 'dozing') {
    const zp = (t % 2.4) / 2.4
    ctx.fillStyle = S(C, 'parch')
    ctx.font = '8px "Jersey 25",monospace'
    ctx.globalAlpha = 1 - zp
    ctx.fillText('z', headX + headW + 2 + zp * 6, headTop + 2 - zp * 13)
    ctx.globalAlpha = 1
  }
}

// A brass chassis panel: bevelled frame, 3-tone shaded inner face, warm/cool
// rim lights, then knocked-round corners so it reads as a soft chibi shell.
function metalPanel(c: CanvasRenderingContext2D, C: Palette, x: number, y: number, w: number, h: number, rad: number): void {
  P(c, x, y, w, h, S(C, 'rFrameD')) // outer frame
  P(c, x, y, w, 2, S(C, 'rFrameL'))
  P(c, x, y, 2, h, S(C, 'rFrame'))
  P(c, x + w - 2, y, 2, h, S(C, 'rXD'))
  P(c, x, y + h - 2, w, 2, S(C, 'rXD'))
  // inner face (3-tone vertical shade)
  P(c, x + 3, y + 3, w - 6, h - 6, S(C, 'r'))
  P(c, x + 3, y + 3, w - 6, 3, S(C, 'rL')) // top sheen
  P(c, x + 3, y + h - 7, w - 6, 4, S(C, 'rD')) // bottom shade
  P(c, x + 3, y + 3, 4, h - 6, S(C, 'rL')) // left lit (moon)
  P(c, x + w - 6, y + 3, 3, h - 6, S(C, 'rD')) // right base
  // rim lights
  P(c, x + w - 4, y + 6, 1, h - 14, 'rgba(255,140,60,0.5)') // warm fire right
  P(c, x + 2, y + 5, 1, h - 12, 'rgba(150,180,230,0.4)') // cool moon left
  clearCorners(c, x, y, w, h, rad)
}

// Classic floppy nightcap: a rolled knit brim hugging the crown, a wide-based
// cone that rises and flops to one side (grown from tapering blobs so it's
// unmistakably a soft droopy cap), capped with a fluffy cream pom-pom.
function drawNightcap(c: CanvasRenderingContext2D, C: Palette, cx: number, headX: number, headTop: number, headW: number): void {
  const by = headTop - 1, bw = headW + 2, bxx = headX - 1
  const baseY = by - 1
  // Soft sock cap on a quadratic Bézier: rises from the crown, bends over and
  // flops DOWN the right side, tip hanging by the ear. Grown from tapering
  // blobs (fat base → thin tip) in three shaded passes for rounded knit volume.
  const N = 64
  const p0x = cx - 2, p0y = baseY, p1x = cx + 22, p1y = headTop - 16, p2x = cx + 25, p2y = headTop + 11
  const path: Array<[number, number, number]> = []
  for (let i = 0; i <= N; i++) {
    const s = i / N, u = 1 - s
    const px = u * u * p0x + 2 * u * s * p1x + s * s * p2x
    const py = u * u * p0y + 2 * u * s * p1y + s * s * p2y
    const half = u * 10 + 3
    path.push([px, py, half])
  }
  for (const [px, py, half] of path) fillBlob(c, px, py, half, S(C, 'knit')) // body
  for (const [px, py, half] of path) fillBlob(c, px + half * 0.4, py + half * 0.5, Math.max(1, half * 0.42), S(C, 'knitD')) // underside shade
  for (const [px, py, half] of path) fillBlob(c, px - half * 0.35, py - half * 0.4, Math.max(1, half * 0.4), S(C, 'knitHi')) // lit crown ridge
  // rolled, ribbed knit brim cuff across the top of the head
  P(c, bxx, by, bw, 6, S(C, 'knitHi'))
  P(c, bxx, by, bw, 2, S(C, 'parch')) // light roll
  P(c, bxx, by + 5, bw, 1, S(C, 'knitD'))
  for (let rxk = bxx + 1; rxk < bxx + bw - 1; rxk += 3) P(c, rxk, by + 1, 1, 4, S(C, 'knitD')) // ribs
  clearCorners(c, bxx, by, bw, 6, 2)
  const tipX = p2x, tipY = p2y
  // fluffy cream pom-pom at the tip
  const pcx = Math.round(tipX), pcy = Math.round(tipY) - 1
  for (let yy = -4; yy <= 4; yy++)
    for (let xx = -4; xx <= 4; xx++)
      if (xx * xx + yy * yy <= 16) {
        const tuft = rnd(xx * 7 + yy * 13)
        P(c, pcx + xx, pcy + yy, 1, 1, tuft > 0.62 ? '#fff' : tuft > 0.32 ? S(C, 'parch') : S(C, 'knitHi'))
      }
  const gl = c.createRadialGradient(pcx, pcy, 1, pcx, pcy, 10)
  gl.addColorStop(0, 'rgba(231,214,173,0.4)')
  gl.addColorStop(1, 'rgba(231,214,173,0)')
  c.fillStyle = gl
  c.fillRect(pcx - 10, pcy - 10, 20, 20)
}

// Over-ear headphones: a thick metal headband arcing over the crown into two
// big cushioned ear cups clamped on the sides of the head.
function drawHeadphones(c: CanvasRenderingContext2D, C: Palette, headX: number, headTop: number, headW: number, headH: number): void {
  const cupCy = headTop + Math.round(headH / 2)
  const Lx = headX - 3, Rx = headX + headW + 3
  const apex = headTop - 7, yoke = cupCy - 9
  // headband arc over the crown (sin bow: ends at the cups, peak over the top)
  const span = Rx - Lx
  for (let i = 0; i <= span; i++) {
    const s = i / span
    const x = Lx + s * span
    const y = yoke + (apex - yoke) * Math.sin(s * Math.PI)
    P(c, Math.round(x), Math.round(y), 2, 4, S(C, 'rFrame'))
    P(c, Math.round(x), Math.round(y), 2, 1, S(C, 'rFrameL'))
    P(c, Math.round(x), Math.round(y) + 3, 2, 1, S(C, 'rFrameD'))
  }
  drawEarCup(c, C, Lx, cupCy)
  drawEarCup(c, C, Rx, cupCy)
}

function drawEarCup(c: CanvasRenderingContext2D, C: Palette, cxk: number, cyk: number): void {
  const w = 12, h = 18, x = cxk - 6, y = cyk - 9
  P(c, x, y, w, h, '#16181f') // dark shell
  P(c, x, y, w, 2, S(C, 'rFrameL')) // top sheen
  P(c, x, y + h - 2, w, 2, '#000')
  clearCorners(c, x, y, w, h, 5)
  // foam cushion ring + pressed-in centre
  P(c, x + 2, y + 3, w - 4, h - 6, S(C, 'redL'))
  P(c, x + 2, y + 3, w - 4, 2, S(C, 'redRim'))
  P(c, x + 3, y + 5, w - 6, h - 10, S(C, 'redD'))
  P(c, x + 2, y + 3, 1, h - 6, S(C, 'redRim')) // lit cushion edge
  clearCorners(c, x + 2, y + 3, w - 4, h - 6, 3)
}

function drawFace(ctx: CanvasRenderingContext2D, cx: number, fy: number, st: RobotState, C: Palette, t: number): void {
  const lx = cx - 10, rx = cx + 5, ey = fy + 4
  const glow = (x: number, y: number): void => {
    const g = ctx.createRadialGradient(x + 2, y + 2, 0, x + 2, y + 2, 6)
    g.addColorStop(0, 'rgba(255,200,90,0.55)')
    g.addColorStop(1, 'rgba(255,200,90,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - 4, y - 4, 12, 12)
  }
  if (st === 'focus') {
    glow(lx, ey)
    glow(rx, ey)
    P(ctx, lx, ey + 2, 5, 1, S(C, 'eye'))
    P(ctx, rx, ey + 2, 5, 1, S(C, 'eye'))
    P(ctx, cx - 3, fy + 12, 6, 1, S(C, 'amber'))
  } else if (st === 'break') {
    P(ctx, lx, ey + 1, 1, 2, S(C, 'eye'))
    P(ctx, lx + 1, ey, 3, 1, S(C, 'eye'))
    P(ctx, lx + 4, ey + 1, 1, 2, S(C, 'eye'))
    P(ctx, rx, ey + 1, 1, 2, S(C, 'eye'))
    P(ctx, rx + 1, ey, 3, 1, S(C, 'eye'))
    P(ctx, rx + 4, ey + 1, 1, 2, S(C, 'eye'))
    P(ctx, cx - 3, fy + 11, 1, 1, S(C, 'amber'))
    P(ctx, cx - 2, fy + 12, 4, 1, S(C, 'amber'))
    P(ctx, cx + 2, fy + 11, 1, 1, S(C, 'amber'))
  } else if (st === 'complete') {
    P(ctx, lx, ey + 2, 1, 1, S(C, 'eye'))
    P(ctx, lx + 1, ey, 3, 1, S(C, 'eye'))
    P(ctx, lx + 4, ey + 2, 1, 1, S(C, 'eye'))
    P(ctx, rx, ey + 2, 1, 1, S(C, 'eye'))
    P(ctx, rx + 1, ey, 3, 1, S(C, 'eye'))
    P(ctx, rx + 4, ey + 2, 1, 1, S(C, 'eye'))
    P(ctx, cx - 3, fy + 11, 6, 1, S(C, 'eye'))
    P(ctx, cx - 2, fy + 12, 4, 1, S(C, 'eye'))
  } else if (st === 'dozing') {
    P(ctx, lx, ey + 2, 5, 1, '#caa23e')
    P(ctx, rx, ey + 2, 5, 1, '#caa23e')
  } else {
    const blink = t % 4 > 3.85
    if (blink) {
      P(ctx, lx, ey + 2, 5, 1, S(C, 'eye'))
      P(ctx, rx, ey + 2, 5, 1, S(C, 'eye'))
    } else {
      glow(lx, ey)
      glow(rx, ey)
      P(ctx, lx, ey, 5, 5, S(C, 'eye'))
      P(ctx, rx, ey, 5, 5, S(C, 'eye'))
      P(ctx, lx, ey, 2, 2, S(C, 'eyeHi'))
      P(ctx, rx, ey, 2, 2, S(C, 'eyeHi'))
    }
    P(ctx, cx - 2, fy + 12, 4, 1, '#caa23e')
  }
}

export const PixelArt = { drawScene, drawRobot, drawDigits, textWidth, PAL }
