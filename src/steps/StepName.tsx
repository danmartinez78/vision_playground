import { useEffect, useMemo, useState } from 'react'
import type { Lab } from '../lab'
import { bioclipFor, isSpecies, loadGuide, speciesPicture, type GuideEntry, type SpeciesGuess } from '../lib/bioclip'
import { cropToDataUrl } from '../lib/geometry'
import type { TruthItem } from '../lib/types'

/** How many moths to name on one photo. */
const MAX_CARDS = 8

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * The experts' species plus look-alikes from the field guide (same genus
 * first, then same family), so every choice has a picture and the right one
 * doesn't stand out.
 */
function choicesFor(real: string, guide: GuideEntry[], seed: string): string[] {
  const me = guide.find((g) => g.species === real)
  const others = guide.filter((g) => g.species !== real)
  const sameGenus = mixed(
    others.filter((g) => me && g.genus === me.genus).map((g) => g.species),
    seed,
  )
  const sameFamily = mixed(
    others.filter((g) => me && g.genus !== me.genus && g.family === me.family).map((g) => g.species),
    seed,
  )
  const anyOther = mixed(
    others.map((g) => g.species),
    seed,
  )
  const picks = [...new Set([...sameGenus, ...sameFamily, ...anyOther])].slice(0, 3)
  return mixed([real, ...picks], seed)
}

/** The same order every time for the same moth, so the AI's answer isn't always first. */
const mixed = (names: string[], seed: string) => [...names].sort((a, b) => hash(seed + a) - hash(seed + b))

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

function SpeciesPicture({ name }: { name: string }) {
  const [missing, setMissing] = useState(false)
  if (missing) return <span className="species-blank" aria-hidden />
  return <img src={speciesPicture(name)} alt="" width={96} height={96} onError={() => setMissing(true)} />
}

interface Card {
  id: string
  truth: TruthItem
  top: SpeciesGuess[]
  choices: string[]
}

/** Step 4: name each moth, then compare with BioCLIP and the experts. */
export function StepName({ lab }: { lab: Lab }) {
  const scene = lab.scene!
  const image = scene.key.replace(/^ami-/, '')
  const [answers, setAnswers] = useState<{ top: Map<number, SpeciesGuess[]>; guide: GuideEntry[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [picks, setPicks] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!scene.real) return
    let stale = false
    Promise.all([bioclipFor(image), loadGuide()])
      .then(([top, guide]) => !stale && setAnswers({ top, guide }))
      .catch((e) => {
        console.warn('BioCLIP answers could not load', e)
        if (!stale) setFailed(true)
      })
    return () => {
      stale = true
    }
  }, [image, scene.real])

  // the moths the detector found and the experts named to species, once each
  const cards = useMemo(() => {
    const cards: Card[] = []
    if (!answers) return cards
    const seen = new Set<string>()
    for (const d of lab.kept) {
      const truth = lab.truthFor.get(d.id)
      if (!truth?.label || truth.label.group !== 'moth' || seen.has(truth.id)) continue
      const top = answers.top.get(Number(truth.id.slice(1)))
      if (!top?.length) continue
      seen.add(truth.id)
      if (!isSpecies(truth.label.name) || cards.length >= MAX_CARDS) continue
      cards.push({ id: d.id, truth, top, choices: choicesFor(truth.label.name, answers.guide, truth.id) })
    }
    return cards
  }, [answers, lab.kept, lab.truthFor])

  const closeUps = useMemo(
    () => new Map(cards.map((c) => [c.id, cropToDataUrl(scene.canvas, c.truth.box)])),
    [cards, scene],
  )

  const intro = (
    <div className="intro">
      <h2>Step 4: Name the moth</h2>
      <p>
        Counting moths is only half the job. Scientists also want to know <em>which kinds</em> came. Match each moth to
        a field-guide picture, then see how an AI did.
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
          The experts didn't name the kind of any moth on this photo, so there's nothing to match. Pick another photo in
          Step 1, or go on to the next step.
        </p>
      </section>
    )
  }

  const picked = cards.filter((c) => picks[c.id]).length
  const allPicked = picked === cards.length
  const youRight = cards.filter((c) => picks[c.id] === c.truth.label!.name).length
  const aiRight = cards.filter((c) => c.top[0].name === c.truth.label!.name).length

  return (
    <section>
      {intro}
      <p>
        <strong>Your turn:</strong> tap the field-guide picture that looks most like each moth.
      </p>

      <div className="toolbar">
        <span>
          Named <strong>{picked}</strong> of {cards.length} moths
        </span>
      </div>

      <div className="review-list">
        {cards.map((c) => {
          const pick = picks[c.id]
          const real = c.truth.label!.name
          const ai = c.top[0]
          return (
            <article key={c.id} className="review-card">
              <div className="review-head">
                <img src={closeUps.get(c.id)} alt="A moth from the photo" width={132} height={132} />
                {revealed && (
                  <div>
                    <div className="small muted">BioCLIP says</div>
                    <strong className="ai-answer">
                      <i>{ai.name}</i>
                    </strong>
                    <Bar value={ai.confidence} />
                  </div>
                )}
              </div>
              <div className="guide-row" role="radiogroup" aria-label="Which moth is it?">
                {c.choices.map((name) => (
                  <button
                    key={name}
                    role="radio"
                    aria-checked={pick === name}
                    className={['guide-card', pick === name ? 'on' : '', revealed && name === real ? 'truth' : ''].join(
                      ' ',
                    )}
                    onClick={() => !revealed && setPicks({ ...picks, [c.id]: name })}
                    disabled={revealed}
                  >
                    <SpeciesPicture name={name} />
                    <i className="small">{name}</i>
                    {revealed && name === ai.name && <span className="tag">BioCLIP</span>}
                  </button>
                ))}
              </div>
              {revealed && (
                <p className="answer small">
                  Experts: <strong>{real}</strong>.{' '}
                  <span className={pick === real ? 'good-text' : 'bad-text'}>
                    {pick === real ? '✓ You were right' : '✗ You missed it'}
                  </span>
                  {' · '}
                  <span className={ai.name === real ? 'good-text' : 'bad-text'}>
                    {ai.name === real ? '✓ BioCLIP was right' : '✗ BioCLIP was wrong'}
                  </span>
                </p>
              )}
            </article>
          )
        })}
      </div>

      <div className="computer-turn">
        {revealed ? (
          <div>
            <h3>You vs. BioCLIP</h3>
            <div className="score">
              <strong>Right species</strong>
              <span className="pill good">
                You: {youRight} of {cards.length}
              </span>
              <span className="pill">
                BioCLIP: {aiRight} of {cards.length}
              </span>
            </div>
            <p className="small">
              Naming moths is hard for people and for AI, because many kinds look almost the same. Check the bars: when
              BioCLIP is very sure, it's usually right. Scientists double-check the unsure ones.
            </p>
          </div>
        ) : (
          <>
            <div>
              <h3>BioCLIP's turn</h3>
              <p>
                <strong>BioCLIP</strong> is a big AI that has seen photos of hundreds of thousands of kinds of living
                things. It's too big for your browser, so we ran it on these photos ahead of time.{' '}
                {allPicked ? '' : `Match all ${cards.length} moths first (${cards.length - picked} to go).`}
              </p>
            </div>
            <button className="primary big" onClick={() => setRevealed(true)} disabled={!allPicked}>
              ▶ Show BioCLIP's answers
            </button>
          </>
        )}
      </div>
    </section>
  )
}
