// Our trained moth / not-a-moth classifier: a small MobileNetV3 trained on
// AMI-Traps close-ups (see docs/moth-classifier.md), running in the browser
// with ONNX Runtime Web. It looks at one close-up at a time, the way AMI's
// second stage does after its insect detector.
import type * as Ort from 'onnxruntime-web'
import type { Box } from './types'

const MODEL_FILE = 'models/moth_classifier.onnx'
/** The close-up size the model was trained on. */
const SIZE = 224
const MEAN = [0.485, 0.456, 0.406]
const STD = [0.229, 0.224, 0.225]
/** Which of the model's two outputs means "moth". */
const MOTH_INDEX = 0
const BATCH = 16

interface MothModel {
  ort: typeof Ort
  session: Ort.InferenceSession
}

let loading: Promise<MothModel> | null = null

function loadMothModel(): Promise<MothModel> {
  loading ??= (async () => {
    const ort = await import('onnxruntime-web/wasm')
    const base = import.meta.env.BASE_URL
    ort.env.wasm.wasmPaths = `${base}ort/`
    const session = await ort.InferenceSession.create(`${base}${MODEL_FILE}`, { executionProviders: ['wasm'] })
    return { ort, session }
  })()
  loading.catch(() => {
    loading = null
  })
  return loading
}

/** The same square around the box that the close-up cards show. */
function closeUpPixels(
  source: HTMLCanvasElement,
  box: Box,
  ctx: CanvasRenderingContext2D,
  into: Float32Array,
  at: number,
) {
  const pad = Math.max(box.w, box.h) * 0.25 + 4
  const side = Math.max(box.w, box.h) + pad * 2
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.drawImage(source, cx - side / 2, cy - side / 2, side, side, 0, 0, SIZE, SIZE)
  const px = ctx.getImageData(0, 0, SIZE, SIZE).data
  const plane = SIZE * SIZE
  for (let c = 0; c < 3; c++) {
    const off = at + c * plane
    for (let i = 0; i < plane; i++) into[off + i] = (px[i * 4 + c] / 255 - MEAN[c]) / STD[c]
  }
}

/** The chance that each box holds a moth, between 0 and 1. */
export async function mothChances(source: HTMLCanvasElement, boxes: Box[]): Promise<number[]> {
  const { ort, session } = await loadMothModel()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  const one = 3 * SIZE * SIZE
  const chances: number[] = []
  for (let start = 0; start < boxes.length; start += BATCH) {
    const batch = boxes.slice(start, start + BATCH)
    const input = new Float32Array(batch.length * one)
    batch.forEach((b, i) => closeUpPixels(source, b, ctx, input, i * one))
    const tensor = new ort.Tensor('float32', input, [batch.length, 3, SIZE, SIZE])
    const out = await session.run({ [session.inputNames[0]]: tensor })
    const logits = out[session.outputNames[0]].data as Float32Array
    tensor.dispose()
    for (let i = 0; i < batch.length; i++) {
      const a = logits[i * 2 + MOTH_INDEX]
      const b = logits[i * 2 + 1 - MOTH_INDEX]
      chances.push(1 / (1 + Math.exp(b - a)))
    }
  }
  return chances
}
