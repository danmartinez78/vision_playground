import type { Lab } from '../lab'
import { NIGHTS, renderNight } from '../lib/scene'
import { SceneView } from '../SceneView'

export function StepNight({ lab }: { lab: Lab }) {
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
      </div>
      <p className="small muted">
        These photos are drawn by the computer, so the lab knows the right answers. Want to try the detector on your own
        photo? Use <em>Try your own photo</em> at the top of the page.
      </p>

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
