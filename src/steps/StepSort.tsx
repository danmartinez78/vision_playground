import { useMemo } from 'react'
import type { Lab } from '../lab'
import { cropToDataUrl } from '../lib/geometry'
import { expertName } from '../lib/samples'
import { REAL_GROUPS } from '../lib/truth'

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
  if (t.kind === 'debris')
    return (
      <>
        Answer key: <strong>not a bug</strong>.
      </>
    )
  if (t.kind === 'unlisted' && t.label?.group === 'unknown') return <>Just a speck, so it isn't scored.</>
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

export function StepSort({ lab }: { lab: Lab }) {
  const scene = lab.scene!
  const closeUps = useMemo(
    () => new Map(lab.cards.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)])),
    [lab.cards, scene],
  )

  if (!lab.detector) {
    return (
      <section>
        <h2>Step 3: Moth or not?</h2>
        <p className="warn">
          Go back to Step 2 and run the computer's detector first. Every box it found becomes a close-up here.
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
          one: <strong>is it a moth?</strong> Moths are what the Mothbox was built to count.
        </p>
        <p>
          Here's what our AI said about each close-up, and how sure it was. A short bar means it wasn't sure. In the
          next step, you check those.
        </p>
      </div>

      {lab.mothFailed ? (
        <p className="warn">The moth AI couldn't run on this device, so there are no AI answers to show.</p>
      ) : !lab.mothReady ? (
        <p id="need-moth">The AI is looking at the close-ups…</p>
      ) : (
        REAL_GROUPS.map((gr) => {
          const cards = lab.cards.filter((d) => lab.mothAi.get(d.id)?.group === gr.id)
          if (!cards.length) return null
          return (
            <div key={gr.id}>
              <h3>
                <span aria-hidden>{gr.emoji}</span> The AI says {gr.label.toLowerCase()} ({cards.length})
              </h3>
              <div className="cards">
                {cards.map((d) => {
                  const m = lab.mothAi.get(d.id)!
                  return (
                    <article key={d.id} className="crop-card">
                      <img src={closeUps.get(d.id)} alt="A close-up from the photo" width={132} height={132} />
                      <Bar value={m.confidence} />
                    </article>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {lab.kept.length > lab.cards.length && (
        <p className="small muted">These are the {lab.cards.length} boxes the detector was most sure about.</p>
      )}
      <p className="small muted">
        This AI is a real classifier we trained on close-ups the AMI experts labeled. It never saw these photos.
      </p>
    </section>
  )
}
