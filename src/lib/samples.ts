// Real light-trap photos from the AMI-Traps test split (public/samples/ami-traps),
// each with the boxes experts drew around every insect.
import { sceneFromUrl } from './scene'
import type { ExpertGroup, Scene, TruthItem } from './types'

export const SAMPLES_DIR = `${import.meta.env.BASE_URL}samples/ami-traps/`

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
}

export const REGION_NAMES: Record<string, string> = {
  CentralAmerica: 'Central America',
  NorthEasternAmerica: 'Northeastern North America',
  WesternEurope: 'Western Europe',
}

const GROUP_OF: Record<string, ExpertGroup> = { moth: 'moth', 'not a moth': 'other', unknown: 'unknown' }

/**
 * Photos left out of the lesson. In this one the detector boxes dozens of
 * tiny insects the experts didn't box, which makes scoring confusing.
 */
const NOT_IN_LESSON = new Set(['20220531204321-00-11.jpg'])

export const inLesson = (s: Sample) => !NOT_IN_LESSON.has(s.image)

/** What the experts called an insect, in words a student can read. */
export function expertName(label: TruthItem['label']): string {
  if (!label) return 'An insect'
  if (label.group === 'unknown') return "An insect the experts couldn't name"
  if (label.group === 'other') return 'Another insect (not a moth)'
  if (label.name === 'Lepidoptera' || label.name === 'Moth') return 'A moth'
  return `A moth: ${label.name}`
}

let index: Promise<Sample[]> | null = null

export function loadSamples(): Promise<Sample[]> {
  index ??= fetch(`${SAMPLES_DIR}index.json`)
    .then((r) => r.json())
    .then((d: { images: Sample[] }) => d.images)
  index.catch(() => {
    index = null
  })
  return index
}

export function sampleTitle(s: Sample): string {
  return `Light trap in ${REGION_NAMES[s.region] ?? s.region}`
}

/** A sample photo as a lesson scene, with the experts' boxes as its answer key. */
export async function sceneFromSample(s: Sample): Promise<Scene> {
  const scene = await sceneFromUrl(`${SAMPLES_DIR}${s.image}`, sampleTitle(s))
  // photos wider than the scene size are shrunk, so scale the boxes the same way
  const k = scene.width / s.width
  const truth: TruthItem[] = s.boxes.map(([x1, y1, x2, y2], i) => ({
    id: `t${i}`,
    box: { x: x1 * k, y: y1 * k, w: (x2 - x1) * k, h: (y2 - y1) * k },
    kind: 'insect',
    label: { name: s.labels?.[i] ?? 'Insect', group: GROUP_OF[s.groups?.[i] ?? ''] ?? 'unknown' },
  }))
  return { ...scene, key: `ami-${s.image}`, source: 'sample', real: true, truth }
}
