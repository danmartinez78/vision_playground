import { useMemo, useState } from 'react'
import type { Lab } from '../lab'
import { cropToDataUrl } from '../lib/geometry'
import type { AiGuess } from '../lib/identifier'
import { makeRng } from '../lib/rng'
import { speciesPicture } from '../lib/scene'
import { SPECIES, SPECIES_BY_ID } from '../lib/species'
import { truthName } from '../lib/truth'

const NOT_BUG = 'notbug'

/**
 * The field-guide choices for one close-up: the AI's answer, the real answer
 * and look-alikes, so a student checks by comparing pictures instead of
 * having to know every species.
 */
function choicesFor(id: string, g: AiGuess, real: string | null): string[] {
  const picks = new Set<string>()
  if (g.speciesId) picks.add(g.speciesId)
  if (real) picks.add(real)
  const anchor = SPECIES_BY_ID.get(g.speciesId ?? real ?? '')
  const rng = makeRng([...id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) >>> 0)
  const likes = SPECIES.filter((s) => !picks.has(s.id) && anchor && s.family === anchor.family)
  const sameOrder = SPECIES.filter((s) => !picks.has(s.id) && anchor && s.order === anchor.order)
  const rest = SPECIES.filter((s) => !picks.has(s.id))
  for (const pool of [likes, sameOrder, rest]) {
    const shuffled = [...pool].sort(() => rng() - 0.5)
    for (const s of shuffled) if (picks.size < 3) picks.add(s.id)
  }
  return [...picks].sort(() => rng() - 0.5)
}

