import { useEffect, useMemo, useState } from 'react'
import type { Lab } from '../lab'
import { AI_COLOR, labResults, resultsPhoto, YOU_COLOR } from '../lib/results'
import {
  findRows,
  LEARNED_STARTER,
  resultLines,
  resultsReportHtml,
  resultsSlidePng,
  SENSOR_LINE,
  SENSOR_STARTER,
  type ResultsNotes,
} from '../lib/resultsExport'

const NOTES_KEY = 'vision-lab-results-notes'

function loadNotes(): ResultsNotes {
  const empty = { team: '', learned: '', sensor: '' }
  try {
    const raw = JSON.parse(localStorage.getItem(NOTES_KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return empty
    const str = (v: unknown) => (typeof v === 'string' ? v : '')
    return { team: str(raw.team), learned: str(raw.learned), sensor: str(raw.sensor) }
  } catch {
    return empty
  }
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const fileStem = () => `vision-lab-results-${new Date().toISOString().slice(0, 10)}`

/** Step 6's results card: the student's results on one page, to print or put on a slide. */
export function OurResults({ lab }: { lab: Lab }) {
  const [notes, setNotes] = useState<ResultsNotes>(loadNotes)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
    } catch {
      // storage can be blocked; the notes just won't come back after a reload
    }
  }, [notes])

  const scene = lab.scene!
  const results = labResults(lab)
  const photo = useMemo(
    () =>
      resultsPhoto(
        scene.canvas,
        lab.studentBoxes,
        lab.kept.map((d) => d.box),
      ),
    [scene, lab.studentBoxes, lab.kept],
  )
  const set = (k: keyof ResultsNotes) => (v: string) => setNotes((n) => ({ ...n, [k]: v }))

  const openReport = () => {
    const html = resultsReportHtml(results, notes, photo)
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const win = window.open(url, '_blank')
    if (!win) download(`${fileStem()}.html`, new Blob([html], { type: 'text/html' }))
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  const saveSlide = async () => {
    setBusy(true)
    try {
      const blob = await resultsSlidePng(results, notes, photo)
      if (blob) download(`${fileStem()}.png`, blob)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="our-results">
      <h3>📄 Our results</h3>
      <p className="small">Everything you did in this lesson on one page, ready for your team's presentation.</p>
      <label className="results-team">
        <span>Team name</span>
        <input value={notes.team} placeholder="Our team" onChange={(e) => set('team')(e.target.value)} />
      </label>

      <div className="results-grid">
        <figure>
          {photo && <img src={photo} alt="The photo with your boxes and the AI's boxes" />}
          <figcaption className="small">
            <i style={{ borderColor: YOU_COLOR }} /> Your boxes <i style={{ borderColor: AI_COLOR }} /> The AI's boxes
          </figcaption>
        </figure>
        <div>
          <table className="tally">
            <thead>
              <tr>
                <th></th>
                <th>You</th>
                <th>The AI</th>
              </tr>
            </thead>
            <tbody>
              {findRows(results).map(([k, a, b]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>{a}</td>
                  <td>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="small results-lines">
            {resultLines(results).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {!results.scaleUp && <p className="small muted">Try “Scale it up” above to add the one-night times.</p>}
        </div>
      </div>

      <p className="small results-sensor">🔎 {SENSOR_LINE}</p>

      <label className="results-write">
        <span>One thing we learned</span>
        <textarea rows={2} value={notes.learned} placeholder={LEARNED_STARTER} onChange={(e) => set('learned')(e.target.value)} />
      </label>
      {!notes.learned.trim() && (
        <button className="link" onClick={() => set('learned')(LEARNED_STARTER)}>
          ✏️ Use a sentence starter
        </button>
      )}
      <label className="results-write">
        <span>How this could help our sensor</span>
        <textarea rows={2} value={notes.sensor} placeholder={SENSOR_STARTER} onChange={(e) => set('sensor')(e.target.value)} />
      </label>
      {!notes.sensor.trim() && (
        <button className="link" onClick={() => set('sensor')(SENSOR_STARTER)}>
          ✏️ Use a sentence starter
        </button>
      )}

      <div className="results-actions">
        <button className="primary" onClick={openReport}>
          📄 Make report
        </button>
        <button className="ghost" onClick={saveSlide} disabled={busy}>
          🖼 Save slide picture
        </button>
      </div>
      <p className="small muted">The report prints on one page, or saves as a PDF. The slide picture is a PNG for your slides.</p>
    </div>
  )
}
