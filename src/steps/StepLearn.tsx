import type { Lab } from '../lab'
import { DrawnNight } from './DrawnNight'
import { ScaleUp } from './ScaleUp'

/** Step 5's count for a real photo: moths and other insects, counted vs. the experts. */
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
                <th>Experts</th>
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
                  <td>❓ Experts didn't name</td>
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

export function StepLearn({ lab }: { lab: Lab }) {
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
            <li>A Mothbox takes photos, and the insects fly away.</li>
            <li>AI finds and sorts them in minutes.</li>
            <li>People check only the hard ones.</li>
          </ul>
        </div>
      </div>

      <ScaleUp lab={lab} />

      <div className="big-idea">
        <h3>Seeing vs. guessing</h3>
        <p>
          The scent simulator's survey map <strong>guesses</strong> where pests are from clues like crop damage. A
          Mothbox <strong>sees</strong> them: every insect in the count is a photo you can check. It still makes
          mistakes, but you can find and fix them, like you just did.
        </p>
      </div>

      <div className="callout">
        <h3>Talk about it</h3>
        <ol>
          <li>Where did the computer beat you? Where did you beat it?</li>
          <li>Which is worse for a farmer: a missed pest, or a false alarm?</li>
          <li>How could a Mothbox show whether a scent treatment worked?</li>
        </ol>
      </div>

      <DrawnNight lab={lab} />
    </section>
  )
}
