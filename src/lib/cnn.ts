// Small pieces of a convolutional neural network (CNN), written out by hand so
// the "How the AI sees" page can show each idea working on a real picture.
import { makeRng } from './rng'
import type { Box, TruthItem } from './types'

/** A grid of numbers: one value per pixel, row by row. */
export interface Grid {
  w: number
  h: number
  data: Float32Array
}

/** Shrinks part of a canvas to w x h and reads its pixels (red, green, blue, alpha). */
export function readPixels(source: HTMLCanvasElement, box: Box, w: number, h: number): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h).data
}

/** Darkness of each pixel, from 0 (white) to 1 (black). */
export function darkness(px: Uint8ClampedArray, w: number, h: number): Grid {
  const data = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const lum = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]
    data[i] = 1 - lum / 255
  }
  return { w, h, data }
}

/** Slides a square filter over the grid. Pixels past the edge copy the nearest edge pixel. */
export function convolve(g: Grid, kernel: number[]): Grid {
  const k = Math.round(Math.sqrt(kernel.length))
  const r = k >> 1
  const out = new Float32Array(g.w * g.h)
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      let sum = 0
      for (let dy = -r; dy <= r; dy++) {
        const yy = Math.min(g.h - 1, Math.max(0, y + dy))
        for (let dx = -r; dx <= r; dx++) {
          const xx = Math.min(g.w - 1, Math.max(0, x + dx))
          sum += g.data[yy * g.w + xx] * kernel[(dy + r) * k + dx + r]
        }
      }
      out[y * g.w + x] = sum
    }
  }
  return { w: g.w, h: g.h, data: out }
}

/** ReLU: negative answers become zero. */
export function relu(g: Grid): Grid {
  return { ...g, data: g.data.map((v) => Math.max(0, v)) }
}

export function add(grids: Grid[]): Grid {
  const data = new Float32Array(grids[0].w * grids[0].h)
  for (const g of grids) for (let i = 0; i < data.length; i++) data[i] += g.data[i]
  return { w: grids[0].w, h: grids[0].h, data }
}

/** Max pooling: keep the strongest answer in each 2 x 2 block, so the grid shrinks by half. */
export function maxPool(g: Grid): Grid {
  const w = Math.max(1, g.w >> 1)
  const h = Math.max(1, g.h >> 1)
  const data = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = -Infinity
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 2; dx++) {
          const yy = Math.min(g.h - 1, y * 2 + dy)
          const xx = Math.min(g.w - 1, x * 2 + dx)
          m = Math.max(m, g.data[yy * g.w + xx])
        }
      data[y * w + x] = m
    }
  }
  return { w, h, data }
}

/** Draws a grid as a picture: bright where the value is high. `top` sets what counts as full brightness. */
export function gridToDataUrl(g: Grid, top?: number, tint: [number, number, number] = [255, 255, 255]): string {
  const c = document.createElement('canvas')
  c.width = g.w
  c.height = g.h
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(g.w, g.h)
  let max = top ?? 0
  if (top === undefined) for (const v of g.data) max = Math.max(max, v)
  if (max <= 0) max = 1
  for (let i = 0; i < g.w * g.h; i++) {
    const v = Math.min(1, Math.max(0, g.data[i] / max))
    img.data[i * 4] = tint[0] * v
    img.data[i * 4 + 1] = tint[1] * v
    img.data[i * 4 + 2] = tint[2] * v
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

// ---------------------------------------------------------------------------
// A tiny trainable network for the "teach a tiny AI" game.
//
// Layer 1: FILTERS small filters (5 x 5, red/green/blue), then ReLU.
// Layer 2: mixes the filter answers into one "insect here?" score per pixel.
// It learns by gradient descent: guess, measure how wrong, nudge every number.

export const FILTERS = 4
const K = 5
const R = K >> 1
const PER_FILTER = 3 * K * K
/** Leaky ReLU: negative answers shrink to a tenth instead of zero, so a filter can't get stuck at zero while learning. */
const LEAK = 0.1
const leaky = (z: number) => (z > 0 ? z : LEAK * z)

export interface TrainingPicture {
  w: number
  h: number
  /** red, green, blue "ink" (1 - value / 255) for each pixel, channel by channel */
  x: Float32Array
  /** 1 where an insect is, 0 elsewhere */
  target: Float32Array
  /** how much each pixel counts when measuring mistakes */
  weight: Float32Array
}

/** Shrinks a sample night and marks which pixels are insects, using its answer key. */
export function makeTrainingPicture(source: HTMLCanvasElement, truth: TruthItem[], w: number): TrainingPicture {
  const h = Math.round((w * source.height) / source.width)
  const px = readPixels(source, { x: 0, y: 0, w: source.width, h: source.height }, w, h)
  const n = w * h
  const x = new Float32Array(3 * n)
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) x[c * n + i] = 1 - px[i * 4 + c] / 255
  const target = new Float32Array(n)
  const isDebris = new Uint8Array(n)
  const sx = w / source.width
  const sy = h / source.height
  for (const t of truth) {
    // the middle of each box, where the insect's body is
    const cx = (t.box.x + t.box.w / 2) * sx
    const cy = (t.box.y + t.box.h / 2) * sy
    const rx = Math.max(1, t.box.w * sx * 0.35)
    const ry = Math.max(1, t.box.h * sy * 0.35)
    for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++)
      for (let xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) {
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
        if (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 > 1) continue
        if (t.kind === 'insect') target[yy * w + xx] = 1
        else isDebris[yy * w + xx] = 1
      }
  }
  const positives = target.reduce((s, v) => s + v, 0)
  const posWeight = Math.min(20, (n - positives) / Math.max(1, positives))
  const weight = new Float32Array(n)
  for (let i = 0; i < n; i++) weight[i] = target[i] ? posWeight : isDebris[i] ? 4 : 1
  return { w, h, x, target, weight }
}

