// BioCLIP's species answers for the moths in the lesson photos. BioCLIP is far
// too big for a browser, so it was run once ahead of time on the full-size
// photos (see docs/bioclip.md) and its top 3 guesses were saved here.
import { SAMPLES_DIR } from './samples'

export interface SpeciesGuess {
  name: string
  confidence: number
}

/** Image name → expert box index → BioCLIP's top guesses, surest first. */
type Answers = Record<string, Record<string, [string, number][]>>

let loading: Promise<Answers> | null = null

function loadAnswers(): Promise<Answers> {
  loading ??= fetch(`${SAMPLES_DIR}bioclip.json`).then((r) => {
    if (!r.ok) throw new Error(`bioclip.json: ${r.status}`)
    return r.json() as Promise<Answers>
  })
  loading.catch(() => {
    loading = null
  })
  return loading
}

/** BioCLIP's guesses for one photo, by expert box index. */
export async function bioclipFor(image: string): Promise<Map<number, SpeciesGuess[]>> {
  const all = await loadAnswers()
  const out = new Map<number, SpeciesGuess[]>()
  for (const [i, top] of Object.entries(all[image] ?? {}))
    out.set(
      Number(i),
      top.map(([name, confidence]) => ({ name, confidence })),
    )
  return out
}

/** True for a two-word scientific name like "Eilema lurideola" (not a genus or family). */
export const isSpecies = (name: string) => /^[A-Z][a-z]+ [a-z-]+$/.test(name)

/** An example close-up of a species from the training photos, for the field guide. */
export const speciesPicture = (name: string) => `${SAMPLES_DIR}species/${name.replace(/ /g, '_')}.jpg`
