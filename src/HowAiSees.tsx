import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import type { Lab } from './lab'
import {
  add,
  convolve,
  darkness,
  FILTERS,
  gridToDataUrl,
  makeTrainingPicture,
  maxPool,
  newTinyNet,
  NUMBER_COUNT,
  readPixels,
  relu,
  runTinyNet,
  scoreTinyNet,
  trainStep,
  type Grid,
  type TinyNet,
} from './lib/cnn'
import { iou } from './lib/geometry'
import { between, makeRng } from './lib/rng'
import { NIGHTS, renderNight } from './lib/scene'
import { SPECIES_BY_ID } from './lib/species'
import type { Box, Scene } from './lib/types'
import { SceneView, type BoxLayer } from './SceneView'

/** A square around the biggest moth on the sheet, for the close-up demos. */
function mothCrop(scene: Scene): Box {
  const moths = (scene.truth ?? []).filter(
    (t) => t.kind === 'insect' && SPECIES_BY_ID.get(t.speciesId!)?.group === 'moth',
  )
  const big = moths.sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h)[0]
  const b = big?.box ?? { x: scene.width / 2 - 50, y: scene.height / 2 - 50, w: 100, h: 100 }
  const side = Math.max(b.w, b.h) * 1.15
  return { x: b.x + b.w / 2 - side / 2, y: b.y + b.h / 2 - side / 2, w: side, h: side }
}

/** Darkness from 0 (white) to 9 (black), so students can do the math in their heads. */
function digits(g: Grid): Grid {
  return { ...g, data: g.data.map((v) => Math.round(v * 9)) }
}

// ---------------------------------------------------------------------------

const RESOLUTIONS = [64, 32, 16, 8]
const MAX_NUMBERS = 16