export interface TinyNet {
  w1: Float32Array // FILTERS x 3 x K x K
  b1: Float32Array // FILTERS
  w2: Float32Array // FILTERS
  b2: number
  /** Adam optimizer memory */
  m: Float32Array
  v: Float32Array
  steps: number
}

export const NUMBER_COUNT = FILTERS * PER_FILTER + FILTERS + FILTERS + 1

export function newTinyNet(seed: number): TinyNet {
  const rng = makeRng(seed)
  const rand = (s: number) => (rng() * 2 - 1) * s
  return {
    w1: Float32Array.from({ length: FILTERS * PER_FILTER }, () => rand(0.15)),
    b1: Float32Array.from({ length: FILTERS }, () => 0.05 + rand(0.05)),
    w2: Float32Array.from({ length: FILTERS }, () => rand(0.5)),
    b2: 0,
    m: new Float32Array(NUMBER_COUNT),
    v: new Float32Array(NUMBER_COUNT),
    steps: 0,
  }
}

interface Forward {
  z1: Float32Array // FILTERS x n, before ReLU
  y: Float32Array // n, 0 to 1
}

function forward(net: TinyNet, p: { w: number; h: number; x: Float32Array }): Forward {
  const { w, h, x } = p
  const n = w * h
  const z1 = new Float32Array(FILTERS * n)
  for (let f = 0; f < FILTERS; f++) {
    const out = z1.subarray(f * n, (f + 1) * n)
    out.fill(net.b1[f])
    for (let c = 0; c < 3; c++) {
      const xc = x.subarray(c * n, (c + 1) * n)
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const wt = net.w1[f * PER_FILTER + c * K * K + (dy + R) * K + dx + R]
          const y0 = Math.max(0, -dy)
          const y1 = Math.min(h, h - dy)
          const x0 = Math.max(0, -dx)
          const x1 = Math.min(w, w - dx)
          for (let yy = y0; yy < y1; yy++) {
            const row = yy * w
            const src = (yy + dy) * w + dx
            for (let xx = x0; xx < x1; xx++) out[row + xx] += wt * xc[src + xx]
          }
        }
      }
    }
  }
  const y = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let z = net.b2
    for (let f = 0; f < FILTERS; f++) z += net.w2[f] * leaky(z1[f * n + i])
    y[i] = 1 / (1 + Math.exp(-z))
  }
  return { z1, y }
}

