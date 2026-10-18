// Our trained insect detector: YOLO11n, trained on the AMI-Traps light-trap
// photos (see docs/yolo-model.md), running in the browser with ONNX Runtime
// Web. With WebGPU it uses the 1280 model; without, the faster 960 model on
// the computer chip (WebAssembly).
import type * as Ort from 'onnxruntime-web'
import { iou } from './geometry'
import type { Box, Detection } from './types'

export type Backend = 'webgpu' | 'wasm'

export interface YoloModel {
  ort: typeof Ort
  session: Ort.InferenceSession
  size: number
  backend: Backend
}

export interface YoloOutput {
  detections: Detection[]
  millis: number
  backend: Backend
  size: number
}

const MODEL_FILES: Record<number, string> = {
  1280: 'models/yolo11n_ami_train1280_imgsz1280.onnx',
  960: 'models/yolo11n_ami_train960_imgsz960.onnx',
}
/** Keep weak guesses too, so the "how sure" slider can bring them back. */
const MIN_SCORE = 0.05
const NMS_IOU = 0.7
const MAX_BOXES = 500
const PAD = 114

let loading: Promise<YoloModel> | null = null

async function webGpuWorks(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
    return Boolean(gpu && (await gpu.requestAdapter()))
  } catch {
    return false
  }
}

async function open(ort: typeof Ort, size: number, backend: Backend): Promise<YoloModel> {
  const base = import.meta.env.BASE_URL
  ort.env.wasm.wasmPaths = `${base}ort/`
  const session = await ort.InferenceSession.create(`${base}${MODEL_FILES[size]}`, {
    executionProviders: [backend],
  })
  const model = { ort, session, size, backend }
  // the first run sets things up and is much slower, so do it now
  await run(model, new Float32Array(3 * size * size))
  return model
}

/** Loads the model once (about 11 MB, cached by the browser after that). */
export function loadYolo(): Promise<YoloModel> {
  loading ??= (async () => {
    if (await webGpuWorks()) {
      try {
        return await open(await import('onnxruntime-web/webgpu'), 1280, 'webgpu')
      } catch (e) {
        console.warn('WebGPU did not work, using WebAssembly instead', e)
      }
    }
    return open(await import('onnxruntime-web/wasm'), 960, 'wasm')
  })()
  loading.catch(() => {
    loading = null
  })
  return loading
}

async function run(model: YoloModel, input: Float32Array): Promise<Float32Array> {
  const { ort, session, size } = model
  const tensor = new ort.Tensor('float32', input, [1, 3, size, size])
  const out = await session.run({ [session.inputNames[0]]: tensor })
  const data = out[session.outputNames[0]].data as Float32Array
  tensor.dispose()
  return data
}

/** Shrinks the photo to fit a size × size square, centered, with gray bars. */
function letterbox(source: HTMLCanvasElement, size: number) {
  const scale = size / Math.max(source.width, source.height)
  const w = Math.round(source.width * scale)
  const h = Math.round(source.height * scale)
  const padX = Math.floor((size - w) / 2)
  const padY = Math.floor((size - h) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = `rgb(${PAD}, ${PAD}, ${PAD})`
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(source, padX, padY, w, h)
  const px = ctx.getImageData(0, 0, size, size).data
  const plane = size * size
  const input = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    input[i] = px[i * 4] / 255
    input[plane + i] = px[i * 4 + 1] / 255
    input[2 * plane + i] = px[i * 4 + 2] / 255
  }
  return { input, scale, padX, padY }
}

export async function runYolo(source: HTMLCanvasElement): Promise<YoloOutput> {
  const model = await loadYolo()
  const t0 = performance.now()
  const { input, scale, padX, padY } = letterbox(source, model.size)
  const out = await run(model, input)

  // the output holds 5 rows (cx, cy, w, h, score) of n candidates each
  const n = out.length / 5
  const candidates: { box: Box; score: number }[] = []
  for (let i = 0; i < n; i++) {
    const score = out[4 * n + i]
    if (score < MIN_SCORE) continue
    const w = out[2 * n + i]
    const h = out[3 * n + i]
    candidates.push({
      box: {
        x: (out[i] - w / 2 - padX) / scale,
        y: (out[n + i] - h / 2 - padY) / scale,
        w: w / scale,
        h: h / scale,
      },
      score,
    })
  }

  // when several guesses cover the same insect, keep only the surest one
  candidates.sort((a, b) => b.score - a.score)
  const kept: typeof candidates = []
  for (const c of candidates) {
    if (kept.length >= MAX_BOXES) break
    if (kept.every((k) => iou(k.box, c.box) < NMS_IOU)) kept.push(c)
  }

  return {
    detections: kept.map((k, i) => ({ id: `y${i}`, box: k.box, score: k.score })),
    millis: performance.now() - t0,
    backend: model.backend,
    size: model.size,
  }
}
