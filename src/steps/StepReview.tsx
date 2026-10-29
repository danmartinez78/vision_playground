import { useMemo, useState } from 'react'
import type { Lab } from '../lab'
import { cropToDataUrl } from '../lib/geometry'
import { NameTheMoth } from './NameTheMoth'
import { ExpertSays } from './StepSort'
import { SAMPLES_DIR } from '../lib/samples'
import { REAL_GROUP_LABEL, realRight, truthRealGroup } from '../lib/truth'
import type { RealGroup } from '../lib/types'

const GUIDE: { id: RealGroup; title: string; look: string; examples: string[] }[] = [
  {
    id: 'moth',
    title: 'Moth',
    look: 'Wide, dusty-looking wings, often like a tent or a flat triangle. Thread or feather antennae.',
    examples: ['moth-1', 'moth-2', 'moth-3'],
  },
  {
    id: 'other',
    title: 'Other insect',
    look: 'Hard shell, clear wings, or a long thin body. Beetles, flies, wasps and more.',
    examples: ['other-1', 'other-2', 'other-3'],
  },
  { id: 'notbug', title: 'Not a bug', look: 'An empty spot, a shadow or a speck on the sheet.', examples: [] },
]

/** Step 4: check the close-ups the AI wasn't sure were moths. */
export function StepReview({ lab }: { lab: Lab }) {
  const scene = lab.scene!
  const [pending, setPending] = useState<Record<string, RealGroup>>({})
  const closeUps = useMemo(
    () => new Map(lab.unsure.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)])),
    [lab.unsure, scene],
  )
  if (!lab.detector) {
    return (
      <section>
        <h2>Step 4: Check the AI's work</h2>
        <p className="warn">Run the computer's detector in Step 2 first.</p>
      </section>
    )
  }

  const answer = (id: string): RealGroup => lab.finalLabel(id) ?? 'notbug'
  const scoredCards = lab.cards.filter((d) => lab.scored(d.id))
  const aiAloneRight = scoredCards.filter((d) => realRight(lab.mothAi.get(d.id)?.group, lab.truthFor.get(d.id))).length
  const teamRight = scoredCards.filter((d) => realRight(answer(d.id), lab.truthFor.get(d.id))).length
  const checked = lab.unsure.filter((d) => lab.reviewChoices[d.id] !== undefined).length
  const allChecked = checked === lab.unsure.length

  return (
    <section>
      <div className="intro">
        <h2>Step 4: Check the AI's work</h2>
        <p>
          Scientists don't just trust the AI. They check the answers it was <strong>least sure</strong> about. Here are
          the <strong>{lab.unsure.length}</strong> of the {lab.cards.length} close-ups the AI was least sure about.
        </p>
        <p>
          <strong>Your job:</strong> compare each close-up with the field guide. Does the AI's answer match? If not,
          pick a better one. Then press <em>Check</em> to see the answer key.
        </p>
      </div>

      {lab.unsure.length === 0 && <p>The AI has no answers to check on this photo. Try another photo.</p>}

      <div className="review-list">
        {lab.unsure.map((d) => {
          const g = lab.mothAi.get(d.id)!
          const truth = lab.truthFor.get(d.id)
          const real = truthRealGroup(truth)
          const decided = lab.reviewChoices[d.id] as RealGroup | undefined
          const value = decided ?? pending[d.id] ?? g.group
          const choose = (v: RealGroup) => decided === undefined && setPending({ ...pending, [d.id]: v })
          const youRight = realRight(decided, truth)
          const aiRight = realRight(g.group, truth)
          return (
            <article key={d.id} className="review-card">
              <div className="review-head">
                <img src={closeUps.get(d.id)} alt="A close-up the AI was unsure about" width={132} height={132} />
                <div>
                  <div className="small muted">The AI says</div>
                  <strong className="ai-answer">{REAL_GROUP_LABEL.get(g.group)}</strong>
                  <div className="small muted">but it's only {Math.round(g.confidence * 100)}% sure.</div>
                </div>
              </div>

              <div className="small muted">Field guide: tap the one that matches the close-up.</div>
              <div className="guide-row wide" role="radiogroup" aria-label="Field guide">
                {GUIDE.map((item) => (
                  <button
                    key={item.id}
                    role="radio"
                    aria-checked={value === item.id}
                    className={[
                      'guide-card',
                      item.id === 'notbug' ? 'notbug' : '',
                      value === item.id ? 'on' : '',
                      decided !== undefined && lab.scored(d.id) && item.id === real ? 'truth' : '',
                    ].join(' ')}
                    onClick={() => choose(item.id)}
                    disabled={decided !== undefined}
                  >
                    {item.examples.length ? (
                      <span className="example-strip">
                        {item.examples.map((e) => (
                          <img key={e} src={`${SAMPLES_DIR}examples/${e}.jpg`} alt="" width={64} height={64} />
                        ))}
                      </span>
                    ) : (
                      <span className="notbug-icon small-icon" aria-hidden>
                        🍂
                      </span>
                    )}
                    <strong>{item.title}</strong>
                    <span className="small muted">{item.look}</span>
                    {item.id === g.group && <span className="tag">AI's answer</span>}
                  </button>
                ))}
              </div>

              {decided === undefined ? (
                <button
                  className="primary"
                  onClick={() => lab.setReviewChoices({ ...lab.reviewChoices, [d.id]: value })}
                >
                  {value === g.group ? 'Check: I agree with the AI' : 'Check: I think the AI was wrong'}
                </button>
              ) : (
                <p className="answer">
                  <ExpertSays id={d.id} lab={lab} />{' '}
                  {lab.scored(d.id) && (
                    <>
                      <span className={youRight ? 'good-text' : 'bad-text'}>
                        {youRight ? '✓ You were right' : '✗ You missed it'}
                      </span>
                      {' · '}
                      <span className={aiRight ? 'good-text' : 'bad-text'}>
                        {aiRight ? '✓ The AI was right' : '✗ The AI was wrong'}
                      </span>
                    </>
                  )}
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
                    AI alone: {aiAloneRight} of {scoredCards.length}
                  </span>
                  <span className="pill good">
                    AI + you: {teamRight} of {scoredCards.length}
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

      {(allChecked || lab.unsure.length === 0) && <NameTheMoth key={scene.key} lab={lab} />}
    </section>
  )
}