/** One round of learning. Returns how wrong the network was before the nudge (lower is better). */
export function trainStep(net: TinyNet, p: TrainingPicture, rate = 0.01): number {
  const { w, h, x, target, weight } = p
  const n = w * h
  const { z1, y } = forward(net, p)
  const grad = new Float32Array(NUMBER_COUNT)
  const gw1 = grad.subarray(0, FILTERS * PER_FILTER)
  const gb1 = grad.subarray(FILTERS * PER_FILTER, FILTERS * PER_FILTER + FILTERS)
  const gw2 = grad.subarray(FILTERS * PER_FILTER + FILTERS, FILTERS * PER_FILTER + 2 * FILTERS)
  let gb2 = 0
  let loss = 0
  let total = 0
  const dz1 = new Float32Array(FILTERS * n)
  for (let i = 0; i < n; i++) {
    const t = target[i]
    const yi = Math.min(1 - 1e-6, Math.max(1e-6, y[i]))
    loss -= weight[i] * (t * Math.log(yi) + (1 - t) * Math.log(1 - yi))
    total += weight[i]
    const dz2 = weight[i] * (y[i] - t)
    gb2 += dz2
    for (let f = 0; f < FILTERS; f++) {
      const z = z1[f * n + i]
      gw2[f] += dz2 * leaky(z)
      dz1[f * n + i] = dz2 * net.w2[f] * (z > 0 ? 1 : LEAK)
    }
  }
  for (let f = 0; f < FILTERS; f++) {
    const d = dz1.subarray(f * n, (f + 1) * n)
    let s = 0
    for (let i = 0; i < n; i++) s += d[i]
    gb1[f] = s
    for (let c = 0; c < 3; c++) {
      const xc = x.subarray(c * n, (c + 1) * n)
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          let g = 0
          const y0 = Math.max(0, -dy)
          const y1 = Math.min(h, h - dy)
          const x0 = Math.max(0, -dx)
          const x1 = Math.min(w, w - dx)
          for (let yy = y0; yy < y1; yy++) {
            const row = yy * w
            const src = (yy + dy) * w + dx
            for (let xx = x0; xx < x1; xx++) g += d[row + xx] * xc[src + xx]
          }
          gw1[f * PER_FILTER + c * K * K + (dy + R) * K + dx + R] = g
        }
      }
    }
  }
  grad[NUMBER_COUNT - 1] = gb2

  // Adam: a careful way to nudge, so big and small numbers both learn
  net.steps++
  const params = [...[net.w1, net.b1, net.w2].flatMap((arr) => Array.from(arr)), net.b2]
  const b1 = 0.9
  const b2 = 0.999
  for (let i = 0; i < NUMBER_COUNT; i++) {
    const g = grad[i] / total
    net.m[i] = b1 * net.m[i] + (1 - b1) * g
    net.v[i] = b2 * net.v[i] + (1 - b2) * g * g
    const mh = net.m[i] / (1 - b1 ** net.steps)
    const vh = net.v[i] / (1 - b2 ** net.steps)
    params[i] -= (rate * mh) / (Math.sqrt(vh) + 1e-8)
  }
  let k = 0
  for (const arr of [net.w1, net.b1, net.w2]) for (let i = 0; i < arr.length; i++) arr[i] = params[k++]
  net.b2 = params[k]
  return loss / total
}

export interface NetView {
  /** the network's "insect here?" answer for each pixel, 0 to 1 */
  output: Grid
  /** what each layer-1 filter lights up */
  filterMaps: Grid[]
}

export function runTinyNet(net: TinyNet, p: { w: number; h: number; x: Float32Array }): NetView {
  const n = p.w * p.h
  const { z1, y } = forward(net, p)
  const filterMaps = Array.from({ length: FILTERS }, (_, f) => ({
    w: p.w,
    h: p.h,
    data: z1.slice(f * n, (f + 1) * n).map((v) => Math.max(0, v)),
  }))
  return { output: { w: p.w, h: p.h, data: y }, filterMaps }
}

/** Counts how many insects the network lights up, and how much of the empty sheet it lights up by mistake. */
export function scoreTinyNet(
  view: NetView,
  p: TrainingPicture,
  truth: TruthItem[],
  sourceW: number,
): {
  found: number
  insects: number
  fooledBy: number
  debris: number
} {
  const s = p.w / sourceW
  const lit = (b: Box) => {
    let best = 0
    for (let yy = Math.floor(b.y * s); yy <= Math.ceil((b.y + b.h) * s); yy++)
      for (let xx = Math.floor(b.x * s); xx <= Math.ceil((b.x + b.w) * s); xx++) {
        if (xx < 0 || yy < 0 || xx >= p.w || yy >= p.h) continue
        best = Math.max(best, view.output.data[yy * p.w + xx])
      }
    return best > 0.5
  }
  const insects = truth.filter((t) => t.kind === 'insect')
  const debris = truth.filter((t) => t.kind === 'debris')
  return {
    found: insects.filter((t) => lit(t.box)).length,
    insects: insects.length,
    fooledBy: debris.filter((t) => lit(t.box)).length,
    debris: debris.length,
  }
}
