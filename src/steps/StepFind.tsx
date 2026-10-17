import { useState } from 'react'
import type { Lab, Score } from '../lab'
import { SceneView, type BoxLayer } from '../SceneView'

const COLORS = { mine: '#2563eb', detector: '#e11d74', answer: '#16a34a' }

function ScoreLine({ who, score }: { who: string; score: Score }) {
  return (
    <div className="score">
      <strong>{who}</strong>
      <span className="pill good">Found {score.hits} of {score.total}</span>
      <span className="pill miss">Missed {score.misses}</span>
      <span className="pill bad">False alarms {score.falseAlarms}</span>
    </div>
  )
}

export function StepFind({ lab }: { lab: Lab }) {
  const [zoom, setZoom] = useState(1)
  const [showMine, setShowMine] = useState(true)
  const [showDetector, setShowDetector] = useState(true)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showContrast, setShowContrast] = useState(false)
  const scene = lab.scene!
  const sample = scene.source === 'sample'

  const layers: BoxLayer[] = []
  if (showAnswer && sample) layers.push({ key: 'answer', boxes: lab.insects.map((t) => t.box), color: COLORS.answer, dashed: true })
  if (showDetector && lab.detector)
    layers.push({
      key: 'detector',
      boxes: lab.kept.map((d) => d.box),
      color: COLORS.detector,
      labels: lab.kept.map((d) => `${Math.round(d.score * 100)}%`),
    })
  if (showMine) layers.push({ key: 'mine', boxes: lab.studentBoxes, color: COLORS.mine })

  return (
    <section>
      <div className="intro">
        <h2>Step 2: Find the bugs</h2>
        <p>
          The first computer job is <strong>detection</strong>: finding <em>where</em> each insect is, without caring what
          kind it is. The real Mothbox uses a trained AI model called YOLO for this. Here you will try it yourself, then run
          a simple detector that looks for spots that stand out from the white sheet.
        </p>
      </div>

      <ol className="howto">
        <li>
          <strong>Your turn:</strong> drag on the picture to draw a box around each insect. Click a box to remove it.
        </li>
        <li>
          <strong>Computer's turn:</strong> press <em>Run the detector</em>. Each pink box shows how sure it is.
        </li>
        <li>
          <strong>Experiment:</strong> move the slider. What happens to misses and false alarms?
        </li>
      </ol>

      <div className="toolbar">
        <button className="primary" onClick={lab.runIt}>
          {lab.detector ? 'Run the detector again' : 'Run the detector'}
        </button>
        {lab.detector && (
          <span className="muted small">
            Checked the whole picture in {Math.max(1, Math.round(lab.detector.millis))} milliseconds and found{' '}
            {lab.detector.detections.length} spots.
          </span>
        )}
        <button className="ghost" onClick={() => lab.setStudentBoxes([])} disabled={!lab.studentBoxes.length}>
          Clear my boxes
        </button>
      </div>

      {lab.detector && (
        <div className="slider-box">
          <label htmlFor="threshold">
            How sure must the detector be to count a spot as a bug? <strong>{Math.round(lab.threshold * 100)}%</strong>
          </label>
          <input
            id="threshold"
            type="range"
            min={0}
            max={0.95}
            step={0.05}
            value={lab.threshold}
            onChange={(e) => lab.setThreshold(+e.target.value)}
          />
          <div className="slider-ends small muted">
            <span>Count everything (more false alarms)</span>
            <span>Only very sure (more misses)</span>
          </div>
        </div>
      )}

      <div className="toolbar toggles">
        <label>
          <input type="checkbox" checked={showMine} onChange={(e) => setShowMine(e.target.checked)} />
          <span style={{ color: COLORS.mine }}>■</span> My boxes ({lab.studentBoxes.length})
        </label>
        <label>
          <input type="checkbox" checked={showDetector} onChange={(e) => setShowDetector(e.target.checked)} disabled={!lab.detector} />
          <span style={{ color: COLORS.detector }}>■</span> Detector ({lab.kept.length})
        </label>
        {sample && (
          <label>
            <input type="checkbox" checked={showAnswer} onChange={(e) => setShowAnswer(e.target.checked)} />
            <span style={{ color: COLORS.answer }}>■</span> Answer key ({lab.insects.length})
          </label>
        )}
        <label>
          <input type="checkbox" checked={showContrast} onChange={(e) => setShowContrast(e.target.checked)} disabled={!lab.detector} />
          What the detector sees
        </label>
        <label>
          Zoom
          <input type="range" min={1} max={3} step={0.25} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
        </label>
      </div>

      <SceneView
        imageUrl={showContrast && lab.detector ? lab.detector.contrastUrl : scene.imageUrl}
        width={scene.width}
        height={scene.height}
        layers={layers}
        zoom={zoom}
        drawLayerKey="mine"
        onAdd={showMine ? (b) => lab.setStudentBoxes([...lab.studentBoxes, b]) : undefined}
        onRemove={(i) => lab.setStudentBoxes(lab.studentBoxes.filter((_, k) => k !== i))}
        alt="Mothbox sheet with boxes"
      />

      {showContrast && (
        <p className="small muted">
          Bright means “very different from the empty sheet.” The detector only sees these differences. It has no idea
          what a bug is, which is why leaves fool it.
        </p>
      )}

      <div className="callout scores">
        {sample ? (
          <>
            {lab.studentScore ? <ScoreLine who="You" score={lab.studentScore} /> : <p className="muted">Draw some boxes to get your score.</p>}
            {lab.detectorScore && <ScoreLine who="Detector" score={lab.detectorScore} />}
          </>
        ) : lab.detectorScore ? (
          <>
            <p className="small muted">On your own photo there's no answer key, so your boxes are the answer key.</p>
            <ScoreLine who="Detector vs. you" score={lab.detectorScore} />
          </>
        ) : (
          <p className="muted">
            On your own photo there's no answer key, so draw boxes around the insects first. They become the answer key for
            the detector.
          </p>
        )}
        <details>
          <summary>What do these words mean?</summary>
          <ul>
            <li>
              <strong>Found:</strong> a box on a real insect.
            </li>
            <li>
              <strong>Missed:</strong> a real insect with no box.
            </li>
            <li>
              <strong>False alarm:</strong> a box on something that is not an insect, like a leaf or a smudge.
            </li>
          </ul>
        </details>
      </div>
    </section>
  )
}
