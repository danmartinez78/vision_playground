import type { Lab } from '../lab'
import { ScaleUp } from './ScaleUp'
import { GROUP_LABEL, GROUPS, ROLE_LABEL, SPECIES } from '../lib/species'

export function StepLearn({ lab }: { lab: Lab }) {
  const scene = lab.scene!
  const sample = scene.source === 'sample'

  if (!lab.detector) {
    return (
      <section>
        <h2>Step 5: What did we learn?</h2>
        <p className="warn">Run the detector in Step 2 first.</p>
      </section>
    )
  }

  const counted = new Map<string, number>()
  if (sample) {
    for (const d of lab.cards) {
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

      {sample ? (
        <>
          <div className="stat-row">
            <div className="stat">
              <span>Your guess</span>
              <strong>{lab.guess || '—'}</strong>
            </div>
            <div className="stat">
              <span>Counted by detector + AI + you</span>
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

          <h3>The night's tally</h3>
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
            Counts can be off because the detector missed some insects, counted some leaves, or the AI picked a look-alike
            that nobody fixed.
          </p>
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
          <p className="small muted">Your guess was {lab.guess || '—'}. The detector kept {lab.kept.length} spots.</p>
        </>
      )}

      <h3>Why scientists use AI for this</h3>
      <div className="then-now">
        <div>
          <h4>Before: all by hand</h4>
          <ul>
            <li>Insects were caught in traps, usually killed, and brought back to the lab.</li>
            <li>Experts sorted, pinned and named them one at a time with a microscope.</li>
            <li>One night's catch could take days, so scientists could only study a few places.</li>
          </ul>
        </div>
        <div>
          <h4>Now: camera + AI + people</h4>
          <ul>
            <li>A Mothbox photographs the insects, and they fly away unharmed.</li>
            <li>AI does the first pass: find every insect, then make a best guess at its name.</li>
            <li>Experts check only the hard cases, so many more places and nights can be studied.</li>
          </ul>
        </div>
      </div>

      <ScaleUp lab={lab} />

      <div className="big-idea">
        <h3>Seeing vs. guessing</h3>
        <p>
          In the scent simulator, the survey drone <strong>estimates</strong> where pests are from clues like crop damage.
          We never see the pests themselves, so the map is a guess about something hidden.
        </p>
        <p>
          A Mothbox <strong>observes</strong> directly. Every insect in the count is a photo you can check, like you just
          did. That doesn't make it perfect: detectors miss things and AI confuses look-alikes. But you can find and fix
          those mistakes, which you can't do with a guess.
        </p>
      </div>

      <div className="callout">
        <h3>Talk about it</h3>
        <ol>
          <li>Where did the computer do better than you? Where did you do better?</li>
          <li>Which mistake is worse for a farmer: a missed pest moth, or a false alarm?</li>
          <li>If we put a Mothbox in the field before and after a scent treatment, what would you hope to see change? What should stay the same?</li>
          <li>How could the Mothbox count and the scent simulator's survey map work together?</li>
        </ol>
      </div>
    </section>
  )
}