function PixelNumbers({ scene, crop }: { scene: Scene; crop: Box }) {
  const [size, setSize] = useState(64)
  const [numbers, setNumbers] = useState(false)
  const { px, dark } = useMemo(() => {
    const px = readPixels(scene.canvas, crop, size, size)
    return { px, dark: digits(darkness(px, size, size)) }
  }, [scene, crop, size])
  const showNumbers = numbers && size <= MAX_NUMBERS

  return (
    <div className="explain-block">
      <h3>1. A photo is just a grid of numbers</h3>
      <p>
        A computer can't "look" at a moth the way you do. To a computer, a photo is a grid of tiny squares called{' '}
        <strong>pixels</strong>, and every pixel is a number. Here's a close-up of the biggest moth from the photo.
      </p>
      <p>
        <strong>Resolution</strong> is how many pixels are used to show the picture. More pixels show more detail. Lower
        the resolution step by step and watch the moth turn into blocks. Then show the numbers the computer really works
        with.
      </p>
      <div className="toolbar">
        <span>Resolution:</span>
        {RESOLUTIONS.map((s) => (
          <button key={s} className={s === size ? 'chip selected' : 'chip'} onClick={() => setSize(s)}>
            {s} × {s}
          </button>
        ))}
        <label>
          <input
            type="checkbox"
            checked={numbers}
            onChange={(e) => setNumbers(e.target.checked)}
            disabled={size > MAX_NUMBERS}
          />
          Show the numbers
        </label>
        {size > MAX_NUMBERS && (
          <span className="small muted">
            {size * size} numbers are too many to read here. Pick {MAX_NUMBERS} × {MAX_NUMBERS} or 8 × 8 to see them.
          </span>
        )}
      </div>
      <div
        className="pixel-grid"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        aria-label={`The moth as a grid of ${size} by ${size} pixels`}
      >
        {Array.from({ length: size * size }, (_, i) => {
          const d = dark.data[i]
          const bg = showNumbers
            ? `rgb(${255 - d * 26}, ${255 - d * 26}, ${255 - d * 26})`
            : `rgb(${px[i * 4]}, ${px[i * 4 + 1]}, ${px[i * 4 + 2]})`
          return (
            <span key={i} style={{ background: bg, color: d > 4 ? '#fff' : '#1d2340' }}>
              {showNumbers ? d : ''}
            </span>
          )
        })}
      </div>
      <p className="small muted">
        {size} × {size} = {size * size} pixels. In the numbers, 0 means white and 9 means black. A real color photo has
        three numbers for every pixel (how much red, green and blue), and a Mothbox photo has tens of millions of
        pixels. That's a lot of numbers!
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------

const PRESETS: { name: string; tip: string; k: number[] }[] = [
  {
    name: 'Left-edge finder',
    tip: 'Lights up where it gets darker from left to right: the left edge of a dark shape.',
    k: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
  },
  {
    name: 'Top-edge finder',
    tip: 'Lights up where it gets darker from top to bottom: the top edge of a dark shape.',
    k: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
  },
  {
    name: 'Spot finder',
    tip: 'Lights up where the middle is darker than everything around it: spots, legs and antennae.',
    k: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
  },
  {
    name: 'Blur',
    tip: 'Adds up the whole neighborhood, so small details get smoothed out.',
    k: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  { name: 'Copy', tip: 'Only the middle counts, so the picture comes out unchanged.', k: [0, 0, 0, 0, 1, 0, 0, 0, 0] },
]

const FILTER_SIZE = 32

function FilterPlayground({ scene, crop }: { scene: Scene; crop: Box }) {
  const [kernel, setKernel] = useState(PRESETS[0].k)
  // until a student clicks, show the math at the spot where the filter's answer is biggest
  const [picked, setPicked] = useState<{ x: number; y: number } | null>(null)
  const input = useMemo(
    () => digits(darkness(readPixels(scene.canvas, crop, FILTER_SIZE, FILTER_SIZE), FILTER_SIZE, FILTER_SIZE)),
    [scene, crop],
  )
  const inputUrl = useMemo(() => gridToDataUrl({ ...input, data: input.data.map((v) => 9 - v) }, 9), [input])
  const output = useMemo(() => relu(convolve(input, kernel)), [input, kernel])
  const outputUrl = useMemo(() => gridToDataUrl(output, undefined, [255, 196, 64]), [output])
  const spot = useMemo(() => {
    if (picked) return picked
    let best = 0
    output.data.forEach((v, i) => {
      if (v > output.data[best]) best = i
    })
    return { x: best % FILTER_SIZE, y: Math.floor(best / FILTER_SIZE) }
  }, [picked, output])
  const preset = PRESETS.find((p) => p.k.every((v, i) => v === kernel[i]))

  const patch: number[] = []
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const yy = Math.min(FILTER_SIZE - 1, Math.max(0, spot.y + dy))
      const xx = Math.min(FILTER_SIZE - 1, Math.max(0, spot.x + dx))
      patch.push(input.data[yy * FILTER_SIZE + xx])
    }
  const sum = patch.reduce((s, v, i) => s + v * kernel[i], 0)

  const pick = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPicked({
      x: Math.min(FILTER_SIZE - 1, Math.floor(((e.clientX - r.left) / r.width) * FILTER_SIZE)),
      y: Math.min(FILTER_SIZE - 1, Math.floor(((e.clientY - r.top) / r.height) * FILTER_SIZE)),
    })
  }
  const marker = {
    left: `${((spot.x - 1) / FILTER_SIZE) * 100}%`,
    top: `${((spot.y - 1) / FILTER_SIZE) * 100}%`,
    width: `${(3 / FILTER_SIZE) * 100}%`,
    height: `${(3 / FILTER_SIZE) * 100}%`,
  }

  return (
    <div className="explain-block">
      <h3>2. A filter is a tiny pattern finder</h3>
      <p>
        The "C" in CNN stands for <strong>convolution</strong>, a big word for a simple idea. A <strong>filter</strong>{' '}
        is a small 3 x 3 grid of numbers. It slides over the photo one spot at a time. At each spot it multiplies the 9
        pixels under it by its 9 numbers and adds them up. A big answer means "I found my pattern here!"
      </p>
      <div className="toolbar">
        {PRESETS.map((p) => (
          <button key={p.name} className={preset === p ? 'chip selected' : 'chip'} onClick={() => setKernel(p.k)}>
            {p.name}
          </button>
        ))}
      </div>
      <p className="small">{preset ? preset.tip : 'Your own filter! What pattern do you think it finds?'}</p>

      <div className="filter-row">
        <figure>
          <div className="pixel-pic" onClick={pick} role="button" aria-label="Click a spot to see the math there">
            <img src={inputUrl} alt="The moth, 32 pixels across" />
            <span className="marker" style={marker} />
          </div>
          <figcaption>The photo. Click anywhere to see the math.</figcaption>
        </figure>

        <figure className="filter-math">
          <div className="math-grids">
            <div className="mini-grid">
              {patch.map((v, i) => (
                <span key={i}>{v}</span>
              ))}
            </div>
            <span className="op">×</span>
            <div className="mini-grid kernel">
              {kernel.map((v, i) => (
                <input
                  key={i}
                  type="number"
                  min={-9}
                  max={9}
                  value={v}
                  aria-label={`Filter number ${i + 1}`}
                  onChange={(e) => {
                    const next = [...kernel]
                    next[i] = Math.max(-9, Math.min(9, Math.round(+e.target.value || 0)))
                    setKernel(next)
                  }}
                />
              ))}
            </div>
          </div>
          <p className="small">
            {patch.map((v, i) => `${v}×${kernel[i]}`).join(' + ')} = <strong>{sum}</strong>
            {sum < 0 && (
              <>
                {' '}
                → negative answers become <strong>0</strong>
              </>
            )}
          </p>
          <figcaption>
            Pixels under the filter (left) times the filter (right). You can type your own filter numbers.
          </figcaption>
        </figure>

        <figure>
          <div className="pixel-pic">
            <img src={outputUrl} alt="Where the filter found its pattern" />
            <span className="marker" style={marker} />
          </div>
          <figcaption>Every spot's answer. Bright = pattern found.</figcaption>
        </figure>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function LayerStack({ scene, crop }: { scene: Scene; crop: Box }) {
  const stages = useMemo(() => {
    const photo = darkness(readPixels(scene.canvas, crop, 64, 64), 64, 64)
    const edges = [
      [-1, 0, 1, -1, 0, 1, -1, 0, 1],
      [1, 0, -1, 1, 0, -1, 1, 0, -1],
      [-1, -1, -1, 0, 0, 0, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, -1, -1, -1],
    ].map((k) => relu(convolve(photo, k)))
    const outline = maxPool(add(edges))
    const blob = maxPool(relu(convolve(convolve(outline, [1, 1, 1, 1, 1, 1, 1, 1, 1]), [1, 1, 1, 1, 1, 1, 1, 1, 1])))
    return {
      photo: gridToDataUrl({ ...photo, data: photo.data.map((v) => 1 - v) }, 1),
      edges: edges.map((g) => gridToDataUrl(g, undefined, [255, 196, 64])),
      outline: gridToDataUrl(outline, undefined, [255, 196, 64]),
      blob: gridToDataUrl(blob, undefined, [255, 196, 64]),
    }
  }, [scene, crop])

  return (
    <div className="explain-block">
      <h3>3. Layers stack up: edges, then shapes, then "insect!"</h3>
      <p>
        One filter only finds one simple pattern. A CNN uses lots of filters, in <strong>layers</strong>. The answers
        from one layer become the "photo" for the next layer. Between layers the grid also shrinks (keeping the
        strongest answer in each little block), so each layer looks at a bigger piece of the picture.
      </p>
      <div className="layer-row">
        <figure>
          <img src={stages.photo} alt="The moth" className="pixel-img" />
          <figcaption>Photo (64 × 64)</figcaption>
        </figure>
        <span className="arrow" aria-hidden>
          →
        </span>
        <figure>
          <div className="edge-grid">
            {stages.edges.map((u, i) => (
              <img key={i} src={u} alt={`Edge filter ${i + 1}`} className="pixel-img" />
            ))}
          </div>
          <figcaption>Layer 1: four edge finders (left, right, top, bottom)</figcaption>
        </figure>
        <span className="arrow" aria-hidden>
          →
        </span>
        <figure>
          <img src={stages.outline} alt="Outline" className="pixel-img" />
          <figcaption>Layer 2: edges joined into an outline (32 × 32)</figcaption>
        </figure>
        <span className="arrow" aria-hidden>
          →
        </span>
        <figure>
          <img src={stages.blob} alt="Blob" className="pixel-img" />
          <figcaption>Layer 3: "something insect-sized is here" (16 × 16)</figcaption>
        </figure>
      </div>
      <p className="small muted">
        We picked these filters by hand so you can see what each one does. A real AI picks its own filters while it
        learns (you'll try that in part 2), and its deeper layers end up reacting to things like wing shapes, antennae
        and eyes. Our real model has dozens of layers.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------

const TRAIN_W = 200
const MAX_ROUNDS = 200

function TeachTinyAi({ trainScene, testScene }: { trainScene: Scene; testScene: Scene }) {
  const train = useMemo(() => makeTrainingPicture(trainScene.canvas, trainScene.truth!, TRAIN_W), [trainScene])
  const test = useMemo(() => makeTrainingPicture(testScene.canvas, testScene.truth!, TRAIN_W), [testScene])
  const [seed, setSeed] = useState(1)
  // the network's numbers change in place as it trains; `losses` growing is what redraws the page
  const [net, setNet] = useState<TinyNet>(() => newTinyNet(1))
  const [losses, setLosses] = useState<number[]>([])
  const [running, setRunning] = useState(false)
  const [onTest, setOnTest] = useState(false)

  useEffect(() => {
    if (!running) return
    let id = 0
    const tick = () => {
      const got: number[] = []
      for (let i = 0; i < 2 && net.steps < MAX_ROUNDS; i++) got.push(trainStep(net, train))
      setLosses((l) => [...l, ...got])
      if (net.steps >= MAX_ROUNDS) setRunning(false)
      else id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [running, train, net])

  const shown = onTest ? test : train
  const shownScene = onTest ? testScene : trainScene
  const rounds = losses.length
  const view = useMemo(() => runTinyNet(net, shown), [net, shown, rounds]) // eslint-disable-line react-hooks/exhaustive-deps
  const score = scoreTinyNet(view, shown, shownScene.truth!, shownScene.width)
  const outputUrl = useMemo(() => gridToDataUrl(view.output, 1, [255, 196, 64]), [view])
  const mapUrls = useMemo(() => view.filterMaps.map((g) => gridToDataUrl(g, undefined, [120, 200, 255])), [view])

  const restart = () => {
    setRunning(false)
    const s = seed + 1
    setNet(newTinyNet(s))
    setSeed(s)
    setLosses([])
  }

  const maxLoss = Math.max(...losses, 0.01)
  const spark = losses.map((l, i) => `${(i / MAX_ROUNDS) * 300},${60 - (l / maxLoss) * 56}`).join(' ')

  return (
    <div className="explain-block">
      <h3>Teach a tiny AI</h3>
      <p>
        Nobody types in the filter numbers. The AI starts with <strong>random</strong> numbers, so at first its guesses
        are junk. Then it practices on photos where people already marked every insect. After each guess it checks how
        wrong it was and nudges every number a tiny bit to be a little less wrong. Then it does it again, and again.
      </p>
      <p>
        Below is a real, tiny CNN with {FILTERS} filters and just {NUMBER_COUNT} numbers. Press <em>Train</em> and watch
        it learn from the cool, quiet night (where the lab knows the answers).
      </p>

      <div className="toolbar">
        <button className="primary" onClick={() => setRunning(!running)} disabled={!running && rounds >= MAX_ROUNDS}>
          {running ? 'Pause' : rounds ? 'Keep training' : 'Train'}
        </button>
        <button className="ghost" onClick={restart}>
          Start over with new random numbers
        </button>
        <label>
          <input type="checkbox" checked={onTest} onChange={(e) => setOnTest(e.target.checked)} />
          Test it on the windy night (it never practiced on that one)
        </label>
      </div>

      <div className="stat-row">
        <div className="stat">
          <span>Practice rounds</span>
          <strong>{rounds}</strong>
        </div>
        <div className="stat">
          <span>Insects it lights up</span>
          <strong>
            {score.found} of {score.insects}
          </strong>
        </div>
        <div className="stat">
          <span>Leaves, twigs and smudges it's fooled by</span>
          <strong>
            {score.fooledBy} of {score.debris}
          </strong>
        </div>
        <div className="stat">
          <span>How wrong it is</span>
          <svg
            viewBox="0 0 300 64"
            className="spark"
            role="img"
            aria-label="How wrong the tiny AI is, going down as it learns"
          >
            <polyline points={spark} fill="none" stroke="var(--accent)" strokeWidth={3} />
          </svg>
        </div>
      </div>

      <div className="two-col">
        <figure>
          <img src={shownScene.imageUrl} alt={shownScene.title} className="full-img" />
          <figcaption>{onTest ? 'The windy night: new to the tiny AI' : 'The practice photo'}</figcaption>
        </figure>
        <figure>
          <img src={outputUrl} alt="Where the tiny AI thinks insects are" className="full-img pixel-img" />
          <figcaption>What the tiny AI thinks. Bright = "insect here!"</figcaption>
        </figure>
      </div>
      <div className="filter-maps">
        {mapUrls.map((u, i) => (
          <figure key={i}>
            <img src={u} alt={`What filter ${i + 1} lights up`} className="pixel-img" />
            <figcaption>Filter {i + 1}</figcaption>
          </figure>
        ))}
      </div>
      <p className="small muted">
        These are what its {FILTERS} filters light up. Nobody told them what to look for. Watch them change as it
        trains.
      </p>

      <div className="callout">
        <strong>Tiny AI vs. our real detector</strong>
        <ul>
          <li>
            Tiny AI: {NUMBER_COUNT} numbers, practiced on 1 drawn photo for {MAX_ROUNDS} rounds, in a few seconds.
          </li>
          <li>
            Our real detector (YOLO): about 2.6 million numbers, practiced on about 2,300 real light-trap photos that
            experts had boxed, 100 times through all of them, in about an hour on a powerful graphics chip (GPU).
          </li>
        </ul>
        Same idea, much bigger. That's why the real one finds tiny insects and isn't fooled as often.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

const YOLO_STAGES = ['Split into a grid', 'Every cell guesses', 'Drop weak guesses', 'Keep the best box']
const CELL = 80

function YoloGrid({ scene }: { scene: Scene }) {
  const [stage, setStage] = useState(0)
  const { cells, guesses } = useMemo(() => {
    const cells: Box[] = []
    for (let y = 0; y < scene.height; y += CELL)
      for (let x = 0; x < scene.width; x += CELL) cells.push({ x, y, w: CELL, h: CELL })
    const rng = makeRng(7)
    const guesses: { box: Box; score: number }[] = []
    for (const t of scene.truth ?? []) {
      const real = t.kind === 'insect'
      const n = real ? 4 : 2
      for (let i = 0; i < n; i++) {
        const j = (v: number) => v * between(rng, -0.12, 0.12)
        guesses.push({
          box: {
            x: t.box.x + j(t.box.w),
            y: t.box.y + j(t.box.h),
            w: t.box.w * between(rng, 0.85, 1.15),
            h: t.box.h * between(rng, 0.85, 1.15),
          },
          score: real ? (i === 0 ? between(rng, 0.6, 0.95) : between(rng, 0.25, 0.7)) : between(rng, 0.05, 0.4),
        })
      }
    }
    for (let i = 0; i < 40; i++) {
      const c = cells[Math.floor(rng() * cells.length)]
      guesses.push({
        box: {
          x: c.x + between(rng, -20, 40),
          y: c.y + between(rng, -20, 40),
          w: between(rng, 30, 90),
          h: between(rng, 30, 90),
        },
        score: between(rng, 0.02, 0.18),
      })
    }
    return { cells, guesses }
  }, [scene])

  const kept = useMemo(() => {
    const strong = guesses.filter((g) => g.score >= 0.25)
    if (stage < 3) return stage === 2 ? strong : guesses
    // non-maximum suppression: keep the most confident box, drop boxes that overlap it a lot
    const out: typeof guesses = []
    for (const g of [...strong].sort((a, b) => b.score - a.score))
      if (out.every((o) => iou(o.box, g.box) < 0.3)) out.push(g)
    return out
  }, [guesses, stage])

  const layers: BoxLayer[] = [{ key: 'grid', boxes: cells, color: 'rgba(80, 90, 140, 0.2)' }]
  if (stage >= 1)
    layers.push({
      key: 'guesses',
      boxes: kept.map((g) => g.box),
      color: '#e11d74',
      labels: stage >= 2 ? kept.map((g) => `${Math.round(g.score * 100)}%`) : undefined,
    })

  const text = [
    'YOLO puts an invisible grid over the whole photo. Each square is a cell.',
    `Every cell asks: "Is the middle of an insect inside me? If so, how big is its box, and how sure am I?" That makes lots of guesses at once, ${guesses.length} here. Most are weak.`,
    'Guesses below 25% sure are thrown out. This is the same "how sure" slider you tried in Step 2.',
    'Neighboring cells often guess the same insect. YOLO keeps the most confident box and removes the ones that overlap it a lot. One insect, one box.',
  ]

  return (
    <div className="explain-block">
      <h3>4. How YOLO turns all of this into boxes</h3>
      <p>
        YOLO stands for <strong>"You Only Look Once."</strong> Older detectors looked at a photo many times, one
        possible area at a time. YOLO runs the photo through its layers <em>once</em> and gets every box at the same
        time. That's why it is fast enough to run in a web browser.
      </p>
      <div className="toolbar">
        {YOLO_STAGES.map((s, i) => (
          <button key={s} className={i === stage ? 'chip selected' : 'chip'} onClick={() => setStage(i)}>
            {i + 1}. {s}
          </button>
        ))}
      </div>
      <p>{text[stage]}</p>
      <SceneView
        imageUrl={scene.imageUrl}
        width={scene.width}
        height={scene.height}
        layers={layers}
        alt="The night with YOLO's grid"
      />
      <p className="small muted">
        This is a drawing of the idea, not the real model's guesses. The real one uses three grids at once (small cells
        for small insects, big cells for big ones), which adds up to 33,600 cells for one photo.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------

function useLessonScenes(lab: Lab) {
  const scene = useMemo(() => (lab.scene?.source === 'sample' ? lab.scene : renderNight(NIGHTS[0])), [lab.scene])
  return scene
}

export function HowAiSees({ lab }: { lab: Lab }) {
  const scene = useLessonScenes(lab)
  const crop = useMemo(() => mothCrop(scene), [scene])

  return (
    <section className="explainer">
      <div className="intro">
        <p>
          The real Mothbox finds insects with an AI called a <strong>convolutional neural network</strong> (CNN for
          short). That sounds complicated, but it's built from a few simple ideas. Try each one below.
        </p>
      </div>

      <PixelNumbers scene={scene} crop={crop} />
      <FilterPlayground scene={scene} crop={crop} />
      <LayerStack scene={scene} crop={crop} />
      <YoloGrid scene={scene} />

      <div className="callout">
        <h3>Talk about it</h3>
        <ol>
          <li>Design your own filter in part 2. Can you make one that finds right edges? Bottom edges?</li>
          <li>Why do you think small insects are harder for the computer to find than big ones?</li>
        </ol>
      </div>
    </section>
  )
}

export function HowAiLearns({ lab }: { lab: Lab }) {
  const scene = useLessonScenes(lab)
  const trainScene = useMemo(() => (scene.key === 'quiet' ? scene : renderNight(NIGHTS[0])), [scene])
  const testScene = useMemo(() => renderNight(NIGHTS[2]), [])

  return (
    <section className="explainer">
      <div className="intro">
        <p>
          In part 1, we picked the filters by hand. A real AI finds its own filter numbers by practicing. This is called{' '}
          <strong>training</strong>.
        </p>
      </div>

      <TeachTinyAi trainScene={trainScene} testScene={testScene} />

      <div className="big-idea">
        <h3>What the AI can't do</h3>
        <ul>
          <li>
            It only knows what it practiced on. Our detector learned from light-trap photos, so a photo of a garden
            would confuse it.
          </li>
          <li>
            It finds <em>where</em> insects are, not <em>what</em> they are. Naming them is a different AI (BioCLIP),
            which you'll meet in step 3 of the lesson.
          </li>
          <li>
            It doesn't "understand" bugs. It's millions of numbers that got good at one job, so people still check its
            work.
          </li>
        </ul>
      </div>

      <div className="callout">
        <h3>Talk about it</h3>
        <ol>
          <li>What fooled the tiny AI on the windy night? Why do you think those things were hard for it?</li>
          <li>
            Why do you think the AI has to practice on photos people already labeled? What if the labels had mistakes?
          </li>
        </ol>
      </div>
    </section>
  )
}
