import { useEffect, useMemo, useState } from 'react'
import type { Lab } from '../lab'
import { bioclipFor, isSpecies, speciesPicture, type SpeciesGuess } from '../lib/bioclip'
import { cropToDataUrl } from '../lib/geometry'
import { inLesson, loadSamples } from '../lib/samples'
import type { TruthItem } from '../lib/types'

/** How many moths to show on one photo. */
const MAX_CARDS = 8

/** BioCLIP counts as "sure" at or above this. */
const SURE = 0.7

/** How often BioCLIP was right when sure and when unsure, over every expert-named moth on the lesson photos. */
interface Tally {
  sure: [right: number, total: number]
  unsure: [right: number, total: number]
}

async function lessonTally(): Promise<Tally> {
  const t: Tally = { sure: [0, 0], unsure: [0, 0] }
  for (const s of (await loadSamples()).filter(inLesson)) {
    const answers = await bioclipFor(s.image)
    s.labels?.forEach((name, i) => {
      const ai = answers.get(i)?.[0]
      if (!ai || !isSpecies(name)) return
      const row = ai.confidence >= SURE ? t.sure : t.unsure
      row[1]++
      if (ai.name === name) row[0]++
    })
  }
  return t
}

function Bar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const tone = pct >= 80 ? 'high' : pct >= 55 ? 'mid' : 'low'
  return (
    <span className={`bar ${tone}`} aria-label={`${pct} percent sure`}>
      <span style={{ width: `${pct}%` }} />
      <em>{pct}%</em>
    </span>
  )
}

/** A field-guide picture with a caption, left out when the guide has no picture of that kind. */
function GuidePicture({ name, caption }: { name: string; caption: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return null
  return (
    <figure>
      <img src={speciesPicture(name)} alt="" width={96} height={96} onError={() => setMissing(true)} />
      <figcaption className="small muted">{caption}</figcaption>
    </figure>
  )
}

interface Card {
  id: string
  truth: TruthItem
  ai: SpeciesGuess
}

/** Step 4: see how BioCLIP named the moths, and how often it was right. */
export function StepName({ lab }: { lab: Lab }) {
  const scene = lab.scene!
  const image = scene.key.replace(/^ami-/, '')
  const [answers, setAnswers] = useState<Map<number, SpeciesGuess[]> | null>(null)
  const [failed, setFailed] = useState(false)
  const [tally, setTally] = useState<Tally | null>(null)

  useEffect(() => {
    lessonTally()
      .then(setTally)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!scene.real) return
    let stale = false
    bioclipFor(image)
      .then((top) => !stale && setAnswers(top))
      .catch((e) => {
        console.warn('BioCLIP answers could not load', e)
        if (!stale) setFailed(true)
      })
    return () => {
      stale = true
    }
  }, [image, scene.real])

  // the moths the detector found and the experts named to species, once each, surest first
  const cards = useMemo(() => {
    const cards: Card[] = []
    if (!answers) return cards
    const seen = new Set<string>()
    for (const d of lab.kept) {
      const truth = lab.truthFor.get(d.id)
      if (!truth?.label || truth.label.group !== 'moth' || seen.has(truth.id)) continue
      if (!isSpecies(truth.label.name)) continue
      const ai = answers.get(Number(truth.id.slice(1)))?.[0]
      if (!ai) continue
      seen.add(truth.id)
      cards.push({ id: d.id, truth, ai })
    }
    return cards.sort((a, b) => b.ai.confidence - a.ai.confidence).slice(0, MAX_CARDS)
  }, [answers, lab.kept, lab.truthFor])

  const closeUps = useMemo(
    () => new Map(cards.map((c) => [c.id, cropToDataUrl(scene.canvas, c.truth.box)])),
    [cards, scene],
  )

  const intro = (
    <div className="intro">
      <h2>Step 4: Name the moth</h2>
      <p>
        Counting moths is only half the job. Scientists also want to know <em>which kinds</em> came. We ran a big AI
        called <strong>BioCLIP</strong> on your photo ahead of time (it's too big for a browser). It has seen photos of
        hundreds of thousands of kinds of living things. Here's what it said about each moth, next to what the experts
        said.
      </p>
    </div>
  )

  if (!lab.detector) {
    return (
      <section>
        {intro}
        <p className="warn">Run the computer's detector in Step 2 first.</p>
      </section>
    )
  }
  if (failed) {
    return (
      <section>
        {intro}
        <p className="warn">BioCLIP's answers couldn't load. Check your connection and try again.</p>
      </section>
    )
  }
  if (!answers) {
    return (
      <section>
        {intro}
        <p className="muted">Loading BioCLIP's answers…</p>
      </section>
    )
  }
  if (!cards.length) {
    return (
      <section>
        {intro}
        <p>
          The experts didn't name the kind of any moth on this photo, so there's nothing to compare. Pick another photo
          in Step 1, or go on to the next step.
        </p>
      </section>
    )
  }

  const right = (c: Card) => c.ai.name === c.truth.label!.name
  const sure = cards.filter((c) => c.ai.confidence >= SURE)
  const unsure = cards.filter((c) => c.ai.confidence < SURE)

  return (
    <section>
      {intro}

      <div className="score">
        <strong>BioCLIP got</strong>
        <span className={cards.filter(right).length * 2 >= cards.length ? 'pill good' : 'pill bad'}>
          {cards.filter(right).length} of {cards.length} right
        </span>
        {sure.length > 0 && (
          <span className="pill">
            Sure: {sure.filter(right).length} of {sure.length}
          </span>
        )}
        {unsure.length > 0 && (
          <span className="pill">
            Unsure: {unsure.filter(right).length} of {unsure.length}
          </span>
        )}
      </div>

      <div className="review-list">
        {cards.map((c) => {
          const real = c.truth.label!.name
          return (
            <article key={c.id} className="review-card name-card">
              <figure>
                <img src={closeUps.get(c.id)} alt="A moth from the photo" width={96} height={96} />
                <figcaption className="small muted">The moth</figcaption>
              </figure>
              <GuidePicture name={c.ai.name} caption="BioCLIP's pick" />
              {!right(c) && <GuidePicture name={real} caption="Experts' answer" />}
              <div className="name-answer">
                <div className="small muted">BioCLIP says</div>
                <strong className="ai-answer">
                  <i>{c.ai.name}</i>
                </strong>
                <Bar value={c.ai.confidence} />
                <p className="small">
                  {right(c) ? (
                    <span className="good-text">✓ Right</span>
                  ) : (
                    <>
                      <span className="bad-text">✗ Wrong.</span> Experts say <i>{real}</i>.
                    </>
                  )}
                </p>
              </div>
            </article>
          )
        })}
      </div>

      <p>
        Many kinds of moths look almost the same, so naming them is hard for people and for AI.{' '}
        {tally && (
          <>
            On all {tally.sure[1] + tally.unsure[1]} named moths in this lesson, BioCLIP was right{' '}
            <strong>
              {tally.sure[0]} of {tally.sure[1]}
            </strong>{' '}
            times when it was sure ({SURE * 100}% or more), but only{' '}
            <strong>
              {tally.unsure[0]} of {tally.unsure[1]}
            </strong>{' '}
            times when it wasn't.{' '}
          </>
        )}
        BioCLIP is a helper, not the final judge. Experts check its answers, especially the unsure ones, and every
        answer they fix can be used to train a better model. You'll do that kind of checking in the next step.
      </p>
    </section>
  )
}
