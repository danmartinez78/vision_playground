import { useMemo } from 'react'
import type { Lab } from '../lab'
import { cropToDataUrl } from '../lib/geometry'
import type { AiGuess } from '../lib/identifier'
import { GROUP_LABEL, GROUPS, SPECIES_BY_ID } from '../lib/species'
import { expertName } from '../lib/samples'
import { REAL_GROUP_LABEL, REAL_GROUPS, realRight, truthGroup, truthName } from '../lib/truth'
import type { GroupId, RealGroup } from '../lib/types'

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

export function AiLadder({ g }: { g: AiGuess }) {
  if (!g.speciesId && g.order.name === 'Not an insect') {
    return (
      <div className="ladder">
        <div>
          <span>Says</span> Not an insect <Bar value={g.order.confidence} />
        </div>
      </div>
    )
  }
  return (
    <div className="ladder">
      <div>
        <span>Order</span> {g.order.name} <Bar value={g.order.confidence} />
      </div>
      <div>
        <span>Family</span> {g.family.name} <Bar value={g.family.confidence} />
      </div>
      <div>
        <span>Species</span> {g.species.name} <Bar value={g.species.confidence} />
      </div>
    </div>
  )
}

/** The AI's moth-or-not answer for a real photo, as one bar. */
function MothAnswer({ group, confidence }: { group: RealGroup; confidence: number }) {
  return (
    <div className="ladder">
      <div>
        <span>Says</span> {REAL_GROUP_LABEL.get(group)} <Bar value={confidence} />
      </div>
    </div>
  )
}

/** What the experts said about a real-photo close-up, in one short sentence. */
export function ExpertSays({ id, lab }: { id: string; lab: Lab }) {
  const t = lab.truthFor.get(id)
  if (!t) {
    return (
      <>
        The experts drew no box here. A false alarm, or an insect they missed? <strong>You decide.</strong>
      </>
    )
  }
  return (
    <>
      {t.label?.group === 'unknown' ? (
        <>
          The experts boxed it but didn't name it. <strong>You decide.</strong>
        </>
      ) : (
        <>
          Experts: <strong>{expertName(t.label)}</strong>.
        </>
      )}
      {lab.twice.has(id) && ' The AI boxed this insect twice.'}
    </>
  )
}

/** Tips for telling a moth from other insects on a light-trap photo. */
export function MothTips() {
  return (
    <ul className="small tips">
      <li>
        <strong>Moth:</strong> wide wings covered in dusty scales, often held like a tent or a flat triangle. Antennae
        like threads or feathers.
      </li>
      <li>
        <strong>Other insect:</strong> a hard shiny shell (beetle), clear see-through wings (fly, wasp, mayfly), or a
        long thin body.
      </li>
      <li>
        <strong>Not a bug:</strong> an empty spot, a shadow or a speck on the sheet.
      </li>
    </ul>
  )
}

