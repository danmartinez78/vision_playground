import { useEffect, useMemo, useRef, useState } from 'react'
import { detect, engineName, type DetectResult } from './lib/detect'
import { cropToDataUrl, judgeBoxes } from './lib/geometry'
import { sceneFromFile, sceneFromUrl } from './lib/scene'
import type { Box, Scene } from './lib/types'
import { loadSamples, REGION_NAMES, SAMPLES_DIR, sampleTitle, thumbUrl, type Sample } from './lib/samples'
import { loadYolo } from './lib/yolo'
import { SceneView, type BoxLayer } from './SceneView'

const MAX_CLOSE_UPS = 24

/** A free-play page outside the lesson: run the detector on any photo. */
export function OwnPhoto() {
  const [scene, setScene] = useState<Scene | null>(null)
  const [answerKey, setAnswerKey] = useState<Box[] | null>(null)
  const [detector, setDetector] = useState<DetectResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const [threshold, setThreshold] = useState(0.25)
  const [contrast, setContrast] = useState(false)
  const [showKey, setShowKey] = useState(true)
  const [marks, setMarks] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const results = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadYolo().catch(() => {})
    loadSamples()
      .then(setSamples)
      .catch(() => setSamples([]))
  }, [])

  const open = async (load: () => Promise<Scene>, key: Box[] | null) => {
    setError('')
    setBusy(true)
    setDetector(null)
    // jump to the results, so it's clear something is happening
    window.setTimeout(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    try {
      const s = await load()
      setScene(s)
      setAnswerKey(key)
      setMarks({})
      setContrast(false)
      setDetector(await detect(s.canvas))
    } catch {
      setError('That file could not be opened as a picture. Try a JPG or PNG.')
    } finally {
      setBusy(false)
    }
  }
  const upload = (file: File | undefined) => file && open(() => sceneFromFile(file), null)
  const openSample = (s: Sample) =>
    open(
      () => sceneFromUrl(`${SAMPLES_DIR}${s.image}`, sampleTitle(s)),
      s.boxes.map(([x1, y1, x2, y2]) => ({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 })),
    )

  const kept = useMemo(
    () => (detector ? detector.detections.filter((d) => d.score >= threshold) : []),
    [detector, threshold],
  )
  const judged = useMemo(
    () =>
      answerKey
        ? judgeBoxes(
            kept.map((d) => d.box),
            answerKey.map((box) => ({ box, insect: true })),
          )
        : null,
    [answerKey, kept],
  )
  const shown = useMemo(() => kept.slice(0, MAX_CLOSE_UPS), [kept])
  const closeUps = useMemo(
    () =>
      scene && !answerKey
        ? new Map(shown.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)]))
        : new Map<string, string>(),
    [scene, shown, answerKey],
  )
  const checked = shown.filter((d) => marks[d.id] !== undefined)
  const right = checked.filter((d) => marks[d.id]).length

  const boxColor = (id: string, i: number) => {
    if (judged) return judged.verdicts[i].kind === 'found' ? '#16a34a' : '#dc2626'
    return marks[id] === undefined ? '#e11d74' : marks[id] ? '#16a34a' : '#dc2626'
  }
  const layers: BoxLayer[] = [
    {
      key: 'detector',
      boxes: kept.map((d) => d.box),
      color: '#e11d74',
      colors: kept.map((d, i) => boxColor(d.id, i)),
      labels: kept.map((d) => `${Math.round(d.score * 100)}%`),
    },
  ]
  if (answerKey && judged && showKey) {
    layers.unshift({
      key: 'missed',
      boxes: judged.missed.map((i) => answerKey[i]),
      color: '#7c3aed',
      dashed: true,
    })
  }

  return (
    <section>
      <div className="intro">
        <h2>Try your own photo</h2>
        <p>
          Run the computer's detector, our trained YOLO11n AI, on any photo, like one from your Mothbox. It runs inside
          this web browser, so your photo never leaves your computer.
        </p>
        <p className="small muted">
          The detector was trained on insects on a lit sheet at night. On other photos (a garden, a leaf, your desk) it
          will miss things and box random spots. That's a good lesson too: an AI only knows what it was trained for.
        </p>
      </div>

      <label className="night-card upload own-upload">
        <strong>{scene && !answerKey ? 'Pick a different photo' : 'Pick a photo'}</strong>
        <span>JPG or PNG. Big photos are shrunk to 1600 pixels wide.</span>
        <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      {error && <p className="warn">{error}</p>}

      {samples.length > 0 && (
        <>
          <h3>Or try a real light-trap photo</h3>
          <p className="small muted">
            Photos from light traps in the AMI dataset, with boxes drawn by experts, so you can see what the AI found
            and missed. The detector never practiced on these photos.
          </p>
          <div className="sample-grid">
            {samples.map((s) => (
              <button
                key={s.image}
                className={scene?.key === `url-${SAMPLES_DIR}${s.image}` ? 'sample-thumb selected' : 'sample-thumb'}
                onClick={() => openSample(s)}
                disabled={busy}
              >
                <img src={thumbUrl(s.image)} width={480} height={253} alt="" />
                <span className="small">
                  {REGION_NAMES[s.region] ?? s.region} · {s.boxes.length} insects
                </span>
              </button>
            ))}
          </div>
          <p className="swipe-hint small muted">Swipe sideways for more photos.</p>
        </>
      )}

      <div ref={results} className="results-anchor" />
      {busy && <p className="callout">The AI is looking at the photo…</p>}

      {scene && detector && !busy && (
        <>
          <p>
            The detector checked {answerKey ? 'this photo' : 'your photo'} in{' '}
            <strong>{Math.max(1, Math.round(detector.millis))} milliseconds</strong> using {engineName(detector)}, and
            counted <strong>{kept.length}</strong> insects at {Math.round(threshold * 100)}% sure or more.
          </p>
          {judged && answerKey && (
            <div className="score">
              <strong>Against the experts' boxes</strong>
              <span className="pill good">
                Found {judged.hits} of {answerKey.length}
              </span>
              <span className="pill">Missed {judged.misses}</span>
              <span className="pill bad">False alarms {judged.falseAlarms}</span>
            </div>
          )}
          <div className="slider-box">
            <label htmlFor="own-threshold">
              Count a spot when the computer is at least <strong>{Math.round(threshold * 100)}%</strong> sure
            </label>
            <input
              id="own-threshold"
              type="range"
              min={0.05}
              max={0.95}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(+e.target.value)}
            />
            <div className="slider-ends small muted">
              <span>Count everything (more false alarms)</span>
              <span>Only very sure (more misses)</span>
            </div>
          </div>
          {answerKey && (
            <label className="small">
              <input type="checkbox" checked={showKey} onChange={(e) => setShowKey(e.target.checked)} /> Show insects
              the AI missed (dashed purple). Green boxes found an insect; red boxes are false alarms.
            </label>
          )}
          {detector.contrastUrl && (
            <label className="small">
              <input type="checkbox" checked={contrast} onChange={(e) => setContrast(e.target.checked)} /> What the
              detector sees
            </label>
          )}
          <SceneView
            imageUrl={(contrast && detector.contrastUrl) || scene.imageUrl}
            width={scene.width}
            height={scene.height}
            layers={layers}
            alt={answerKey ? `${scene.title} with the detector's boxes` : "Your photo with the detector's boxes"}
          />

          {!answerKey && shown.length > 0 && (
            <>
              <h3>Was it right?</h3>
              <p>
                There's no answer key for your photo, so you are the judge. Mark each close-up.
                {checked.length > 0 && (
                  <>
                    {' '}
                    So far: <strong>{right}</strong> real insects and <strong>{checked.length - right}</strong> false
                    alarms out of {checked.length} checked.
                  </>
                )}
              </p>
              {kept.length > shown.length && (
                <p className="small muted">Showing the {shown.length} spots the computer was most sure about.</p>
              )}
              <div className="cards">
                {shown.map((d) => (
                  <article
                    key={d.id}
                    className={
                      marks[d.id] === undefined ? 'crop-card' : marks[d.id] ? 'crop-card right' : 'crop-card wrong'
                    }
                  >
                    <img src={closeUps.get(d.id)} alt="A close-up the detector found" width={132} height={132} />
                    <span className="small muted">{Math.round(d.score * 100)}% sure</span>
                    <div className="group-buttons">
                      <button
                        className={marks[d.id] === true ? 'chip on' : 'chip'}
                        onClick={() => setMarks({ ...marks, [d.id]: true })}
                      >
                        ✓ Insect
                      </button>
                      <button
                        className={marks[d.id] === false ? 'chip on' : 'chip'}
                        onClick={() => setMarks({ ...marks, [d.id]: false })}
                      >
                        ✗ Not an insect
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <p className="small muted">
                Did it miss any insects? Zoom in on the photo and look for ones with no box.
              </p>
            </>
          )}
        </>
      )}
    </section>
  )
}
