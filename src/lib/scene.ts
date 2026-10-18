// Draws practice "Mothbox nights": a lit white sheet with insects and some
// debris, plus an answer key of where everything really is.
import { between, makeRng, pick, type Rng } from './rng'
import type { Box, Scene, TruthItem } from './types'

export const SCENE_W = 1600
export const SCENE_H = 1067

interface Extent {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type Ctx = CanvasRenderingContext2D

function shadowOn(ctx: Ctx, strength = 0.28) {
  ctx.shadowColor = `rgba(40, 30, 50, ${strength})`
  ctx.shadowBlur = 5
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 3
}

function shadowOff(ctx: Ctx) {
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

function line(ctx: Ctx, pts: number[], stroke: string, width: number) {
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.strokeStyle = stroke
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.stroke()
}

function legs(ctx: Ctx, len: number, y0: number, spread: number, color: string, width: number) {
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const y = y0 + (i - 1) * spread
      const angle = (i - 1) * 0.6
      line(
        ctx,
        [0, y, side * len * 0.55, y + angle * len * 0.3, side * len, y + angle * len * 0.8 + len * 0.15],
        color,
        width,
      )
    }
  }
}

interface MothColors {
  base: string
  mark: string
  hind: string
  body: string
  spots?: string
}

const MOTH_COLORS: Record<string, MothColors> = {
  'fall-armyworm': { base: '#8a7b6a', mark: '#54473a', hind: '#d9d0c4', body: '#6e604f', spots: '#d8ccb8' },
  'corn-earworm': { base: '#b9a272', mark: '#86734a', hind: '#e2d7bd', body: '#a08a5c' },
  'black-cutworm': { base: '#5b4b3d', mark: '#2d241b', hind: '#cfc5b8', body: '#47392d', spots: '#9c8b78' },
  'rosy-maple': { base: '#f2a3bd', mark: '#f3dd7c', hind: '#f6e7a8', body: '#f1d567' },
  'isabella-tiger': { base: '#c58a45', mark: '#8f5f28', hind: '#e0b58a', body: '#a8702f', spots: '#6b4520' },
}

function drawMoth(ctx: Ctx, size: number, speciesId: string, rng: Rng): Extent {
  const c = MOTH_COLORS[speciesId]
  const s = size
  // hind wings peek out behind the forewings
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, s * 0.02)
    ctx.quadraticCurveTo(side * s * 0.36, s * 0.04, side * s * 0.3, s * 0.3)
    ctx.quadraticCurveTo(side * s * 0.12, s * 0.36, 0, s * 0.24)
    ctx.closePath()
    ctx.fillStyle = c.hind
    ctx.fill()
  }
  shadowOn(ctx)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.16)
    ctx.quadraticCurveTo(side * s * 0.3, -s * 0.12, side * s * 0.5, s * 0.06)
    ctx.quadraticCurveTo(side * s * 0.46, s * 0.3, side * s * 0.36, s * 0.32)
    ctx.quadraticCurveTo(side * s * 0.12, s * 0.26, 0, s * 0.2)
    ctx.closePath()
    ctx.fillStyle = c.base
    ctx.fill()
  }
  shadowOff(ctx)
  // markings: a wavy band and a spot on each forewing
  for (const side of [-1, 1]) {
    line(
      ctx,
      [side * s * 0.1, -s * 0.06, side * s * 0.25, s * 0.02, side * s * 0.33, s * 0.12, side * s * 0.42, s * 0.16],
      c.mark,
      s * 0.04,
    )
    if (c.spots) ellipse(ctx, side * s * 0.22, s * 0.13, s * 0.035, s * 0.025, c.spots)
    if (speciesId === 'isabella-tiger') {
      for (let i = 0; i < 3; i++)
        ellipse(ctx, side * s * (0.15 + i * 0.09), s * (0.2 - i * 0.03), s * 0.012, s * 0.012, c.mark)
    }
    if (rng() < 0.5) line(ctx, [side * s * 0.04, s * 0.15, side * s * 0.3, s * 0.27], c.mark, s * 0.015)
  }
  ellipse(ctx, 0, s * 0.04, s * 0.055, s * 0.2, c.body)
  ellipse(ctx, 0, -s * 0.16, s * 0.05, s * 0.04, c.body)
  for (const side of [-1, 1])
    line(ctx, [side * s * 0.02, -s * 0.19, side * s * 0.12, -s * 0.33], c.mark, Math.max(1, s * 0.012))
  return { minX: -s * 0.5, maxX: s * 0.5, minY: -s * 0.33, maxY: s * 0.36 }
}

