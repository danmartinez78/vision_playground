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
  kind: 'insect' | 'debris'
  speciesId?: string
  debrisLabel?: string
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
}

export type GroupId = 'moth' | 'beetle' | 'fly' | 'wasp' | 'lacewing' | 'notbug'
