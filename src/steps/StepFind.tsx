import { useEffect, useState } from 'react'
import type { Lab, Score } from '../lab'
import { engineName } from '../lib/detect'
import type { Judgement, Verdict } from '../lib/geometry'
import { formatTime } from '../lib/time'
import type { TruthItem } from '../lib/types'
import { loadYolo } from '../lib/yolo'
import { SceneView, type BoxLayer } from '../SceneView'

const BLUE = '#2563eb'
const GREEN = '#16a34a'
const ORANGE = '#d97706'
const RED = '#dc2626'
const PURPLE = '#7c3aed'

const verdictColor = (v: Verdict) => (v.kind === 'found' ? GREEN : v.kind === 'too-big' ? ORANGE : RED)

function verdictLabel(v: Verdict, truth: TruthItem[]): string {
  switch (v.kind) {
    case 'found':
      return '✓'
    case 'too-big':
      return 'Too big'
    case 'twice':
      return 'Counted twice'
    case 'not-insect':
      return `${truth[v.answer]?.debrisLabel ?? 'Not an insect'}, not an insect`
    case 'empty':
      return 'Nothing here'
  }
}

/** Boxes colored by whether they counted, plus dashed boxes on the insects nobody found. */
function judgedLayers(
  key: string,
  boxes: { x: number; y: number; w: number; h: number }[],
  j: Judgement,
  truth: TruthItem[],
  labels?: string[],
): BoxLayer[] {
  return [
    {
      key,
      boxes,
      color: BLUE,
      colors: j.verdicts.map(verdictColor),
      labels: labels ?? j.verdicts.map((v) => verdictLabel(v, truth)),
    },
  ]
}

function missedLayer(key: string, j: Judgement, truth: TruthItem[]): BoxLayer {
  return { key, boxes: j.missed.map((i) => truth[i].box), color: PURPLE, dashed: true }
}

function Pills({ score }: { score: Score }) {
  return (
    <>
      <span className="pill good">
        Found {score.hits} of {score.total}
      </span>
      <span className="pill miss">Missed {score.misses}</span>
      <span className="pill bad">False alarms {score.falseAlarms}</span>
    </>
  )
}

function Legend({ j, missed }: { j: Judgement; missed: boolean }) {
  const count = (k: Verdict['kind']) => j.verdicts.filter((v) => v.kind === k).length
  const rows: [string, string, string, number][] = [
    [GREEN, '✓ Found it', 'Your box covers the middle of an insect.', count('found')],
    [
      ORANGE,
      'Too big',
      'There is an insect inside, but the box is much bigger than it. Draw a tighter box.',
      count('too-big'),
    ],
    [RED, 'Not an insect', 'A leaf, twig or smudge. Easy to mix up!', count('not-insect')],
    [RED, 'Counted twice', 'Another of your boxes already found this insect.', count('twice')],
    [RED, 'Nothing here', 'The box missed the insect. Its middle has to be inside your box.', count('empty')],
  ]
  return (
    <ul className="legend">
      {rows
        .filter((r) => r[3] > 0)
        .map(([color, name, why, n]) => (
          <li key={name}>
            <span className="swatch" style={{ borderColor: color }} />
            <strong style={{ color }}>{name}</strong> ({n}): {why}
          </li>
        ))}
      {missed && j.missed.length > 0 && (
        <li>
          <span className="swatch dashed" style={{ borderColor: PURPLE }} />
          <strong style={{ color: PURPLE }}>Missed</strong> ({j.missed.length}): insects with no box. Zoom in to see
          them.
        </li>
      )}
    </ul>
  )
}

