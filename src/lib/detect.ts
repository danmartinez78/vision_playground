import { runDetector } from './detector'
import { DATA_VERSION, SAMPLES_DIR } from './samples'
import type { Detection } from './types'
import { runYolo, type Backend } from './yolo'

export interface DetectResult {
  detections: Detection[]
  millis: number
  /**
   * 'yolo' is our trained model running on this device. 'saved' is the same
   * model's answers worked out ahead of time, for lesson photos on devices
   * that can't run it. 'simple' is the spot finder, used only when neither works.
   */
  engine: 'yolo' | 'saved' | 'simple'
  backend?: Backend
  size?: number
  /** With 'saved': the moth classifier's saved moth chance for each detection id. */
  savedMoth?: Map<string, number>
  /** What the simple spot finder "sees" (not available for YOLO). */
  contrastUrl?: string
}

/** Photo name → rows of [x, y, w, h, score, moth chance] in pixels of the 1600 px photo. */
type Saved = Record<string, [number, number, number, number, number, number][]>

let saved: Promise<Saved> | null = null

function loadSaved(): Promise<Saved> {
  saved ??= fetch(`${SAMPLES_DIR}precomputed.json${DATA_VERSION}`)
    .then((r) => {
      if (!r.ok) throw new Error(`precomputed.json: ${r.status}`)
      return r.json()
    })
    .then((d: { images: Saved }) => d.images)
  saved.catch(() => {
    saved = null
  })
  return saved
}

/** The saved answers for a lesson photo, scaled to the canvas, or null if there are none. */
async function savedResult(canvas: HTMLCanvasElement, image: string): Promise<DetectResult | null> {
  const rows = (await loadSaved().catch(() => ({}) as Saved))[image]
  if (!rows) return null
  const k = canvas.width / 1600
  const savedMoth = new Map<string, number>()
  const detections = rows.map(([x, y, w, h, score, moth], i) => {
    savedMoth.set(`s${i}`, moth)
    return { id: `s${i}`, box: { x: x * k, y: y * k, w: w * k, h: h * k }, score }
  })
  return { detections, millis: 0, engine: 'saved', savedMoth }
}

/**
 * Finds the insects with YOLO. If it can't run here, a lesson photo (named by
 * `image`) gets YOLO's saved answers, and anything else gets the spot finder.
 */
export async function detect(canvas: HTMLCanvasElement, image?: string): Promise<DetectResult> {
  try {
    return { ...(await runYolo(canvas)), engine: 'yolo' }
  } catch (e) {
    console.warn('The YOLO model could not run on this device', e)
  }
  const fromFile = image ? await savedResult(canvas, image) : null
  return fromFile ?? { ...runDetector(canvas), engine: 'simple' }
}

/** A short, kid-friendly name for what ran, for example "our trained YOLO11n AI (on the graphics chip)". */
export function engineName(r: DetectResult): string {
  if (r.engine === 'simple') return 'the simple spot finder (the AI model could not load on this device)'
  if (r.engine === 'saved') return 'our trained YOLO11n AI, run ahead of time on a bigger computer'
  return `our trained YOLO11n AI (on the ${r.backend === 'webgpu' ? 'graphics chip' : 'computer chip'}, at ${r.size} × ${r.size} pixels)`
}
