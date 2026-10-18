import { useRef, useState } from 'react'
import type { Lab } from '../lab'
import { detect } from '../lib/detect'
import { inLesson, loadSamples, sceneFromSample } from '../lib/samples'
import { randomRecipe, renderNight } from '../lib/scene'
import type { Scene } from '../lib/types'
import { formatDuration } from '../lib/time'

// From the Mothbox paper: the default schedule takes about 300 photos a night.
const PHOTOS_PER_NIGHT = 300
const NIGHTS_PER_SEASON = 60
const BATCH = 20
// Used until the student has timed themselves.
const DEFAULT_BOX_SECONDS = 5
// Naming an insect to species takes far longer than sorting it into a group,
// so the by-hand estimate never uses less than this.
const MIN_ID_SECONDS = 8

interface BatchResult {
  photos: number
  insects: number
  found: number
  detectSeconds: number
}

export function ScaleUp({ lab }: { lab: Lab }) {
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BatchResult | null>(null)
  const running = useRef(false)

  const run = async () => {
    if (running.current) return
    running.current = true
    setResult(null)
    const acc: BatchResult = { photos: 0, insects: 0, found: 0, detectSeconds: 0 }
    const seedBase = Math.floor(Math.random() * 100000)
    // real photos: the other lesson photos; drawn night: freshly drawn ones
    let next: () => Promise<Scene> = async () => renderNight(randomRecipe(seedBase + acc.photos), false)
    if (lab.real) {
      try {
        const others = (await loadSamples()).filter((s) => inLesson(s) && `ami-${s.image}` !== lab.scene?.key)
        next = () => sceneFromSample(others[acc.photos % others.length])
      } catch {
        // keep the drawn photos if the real ones can't be loaded
      }
    }
    const step = async () => {
      const scene = await next()
      const out = await detect(scene.canvas)
      acc.photos++
      acc.insects += scene.truth!.filter((t) => t.kind === 'insect').length
      acc.found += out.detections.filter((d) => d.score >= lab.threshold).length
      acc.detectSeconds += out.millis / 1000
      setProgress(acc.photos / BATCH)
      if (acc.photos < BATCH) window.setTimeout(step, 0)
      else {
        setResult({ ...acc })
        running.current = false
      }
    }
    window.setTimeout(step, 0)
  }

  const boxSec = lab.handSeconds ?? DEFAULT_BOX_SECONDS
  const idSec = Math.max(MIN_ID_SECONDS, lab.sortSeconds ?? 0)
  const unsureShare = lab.cards.length ? lab.unsure.length / lab.cards.length : 0.3

  let tiles = null
  if (result) {
    const perPhoto = result.insects / result.photos
    const handNight = PHOTOS_PER_NIGHT * perPhoto * (boxSec + idSec)
    const computerNight = (PHOTOS_PER_NIGHT * result.detectSeconds) / result.photos
    const teamNight = computerNight + PHOTOS_PER_NIGHT * perPhoto * unsureShare * idSec
    tiles = (
      <>
        <p>
          The computer checked <strong>{result.photos} photos</strong> in{' '}
          <strong>{formatDuration(result.detectSeconds)}</strong>. For a whole Mothbox night of {PHOTOS_PER_NIGHT}{' '}
          photos:
        </p>
        <div className="stat-row">
          <div className="stat">
            <span>By hand: one night</span>
            <strong>{formatDuration(handNight)}</strong>
            <small>finding and naming every insect</small>
          </div>
          <div className="stat">
            <span>By hand: a season ({NIGHTS_PER_SEASON} nights)</span>
            <strong>{formatDuration(handNight * NIGHTS_PER_SEASON)}</strong>
            <small>about {Math.round((handNight * NIGHTS_PER_SEASON) / 3600 / 40)} weeks of full-time work</small>
          </div>
          <div className="stat">
            <span>Computer finding the bugs: one night</span>
            <strong>{formatDuration(computerNight)}</strong>
            <small>our YOLO11n AI on this device</small>
          </div>
          <div className="stat highlight">
            <span>Computer + you checking only the unsure ones</span>
            <strong>{formatDuration(teamNight)}</strong>
            <small>you review about {Math.round(unsureShare * 100)}% of the insects</small>
          </div>
        </div>
        <details className="small muted">
          <summary>How did we work this out?</summary>
          <p>
            {lab.handSeconds !== null
              ? `Using your own boxing speed from Step 2 (${boxSec.toFixed(1)} seconds per insect)`
              : `Using ${boxSec} seconds to box each insect (try the stopwatch in Step 2 to use your own speed)`}{' '}
            and {idSec.toFixed(0)} seconds to name each one to species
            {lab.sortSeconds !== null && lab.sortSeconds < idSec
              ? ` (you sorted cards into groups in ${lab.sortSeconds.toFixed(1)} seconds, but naming the exact species is much harder)`
              : ''}
            . The computer time counts only finding the insects. Naming them with BioCLIP takes extra computer time, but
            still far less than doing it by hand.
          </p>
        </details>
      </>
    )
  }

  return (
    <div className="scale-box">
      <h3>Scale it up</h3>
      <p>A real Mothbox takes hundreds of photos a night. Let the computer try a stack of new ones.</p>
      <button className="primary" onClick={run} disabled={progress > 0 && progress < 1}>
        {result ? 'Run it again' : `Process ${BATCH} new photos`}
      </button>
      {progress > 0 && (
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      {tiles}
    </div>
  )
}
