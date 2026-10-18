import { useEffect, useRef, useState } from 'react'
import type { Lab } from '../lab'
import { inLesson, loadSamples, REGION_NAMES, SAMPLES_DIR, sceneFromSample, type Sample } from '../lib/samples'
import { SceneView } from '../SceneView'

export function StepNight({ lab }: { lab: Lab }) {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const photo = useRef<HTMLDivElement>(null)
  const show = () => window.setTimeout(() => photo.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  useEffect(() => {
    loadSamples()
      .then((all) => setSamples(all.filter(inLesson)))
      .catch(() => setError('The photos could not be loaded. Check the connection and reload the page.'))
  }, [])

  const pick = async (s: Sample) => {
    setLoading(s.image)
    try {
      lab.setScene(await sceneFromSample(s))
      show()
    } catch {
      setError('That photo could not be loaded. Try another one.')
    } finally {
      setLoading('')
    }
  }

  return (
    <section>
      <div className="intro">
        <h2>Step 1: Look at a Mothbox photo</h2>
        <p>
          A <strong>Mothbox</strong> is a camera trap for insects. At night it turns on a bright light and takes photos
          of the insects that land on its white sheet. One night can make hundreds of photos. Nobody has time to look at
          all of them, so computers help. In this lab you will do each job yourself first, then see how the computer
          does it.
        </p>
      </div>

      <h3>Pick a photo to work on</h3>
      <p className="small muted">
        These are real photos from light traps like the Mothbox, used by scientists in the AMI project in North America,
        Central America and Europe. Experts drew a box around every insect, so the lab knows the right answers.
      </p>
      {error && <p className="warn">{error}</p>}
      <div className="sample-grid">
        {samples.map((s) => (
          <button
            key={s.image}
            className={lab.scene?.key === `ami-${s.image}` ? 'sample-thumb selected' : 'sample-thumb'}
            onClick={() => pick(s)}
            disabled={Boolean(loading)}
          >
            <img src={`${SAMPLES_DIR}${s.image}`} alt="" loading="lazy" />
            <span className="small">{loading === s.image ? 'Loading…' : (REGION_NAMES[s.region] ?? s.region)}</span>
          </button>
        ))}
      </div>
      <p className="swipe-hint small muted">Swipe sideways for more photos.</p>

      <div ref={photo} className="results-anchor" />
      {lab.scene && (
        <>
          <SceneView
            imageUrl={lab.scene.imageUrl}
            width={lab.scene.width}
            height={lab.scene.height}
            layers={[]}
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
