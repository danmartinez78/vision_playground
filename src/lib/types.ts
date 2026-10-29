export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Something that is really on the sheet (only known for sample nights). */
export interface TruthItem {
  id: string
  box: Box
  /** 'unlisted': smaller than 1 cm (a speck, or a small insect); boxing it counts neither way */
  kind: 'insect' | 'debris' | 'unlisted'
  speciesId?: string
  debrisLabel?: string
  /** What a real photo's insect is, from the AMI labels or our team's (real photos only). */
  label?: { name: string; group: ExpertGroup; team?: boolean }
}

export interface Detection {
  id: string
  box: Box
  /** 0 to 1: how sure the detector is that this is a bug. */
  score: number
}

export interface Scene {
  key: string
  title: string
  source: 'sample' | 'upload'
  canvas: HTMLCanvasElement
  imageUrl: string
  width: number
  height: number
  /** Answer key. Sample nights only. */
  truth?: TruthItem[]
  /** A real insect-monitor photo (not one the computer drew). */
  real?: boolean
}

export type GroupId = 'moth' | 'beetle' | 'fly' | 'wasp' | 'lacewing' | 'notbug'

/** What the experts said about an insect in a real photo. */
export type ExpertGroup = 'moth' | 'other' | 'unknown'

/** The groups students sort real photos into. */
export type RealGroup = 'moth' | 'other' | 'notbug'
