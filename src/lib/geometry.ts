import type { Box } from './types'

export function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const union = a.w * a.h + b.w * b.h - inter
  return union > 0 ? inter / union : 0
}

export interface MatchResult {
  /** guess index -> answer index */
  pairs: Map<number, number>
  hits: number
  misses: number
  falseAlarms: number
}

/**
 * Greedy matching: the best-overlapping pairs are matched first, and each
 * answer box can be claimed only once. Overlap of 0.2 or more counts.
 */
export function matchBoxes(guesses: Box[], answers: Box[], minIou = 0.2): MatchResult {
  const candidates: { g: number; a: number; v: number }[] = []
  guesses.forEach((g, gi) =>
    answers.forEach((a, ai) => {
      const v = iou(g, a)
      if (v >= minIou) candidates.push({ g: gi, a: ai, v })
    }),
  )
  candidates.sort((p, q) => q.v - p.v)
  const usedG = new Set<number>()
  const usedA = new Set<number>()
  const pairs = new Map<number, number>()
  for (const c of candidates) {
    if (usedG.has(c.g) || usedA.has(c.a)) continue
    usedG.add(c.g)
    usedA.add(c.a)
    pairs.set(c.g, c.a)
  }
  return {
    pairs,
    hits: pairs.size,
    misses: answers.length - pairs.size,
    falseAlarms: guesses.length - pairs.size,
  }
}

export function cropToDataUrl(canvas: HTMLCanvasElement, box: Box, size = 132): string {
  const pad = Math.max(box.w, box.h) * 0.25 + 4
  const side = Math.max(box.w, box.h) + pad * 2
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const out = document.createElement('canvas')
  out.width = size
  out.height = size
  const ctx = out.getContext('2d')!
  ctx.fillStyle = '#f2f0ec'
  ctx.fillRect(0, 0, size, size)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, cx - side / 2, cy - side / 2, side, side, 0, 0, size, size)
  return out.toDataURL('image/png')
}
