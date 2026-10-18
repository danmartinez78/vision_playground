import { useMemo } from 'react'
import type { Lab } from '../lab'
import { cropToDataUrl } from '../lib/geometry'
import type { AiGuess } from '../lib/identifier'
import { GROUP_LABEL, GROUPS, SPECIES_BY_ID } from '../lib/species'
import { truthGroup, truthName } from '../lib/truth'
import type { GroupId } from '../lib/types'

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

export function StepSort({ lab }: { lab: Lab }) {
  const scene = lab.scene!
  const sample = scene.source === 'sample'
  const closeUps = useMemo(
    () => new Map(lab.cards.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)])),
    [lab.cards, scene],
  )
  const sorted = lab.cards.filter((d) => lab.sortChoices[d.id]).length
  const allSorted = sorted === lab.cards.length
  const rightCount = lab.cards.filter((d) => lab.sortChoices[d.id] === truthGroup(lab.truthFor.get(d.id))).length
  const aiRight = lab.cards.filter((d) => {
    const g = lab.ai.get(d.id)
    const aiGroup: GroupId = g?.speciesId ? SPECIES_BY_ID.get(g.speciesId)!.group : 'notbug'
    return aiGroup === truthGroup(lab.truthFor.get(d.id))
  }).length
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
          cuts a small close-up picture out of the photo for every box the detector found. Then a different AI, called{' '}
          <strong>BioCLIP</strong>, names each one at every level of the tree of life: order, then family, then species.
        </p>
        <p>
          <strong>Your turn first:</strong> put each close-up into a group. When you've done them all, you can see what
          the AI said.
        </p>
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
          const right = choice && choice === truthGroup(real)
          return (
            <article key={d.id} className={revealed ? (right ? 'crop-card right' : 'crop-card wrong') : 'crop-card'}>
              <img src={closeUps.get(d.id)} alt="A close-up from the photo" width={132} height={132} />
              {revealed && g ? (
                <>
                  <p className="answer small">
                    <span className={right ? 'good-text' : 'bad-text'}>{right ? '✓' : '✗'}</span> You said{' '}
                    <strong>{choice ? GROUP_LABEL.get(choice) : 'nothing'}</strong>. It was{' '}
                    <strong>{truthName(real)}</strong>.
                  </p>
                  <div className="small muted">The AI said:</div>
                  <AiLadder g={g} />
                </>
              ) : (
                <div className="group-buttons" role="group" aria-label="Pick a group">
                  {GROUPS.map((gr) => (
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
                  You: {rightCount} of {lab.cards.length}
                </span>
                <span className="pill">
                  AI: {aiRight} of {lab.cards.length}
                </span>
              </div>
              <p className="small">
                Look at the AI's bars on each card. It's very sure about the order, less sure about the family, and
                often unsure about the exact species, especially for the three brown pest moths that look alike.
              </p>
              <p className="small muted">
                Practice mode: on the sample photos these AI answers are made up to act like BioCLIP.
              </p>
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