function Clock({ start }: { start: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  return <strong className="clock">{formatTime((now - start) / 1000)}</strong>
}

export function StepFind({ lab, onExplain }: { lab: Lab; onExplain: () => void }) {
  const [view, setView] = useState<'mine' | 'computer' | 'both'>('computer')
  const [showMissed, setShowMissed] = useState(true)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showContrast, setShowContrast] = useState(false)
  const scene = lab.scene!
  const sample = scene.source === 'sample'
  const truth = lab.truth
  const { start, end } = lab.handTimer
  const phase = !end ? 'mine' : !lab.detector ? 'computer' : 'compare'
  // start downloading the AI model while the student works, so it's ready when they need it
  useEffect(() => {
    loadYolo().catch(() => {})
  }, [])
  const handSecs = start && end ? (end - start) / 1000 : 0

  const startTimer = () => {
    lab.setStudentBoxes([])
    lab.setHandTimer({ start: Date.now(), end: null })
  }
  const redo = () => {
    lab.setStudentBoxes([])
    lab.setHandTimer({ start: null, end: null })
    lab.clearDetector()
  }

  // what to draw on the photo
  const layers: BoxLayer[] = []
  if (phase === 'mine') {
    layers.push({ key: 'mine', boxes: lab.studentBoxes, color: BLUE })
  } else {
    const showMine = phase === 'computer' || view !== 'computer'
    const showComputer = phase === 'compare' && view !== 'mine'
    if (showAnswer && sample)
      layers.push({ key: 'answer', boxes: lab.insects.map((t) => t.box), color: GREEN, dashed: true })
    if (showMine) {
      if (lab.studentJudgement) {
        layers.push(
          ...judgedLayers(
            'mine',
            lab.studentBoxes,
            lab.studentJudgement,
            truth,
            view === 'both' && phase === 'compare' ? lab.studentBoxes.map(() => '') : undefined,
          ),
        )
        if (showMissed && !showComputer) layers.push(missedLayer('missed', lab.studentJudgement, truth))
      } else layers.push({ key: 'mine', boxes: lab.studentBoxes, color: BLUE })
    }
    if (showComputer && lab.detectorJudgement) {
      const labels = lab.kept.map((d) => `${Math.round(d.score * 100)}%`)
      if (sample) {
        layers.push(
          ...judgedLayers(
            'computer',
            lab.kept.map((d) => d.box),
            lab.detectorJudgement,
            truth,
            labels,
          ).map((l) => (view === 'both' ? { ...l, colors: undefined, color: '#e11d74' } : l)),
        )
        if (showMissed && view === 'computer') layers.push(missedLayer('missed', lab.detectorJudgement, truth))
      } else layers.push({ key: 'computer', boxes: lab.kept.map((d) => d.box), color: '#e11d74', labels })
    }
  }

  const stopwatchBar =
    phase === 'mine' && start ? (
      <div className="stopwatch running">
        <span aria-hidden>⏱️</span>
        <Clock start={start} />
        <span>
          Boxes so far: <strong>{lab.studentBoxes.length}</strong>. Drag around each insect. Tap or click a box to
          remove it.
        </span>
        <button
          className="primary"
          onClick={() => lab.setHandTimer({ start, end: Date.now() })}
          disabled={!lab.studentBoxes.length}
        >
          I'm done
        </button>
      </div>
    ) : undefined

  return (
    <section>
      <div className="intro">
        <h2>Step 2: Find the insects</h2>
        <p>
          The first job is called <strong>detection</strong>: finding <em>where</em> every insect is, without worrying
          yet about what kind it is. Scientists used to do this by hand. First you try it against the clock, then the
          computer tries the same photo, then you compare.
        </p>
      </div>

      <ol className="phases" aria-label="Parts of this step">
        <li className={phase === 'mine' ? 'current' : 'done'}>1. Your turn</li>
        <li className={phase === 'computer' ? 'current' : phase === 'compare' ? 'done' : ''}>2. Computer's turn</li>
        <li className={phase === 'compare' ? 'current' : ''}>3. Compare</li>
      </ol>

      {phase === 'mine' && !start && (
        <div className="stopwatch">
          <span aria-hidden>⏱️</span>
          <span>
            <strong>Your turn.</strong> When you press start, the stopwatch runs. Draw a box around every insect you can
            find by dragging on the photo. Zoom in to spot the small ones. Press <em>I'm done</em> when you have them
            all.
          </span>
          <button className="primary" onClick={startTimer}>
            Start the stopwatch
          </button>
        </div>
      )}

      {phase === 'computer' && (
        <div className="callout">
          <h3>
            You boxed {lab.studentBoxes.length} insects in {formatTime(handSecs)}
            {lab.handSeconds !== null && <> (about {lab.handSeconds.toFixed(1)} seconds each)</>}
          </h3>
          {lab.studentScore && lab.studentJudgement ? (
            <>
              <div className="score">
                <strong>You</strong>
                <Pills score={lab.studentScore} />
              </div>
              <Legend j={lab.studentJudgement} missed={showMissed} />
            </>
          ) : (
            <p className="small muted">
              Your own photo has no answer key, so your boxes become the answer key for the computer.
            </p>
          )}
          <button className="ghost" onClick={redo}>
            Try my turn again
          </button>
        </div>
      )}

      {phase === 'computer' && (
        <div className="computer-turn">
          <div>
            <h3>2. Computer's turn</h3>
            <p>
              Now the computer does the same job on the same photo. Its <strong>detector</strong> is YOLO11n, a small AI
              we trained on about 2,300 real light-trap photos. It really runs, right now, inside this web browser.
              Nothing is looked up ahead of time, so it works on your own photos too.
            </p>
          </div>
          <button className="primary big" onClick={lab.runIt} disabled={lab.detecting}>
            {lab.detecting ? 'The AI is looking at the photo…' : "▶ Run the computer's detector"}
          </button>
        </div>
      )}

      {phase === 'compare' && lab.detector && (
        <div className="callout">
          <h3>3. Compare: you vs. the computer</h3>
          <div className="table-scroll">
            <table className="tally compare">
              <thead>
                <tr>
                  <th></th>
                  <th>Found</th>
                  <th>Missed</th>
                  <th>False alarms</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>You</strong>
                  </td>
                  {lab.studentScore ? (
                    <>
                      <td>
                        {lab.studentScore.hits} of {lab.studentScore.total}
                      </td>
                      <td>{lab.studentScore.misses}</td>
                      <td>{lab.studentScore.falseAlarms}</td>
                    </>
                  ) : (
                    <td colSpan={3} className="muted">
                      You are the answer key ({lab.studentBoxes.length} boxes)
                    </td>
                  )}
                  <td>{formatTime(handSecs)}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Computer</strong>
                  </td>
                  {lab.detectorScore ? (
                    <>
                      <td>
                        {lab.detectorScore.hits} of {lab.detectorScore.total}
                      </td>
                      <td>{lab.detectorScore.misses}</td>
                      <td>{lab.detectorScore.falseAlarms}</td>
                    </>
                  ) : (
                    <td colSpan={3}>—</td>
                  )}
                  <td>{(lab.detector.millis / 1000).toFixed(2)} seconds</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="small muted">
            Both are scored with the same rules. The computer checked the whole photo in{' '}
            {Math.max(1, Math.round(lab.detector.millis))} milliseconds using {engineName(lab.detector)}.{' '}
            <button className="link" onClick={redo}>
              Start this step over
            </button>
          </p>
        </div>
      )}

      {phase === 'compare' && (
        <div className="toolbar toggles">
          <span role="group" aria-label="Whose boxes to show" className="tool-switch">
            <button className={view === 'mine' ? 'on' : ''} onClick={() => setView('mine')}>
              My boxes
            </button>
            <button className={view === 'computer' ? 'on' : ''} onClick={() => setView('computer')}>
              Computer's boxes
            </button>
            <button className={view === 'both' ? 'on' : ''} onClick={() => setView('both')}>
              Both
            </button>
          </span>
          {sample && (
            <label>
              <input type="checkbox" checked={showAnswer} onChange={(e) => setShowAnswer(e.target.checked)} />
              Answer key
            </label>
          )}
          {lab.detector?.contrastUrl && (
            <label>
              <input type="checkbox" checked={showContrast} onChange={(e) => setShowContrast(e.target.checked)} />
              What the detector sees
            </label>
          )}
        </div>
      )}
      {phase !== 'mine' && sample && (
        <label className="small">
          <input type="checkbox" checked={showMissed} onChange={(e) => setShowMissed(e.target.checked)} /> Show missed
          insects (dashed purple)
        </label>
      )}

      <SceneView
        imageUrl={(showContrast && phase === 'compare' && lab.detector?.contrastUrl) || scene.imageUrl}
        width={scene.width}
        height={scene.height}
        layers={layers}
        drawLayerKey="mine"
        onAdd={phase === 'mine' && start ? (b) => lab.setStudentBoxes([...lab.studentBoxes, b]) : undefined}
        onRemove={
          phase === 'mine' && start ? (i) => lab.setStudentBoxes(lab.studentBoxes.filter((_, k) => k !== i)) : undefined
        }
        alt="Mothbox sheet"
        overlay={stopwatchBar}
      />

      {phase === 'compare' && showContrast && lab.detector?.contrastUrl && (
        <p className="small muted">
          Bright means “very different from the empty sheet.” The detector only sees these differences. It has no idea
          what an insect is, which is why leaves fool it.
        </p>
      )}

      {phase === 'compare' && lab.detector && (
        <div className="slider-box">
          <h3>Experiment: how sure should the computer be?</h3>
          <p className="small">
            The detector gives every spot a score for how sure it is (the % on each box). Move the slider and watch the
            scores in the table change.
          </p>
          <label htmlFor="threshold">
            Count a spot as an insect when the computer is at least <strong>{Math.round(lab.threshold * 100)}%</strong>{' '}
            sure
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
          <p className="small muted">
            Our detector is YOLO11n, the same kind of AI the Mothbox team uses.{' '}
            <button className="link" onClick={onExplain}>
              How does an AI like YOLO see?
            </button>
          </p>
        </div>
      )}
    </section>
  )
}