export function StepSort({ lab }: { lab: Lab }) {
  const scene = lab.scene!
  const sample = scene.source === 'sample'
  const closeUps = useMemo(
    () => new Map(lab.cards.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)])),
    [lab.cards, scene],
  )
  const sorted = lab.cards.filter((d) => lab.sortChoices[d.id]).length
  const allSorted = sorted === lab.cards.length
  const isRight = (id: string, answer: GroupId | RealGroup | undefined) =>
    lab.real
      ? realRight(answer as RealGroup | undefined, lab.truthFor.get(id))
      : answer === truthGroup(lab.truthFor.get(id))
  const aiGroup = (id: string): GroupId | RealGroup => {
    if (lab.real) return lab.mothAi.get(id)?.group ?? 'notbug'
    const g = lab.ai.get(id)
    return g?.speciesId ? SPECIES_BY_ID.get(g.speciesId)!.group : 'notbug'
  }
  const scoredCards = lab.cards.filter((d) => lab.scored(d.id))
  const rightCount = scoredCards.filter((d) => isRight(d.id, lab.sortChoices[d.id])).length
  const aiRight = scoredCards.filter((d) => isRight(d.id, aiGroup(d.id))).length
  const unscored = lab.cards.length - scoredCards.length
  const groups = lab.real ? REAL_GROUPS : GROUPS
  const groupLabel = (g: GroupId | RealGroup) =>
    lab.real ? REAL_GROUP_LABEL.get(g as RealGroup) : GROUP_LABEL.get(g as GroupId)
  const revealed = lab.aiRevealed && sample

  if (!lab.detector) {
    return (
      <section>
        <h2>Step 3: Name the insects</h2>
        <p className="warn">
          Go back to Step 2 and run the computer's detector first. Every box it found becomes a close-up card here.
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="intro">
        <h2>Step 3: Name the insects</h2>
        <p>
          The second job is called <strong>identification</strong>: deciding <em>what</em> each insect is. The Mothbox
          cuts a small close-up picture out of the photo for every box the detector found. Then a different AI names
          each one.
        </p>
        {lab.real ? (
          <>
            <p>
              The first question scientists ask is simple: <strong>is it a moth?</strong> Moths are what the Mothbox was
              built to count.
            </p>
            <p>
              <strong>Your turn first:</strong> sort each close-up. When you've done them all, you can see what the AI
              and the experts said.
            </p>
            <MothTips />
          </>
        ) : (
          <p>
            An AI called <strong>BioCLIP</strong> names insects at every level of the tree of life: order, then family,
            then species. <strong>Your turn first:</strong> put each close-up into a group. When you've done them all,
            you can see what the AI said.
          </p>
        )}
      </div>

      <div className="toolbar">
        <span>
          Sorted <strong>{sorted}</strong> of {lab.cards.length} close-ups
          {lab.kept.length > lab.cards.length && (
            <span className="muted"> (the {lab.cards.length} the detector was most sure about)</span>
          )}
          {lab.sortSeconds !== null && (
            <span className="muted"> · about {lab.sortSeconds.toFixed(1)} seconds each</span>
          )}
        </span>
      </div>

      <div className="cards">
        {lab.cards.map((d) => {
          const choice = lab.sortChoices[d.id]
          const real = lab.truthFor.get(d.id)
          const g = lab.ai.get(d.id)
          const m = lab.mothAi.get(d.id)
          const right = choice && isRight(d.id, choice)
          return (
            <article
              key={d.id}
              className={revealed && lab.scored(d.id) ? (right ? 'crop-card right' : 'crop-card wrong') : 'crop-card'}
            >
              <img src={closeUps.get(d.id)} alt="A close-up from the photo" width={132} height={132} />
              {revealed && (g || m) ? (
                <>
                  <p className="answer small">
                    {lab.scored(d.id) && (
                      <span className={right ? 'good-text' : 'bad-text'}>{right ? '✓ ' : '✗ '}</span>
                    )}
                    You said <strong>{choice ? groupLabel(choice) : 'nothing'}</strong>.{' '}
                    {lab.real ? (
                      <ExpertSays id={d.id} lab={lab} />
                    ) : (
                      <>
                        It was <strong>{truthName(real)}</strong>.
                      </>
                    )}
                  </p>
                  <div className="small muted">The AI said:</div>
                  {m ? <MothAnswer group={m.group} confidence={m.confidence} /> : g && <AiLadder g={g} />}
                </>
              ) : (
                <div className="group-buttons" role="group" aria-label="Pick a group">
                  {groups.map((gr) => (
                    <button
                      key={gr.id}
                      className={choice === gr.id ? 'chip on' : 'chip'}
                      onClick={() => lab.chooseGroup(d.id, gr.id)}
                      title={gr.label}
                    >
                      <span aria-hidden>{gr.emoji}</span> {gr.label}
                    </button>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>

      {sample ? (
        <div className="computer-turn">
          {revealed ? (
            <div>
              <h3>You vs. the AI</h3>
              <div className="score">
                <strong>Right group</strong>
                <span className="pill good">
                  You: {rightCount} of {scoredCards.length}
                </span>
                <span className="pill">
                  AI: {aiRight} of {scoredCards.length}
                </span>
              </div>
              {unscored > 0 && (
                <p className="small muted">
                  {unscored} close-up{unscored > 1 ? 's have' : ' has'} no expert answer, so{' '}
                  {unscored > 1 ? "they aren't" : "it isn't"} scored.
                </p>
              )}
              {lab.real ? (
                <>
                  <p className="small">
                    Look at the AI's bars. It's sure about big, clear insects and less sure about tiny or blurry ones.
                    Those unsure ones are where people help, in the next step.
                  </p>
                  <p className="small muted">
                    Practice mode: the expert answers are real, but the AI's answers are made up to act like a moth
                    classifier.
                  </p>
                </>
              ) : (
                <>
                  <p className="small">
                    Look at the AI's bars on each card. It's very sure about the order, less sure about the family, and
                    often unsure about the exact species, especially for the three brown pest moths that look alike.
                  </p>
                  <p className="small muted">Practice mode: these AI answers are made up to act like BioCLIP.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div>
                <h3>AI's turn</h3>
                <p>
                  {allSorted
                    ? 'Ready! See what the AI said about each close-up.'
                    : `Sort all ${lab.cards.length} close-ups first (${lab.cards.length - sorted} to go).`}
                </p>
              </div>
              <button className="primary big" onClick={() => lab.setAiRevealed(true)} disabled={!allSorted}>
                ▶ Show the AI's answers
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="muted small">AI answers for your own photos come in a later version.</p>
      )}
    </section>
  )
}
