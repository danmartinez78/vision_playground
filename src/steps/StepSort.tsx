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
  const crops = useMemo(() => new Map(lab.cards.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)])), [lab.cards, scene])
  const sorted = lab.cards.filter((d) => lab.sortChoices[d.id]).length
  const rightCount = lab.cards.filter((d) => lab.sortChoices[d.id] === truthGroup(lab.truthFor.get(d.id))).length
  const aiRight = lab.cards.filter((d) => {
    const g = lab.ai.get(d.id)
    const aiGroup: GroupId = g?.speciesId ? SPECIES_BY_ID.get(g.speciesId)!.group : 'notbug'
    return aiGroup === truthGroup(lab.truthFor.get(d.id))
  }).length

  if (!lab.detector) {
    return (
      <section>
        <h2>Step 3: Sort the crops</h2>
        <p className="warn">Go back to Step 2 and run the detector first. Its boxes become the cards you sort here.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="intro">
        <h2>Step 3: Sort the crops</h2>
        <p>
          The second computer job is <strong>identification</strong>: deciding <em>what</em> each insect is. The Mothbox
          cuts every detected box out of the photo (a <em>crop</em>) and shows it to an AI called <strong>BioCLIP</strong>,
          which guesses at each level of the tree of life: order, then family, then species.
        </p>
        <p>
          Sort each card into a group first. Then reveal the AI's guesses and compare.
        </p>
      </div>

      <div className="toolbar">
        <span>
          Sorted {sorted} of {lab.cards.length} cards
          {lab.kept.length > lab.cards.length && ` (showing the ${lab.cards.length} the detector was most sure about)`}
          {lab.sortSeconds !== null && (
            <span className="muted"> · about {lab.sortSeconds.toFixed(1)} seconds per card</span>
          )}
        </span>
        {sample ? (
          <button className="primary" onClick={() => lab.setAiRevealed(!lab.aiRevealed)}>
            {lab.aiRevealed ? 'Hide the AI guesses' : "Show the AI's guesses"}
          </button>
        ) : (
          <span className="muted small">AI guesses for your own photos come in a later version.</span>
        )}
      </div>

      {lab.aiRevealed && sample && (
        <div className="callout">
          <div className="score">
            <strong>Right group</strong>
            <span className="pill good">You: {rightCount} of {lab.cards.length}</span>
            <span className="pill">AI: {aiRight} of {lab.cards.length}</span>
          </div>
          <p className="small muted">
            Practice mode: on the sample nights these AI guesses are simulated to act like BioCLIP. Notice how sure it is
            about the order and how unsure it gets about species that look alike.
          </p>
        </div>
      )}

      <div className="cards">
        {lab.cards.map((d) => {
          const choice = lab.sortChoices[d.id]
          const real = lab.truthFor.get(d.id)
          const g = lab.ai.get(d.id)
          const right = choice && choice === truthGroup(real)
          return (
            <article key={d.id} className="crop-card">
              <img src={crops.get(d.id)} alt="A crop from the photo" width={132} height={132} />
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
              {lab.aiRevealed && g && (
                <>
                  <AiLadder g={g} />
                  <p className="answer small">
                    Answer: <strong>{truthName(real)}</strong>
                    {choice && (right ? ' ✓ you got the group' : ` ✗ you said ${GROUP_LABEL.get(choice)}`)}
                  </p>
                </>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
