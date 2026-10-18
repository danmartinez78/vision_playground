import { useMemo, useState } from 'react'
import type { Lab } from '../lab'
import { cropToDataUrl } from '../lib/geometry'
import { SPECIES, SPECIES_BY_ID } from '../lib/species'
import { truthName } from '../lib/truth'
import { AiLadder } from './StepSort'

export function StepReview({ lab }: { lab: Lab }) {
  const scene = lab.scene!
  const [pending, setPending] = useState<Record<string, string>>({})
  const closeUps = useMemo(
    () => new Map(lab.unsure.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)])),
    [lab.unsure, scene],
  )

  if (scene.source !== 'sample' || !lab.detector) {
    return (
      <section>
        <h2>Step 6: Check the AI's work</h2>
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
  const conf = (id: string) => {
    const g = lab.ai.get(id)!
    return g.speciesId ? g.species.confidence : g.order.confidence
  }
  const aiAloneRight = lab.cards.filter((d) => (lab.ai.get(d.id)?.speciesId ?? null) === realId(d.id)).length
  const teamRight = lab.cards.filter((d) => lab.finalLabel(d.id) === realId(d.id)).length
  const checked = lab.unsure.filter((d) => lab.reviewChoices[d.id] !== undefined).length
  const allChecked = checked === lab.unsure.length

  return (
    <section>
      <div className="intro">
        <h2>Step 6: Check the AI's work</h2>
        <p>
          Scientists don't just trust the AI. They check the answers it was <strong>least sure</strong> about. (The
          Mothbox team does this in a program called FiftyOne.) The AI was less than 50% sure about these{' '}
          <strong>{lab.unsure.length}</strong> of the {lab.cards.length} close-ups.
        </p>
        <p>
          <strong>You decide first:</strong> pick what you think each one is, then press <em>Check</em> to see what the
          AI said and the right answer.
        </p>
      </div>

      {lab.unsure.length === 0 && <p>The AI was sure about every close-up this time. Try the warm summer night.</p>}

      <div className="review-list">
        {lab.unsure.map((d) => {
          const g = lab.ai.get(d.id)!
          const decided = lab.reviewChoices[d.id]
          const value = decided ?? pending[d.id] ?? ''
          const mine = decided === undefined ? undefined : decided === 'notbug' ? null : decided
          const youRight = mine === realId(d.id)
          const aiRight = (g.speciesId ?? null) === realId(d.id)
          return (
            <article key={d.id} className="review-row">
              <img src={closeUps.get(d.id)} alt="A close-up the AI was unsure about" width={132} height={132} />
              <div>
                <p className="small muted">The AI was only {Math.round(conf(d.id) * 100)}% sure about this one.</p>
                <label className="review-pick">
                  Your call:
                  <select
                    value={value}
                    disabled={decided !== undefined}
                    onChange={(e) => setPending({ ...pending, [d.id]: e.target.value })}
                  >
                    <option value="" disabled>
                      Pick one…
                    </option>
                    {SPECIES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.common}
                      </option>
                    ))}
                    <option value="notbug">Not an insect</option>
                  </select>
                  {decided === undefined && (
                    <button
                      className="primary"
                      disabled={!value}
                      onClick={() => lab.setReviewChoices({ ...lab.reviewChoices, [d.id]: value })}
                    >
                      Check
                    </button>
                  )}
                </label>
                {decided !== undefined && (
                  <>
                    <div className="small muted">The AI said:</div>
                    <AiLadder g={g} />
                    <p className="answer">
                      It was really: <strong>{truthName(lab.truthFor.get(d.id))}</strong>
                      {realId(d.id) && <span className="muted"> ({SPECIES_BY_ID.get(realId(d.id)!)!.note})</span>}
                    </p>
                    <p className="small">
                      <span className={youRight ? 'good-text' : 'bad-text'}>
                        {youRight ? '✓ You were right' : '✗ You missed it'}
                      </span>
                      {' · '}
                      <span className={aiRight ? 'good-text' : 'bad-text'}>
                        {aiRight ? '✓ The AI was right' : '✗ The AI was wrong'}
                      </span>
                    </p>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {lab.unsure.length > 0 && (
        <div className="computer-turn">
          {allChecked ? (
            <div>
              <h3>AI alone vs. AI + you</h3>
              <div className="score">
                <strong>Right species</strong>
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
            </div>
          ) : (
            <div>
              <h3>AI alone vs. AI + you</h3>
              <p>
                Check all {lab.unsure.length} close-ups to see if you made the AI's results better (
                {lab.unsure.length - checked} to go).
              </p>
            </div>
          )}
        </div>
      )}

      <details className="callout">
        <summary>Tip: the three brown pest moths</summary>
        <p>
          Fall armyworm, corn earworm and black cutworm moths are all brown moths in the same family (Noctuidae). Even
          experts look closely at wing markings to tell them apart. That's exactly where an AI needs a human to check
          its work.
        </p>
      </details>
    </section>
  )
}