function drawBeetle(ctx: Ctx, size: number, speciesId: string): Extent {
  const s = size
  const colors: Record<string, { shell: string; head: string; leg: string }> = {
    'june-beetle': { shell: '#7b4b25', head: '#5a3518', leg: '#5a3518' },
    ladybug: { shell: '#d23a28', head: '#1b1b1b', leg: '#1b1b1b' },
    'ground-beetle': { shell: '#1e1e24', head: '#16161a', leg: '#16161a' },
  }
  const c = colors[speciesId]
  legs(ctx, s * 0.42, s * 0.05, s * 0.16, c.leg, Math.max(1.2, s * 0.04))
  shadowOn(ctx)
  const round = speciesId === 'ladybug'
  ellipse(ctx, 0, s * 0.1, s * (round ? 0.34 : 0.27), s * (round ? 0.34 : 0.38), c.shell)
  shadowOff(ctx)
  ellipse(ctx, 0, -s * 0.28, s * (round ? 0.2 : 0.2), s * 0.11, c.head)
  ellipse(ctx, 0, -s * 0.39, s * 0.1, s * 0.06, c.head)
  line(ctx, [0, -s * 0.18, 0, s * 0.46], 'rgba(0,0,0,0.45)', Math.max(1, s * 0.02))
  if (round) {
    for (const [x, y] of [
      [-0.16, 0.0],
      [0.16, 0.0],
      [-0.2, 0.2],
      [0.2, 0.2],
      [-0.08, 0.32],
      [0.08, 0.32],
    ]) {
      ellipse(ctx, x * s, y * s, s * 0.05, s * 0.05, '#1b1b1b')
    }
    ellipse(ctx, -s * 0.09, -s * 0.28, s * 0.04, s * 0.03, '#f4f4f4')
    ellipse(ctx, s * 0.09, -s * 0.28, s * 0.04, s * 0.03, '#f4f4f4')
  } else {
    ellipse(ctx, -s * 0.09, 0.0, s * 0.05, s * 0.18, 'rgba(255,255,255,0.18)')
  }
  for (const side of [-1, 1])
    line(ctx, [side * s * 0.05, -s * 0.43, side * s * 0.15, -s * 0.55], c.leg, Math.max(1, s * 0.025))
  return { minX: -s * 0.44, maxX: s * 0.44, minY: -s * 0.55, maxY: s * 0.5 }
}

function drawCraneFly(ctx: Ctx, size: number): Extent {
  const s = size
  // very long, very thin legs: hard for the detector to see
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const a = -0.9 + i * 0.9
      line(ctx, [0, -s * 0.05, side * Math.cos(a) * s * 0.75, Math.sin(a) * s * 0.75], 'rgba(95,75,55,0.55)', 1)
    }
  }
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(side * s * 0.2, -s * 0.02, s * 0.22, s * 0.05, side * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(170,160,140,0.35)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(120,105,85,0.5)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  shadowOn(ctx, 0.18)
  ellipse(ctx, 0, s * 0.12, s * 0.035, s * 0.3, '#8b7355')
  shadowOff(ctx)
  ellipse(ctx, 0, -s * 0.13, s * 0.05, s * 0.06, '#7a6248')
  return { minX: -s * 0.42, maxX: s * 0.42, minY: -s * 0.2, maxY: s * 0.42 }
}

function drawMidge(ctx: Ctx, size: number): Extent {
  const s = size
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(side * s * 0.18, s * 0.05, s * 0.2, s * 0.08, side * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(160,165,150,0.4)'
    ctx.fill()
  }
  ellipse(ctx, 0, s * 0.1, s * 0.07, s * 0.32, '#5f6a4a')
  ellipse(ctx, 0, -s * 0.24, s * 0.08, s * 0.08, '#4a5238')
  return { minX: -s * 0.38, maxX: s * 0.38, minY: -s * 0.32, maxY: s * 0.42 }
}

