import { useMemo } from 'react'
import type { Lab } from '../lab'
import { cropToDataUrl } from '../lib/geometry'
import { expertName } from '../lib/samples'
import { REAL_GROUP_LABEL, REAL_GROUPS, realRight } from '../lib/truth'
import type { RealGroup } from '../lib/types'

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

/** What the answer key says about a real-photo close-up, in one short sentence. */
export function ExpertSays({ id, lab }: { id: string; lab: Lab }) {
  const t = lab.truthFor.get(id)
  if (!t) {
    return (
      <>
        Answer key: <strong>nothing here</strong>, so this box is a false alarm.
      </>
    )
  }
  if (t.kind === 'unlisted') return <>Just a speck, too small to judge. It isn't scored.</>
  if (t.label?.group === 'unknown') return <>The experts couldn't name this insect, so it isn't scored.</>
  const name = expertName(t.label)
  return (
    <>
      Answer key: <strong>{name}</strong>
      {t.label?.team ? ' (checked by our team).' : name.endsWith('.') ? '' : '.'}
      {lab.twice.has(id) && ' The AI boxed this insect twice.'}
    </>
  )
}

/** Tips for telling a moth from other insects on an insect-monitor photo. */
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
  const closeUps = useMemo(
    () => new Map(lab.cards.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)])),
    [lab.cards, scene],
  )
  const sorted = lab.cards.filter((d) => lab.sortChoices[d.id]).length
  const allSorted = sorted === lab.cards.length
  const isRight = (id: string, answer: RealGroup | undefined) => realRight(answer, lab.truthFor.get(id))
  const aiGroup = (id: string): RealGroup => lab.mothAi.get(id)?.group ?? 'notbug'
  const scoredCards = lab.cards.filter((d) => lab.scored(d.id))
  const rightCount = scoredCards.filter((d) => isRight(d.id, lab.sortChoices[d.id])).length
  const aiRight = scoredCards.filter((d) => isRight(d.id, aiGroup(d.id))).length
  const unscored = lab.cards.length - scoredCards.length
  const revealed = lab.aiRevealed

  if (!lab.detector) {
    return (
      <section>
        <h2>Step 3: Moth or not?</h2>
        <p className="warn">
          Go back to Step 2 and run the computer's detector first. Every box it found becomes a close-up card here.
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="intro">
        <h2>Step 3: Moth or not?</h2>
        <p>
          The second job is called <strong>identification</strong>: deciding <em>what</em> each insect is. The Mothbox
          cuts a small close-up picture out of the photo for every box the detector found. Then a second AI sorts each
          one.
        </p>
        <p>
          The first question scientists ask is simple: <strong>is it a moth?</strong> Moths are what the Mothbox was
          built to count.
        </p>
        <p>
          <strong>Your turn first:</strong> sort each close-up. When you've done them all, you can see the AI's answers
          and the answer key.
        </p>
        <MothTips />
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
          const m = lab.mothAi.get(d.id)
          const right = choice && isRight(d.id, choice)
          return (
            <article
              key={d.id}
              className={revealed && lab.scored(d.id) ? (right ? 'crop-card right' : 'crop-card wrong') : 'crop-card'}
            >
              <img src={closeUps.get(d.id)} alt="A close-up from the photo" width={132} height={132} />
              {revealed && m ? (
                <>
                  <p className="answer small">
                    {lab.scored(d.id) && (
                      <span className={right ? 'good-text' : 'bad-text'}>{right ? '✓ ' : '✗ '}</span>
                    )}
                    You said <strong>{choice ? REAL_GROUP_LABEL.get(choice) : 'nothing'}</strong>.{' '}
                    <ExpertSays id={d.id} lab={lab} />
                  </p>
                  <div className="small muted">The AI said:</div>
                  <MothAnswer group={m.group} confidence={m.confidence} />
                </>
              ) : (
                <div className="group-buttons" role="group" aria-label="Pick a group">
                  {REAL_GROUPS.map((gr) => (
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
                {unscored} close-up{unscored > 1 ? 's are' : ' is'} too small to judge, so{' '}
                {unscored > 1 ? "they aren't" : "it isn't"} scored.
              </p>
            )}
            <p className="small">Look at the AI's bars. Where it's unsure, people help, in the next step.</p>
            <p className="small muted">
              This AI is a real classifier we trained on close-ups the AMI experts labeled. It never saw these photos.
            </p>
          </div>
        ) : (
          <>
            <div>
              <h3>AI's turn</h3>
              <p>
                {!allSorted
                  ? `Sort all ${lab.cards.length} close-ups first (${lab.cards.length - sorted} to go).`
                  : lab.mothFailed
                    ? "The moth AI couldn't run on this device, so there are no AI answers to show."
                    : lab.mothReady
                      ? 'Ready! See what the AI said about each close-up.'
                      : 'The AI is still looking at the close-ups…'}
              </p>
            </div>
            <button
              className="primary big"
              onClick={() => lab.setAiRevealed(true)}
              disabled={!allSorted || !lab.mothReady || lab.mothFailed}
            >
              ▶ Show the AI's answers
            </button>
          </>
        )}
      </div>
    </section>
  )
}
