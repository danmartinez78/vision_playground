import { runDetector } from './detector'
import type { Detection } from './types'
import { runYolo, type Backend } from './yolo'

export interface DetectResult {
  detections: Detection[]
  millis: number
  /** 'yolo' is our trained model; 'simple' is the spot finder, used only if the model can't load. */
  engine: 'yolo' | 'simple'
  backend?: Backend
  size?: number
  /** What the simple spot finder "sees" (not available for YOLO). */
  contrastUrl?: string
}

export async function detect(canvas: HTMLCanvasElement): Promise<DetectResult> {
  try {
    return { ...(await runYolo(canvas)), engine: 'yolo' }
  } catch (e) {
    console.warn('The YOLO model could not run, using the simple spot finder', e)
    return { ...runDetector(canvas), engine: 'simple' }
  }
}

/** A short, kid-friendly name for what ran, for example "our trained YOLO11n AI (on the graphics chip)". */
export function engineName(r: DetectResult): string {
  if (r.engine === 'simple') return 'the simple spot finder (the AI model could not load on this device)'
  return `our trained YOLO11n AI (on the ${r.backend === 'webgpu' ? 'graphics chip' : 'computer chip'}, at ${r.size} × ${r.size} pixels)`
}
