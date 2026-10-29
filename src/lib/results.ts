import type { Lab, ScaleUpTimes } from '../lab'
import { realRight } from './truth'
import type { Box } from './types'

/** The numbers from one run through the lesson, for the results card, its report and its slide. */
export interface LabResults {
  photo: string
  /** A real insect-monitor photo from AMI-Traps (not drawn, not the student's own). */
  real: boolean
  /** Insects the experts boxed on the photo (null on a photo with no answer key). */
  insects: number | null
  guess: string
  you: {
    boxes: number
    found: number | null
    missed: number | null
    falseAlarms: number | null
    seconds: number | null
  }
  ai: {
    found: number | null
    missed: number | null
    falseAlarms: number | null
    seconds: number | null
    saved: boolean
    spotFinder: boolean
  }
  /** Moth or not: how many close-ups each got right (scored ones only). */
  sort: { scored: number; you: number; ai: number } | null
  /** Checking the AI's least-sure answers. */
  review: { checked: number; aiWrong: number; fixed: number; aiAlone: number; team: number; scored: number } | null
  scaleUp: ScaleUpTimes | null
}

export function labResults(lab: Lab): LabResults {
  const scene = lab.scene
  const { start, end } = lab.handTimer
  const scored = lab.cards.filter((d) => lab.scored(d.id))
  const right = (id: string, g: Parameters<typeof realRight>[0]) => realRight(g, lab.truthFor.get(id))
  const sorted = scored.filter((d) => lab.sortChoices[d.id]).length
  const checked = lab.unsure.filter((d) => lab.reviewChoices[d.id] !== undefined)
  const reviewScored = checked.filter((d) => lab.scored(d.id))
  return {
    photo: scene?.title ?? '',
    real: !!scene?.real,
    insects: lab.detectorScore?.total ?? lab.studentScore?.total ?? null,
    guess: lab.guess,
    you: {
      boxes: lab.studentBoxes.length,
      found: lab.studentScore?.hits ?? null,
      missed: lab.studentScore?.misses ?? null,
      falseAlarms: lab.studentScore?.falseAlarms ?? null,
      seconds: start && end ? (end - start) / 1000 : null,
    },
    ai: {
      found: lab.detectorScore?.hits ?? (lab.detector ? lab.kept.length : null),
      missed: lab.detectorScore?.misses ?? null,
      falseAlarms: lab.detectorScore?.falseAlarms ?? null,
      seconds: lab.detector && lab.detector.engine !== 'saved' ? lab.detector.millis / 1000 : null,
      saved: lab.detector?.engine === 'saved',
      spotFinder: lab.detector?.engine === 'simple',
    },
    sort:
      scored.length && sorted
        ? {
            scored: scored.length,
            you: scored.filter((d) => right(d.id, lab.sortChoices[d.id])).length,
            ai: scored.filter((d) => right(d.id, lab.mothAi.get(d.id)?.group ?? 'notbug')).length,
          }
        : null,
    review: checked.length
      ? {
          checked: checked.length,
          aiWrong: reviewScored.filter((d) => !right(d.id, lab.mothAi.get(d.id)?.group)).length,
          fixed: reviewScored.filter(
            (d) => !right(d.id, lab.mothAi.get(d.id)?.group) && right(d.id, lab.finalLabel(d.id) ?? 'notbug'),
          ).length,
          aiAlone: scored.filter((d) => right(d.id, lab.mothAi.get(d.id)?.group)).length,
          team: scored.filter((d) => right(d.id, lab.finalLabel(d.id) ?? 'notbug')).length,
          scored: scored.length,
        }
      : null,
    scaleUp: lab.scaleUp,
  }
}

export const YOU_COLOR = '#2563eb'
export const AI_COLOR = '#e11d74'

/** The photo with the student's boxes (blue) and the AI's boxes (pink), as a JPEG. */
export function resultsPhoto(canvas: HTMLCanvasElement, yours: Box[], ai: Box[], maxWidth = 1400): string | null {
  const scale = Math.min(1, maxWidth / canvas.width)
  const out = document.createElement('canvas')
  out.width = Math.round(canvas.width * scale)
  out.height = Math.round(canvas.height * scale)
  const ctx = out.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(canvas, 0, 0, out.width, out.height)
  const line = Math.max(2, Math.round(out.width / 400))
  const draw = (boxes: Box[], color: string, inset: number) => {
    ctx.strokeStyle = color
    ctx.lineWidth = line
    for (const b of boxes)
      ctx.strokeRect(b.x * scale - inset, b.y * scale - inset, b.w * scale + 2 * inset, b.h * scale + 2 * inset)
  }
  // the student's boxes sit just outside the AI's, so both show on the same insect
  draw(ai, AI_COLOR, 0)
  draw(yours, YOU_COLOR, line + 1)
  try {
    return out.toDataURL('image/jpeg', 0.82)
  } catch {
    return null
  }
}
