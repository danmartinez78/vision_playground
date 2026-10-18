import { useMemo, useState } from 'react'
import { runDetector, type DetectorOutput } from './lib/detector'
import { cropToDataUrl } from './lib/geometry'
import { sceneFromFile } from './lib/scene'
import type { Scene } from './lib/types'
import { SceneView, type BoxLayer } from './SceneView'

const MAX_CLOSE_UPS = 24

/** A free-play page outside the lesson: run the detector on any photo. */
export function OwnPhoto() {
  const [scene, setScene] = useState<Scene | null>(null)
  const [detector, setDetector] = useState<DetectorOutput | null>(null)
  const [threshold, setThreshold] = useState(0.4)
  const [contrast, setContrast] = useState(false)
  const [marks, setMarks] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')

  const upload = async (file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      const s = await sceneFromFile(file)
      setScene(s)
      setMarks({})
      setContrast(false)
      setDetector(runDetector(s.canvas))
    } catch {
      setError('That file could not be opened as a picture. Try a JPG or PNG.')
    }
  }

  const kept = useMemo(
    () => (detector ? detector.detections.filter((d) => d.score >= threshold) : []),
    [detector, threshold],
  )
  const shown = useMemo(() => kept.slice(0, MAX_CLOSE_UPS), [kept])
  const closeUps = useMemo(
    () => (scene ? new Map(shown.map((d) => [d.id, cropToDataUrl(scene.canvas, d.box)])) : new Map<string, string>()),
    [scene, shown],
  )
  const checked = shown.filter((d) => marks[d.id] !== undefined)
  const right = checked.filter((d) => marks[d.id]).length

  const layers: BoxLayer[] = [
    {
      key: 'detector',
      boxes: kept.map((d) => d.box),
      color: '#e11d74',
      colors: kept.map((d) => (marks[d.id] === undefined ? '#e11d74' : marks[d.id] ? '#16a34a' : '#dc2626')),
      labels: kept.map((d) => `${Math.round(d.score * 100)}%`),
    },
  ]

  return (
    <section>
      <div className="intro">
        <h2>Try your own photo</h2>
        <p>
          Run the computer's detector on any photo, like one from your Mothbox. It runs inside this web browser, so your
          photo never leaves your computer.
        </p>
        <p className="small muted">
          The detector was made for insects on a white sheet at night. On other photos (a garden, a leaf, your desk) it
          will miss things and box random spots. That's a good lesson too: an AI only knows what it was made or trained
          for.
        </p>
      </div>

      <label className="night-card upload own-upload">
        <strong>{scene ? 'Pick a different photo' : 'Pick a photo'}</strong>
        <span>JPG or PNG. Big photos are shrunk to 1600 pixels wide.</span>
        <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      {error && <p className="warn">{error}</p>}

      {scene && detector && (
        <>
          <p>
            The detector checked your photo in <strong>{Math.max(1, Math.round(detector.millis))} milliseconds</strong>{' '}
            and counted <strong>{kept.length}</strong> insects at {Math.round(threshold * 100)}% sure or more.
          </p>
          <div className="slider-box">
            <label htmlFor="own-threshold">
              Count a spot when the computer is at least <strong>{Math.round(threshold * 100)}%</strong> sure
            </label>
            <input
              id="own-threshold"
              type="range"
              min={0}
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
          <label className="small">
            <input type="checkbox" checked={contrast} onChange={(e) => setContrast(e.target.checked)} /> What the
            detector sees
          </label>
          <SceneView
            imageUrl={contrast ? detector.contrastUrl : scene.imageUrl}
            width={scene.width}
            height={scene.height}
            layers={layers}
            alt="Your photo with the detector's boxes"
          />

          {shown.length > 0 && (
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
