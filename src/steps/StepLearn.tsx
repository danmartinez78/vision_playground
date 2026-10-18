import type { Lab } from '../lab'
import { DrawnNight } from './DrawnNight'
import { ScaleUp } from './ScaleUp'
import { GROUP_LABEL, GROUPS, ROLE_LABEL, SPECIES } from '../lib/species'

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
                  <td>❓ Experts couldn't tell</td>
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
            Experts looked closely and named these moths, some down to the species. That's the job BioCLIP tries to do
            next in the Mothbox pipeline.
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
  const scene = lab.scene!
  const sample = scene.source === 'sample'

  if (!lab.detector) {
    return (
      <section>
        <h2>Step 5: What did we learn?</h2>
        <p className="warn">Run the computer's detector in Step 2 first.</p>
      </section>
    )
  }

  const counted = new Map<string, number>()
  if (sample) {
    for (const d of lab.kept) {
      const id = lab.finalLabel(d.id)
      if (id) counted.set(id, (counted.get(id) ?? 0) + 1)
    }
  }
  const real = new Map<string, number>()
  for (const t of lab.insects) real.set(t.speciesId!, (real.get(t.speciesId!) ?? 0) + 1)

  const totalCounted = [...counted.values()].reduce((a, b) => a + b, 0)
  const pestsCounted = SPECIES.filter((s) => s.role === 'pest').reduce((n, s) => n + (counted.get(s.id) ?? 0), 0)
  const helpersCounted = SPECIES.filter((s) => s.role === 'helper').reduce((n, s) => n + (counted.get(s.id) ?? 0), 0)
  const pestsReal = SPECIES.filter((s) => s.role === 'pest').reduce((n, s) => n + (real.get(s.id) ?? 0), 0)

  const groupCounts = new Map<string, number>()
  for (const d of lab.cards) {
    const g = lab.sortChoices[d.id]
    if (g && g !== 'notbug') groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1)
  }

  return (
    <section>
      <div className="intro">
        <h2>Step 5: What did we learn?</h2>
      </div>

      {lab.real ? (
        <RealTally lab={lab} counted={counted} />
      ) : sample ? (
        <>
          <div className="stat-row">
            <div className="stat">
              <span>Your guess</span>
              <strong>{lab.guess || '—'}</strong>
            </div>
            <div className="stat">
              <span>Counted by computer + AI + you</span>
              <strong>{totalCounted}</strong>
            </div>
            <div className="stat">
              <span>Really on the sheet</span>
              <strong>{lab.insects.length}</strong>
            </div>
            <div className="stat">
              <span>Different kinds counted</span>
              <strong>{counted.size}</strong>
            </div>
          </div>

          <div className="two-col">
            <div className="callout pest">
              <h3>Pest watch</h3>
              <p>
                We counted <strong>{pestsCounted}</strong> crop-pest moths (really {pestsReal}).
              </p>
              <ul className="small">
                {SPECIES.filter((s) => s.role === 'pest').map((s) => (
                  <li key={s.id}>
                    {s.common}: {counted.get(s.id) ?? 0} counted, {real.get(s.id) ?? 0} real
                  </li>
                ))}
              </ul>
            </div>
            <div className="callout helper">
              <h3>Helpers</h3>
              <p>
                We counted <strong>{helpersCounted}</strong> helpful insects. Spraying for pests could hurt these too.
              </p>
              <ul className="small">
                {SPECIES.filter((s) => s.role === 'helper').map((s) => (
                  <li key={s.id}>
                    {s.common}: {counted.get(s.id) ?? 0} counted, {real.get(s.id) ?? 0} real
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <details className="callout">
            <summary>See the full count for this photo</summary>
            <table className="tally">
              <thead>
                <tr>
                  <th>Insect</th>
                  <th>Group</th>
                  <th>Role</th>
                  <th>Counted</th>
                  <th>Really there</th>
                </tr>
              </thead>
              <tbody>
                {SPECIES.filter((s) => counted.get(s.id) || real.get(s.id)).map((s) => (
                  <tr key={s.id} className={s.role}>
                    <td>
                      {s.common} <em className="muted small">{s.scientific}</em>
                    </td>
                    <td>{GROUP_LABEL.get(s.group)}</td>
                    <td>{ROLE_LABEL[s.role]}</td>
                    <td>{counted.get(s.id) ?? 0}</td>
                    <td>{real.get(s.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">
              Counts can be off when the detector misses an insect, counts a leaf, or the AI picks a look-alike.
            </p>
          </details>
        </>
      ) : (
        <>
          <h3>Your sorting tally</h3>
          <table className="tally">
            <tbody>
              {GROUPS.filter((g) => g.id !== 'notbug').map((g) => (
                <tr key={g.id}>
                  <td>{g.label}</td>
                  <td>{groupCounts.get(g.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted">
            Your guess was {lab.guess || '—'}. The detector kept {lab.kept.length} spots.
          </p>
        </>
      )}

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
            <li>AI finds and names them in minutes.</li>
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

      {lab.real && <DrawnNight lab={lab} />}
    </section>
  )
}
