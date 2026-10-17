// A simple, explainable bug detector that really runs on the picture.
//
// 1. Work at half size so it's fast.
// 2. Estimate what the empty sheet looks like everywhere (the middle value
//    of each small block, smoothed between blocks).
// 3. Mark pixels that are much darker or more colorful than the sheet.
// 4. Group touching marked pixels into blobs, and draw a box around each one.
// 5. Give each blob a score from its contrast and size.
//
// The real Mothbox uses a trained YOLO model for this step; this detector
// shows the same idea (find things that stand out) without any training.
import type { Box, Detection } from './types'

export interface DetectorOutput {
  detections: Detection[]
  /** Picture of what the detector "sees": brighter means more different from the sheet. */
  contrastUrl: string
  millis: number
}

const BLOCK = 40
const MARK_LEVEL = 16
const MIN_AREA = 10

function median(values: number[]): number {
  values.sort((a, b) => a - b)
  return values[values.length >> 1]
}

export function runDetector(source: HTMLCanvasElement): DetectorOutput {
  const t0 = performance.now()
  const w = Math.max(1, Math.round(source.width / 2))
  const h = Math.max(1, Math.round(source.height / 2))
  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const sctx = small.getContext('2d', { willReadFrequently: true })!
  sctx.drawImage(source, 0, 0, w, h)
  const px = sctx.getImageData(0, 0, w, h).data

  const lum = new Float32Array(w * h)
  const chroma = new Float32Array(w * h)
  for (let i = 0, j = 0; j < w * h; i += 4, j++) {
    const r = px[i]
    const g = px[i + 1]
    const b = px[i + 2]
    lum[j] = 0.299 * r + 0.587 * g + 0.114 * b
    chroma[j] = Math.max(r, g, b) - Math.min(r, g, b)
  }

  // background model: median per block, then bilinear blend
  const gw = Math.ceil(w / BLOCK)
  const gh = Math.ceil(h / BLOCK)
  const bgL = new Float32Array(gw * gh)
  const bgC = new Float32Array(gw * gh)
  for (let by = 0; by < gh; by++) {
    for (let bx = 0; bx < gw; bx++) {
      const ls: number[] = []
      const cs: number[] = []
      for (let y = by * BLOCK; y < Math.min(h, (by + 1) * BLOCK); y += 2) {
        for (let x = bx * BLOCK; x < Math.min(w, (bx + 1) * BLOCK); x += 2) {
          ls.push(lum[y * w + x])
          cs.push(chroma[y * w + x])
        }
      }
      bgL[by * gw + bx] = median(ls)
      bgC[by * gw + bx] = median(cs)
    }
  }
  const sample = (grid: Float32Array, x: number, y: number) => {
    const fx = Math.min(gw - 1, Math.max(0, x / BLOCK - 0.5))
    const fy = Math.min(gh - 1, Math.max(0, y / BLOCK - 0.5))
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const x1 = Math.min(gw - 1, x0 + 1)
    const y1 = Math.min(gh - 1, y0 + 1)
    const tx = fx - x0
    const ty = fy - y0
    const top = grid[y0 * gw + x0] * (1 - tx) + grid[y0 * gw + x1] * tx
    const bottom = grid[y1 * gw + x0] * (1 - tx) + grid[y1 * gw + x1] * tx
    return top * (1 - ty) + bottom * ty
  }

  const diff = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = y * w + x
      const darker = sample(bgL, x, y) - lum[j]
      const colorful = (chroma[j] - sample(bgC, x, y)) * 0.8
      diff[j] = Math.max(0, darker, colorful)
    }
  }

  // mark, then grow marks by one pixel so wings join their bodies
  const marked = new Uint8Array(w * h)
  for (let j = 0; j < w * h; j++) if (diff[j] > MARK_LEVEL) marked[j] = 1
  const grown = new Uint8Array(w * h)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const j = y * w + x
      if (marked[j] || marked[j - 1] || marked[j + 1] || marked[j - w] || marked[j + w]) grown[j] = 1
    }
  }

  // connected blobs
  const label = new Int32Array(w * h)
  const detections: Detection[] = []
  const stack: number[] = []
  let next = 0
  for (let start = 0; start < w * h; start++) {
    if (!grown[start] || label[start]) continue
    next++
    label[start] = next
    stack.push(start)
    let minX = w
    let minY = h
    let maxX = 0
    let maxY = 0
    let area = 0
    let sum = 0
    let peak = 0
    while (stack.length) {
      const j = stack.pop()!
      const x = j % w
      const y = (j / w) | 0
      area++
      sum += diff[j]
      if (diff[j] > peak) peak = diff[j]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      const around = [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1]
      for (const k of around) {
        if (k >= 0 && grown[k] && !label[k]) {
          label[k] = next
          stack.push(k)
        }
      }
    }
    const bw = maxX - minX + 1
    const bh = maxY - minY + 1
    if (area < MIN_AREA || bw * bh > w * h * 0.3) continue
    const mean = sum / area
    const contrast = Math.min(1, Math.max(0, (mean * 0.6 + peak * 0.4 - 18) / 70))
    const sizeScore = Math.min(1, Math.log(area) / Math.log(1500))
    const box: Box = { x: minX * 2, y: minY * 2, w: bw * 2, h: bh * 2 }
    detections.push({ id: `det${next}`, box, score: Math.round((contrast * 0.75 + sizeScore * 0.25) * 100) / 100 })
  }
  detections.sort((a, b) => b.score - a.score)

  // contrast picture for students
  const view = sctx.createImageData(w, h)
  for (let j = 0, i = 0; j < w * h; j++, i += 4) {
    const v = Math.min(255, diff[j] * 3)
    view.data[i] = v
    view.data[i + 1] = v * 0.85
    view.data[i + 2] = Math.min(255, v * 0.4 + 30)
    view.data[i + 3] = 255
  }
  sctx.putImageData(view, 0, 0)

  return { detections, contrastUrl: small.toDataURL('image/png'), millis: performance.now() - t0 }
}
