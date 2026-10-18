import { useState } from 'react'
import type { Lab } from '../lab'
import { detect } from '../lib/detect'
import { judgeBoxes, type Judgement } from '../lib/geometry'
import { NIGHTS, renderNight } from '../lib/scene'
import type { Box, Scene } from '../lib/types'
import { SceneView } from '../SceneView'

const DRAWN = NIGHTS[1]
const GREEN = '#16a34a'
const RED = '#dc2626'

/** An optional extra at the end: our AI on a computer-drawn night it was never trained for. */
export function DrawnNight({ lab }: { lab: Lab }) {
  const [guess, setGuess] = useState<'more' | 'fewer' | null>(null)
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState<{ scene: Scene; judged: Judgement; boxes: Box[] } | null>(null)

  const run = async () => {
    setBusy(true)
    try {
      const scene = renderNight(DRAWN)
      const result = await detect(scene.canvas)
      const kept = result.detections.filter((d) => d.score >= lab.threshold).map((d) => d.box)
      const truth = scene.truth ?? []
      const judged = judgeBoxes(
        kept,
        truth.map((t) => ({ box: t.box, insect: t.kind === 'insect' })),
      )
      setOut({ scene, judged, boxes: kept })
    } finally {
      setBusy(false)
    }
  }

  const real = lab.detectorScore
  const realShare = real && real.total ? real.hits / real.total : null
  const drawnTotal = out ? (out.scene.truth ?? []).filter((t) => t.kind === 'insect').length : 0
  const drawnShare = out && drawnTotal ? out.judged.hits / drawnTotal : null
  const missed = out ? out.judged.missed.map((i) => out.scene.truth![i].box) : []

  return (
    <details className="callout">
      <summary>
        <strong>Extra: can the AI handle a drawing?</strong>
      </summary>
      <p>
        Our AI learned from thousands of real light-trap photos. It has never seen a drawing of a bug. Here's a night
        drawn by the computer.
      </p>
      {!out && (
        <>
          <div className="drawn-guess">
            <span>
              <strong>Guess first:</strong> will it find more or fewer of the drawn bugs than on your real photo?
            </span>
            <div className="group-buttons">
              <button className={guess === 'more' ? 'chip on' : 'chip'} onClick={() => setGuess('more')}>
                More
              </button>
              <button className={guess === 'fewer' ? 'chip on' : 'chip'} onClick={() => setGuess('fewer')}>
                Fewer
              </button>
            </div>
            <button className="primary" onClick={run} disabled={!guess || busy}>
              {busy ? 'The AI is looking at the drawing…' : '▶ Run the AI on the drawing'}
            </button>
          </div>
        </>
      )}
      {out && (
        <>
          <div className="score">
            <strong>Drawn night</strong>
            <span className="pill good">
              Found {out.judged.hits} of {drawnTotal}
            </span>
            <span className="pill bad">False alarms {out.judged.falseAlarms}</span>
          </div>
          {realShare !== null && drawnShare !== null && (
            <p>
              It found <strong>{Math.round(drawnShare * 100)}%</strong> of the drawn bugs and{' '}
              <strong>{Math.round(realShare * 100)}%</strong> on your real photo. You guessed {guess}.
            </p>
          )}
          <SceneView
            imageUrl={out.scene.imageUrl}
            width={out.scene.width}
            height={out.scene.height}
            layers={[
              { key: 'missed', boxes: missed, color: '#7c3aed', dashed: true },
              {
                key: 'ai',
                boxes: out.boxes,
                color: GREEN,
                colors: out.judged.verdicts.map((v) => (v.kind === 'found' ? GREEN : RED)),
              },
            ]}
            alt="The drawn night with the AI's boxes"
          />
          <p className="small muted">Green: found a bug. Red: false alarm. Dashed purple: a bug the AI missed.</p>
          <p>
            <strong>An AI only knows what it was trained on.</strong> That's why a Mothbox AI trained in one place needs
            checking when it's used somewhere new.
          </p>
        </>
      )}
    </details>
  )
}
