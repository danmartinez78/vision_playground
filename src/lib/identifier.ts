// Practice identifier. The real Mothbox pipeline names each close-up with
// BioCLIP. Until we add real AI results, this file makes believable guesses:
// for the drawn night, very sure about the order, less sure about the family,
// and often unsure (or wrong) about look-alike species; for real photos, moth
// or not a moth.
import { between, makeRng } from './rng'
import { SPECIES, SPECIES_BY_ID } from './species'
import type { RealGroup, TruthItem } from './types'

export interface Level {
  name: string
  confidence: number
}

export interface AiGuess {
  order: Level
  family: Level
  species: Level & { id: string | null }
  /** The guess the AI would act on: a species id, or null for "not an insect". */
  speciesId: string | null
}

const ORDERS = [...new Set(SPECIES.map((s) => s.order))]

function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}

const round = (v: number) => Math.round(v * 100) / 100

export function identify(sceneKey: string, detectionId: string, truth: TruthItem | undefined): AiGuess {
  const rng = makeRng(hashId(sceneKey + detectionId))

  if (!truth || truth.kind === 'debris' || !truth.speciesId) {
    // not really an insect: low confidence everywhere, sometimes it notices
    if (rng() < 0.55) {
      return {
        order: { name: 'Not an insect', confidence: round(between(rng, 0.5, 0.8)) },
        family: { name: '—', confidence: 0 },
        species: { id: null, name: '—', confidence: 0 },
        speciesId: null,
      }
    }
    const s = SPECIES[Math.floor(rng() * SPECIES.length)]
    return {
      order: { name: s.order, confidence: round(between(rng, 0.25, 0.5)) },
      family: { name: s.family, confidence: round(between(rng, 0.15, 0.35)) },
      species: { id: s.id, name: s.common, confidence: round(between(rng, 0.08, 0.25)) },
      speciesId: s.id,
    }
  }

  const real = SPECIES_BY_ID.get(truth.speciesId)!
  const tiny = truth.box.w * truth.box.h < 1600
  const penalty = tiny ? 0.15 : 0

  const orderRight = rng() < 0.97
  const orderName = orderRight
    ? real.order
    : ORDERS.filter((o) => o !== real.order)[Math.floor(rng() * (ORDERS.length - 1))]
  const order = { name: orderName, confidence: round(between(rng, 0.85, 0.99) - penalty) }

  const sameOrder = SPECIES.filter((s) => s.order === orderName)
  const familyRight = orderRight && rng() < 0.88
  const familyPick = familyRight ? real : sameOrder[Math.floor(rng() * sameOrder.length)]
  const family = { name: familyPick.family, confidence: round(between(rng, 0.6, 0.9) - penalty) }

  // look-alikes: the three crop-pest moths are all brown noctuids
  const lookAlikes = SPECIES.filter((s) => s.family === familyPick.family)
  const hard = lookAlikes.length > 1 && familyPick.family === 'Noctuidae'
  const speciesRight = familyRight && rng() < (hard ? 0.55 : 0.85)
  const speciesPick = speciesRight
    ? real
    : (lookAlikes.filter((s) => s.id !== real.id)[Math.floor(rng() * Math.max(1, lookAlikes.length - 1))] ?? familyPick)
  const species = {
    id: speciesPick.id,
    name: speciesPick.common,
    confidence: round((hard ? between(rng, 0.3, 0.62) : between(rng, 0.6, 0.92)) - penalty),
  }
  return { order, family, species, speciesId: speciesPick.id }
}

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
