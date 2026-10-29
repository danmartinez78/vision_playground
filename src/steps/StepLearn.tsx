import type { Lab } from '../lab'
import { DrawnNight } from './DrawnNight'
import { OurResults } from './OurResults'
import { ScaleUp } from './ScaleUp'

/** Step 5's count for a real photo: moths and other insects, counted vs. the answer key. */
function RealTally({ lab, counted }: { lab: Lab; counted: Map<string, number> }) {
  const real = { moth: 0, other: 0, unknown: 0 }
  const mothNames = new Map<string, number>()
  for (const t of lab.insects) {
    const g = t.label?.group ?? 'unknown'
    real[g]++
    if (g === 'moth' && t.label && t.label.name !== 'Moth' && t.label.name !== 'Lepidoptera') {
      mothNames.set(t.label.name, (mothNames.get(t.label.name) ?? 0) + 1)
    }
  }
  const moths = counted.get('moth') ?? 0
  const others = counted.get('other') ?? 0
  return (
    <>
      <div className="stat-row">
        <div className="stat">
          <span>Your guess</span>
          <strong>{lab.guess || '—'}</strong>
        </div>
        <div className="stat">
          <span>Counted by computer + AI + you</span>
          <strong>{moths + others}</strong>
        </div>
        <div className="stat">
          <span>Really on the sheet</span>
          <strong>{lab.insects.length}</strong>
        </div>
        <div className="stat">
          <span>Moths counted</span>
          <strong>{moths}</strong>
        </div>
      </div>

      <div className="callout">
        <h3>Moth count</h3>
        <div className="table-scroll">
          <table className="tally">
            <thead>
              <tr>
                <th></th>
                <th>Counted</th>
                <th>Answer key</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>🦋 Moths</td>
                <td>{moths}</td>
                <td>{real.moth}</td>
              </tr>
              <tr>
                <td>🐞 Other insects</td>
                <td>{others}</td>
                <td>{real.other}</td>
              </tr>
              {real.unknown > 0 && (
                <tr>
                  <td>❓ Couldn't be named</td>
                  <td>—</td>
                  <td>{real.unknown}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Counts can be off when the detector misses an insect, boxes an empty spot, or the AI mixes up a moth.
        </p>
      </div>

      {mothNames.size > 0 && (
        <details className="callout">
          <summary>Which moths did the experts name?</summary>
          <p className="small">
            Experts looked closely and named these moths, some down to the species. Naming moths this exactly takes an
            expert, or a much bigger AI than ours.
          </p>
          <ul className="small">
            {[...mothNames].map(([name, n]) => (
              <li key={name}>
                <em>{name}</em>
                {n > 1 && ` × ${n}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  )
}

export function StepLearn({ lab, onOwn, onAi }: { lab: Lab; onOwn: () => void; onAi: () => void }) {
  if (!lab.detector) {
    return (
      <section>
        <h2>Step 5: What did we learn?</h2>
        <p className="warn">Run the computer's detector in Step 2 first.</p>
      </section>
    )
  }

  // counts after the student's checks: every box the detector kept, as moth or other insect
  const counted = new Map<string, number>()
  for (const d of lab.kept) {
    // like Step 2, anything under 1 cm isn't counted
    if (lab.truthFor.get(d.id)?.kind === 'unlisted') continue
    const g = lab.finalLabel(d.id)
    if (g) counted.set(g, (counted.get(g) ?? 0) + 1)
  }

  return (
    <section>
      <div className="intro">
        <h2>Step 5: What did we learn?</h2>
      </div>

      <RealTally lab={lab} counted={counted} />

      <h3>Why scientists use AI for this</h3>
      <div className="then-now">
        <div>
          <h4>Before: all by hand</h4>
          <ul>
            <li>Insects were trapped and usually killed.</li>
            <li>Experts named them one at a time under a microscope.</li>
            <li>One night's catch took days to sort.</li>
          </ul>
        </div>
        <div>
          <h4>Now: camera + AI + people</h4>
          <ul>
            <li>An insect monitor takes photos, and the insects fly away.</li>
            <li>AI finds and sorts them in minutes.</li>
            <li>People check only the hard ones.</li>
          </ul>
        </div>
      </div>

      <ScaleUp lab={lab} />

      <div className="big-idea">
        <h3>Why count insects instead of watching the crops?</h3>
        <p>
          Crop damage is a clue, like in the scent simulator's survey map, but it's a weak one. It shows up{' '}
          <strong>too late</strong> to prevent the damage, it's <strong>not a sure sign</strong> of pests (crops also
          suffer from dry weather or poor soil), and it's <strong>too slow</strong> to tell you if a treatment worked,
          because crops take weeks to recover.
        </p>
        <p>
          A sensor like the Mothbox counts the insects themselves, and every insect in the count is a photo you can
          check. Our team is designing one to use before and after a treatment, to:
        </p>
        <ul>
          <li>find out which pests are there,</li>
          <li>treat only where they are, which means less pesticide even without a scent repellent,</li>
          <li>count again afterward to see if the treatment worked.</li>
        </ul>
      </div>

      <div className="callout">
        <h3>Talk about it</h3>
        <ol>
          <li>Where did the computer beat you? Where did you beat it?</li>
          <li>Which is worse for a farmer: a missed pest, or a false alarm?</li>
          <li>How could counting insects before and after show whether a treatment worked?</li>
        </ol>
      </div>

      <OurResults lab={lab} />

      <h3>Keep exploring</h3>
      <div className="next-steps">
        <button className="next-card" onClick={onOwn}>
          <span className="icon" aria-hidden>
            📷
          </span>
          <span>
            <strong>Try your own photo</strong>
            <span className="small">
              Run the AI on a photo of your own, or on any of 24 real insect-monitor photos.
            </span>
          </span>
        </button>
        <button className="next-card" onClick={onAi}>
          <span className="icon" aria-hidden>
            🧠
          </span>
          <span>
            <strong>How the AI works</strong>
            <span className="small">See what the detector sees, and how it learned to find insects.</span>
          </span>
        </button>
      </div>

      <DrawnNight lab={lab} />
    </section>
  )
}
