import { useEffect, useState, type ReactNode } from 'react'
import type { Lab, Score } from '../lab'
import { engineName } from '../lib/detect'
import { FallbackNote } from '../FallbackNote'
import type { Judgement, Verdict } from '../lib/geometry'
import { formatTime } from '../lib/time'
import type { TruthItem } from '../lib/types'
import { loadYolo } from '../lib/yolo'
import { SceneView, type BoxLayer } from '../SceneView'
import { TOUCH } from '../lib/touch'

const BLUE = '#2563eb'
const GREEN = '#16a34a'
const ORANGE = '#d97706'
const RED = '#dc2626'
const PURPLE = '#7c3aed'
const GRAY = '#6b7280'

const verdictColor = (v: Verdict) =>
  v.kind === 'found' ? GREEN : v.kind === 'too-big' ? ORANGE : v.kind === 'unlisted' ? GRAY : RED

function verdictLabel(v: Verdict, truth: TruthItem[]): string {
  switch (v.kind) {
    case 'found':
      return '✓'
    case 'too-big':
      return 'Too big'
    case 'twice':
      return 'Counted twice'
    case 'not-insect':
      return truth[v.answer]?.debrisLabel ? `${truth[v.answer].debrisLabel}, not an insect` : 'Not an insect'
    case 'unlisted':
      return 'Not counted'
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

interface ScoreRow {
  who: string
  score: Score | null
  /** shown instead of the score when there's no answer key */
  note?: string
  time: string
}

/** You (and the computer) side by side: small enough for a phone. */
function ScoreGrid({ rows }: { rows: ScoreRow[] }) {
  return (
    <table className="score-grid">
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
        {rows.map((r) => (
          <tr key={r.who}>
            <th scope="row">{r.who}</th>
            {r.score ? (
              <>
                <td className="good-text">
                  <strong>{r.score.hits}</strong>
                  <span className="of">/{r.score.total}</span>
                </td>
                <td className="miss-text">
                  <strong>{r.score.misses}</strong>
                </td>
                <td className="bad-text">
                  <strong>{r.score.falseAlarms}</strong>
                </td>
              </>
            ) : (
              <td colSpan={3} className="muted small">
                {r.note}
              </td>
            )}
            <td>{r.time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Legend({ j, missed }: { j: Judgement; missed: boolean }) {
  const count = (k: Verdict['kind']) => j.verdicts.filter((v) => v.kind === k).length
  const rows: [string, string, string, number][] = [
    [GREEN, '✓ Found it', 'Your box covers the middle of an insect.', count('found')],
    [ORANGE, 'Too big', 'Much bigger than the insect inside. Fit it tighter.', count('too-big')],
    [RED, 'Not an insect', 'A speck, fiber, leaf or smudge. Easy to mix up!', count('not-insect')],
    [RED, 'Counted twice', 'Another of your boxes already found this insect.', count('twice')],
    [RED, 'Nothing here', 'The box missed the insect. Its middle has to be inside your box.', count('empty')],
    [GRAY, 'Not counted', "This spot isn't in the answer key, so it counts neither way.", count('unlisted')],
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
          <strong style={{ color: PURPLE }}>Missed</strong> ({j.missed.length}): insects with no box.
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
  // phones box insects with the photo full screen
  const [full, setFull] = useState(false)
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
  // insects our team added to the answer key that the AI skipped, since the experts it learned from skipped them
  const teamMissed =
    scene.real && lab.detector?.engine !== 'simple'
      ? (lab.detectorJudgement?.missed ?? []).filter((ai) => scene.truth?.[ai]?.label?.team).length
      : 0

  const startTimer = () => {
    lab.setStudentBoxes([])
    lab.setHandTimer({ start: Date.now(), end: null })
    if (TOUCH) setFull(true)
  }
  const finish = () => {
    lab.setHandTimer({ start, end: Date.now() })
    setFull(false)
  }
  const redo = () => {
    lab.setStudentBoxes([])
    lab.setHandTimer({ start: null, end: null })
    lab.clearDetector()
  }

  // what to draw on the photo
  const layers: BoxLayer[] = []
  if (phase !== 'mine') {
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

  // the strip on top of the photo: the stopwatch while you work, what to show afterward
  let bar: ReactNode = null
  if (phase === 'mine' && start) {
    bar = (
      <>
        <Clock start={start} />
        <span className="bar-count">
          <strong>{lab.studentBoxes.length}</strong> {lab.studentBoxes.length === 1 ? 'box' : 'boxes'}
        </span>
        <button className="primary bar-done" onClick={finish} disabled={!lab.studentBoxes.length}>
          I'm done
        </button>
      </>
    )
  } else if (phase !== 'mine') {
    bar = (
      <div className="photo-options">
        {phase === 'compare' && (
          <span role="group" aria-label="Whose boxes to show" className="tool-switch">
            <button className={view === 'mine' ? 'on' : ''} onClick={() => setView('mine')}>
              Mine
            </button>
            <button className={view === 'computer' ? 'on' : ''} onClick={() => setView('computer')}>
              Computer
            </button>
            <button className={view === 'both' ? 'on' : ''} onClick={() => setView('both')}>
              Both
            </button>
          </span>
        )}
        {sample && (
          <label className="toggle-chip">
            <input type="checkbox" checked={showMissed} onChange={(e) => setShowMissed(e.target.checked)} />
            Missed
          </label>
        )}
        {phase === 'compare' && sample && (
          <label className="toggle-chip">
            <input type="checkbox" checked={showAnswer} onChange={(e) => setShowAnswer(e.target.checked)} />
            Answer key
          </label>
        )}
        {phase === 'compare' && lab.detector?.contrastUrl && (
          <label className="toggle-chip">
            <input type="checkbox" checked={showContrast} onChange={(e) => setShowContrast(e.target.checked)} />
            What the AI sees
          </label>
        )}
      </div>
    )
  }

  const photo = (
    <SceneView
      imageUrl={(showContrast && phase === 'compare' && lab.detector?.contrastUrl) || scene.imageUrl}
      width={scene.width}
      height={scene.height}
      layers={layers}
      edit={
        phase === 'mine' && start ? { boxes: lab.studentBoxes, color: BLUE, onChange: lab.setStudentBoxes } : undefined
      }
      alt="Insect-monitor photo"
      bar={bar}
      full={full}
      onFullChange={setFull}
    />
  )

  return (
    <section>
      <div className="intro">
        <h2>Step 2: Find the insects</h2>
        <p>
          <strong>Detection</strong> means finding <em>where</em> every insect is, not what kind it is. You go first,
          against the clock. Then the computer tries, and you compare.
        </p>
      </div>

      <ol className="phases" aria-label="Parts of this step">
        <li className={phase === 'mine' ? 'current' : 'done'}>1. You</li>
        <li className={phase === 'computer' ? 'current' : phase === 'compare' ? 'done' : ''}>2. Computer</li>
        <li className={phase === 'compare' ? 'current' : ''}>3. Compare</li>
      </ol>

      {phase === 'mine' && !start && (
        <div className="callout start-card">
          <p>
            <strong>Your turn.</strong>{' '}
            {TOUCH
              ? 'Tap each insect you can find to box it, then drag the corners to fit. Pinch to zoom in on the small ones.'
              : 'Drag a box around every insect you can find. Zoom in to spot the small ones.'}{' '}
            The stopwatch runs until you press <em>I'm done</em>.
          </p>
          <button className="primary big" onClick={startTimer}>
            ⏱️ Start
          </button>
        </div>
      )}

      {phase === 'mine' && start && TOUCH && !full && (
        <p className="small muted">The stopwatch is still running. Tap the photo to keep going.</p>
      )}

      {phase === 'computer' && (
        <div className="callout">
          <h3>
            You boxed {lab.studentBoxes.length} in {formatTime(handSecs)}
          </h3>
          {lab.studentScore && lab.studentJudgement ? (
            <>
              <ScoreGrid rows={[{ who: 'You', score: lab.studentScore, time: formatTime(handSecs) }]} />
              <Legend j={lab.studentJudgement} missed={showMissed} />
            </>
          ) : (
            <p className="small muted">
              Your own photo has no answer key, so your boxes become the answer key for the computer.
            </p>
          )}
          <button className="ghost" onClick={redo}>
            Try again
          </button>
        </div>
      )}

      {phase === 'compare' && lab.detector && (
        <div className="callout">
          <h3>You vs. the computer</h3>
          <FallbackNote detector={lab.detector} />
          <ScoreGrid
            rows={[
              {
                who: 'You',
                score: lab.studentScore,
                note: `You are the answer key (${lab.studentBoxes.length} boxes)`,
                time: formatTime(handSecs),
              },
              {
                who: { yolo: 'Computer', saved: 'Computer (saved answers)', simple: 'Spot finder (not AI)' }[
                  lab.detector.engine
                ],
                score: lab.detectorScore,
                note: '—',
                time: lab.detector.engine === 'saved' ? '—' : `${(lab.detector.millis / 1000).toFixed(2)} s`,
              },
            ]}
          />
          <p className="small muted">
            Same rules for both.{' '}
            {lab.detector.engine === 'saved'
              ? `These are the answers of ${engineName(lab.detector)}.`
              : `The computer checked the whole photo in ${Math.max(1, Math.round(lab.detector.millis))} milliseconds using ${engineName(lab.detector)}.`}{' '}
            <button className="link" onClick={onExplain}>
              How does an AI like YOLO see?
            </button>{' '}
            ·{' '}
            <button className="link" onClick={redo}>
              Start this step over
            </button>
          </p>
          {teamMissed > 0 && (
            <p className="small">
              The AI missed {teamMissed} small insect{teamMissed > 1 ? 's' : ''} that our team added to the answer key.
              It learned from the experts' boxes, and the experts often skipped the tiniest bugs, so the AI learned to
              skip them too. An AI picks up its habits from its training data.
            </p>
          )}
        </div>
      )}

      {photo}

      {phase === 'compare' && showContrast && lab.detector?.contrastUrl && (
        <p className="small muted">
          Bright means “very different from the empty sheet.” The detector only sees these differences. It has no idea
          what an insect is, which is why leaves fool it.
        </p>
      )}

      {phase === 'computer' && (
        <div className="computer-turn">
          <div>
            <h3>Computer's turn</h3>
            <p>
              Its <strong>detector</strong> is YOLO11n, a small AI we trained on about 2,300 real insect-monitor photos.
              It runs right now, inside this browser, so it works on your own photos too.
            </p>
          </div>
          <button className="primary big" onClick={lab.runIt} disabled={lab.detecting}>
            {lab.detecting ? 'The AI is looking at the photo…' : "▶ Run the computer's detector"}
          </button>
        </div>
      )}
    </section>
  )
}
