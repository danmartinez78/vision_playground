import { useState } from 'react'
import type { Lab } from '../lab'
import { NIGHTS, renderNight, sceneFromFile } from '../lib/scene'
import { SceneView } from '../SceneView'

export function StepNight({ lab }: { lab: Lab }) {
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState('')

  const upload = async (file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      lab.setScene(await sceneFromFile(file))
    } catch {
      setError('That file could not be opened as a picture. Try a JPG or PNG.')
    }
  }

  return (
    <section>
      <div className="intro">
        <h2>Step 1: The night</h2>
        <p>
          A <strong>Mothbox</strong> wakes up at night, turns on a bright UV light and takes photos of the insects that
          land on its white sheet. One night can make hundreds of photos. Nobody has time to look at all of them, so
          computers help. In this lab you will do each job yourself first, then see how the computer does it.
        </p>
      </div>

      <h3>Pick a night</h3>
      <div className="night-grid">
        {NIGHTS.map((n) => (
          <button
            key={n.key}
            className={lab.scene?.key === n.key ? 'night-card selected' : 'night-card'}
            onClick={() => lab.setScene(renderNight(n))}
          >
            <strong>{n.title}</strong>
            <span>{n.blurb}</span>
          </button>
        ))}
        <label className={lab.scene?.source === 'upload' ? 'night-card upload selected' : 'night-card upload'}>
          <strong>Use your own photo</strong>
          <span>A photo from your Mothbox, or any picture of bugs on a light sheet.</span>
          <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      </div>
      {error && <p className="warn">{error}</p>}
      <p className="small muted">
        The three sample nights are drawn by the computer so we know the right answers. Real Mothbox photos come next.
      </p>

      {lab.scene && (
        <>
          <div className="toolbar">
            <label>
              Zoom
              <input type="range" min={1} max={3} step={0.25} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
            </label>
            <span className="muted small">Scroll around when zoomed in.</span>
          </div>
          <SceneView
            imageUrl={lab.scene.imageUrl}
            width={lab.scene.width}
            height={lab.scene.height}
            layers={[]}
            zoom={zoom}
            alt={`Mothbox sheet: ${lab.scene.title}`}
          />
          <div className="callout">
            <label className="guess">
              Quick guess: how many insects are on this sheet?
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={lab.guess}
                onChange={(e) => lab.setGuess(e.target.value)}
                placeholder="Your guess"
              />
            </label>
            <p className="small muted">Write it down. You will check it at the end.</p>
          </div>
        </>
      )}
    </section>
  )
}
