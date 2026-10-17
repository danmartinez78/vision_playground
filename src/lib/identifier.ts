// Practice identifier. The real Mothbox pipeline names each crop with
// BioCLIP. Until we add real BioCLIP results for real photos, this file makes
// believable guesses for the sample nights: very sure about the order, less
// sure about the family, and often unsure (or wrong) about look-alike species.
import { between, makeRng } from './rng'
import { SPECIES, SPECIES_BY_ID } from './species'
import type { TruthItem } from './types'

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
  const orderName = orderRight ? real.order : ORDERS.filter((o) => o !== real.order)[Math.floor(rng() * (ORDERS.length - 1))]
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
    : lookAlikes.filter((s) => s.id !== real.id)[Math.floor(rng() * Math.max(1, lookAlikes.length - 1))] ?? familyPick
  const species = {
    id: speciesPick.id,
    name: speciesPick.common,
    confidence: round((hard ? between(rng, 0.3, 0.62) : between(rng, 0.55, 0.9)) - penalty),
  }
  return { order, family, species, speciesId: speciesPick.id }
}
