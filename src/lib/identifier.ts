// Practice identifier: makes believable moth / not-a-moth answers until a real
// classifier's results are added.
import { between, makeRng } from './rng'
import type { RealGroup, TruthItem } from './types'

function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}

const round = (v: number) => Math.round(v * 100) / 100

export interface MothGuess {
  group: RealGroup
  confidence: number
}

/**
 * Practice moth / not-a-moth answers for the real photos, in the spirit of the
 * moth-or-not classifier the AMI project runs: usually right and sure, less
 * sure on small insects, and it sometimes calls an empty spot an insect.
 */
export function identifyMoth(sceneKey: string, detectionId: string, truth: TruthItem | undefined): MothGuess {
  const rng = makeRng(hashId(sceneKey + detectionId))
  const flip = (g: RealGroup): RealGroup => (g === 'moth' ? 'other' : 'moth')

  if (!truth?.label) {
    if (rng() < 0.5) return { group: 'notbug', confidence: round(between(rng, 0.45, 0.7)) }
    return { group: rng() < 0.5 ? 'moth' : 'other', confidence: round(between(rng, 0.3, 0.55)) }
  }
  const real = truth.label.group
  if (real === 'unknown') return { group: rng() < 0.5 ? 'moth' : 'other', confidence: round(between(rng, 0.3, 0.55)) }

  // mostly right and sure; wrong answers come with low confidence, which is
  // what makes checking only the unsure ones worth it
  if (rng() < 0.85) {
    if (rng() < 0.1) return { group: real, confidence: round(between(rng, 0.4, 0.58)) }
    const small = truth.box.w * truth.box.h < 2500 ? 0.1 : 0
    return { group: real, confidence: round(between(rng, 0.7, 0.98) - small) }
  }
  return { group: flip(real), confidence: round(between(rng, 0.35, 0.58)) }
}
