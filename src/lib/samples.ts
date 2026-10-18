// Real insect-monitor photos from the AMI-Traps test split (public/samples/ami-traps),
// each with the boxes experts drew around every insect.
import { sceneFromUrl } from './scene'
import type { ExpertGroup, Scene, TruthItem } from './types'

export const SAMPLES_DIR = `${import.meta.env.BASE_URL}samples/ami-traps/`
/** Add to sample data URLs so a browser never uses an old cached copy. */
export const DATA_VERSION = `?v=${__DATA_VERSION__}`

/** A small copy of a sample photo for the photo pickers (made by scripts/make_thumbs.py). */
export const thumbUrl = (image: string) => `${SAMPLES_DIR}thumbs/${image}`

export interface Sample {
  image: string
  width: number
  height: number
  region: string
  /** Expert boxes as [x1, y1, x2, y2] in the photo's pixels. */
  boxes: [number, number, number, number][]
  /** The experts' name for each boxed insect, in the same order as `boxes`. */
  labels?: string[]
  /** Each insect simplified to 'moth', 'not a moth' or 'unknown'. */
  groups?: string[]
  /** Dark spots the experts didn't box, often tiny bugs (see scripts/unlisted_spots.py). */
  unlisted?: [number, number, number, number][]
}

export const REGION_NAMES: Record<string, string> = {
  CentralAmerica: 'Central America',
  NorthEasternAmerica: 'Northeastern North America',
  WesternEurope: 'Western Europe',
}

/** The label on spots the experts didn't box. */
const UNLISTED = 'Unlisted'

const GROUP_OF: Record<string, ExpertGroup> = { moth: 'moth', 'not a moth': 'other', unknown: 'unknown' }

/**
 * The photos in the lesson: the experts boxed nearly every insect on them,
 * and they named enough moths to species for Step 4. The others stay in
 * "Try your own photo".
 */
const LESSON = new Set([
  '20220820030901-00-156.jpg',
  '20230722030832-00-44.jpg',
  '20220623013311-00-137.jpg',
  '20220616022535-00-16.jpg',
  '20220628003000-00-75.jpg',
  '20220602015906-00-188.jpg',
])

export const inLesson = (s: Sample) => LESSON.has(s.image)

/** What the experts called an insect, in words a student can read. */
export function expertName(label: TruthItem['label']): string {
  if (!label) return 'An insect'
  if (label.name === UNLISTED) return "Something the experts didn't box"
  if (label.group === 'unknown') return "An insect the experts couldn't name"
  if (label.group === 'other') return 'Another insect (not a moth)'
  if (label.name === 'Lepidoptera' || label.name === 'Moth') return 'A moth'
  return `A moth: ${label.name}`
}

let index: Promise<Sample[]> | null = null

export function loadSamples(): Promise<Sample[]> {
  index ??= fetch(`${SAMPLES_DIR}index.json${DATA_VERSION}`)
    .then((r) => r.json())
    .then((d: { images: Sample[] }) => d.images)
  index.catch(() => {
    index = null
  })
  return index
}

export function sampleTitle(s: Sample): string {
  return `Insect monitor in ${REGION_NAMES[s.region] ?? s.region}`
}

/** A sample photo as a lesson scene, with the experts' boxes as its answer key. */
export async function sceneFromSample(s: Sample): Promise<Scene> {
  const scene = await sceneFromUrl(`${SAMPLES_DIR}${s.image}`, sampleTitle(s))
  // photos wider than the scene size are shrunk, so scale the boxes the same way
  const k = scene.width / s.width
  const box = ([x1, y1, x2, y2]: number[]) => ({ x: x1 * k, y: y1 * k, w: (x2 - x1) * k, h: (y2 - y1) * k })
  const truth: TruthItem[] = [
    ...s.boxes.map(
      (b, i): TruthItem => ({
        id: `t${i}`,
        box: box(b),
        kind: 'insect',
        label: { name: s.labels?.[i] ?? 'Insect', group: GROUP_OF[s.groups?.[i] ?? ''] ?? 'unknown' },
      }),
    ),
    ...(s.unlisted ?? []).map(
      (b, i): TruthItem => ({
        id: `u${i}`,
        box: box(b),
        kind: 'unlisted',
        label: { name: UNLISTED, group: 'unknown' },
      }),
    ),
  ]
  return { ...scene, key: `ami-${s.image}`, source: 'sample', real: true, truth }
}