function drawIchneumon(ctx: Ctx, size: number): Extent {
  const s = size
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(side * s * 0.18, -s * 0.05, s * 0.22, s * 0.07, side * 0.45, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(200,185,150,0.35)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(150,110,60,0.5)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  legs(ctx, s * 0.32, -s * 0.05, s * 0.08, '#b0652a', 1.2)
  shadowOn(ctx, 0.2)
  ellipse(ctx, 0, s * 0.22, s * 0.05, s * 0.26, '#c0702a')
  shadowOff(ctx)
  ellipse(ctx, 0, -s * 0.05, s * 0.07, s * 0.1, '#b0652a')
  ellipse(ctx, 0, -s * 0.2, s * 0.06, s * 0.05, '#9a5520')
  for (const side of [-1, 1]) line(ctx, [side * s * 0.02, -s * 0.24, side * s * 0.12, -s * 0.5], '#9a5520', 1)
  return { minX: -s * 0.4, maxX: s * 0.4, minY: -s * 0.5, maxY: s * 0.48 }
}

function drawLacewing(ctx: Ctx, size: number): Extent {
  const s = size
  for (const side of [-1, 1]) {
    for (const k of [0, 1]) {
      ctx.beginPath()
      ctx.ellipse(side * s * 0.12, s * (0.05 + k * 0.08), s * 0.13, s * 0.42, side * (0.25 + k * 0.15), 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(150,205,130,0.22)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(100,170,90,0.6)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
  shadowOn(ctx, 0.15)
  ellipse(ctx, 0, s * 0.1, s * 0.04, s * 0.26, '#8cc36a')
  shadowOff(ctx)
  ellipse(ctx, -s * 0.04, -s * 0.18, s * 0.025, s * 0.025, '#d6b13a')
  ellipse(ctx, s * 0.04, -s * 0.18, s * 0.025, s * 0.025, '#d6b13a')
  for (const side of [-1, 1])
    line(ctx, [side * s * 0.02, -s * 0.2, side * s * 0.14, -s * 0.5], 'rgba(110,160,80,0.8)', 1)
  return { minX: -s * 0.3, maxX: s * 0.3, minY: -s * 0.5, maxY: s * 0.52 }
}

function drawLeaf(ctx: Ctx, size: number, rng: Rng): Extent {
  const s = size
  const fill = pick(rng, ['#6d8c3c', '#8a7a3a', '#9c6a32', '#5f7d36'])
  shadowOn(ctx, 0.22)
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.5)
  ctx.quadraticCurveTo(s * 0.32, -s * 0.1, 0, s * 0.45)
  ctx.quadraticCurveTo(-s * 0.32, -s * 0.1, 0, -s * 0.5)
  ctx.fillStyle = fill
  ctx.fill()
  shadowOff(ctx)
  line(ctx, [0, -s * 0.45, 0, s * 0.55], 'rgba(60,45,20,0.6)', Math.max(1, s * 0.03))
  return { minX: -s * 0.18, maxX: s * 0.18, minY: -s * 0.5, maxY: s * 0.55 }
}

function drawTwig(ctx: Ctx, size: number): Extent {
  const s = size
  line(ctx, [0, -s * 0.5, s * 0.03, 0, -s * 0.02, s * 0.5], '#6b4d2e', Math.max(2, s * 0.06))
  line(ctx, [s * 0.02, -s * 0.05, s * 0.18, -s * 0.22], '#6b4d2e', Math.max(1.5, s * 0.04))
  return { minX: -s * 0.05, maxX: s * 0.2, minY: -s * 0.52, maxY: s * 0.52 }
}

function drawSmudge(ctx: Ctx, size: number): Extent {
  const s = size
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.5)
  g.addColorStop(0, 'rgba(90,80,90,0.32)')
  g.addColorStop(1, 'rgba(90,80,90,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.5, s * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
  return { minX: -s * 0.35, maxX: s * 0.35, minY: -s * 0.25, maxY: s * 0.25 }
}

const SIZE_RANGE: Record<string, [number, number]> = {
  'fall-armyworm': [70, 90],
  'corn-earworm': [70, 88],
  'black-cutworm': [80, 100],
  'rosy-maple': [70, 90],
  'isabella-tiger': [75, 95],
  'june-beetle': [48, 60],
  ladybug: [22, 28],
  'ground-beetle': [36, 46],
  'crane-fly': [70, 90],
  midge: [16, 22],
  ichneumon: [60, 75],
  'green-lacewing': [45, 58],
}

function drawSpecies(ctx: Ctx, speciesId: string, size: number, rng: Rng): Extent {
  if (MOTH_COLORS[speciesId]) return drawMoth(ctx, size, speciesId, rng)
  switch (speciesId) {
    case 'june-beetle':
    case 'ladybug':
    case 'ground-beetle':
      return drawBeetle(ctx, size, speciesId)
    case 'crane-fly':
      return drawCraneFly(ctx, size)
    case 'midge':
      return drawMidge(ctx, size)
    case 'ichneumon':
      return drawIchneumon(ctx, size)
    default:
      return drawLacewing(ctx, size)
  }
}

function rotatedBox(e: Extent, x: number, y: number, angle: number): Box {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [px, py] of [
    [e.minX, e.minY],
    [e.maxX, e.minY],
    [e.minX, e.maxY],
    [e.maxX, e.maxY],
  ]) {
    const rx = x + px * cos - py * sin
    const ry = y + px * sin + py * cos
    minX = Math.min(minX, rx)
    maxX = Math.max(maxX, rx)
    minY = Math.min(minY, ry)
    maxY = Math.max(maxY, ry)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

function paintSheet(ctx: Ctx, rng: Rng, folds: number) {
  const W = SCENE_W
  const H = SCENE_H
  const base = ctx.createLinearGradient(0, 0, 0, H)
  base.addColorStop(0, '#efeaf7')
  base.addColorStop(1, '#f2f0ea')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)
  // the UV lamp makes the top center brightest
  const glow = ctx.createRadialGradient(W / 2, -80, 50, W / 2, -80, W * 0.9)
  glow.addColorStop(0, 'rgba(255,255,255,0.0)')
  glow.addColorStop(1, 'rgba(70,60,90,0.16)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < folds; i++) {
    const x = between(rng, 0, W)
    const w = between(rng, 40, 120)
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0)
    g.addColorStop(0, 'rgba(60,50,80,0)')
    g.addColorStop(0.5, 'rgba(60,50,80,0.06)')
    g.addColorStop(1, 'rgba(60,50,80,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - w, 0, w * 2, H)
  }
}

function addNoise(ctx: Ctx, rng: Rng) {
  const img = ctx.getImageData(0, 0, SCENE_W, SCENE_H)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 9
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

export interface NightRecipe {
  key: string
  title: string
  blurb: string
  seed: number
  insects: number
  debris: number
  folds: number
  weights: Record<string, number>
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  'fall-armyworm': 3,
  'corn-earworm': 2,
  'black-cutworm': 2,
  'rosy-maple': 1,
  'isabella-tiger': 1.5,
  'june-beetle': 2,
  ladybug: 1,
  'ground-beetle': 1.5,
  'crane-fly': 1.5,
  midge: 4,
  ichneumon: 1,
  'green-lacewing': 1.5,
}

export const NIGHTS: NightRecipe[] = [
  {
    key: 'quiet',
    title: 'Cool, quiet night',
    blurb: 'A calm night with only a few visitors. Good for a first try.',
    seed: 23,
    insects: 14,
    debris: 2,
    folds: 3,
    weights: DEFAULT_WEIGHTS,
  },
  {
    key: 'busy',
    title: 'Warm summer night',
    blurb: 'Lots of insects came to the light. Can you find them all?',
    seed: 11,
    insects: 42,
    debris: 4,
    folds: 4,
    weights: DEFAULT_WEIGHTS,
  },
  {
    key: 'windy',
    title: 'Windy night',
    blurb: 'Wind blew leaves and twigs onto the sheet. Watch for false alarms.',
    seed: 37,
    insects: 24,
    debris: 14,
    folds: 7,
    weights: { ...DEFAULT_WEIGHTS, 'fall-armyworm': 5, 'corn-earworm': 3 },
  },
]

/** A different random night each time, for the "process a whole night" demo. */
export function randomRecipe(seed: number): NightRecipe {
  const rng = makeRng(seed)
  return {
    key: `batch-${seed}`,
    title: `Photo ${seed}`,
    blurb: '',
    seed,
    insects: Math.round(between(rng, 8, 45)),
    debris: Math.round(between(rng, 0, 8)),
    folds: Math.round(between(rng, 2, 7)),
    weights: DEFAULT_WEIGHTS,
  }
}

function weightedPick(rng: Rng, weights: Record<string, number>): string {
  const entries = Object.entries(weights)
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [id, w] of entries) {
    r -= w
    if (r <= 0) return id
  }
  return entries[entries.length - 1][0]
}

export function renderNight(recipe: NightRecipe, withImage = true): Scene {
  const rng = makeRng(recipe.seed)
  const canvas = document.createElement('canvas')
  canvas.width = SCENE_W
  canvas.height = SCENE_H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  paintSheet(ctx, rng, recipe.folds)

  const placed: { x: number; y: number; r: number }[] = []
  const truth: TruthItem[] = []
  const margin = 60

  const place = (radius: number) => {
    for (let tries = 0; tries < 200; tries++) {
      const x = between(rng, margin, SCENE_W - margin)
      const y = between(rng, margin, SCENE_H - margin)
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > (p.r + radius) * 0.95)) {
        placed.push({ x, y, r: radius })
        return { x, y }
      }
    }
    return null
  }

  const drawAt = (x: number, y: number, angle: number, draw: () => Extent): Box => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    const e = draw()
    ctx.restore()
    return rotatedBox(e, x, y, angle)
  }

  // debris first so insects sit on top
  for (let i = 0; i < recipe.debris; i++) {
    const kind = pick(rng, ['Leaf', 'Leaf', 'Twig', 'Smudge'] as const)
    const size = kind === 'Smudge' ? between(rng, 50, 80) : between(rng, 35, 70)
    const spot = place(size * 0.5)
    if (!spot) continue
    const angle = between(rng, 0, Math.PI * 2)
    const box = drawAt(spot.x, spot.y, angle, () =>
      kind === 'Leaf' ? drawLeaf(ctx, size, rng) : kind === 'Twig' ? drawTwig(ctx, size) : drawSmudge(ctx, size),
    )
    truth.push({ id: `d${i}`, box, kind: 'debris', debrisLabel: kind })
  }

  for (let i = 0; i < recipe.insects; i++) {
    const speciesId = weightedPick(rng, recipe.weights)
    const [lo, hi] = SIZE_RANGE[speciesId]
    const size = between(rng, lo, hi)
    const spot = place(size * 0.5)
    if (!spot) continue
    const angle = between(rng, -0.6, 0.6) + (rng() < 0.3 ? Math.PI : 0)
    const box = drawAt(spot.x, spot.y, angle, () => drawSpecies(ctx, speciesId, size, rng))
    truth.push({ id: `i${i}`, box, kind: 'insect', speciesId })
  }

  // a sprinkle of dust specks that should be too small to count
  for (let i = 0; i < 60; i++) {
    ellipse(ctx, between(rng, 0, SCENE_W), between(rng, 0, SCENE_H), 0.8, 0.8, 'rgba(60,50,40,0.5)')
  }
  addNoise(ctx, rng)

  return {
    key: recipe.key,
    title: recipe.title,
    source: 'sample',
    canvas,
    imageUrl: withImage ? canvas.toDataURL('image/jpeg', 0.9) : '',
    width: SCENE_W,
    height: SCENE_H,
    truth,
  }
}

/** Loads a photo (for example from the team's Mothbox) and shrinks it to a workable size. */
export async function sceneFromFile(file: File): Promise<Scene> {
  return sceneFromBitmap(await createImageBitmap(file), `upload-${file.name}-${file.lastModified}`, file.name)
}

/** A real photo from a web address, for example one of the AMI-Traps samples. */
export async function sceneFromUrl(url: string, title: string): Promise<Scene> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load ${url}`)
  return sceneFromBitmap(await createImageBitmap(await res.blob()), `url-${url}`, title)
}

async function sceneFromBitmap(bitmap: ImageBitmap, key: string, title: string): Promise<Scene> {
  const scale = Math.min(1, SCENE_W / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return {
    key,
    title,
    source: 'upload',
    canvas,
    imageUrl: canvas.toDataURL('image/jpeg', 0.9),
    width: w,
    height: h,
  }
}
