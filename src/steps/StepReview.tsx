import { useMemo } from 'react'
import type { Lab } from '../lab'
import { cropToDataUrl } from '../lib/geometry'
import { SPECIES, SPECIES_BY_ID } from '../lib/species'
import { truthName } from '../lib/truth'
import { AiLadder } from './StepSort'

export function StepReview({ lab }: { lab: Lab }) {
  const scene = lab.scene!
  const crops = useMemo(() => new Map(lab.unsure.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)])), [lab.unsure, scene])

  if (scene.source !== 'sample' || !lab.detector) {
    return (
      <section>
        <h2>Step 4: Be the reviewer</h2>
        <p className="warn">
          {scene.source !== 'sample'
            ? 'Reviewing AI guesses needs AI guesses, which come for your own photos in a later version. Try a sample night.'
            : 'Run the detector in Step 2 first.'}
        </p>
      </section>
    )
  }

  const realId = (id: string) => {
    const t = lab.truthFor.get(id)
    return t?.kind === 'insect' ? t.speciesId! : null
  }
  const aiAloneRight = lab.cards.filter((d) => (lab.ai.get(d.id)?.speciesId ?? null) === realId(d.id)).length
  const teamRight = lab.cards.filter((d) => lab.finalLabel(d.id) === realId(d.id)).length
  const reviewed = lab.unsure.filter((d) => lab.reviewChoices[d.id] !== undefined).length

  return (
    <section>
      <div className="intro">
        <h2>Step 4: Be the reviewer</h2>
        <p>
          Scientists don't just trust the AI. They check the guesses it was <strong>least sure</strong> about. The Mothbox
          team does this in a tool called FiftyOne. Here are the {lab.unsure.length} cards where the AI was under 60% sure.
          Keep its guess or pick a better one.
        </p>
      </div>

      <div className="callout">
        <div className="score">
          <strong>Right species</strong>
          <span className="pill">AI alone: {aiAloneRight} of {lab.cards.length}</span>
          <span className="pill good">AI + you: {teamRight} of {lab.cards.length}</span>
          <span className="muted small">
            Reviewed {reviewed} of {lab.unsure.length}
          </span>
        </div>
      </div>

      {lab.unsure.length === 0 && <p>The AI was sure about every card this time. Try the warm summer night.</p>}

      <div className="review-list">
        {lab.unsure.map((d) => {
          const g = lab.ai.get(d.id)!
          const chosen = lab.reviewChoices[d.id]
          const value = chosen ?? (g.speciesId ?? 'notbug')
          const decided = chosen !== undefined
          const right = (value === 'notbug' ? null : value) === realId(d.id)
          return (
            <article key={d.id} className="review-row">
              <img src={crops.get(d.id)} alt="A crop the AI was unsure about" width={132} height={132} />
              <div>
                <AiLadder g={g} />
                <label className="review-pick">
                  Your call:
                  <select value={value} onChange={(e) => lab.setReviewChoices({ ...lab.reviewChoices, [d.id]: e.target.value })}>
                    {SPECIES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.common}
                      </option>
                    ))}
                    <option value="notbug">Not an insect</option>
                  </select>
                  {!decided && (
                    <button className="ghost" onClick={() => lab.setReviewChoices({ ...lab.reviewChoices, [d.id]: value })}>
                      Keep AI guess
                    </button>
                  )}
                </label>
                {decided && (
                  <p className={right ? 'answer good-text' : 'answer bad-text'}>
                    {right ? '✓ Correct: ' : '✗ It was really: '}
                    <strong>{truthName(lab.truthFor.get(d.id))}</strong>
                    {realId(d.id) && <span className="muted"> ({SPECIES_BY_ID.get(realId(d.id)!)!.note})</span>}
                  </p>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <details className="callout">
        <summary>Tip: the three brown pest moths</summary>
        <p>
          Fall armyworm, corn earworm and black cutworm moths are all brown moths in the same family (Noctuidae). Even
          experts look closely at wing markings to tell them apart. That's exactly where an AI needs a human reviewer.
        </p>
      </details>
    </section>
  )
}