export function StepReview({ lab }: { lab: Lab }) {
  const scene = lab.scene!
  const [pending, setPending] = useState<Record<string, string>>({})
  const closeUps = useMemo(
    () => new Map(lab.unsure.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)])),
    [lab.unsure, scene],
  )
  const pictures = useMemo(() => new Map(SPECIES.map((s) => [s.id, speciesPicture(s.id, 96)])), [])

  if (scene.source !== 'sample' || !lab.detector) {
    return (
      <section>
        <h2>Step 4: Check the AI's work</h2>
        <p className="warn">
          {scene.source !== 'sample'
            ? 'Checking AI answers needs AI answers, which come for your own photos in a later version. Try a sample photo.'
            : "Run the computer's detector in Step 2 first."}
        </p>
      </section>
    )
  }

  const realId = (id: string) => {
    const t = lab.truthFor.get(id)
    return t?.kind === 'insect' ? t.speciesId! : null
  }
  const conf = (g: AiGuess) => (g.speciesId ? g.species.confidence : g.order.confidence)
  const aiAloneRight = lab.cards.filter((d) => (lab.ai.get(d.id)?.speciesId ?? null) === realId(d.id)).length
  const teamRight = lab.cards.filter((d) => lab.finalLabel(d.id) === realId(d.id)).length
  const checked = lab.unsure.filter((d) => lab.reviewChoices[d.id] !== undefined).length
  const allChecked = checked === lab.unsure.length

  return (
    <section>
      <div className="intro">
        <h2>Step 4: Check the AI's work</h2>
        <p>
          Scientists don't just trust the AI. They check the answers it was <strong>least sure</strong> about. (The
          Mothbox team does this in a program called FiftyOne.) The AI was less than 50% sure about these{' '}
          <strong>{lab.unsure.length}</strong> of the {lab.cards.length} close-ups.
        </p>
        <p>
          <strong>Your job:</strong> compare each close-up with the field guide pictures. Does it match the AI's answer?
          If not, pick the one that matches better. Then press <em>Check</em>.
        </p>
      </div>

      {lab.unsure.length === 0 && <p>The AI was sure about every close-up this time. Try the warm summer night.</p>}

      <div className="review-list">
        {lab.unsure.map((d) => {
          const g = lab.ai.get(d.id)!
          const real = realId(d.id)
          const decided = lab.reviewChoices[d.id]
          const aiPick = g.speciesId ?? NOT_BUG
          const value = decided ?? pending[d.id] ?? aiPick
          const choices = choicesFor(d.id, g, real)
          const mine = decided === undefined ? undefined : decided === NOT_BUG ? null : decided
          const youRight = mine === real
          const aiRight = (g.speciesId ?? null) === real
          const choose = (v: string) => decided === undefined && setPending({ ...pending, [d.id]: v })
          return (
            <article key={d.id} className="review-card">
              <div className="review-head">
                <img src={closeUps.get(d.id)} alt="A close-up the AI was unsure about" width={132} height={132} />
                <div>
                  <div className="small muted">The AI says</div>
                  <strong className="ai-answer">{g.speciesId ? g.species.name : 'Not an insect'}</strong>
                  <div className="small muted">but it's only {Math.round(conf(g) * 100)}% sure.</div>
                </div>
              </div>

              <div className="small muted">Field guide: tap the one that matches the close-up.</div>
              <div className="guide-row" role="radiogroup" aria-label="Field guide">
                {choices.map((id) => {
                  const s = SPECIES_BY_ID.get(id)!
                  const cls = [
                    'guide-card',
                    value === id ? 'on' : '',
                    decided !== undefined && id === real ? 'truth' : '',
                  ].join(' ')
                  return (
                    <button
                      key={id}
                      role="radio"
                      aria-checked={value === id}
                      className={cls}
                      onClick={() => choose(id)}
                      disabled={decided !== undefined}
                    >
                      <img src={pictures.get(id)} alt="" width={96} height={96} />
                      <strong>{s.common}</strong>
                      <span className="small muted">{s.look}</span>
                      {id === g.speciesId && <span className="tag">AI's answer</span>}
                    </button>
                  )
                })}
                <button
                  role="radio"
                  aria-checked={value === NOT_BUG}
                  className={[
                    'guide-card notbug',
                    value === NOT_BUG ? 'on' : '',
                    decided !== undefined && real === null ? 'truth' : '',
                  ].join(' ')}
                  onClick={() => choose(NOT_BUG)}
                  disabled={decided !== undefined}
                >
                  <span className="notbug-icon" aria-hidden>
                    🍂
                  </span>
                  <strong>Not an insect</strong>
                  <span className="small muted">A leaf, twig or smudge.</span>
                  {!g.speciesId && <span className="tag">AI's answer</span>}
                </button>
              </div>

              {decided === undefined ? (
                <button
                  className="primary"
                  onClick={() => lab.setReviewChoices({ ...lab.reviewChoices, [d.id]: value })}
                >
                  {value === aiPick ? 'Check: I agree with the AI' : 'Check: I think the AI was wrong'}
                </button>
              ) : (
                <p className="answer">
                  It was really: <strong>{truthName(lab.truthFor.get(d.id))}</strong>.{' '}
                  <span className={youRight ? 'good-text' : 'bad-text'}>
                    {youRight ? '✓ You were right' : '✗ You missed it'}
                  </span>
                  {' · '}
                  <span className={aiRight ? 'good-text' : 'bad-text'}>
                    {aiRight ? '✓ The AI was right' : '✗ The AI was wrong'}
                  </span>
                </p>
              )}
            </article>
          )
        })}
      </div>

      {lab.unsure.length > 0 && (
        <div className="computer-turn">
          <div>
            <h3>AI alone vs. AI + you</h3>
            {allChecked ? (
              <>
                <div className="score">
                  <strong>Right answers</strong>
                  <span className="pill">
                    AI alone: {aiAloneRight} of {lab.cards.length}
                  </span>
                  <span className="pill good">
                    AI + you: {teamRight} of {lab.cards.length}
                  </span>
                </div>
                <p className="small">
                  You only had to check <strong>{lab.unsure.length}</strong> of {lab.cards.length} close-ups. The AI
                  handled the easy ones and you spent your time on the hard ones. That's how scientists use AI: as a
                  helper, not a replacement.
                </p>
              </>
            ) : (
              <p>
                Check all {lab.unsure.length} close-ups to see if you made the AI's results better (
                {lab.unsure.length - checked} to go).
              </p>
            )}
          </div>
        </div>
      )}

      <details className="callout">
        <summary>Tip: the three brown pest moths</summary>
        <p>
          Fall armyworm, corn earworm and black cutworm moths are all brown moths in the same family (Noctuidae). Look
          at how dark the wings are and whether there's a pale spot. Even experts look closely at wing markings to tell
          them apart. That's exactly where an AI needs a human to check its work.
        </p>
      </details>
    </section>
  )
}
