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

/** Why a box counted or not, so students can see what to fix. */
export type Verdict =
  | { kind: 'found'; answer: number }
  | { kind: 'too-big'; answer: number }
  | { kind: 'twice'; answer: number }
  | { kind: 'not-insect'; answer: number }
  | { kind: 'unlisted'; answer: number }
  | { kind: 'empty' }

export interface Judgement {
  verdicts: Verdict[]
  /** indexes of real insects nobody boxed */
  missed: number[]
  hits: number
  misses: number
  falseAlarms: number
}

const contains = (b: Box, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h

/**
 * Kid-friendly scoring. A box finds an insect if it covers the insect's middle
 * and isn't way bigger than it (tiny insects get some slack), or if it overlaps
 * the insect well. Each insect can be found only once.
 */
export function judgeBoxes(guesses: Box[], answers: { box: Box; insect: boolean; unlisted?: boolean }[]): Judgement {
  const center = answers.map((a) => ({ x: a.box.x + a.box.w / 2, y: a.box.y + a.box.h / 2 }))
  const coversMiddle = (g: Box, ai: number) => contains(g, center[ai].x, center[ai].y)
  const tightEnough = (g: Box, a: Box) => g.w <= Math.max(4 * a.w, a.w + 60) && g.h <= Math.max(4 * a.h, a.h + 60)
  const good = (g: Box, ai: number) => {
    const a = answers[ai].box
    return (coversMiddle(g, ai) && tightEnough(g, a)) || iou(g, a) >= 0.2
  }

  const candidates: { g: number; a: number; v: number }[] = []
  guesses.forEach((g, gi) =>
    answers.forEach((ans, ai) => {
      if (ans.insect && good(g, ai))
        candidates.push({ g: gi, a: ai, v: iou(g, ans.box) + (coversMiddle(g, ai) ? 1 : 0) })
    }),
  )
  candidates.sort((p, q) => q.v - p.v)
  const verdicts: (Verdict | null)[] = guesses.map(() => null)
  const claimed = new Set<number>()
  for (const c of candidates) {
    if (verdicts[c.g] || claimed.has(c.a)) continue
    verdicts[c.g] = { kind: 'found', answer: c.a }
    claimed.add(c.a)
  }

  guesses.forEach((g, gi) => {
    if (verdicts[gi]) return
    const touching = answers.map((_, ai) => ai).filter((ai) => coversMiddle(g, ai) || iou(g, answers[ai].box) >= 0.2)
    const twice = touching.find((ai) => answers[ai].insect && claimed.has(ai) && good(g, ai))
    const big = touching.find((ai) => answers[ai].insect && !claimed.has(ai))
    const junk = touching.find((ai) => !answers[ai].insect && !answers[ai].unlisted)
    // anything smaller than 1 cm counts neither way
    const unlisted = answers.findIndex((a, ai) => a.unlisted && coversMiddle(g, ai))
    if (twice !== undefined) verdicts[gi] = { kind: 'twice', answer: twice }
    else if (big !== undefined) verdicts[gi] = { kind: 'too-big', answer: big }
    else if (junk !== undefined) verdicts[gi] = { kind: 'not-insect', answer: junk }
    else if (unlisted >= 0) verdicts[gi] = { kind: 'unlisted', answer: unlisted }
    else verdicts[gi] = { kind: 'empty' }
  })

  const missed = answers.map((a, ai) => (a.insect && !claimed.has(ai) ? ai : -1)).filter((ai) => ai >= 0)
  const hits = claimed.size
  const neither = verdicts.filter((v) => v?.kind === 'unlisted').length
  return {
    verdicts: verdicts as Verdict[],
    missed,
    hits,
    misses: missed.length,
    falseAlarms: guesses.length - hits - neither,
  }
}
