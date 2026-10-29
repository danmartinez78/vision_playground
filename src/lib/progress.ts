import type { Lab } from '../lab'

/** Something a student still has to do before the next step, and the element to point at. */
export interface Todo {
  target: string
  text: string
}

/** What's left to do on a lesson step (0 to 4) before moving past it. */
export function todosFor(lab: Lab, step: number): Todo[] {
  const todo: Todo[] = []
  if (step === 0) {
    if (!lab.scene) todo.push({ target: 'need-photo', text: 'Pick a photo.' })
    else if (!lab.guess) todo.push({ target: 'need-guess', text: 'Type your guess of how many insects are on it.' })
  }
  if (step === 1) {
    if (!lab.handTimer.end) todo.push({ target: 'need-boxes', text: "Box the insects, then press I'm done." })
    else if (!lab.detector) todo.push({ target: 'need-detector', text: "Run the computer's detector." })
  }
  if (step === 2 && lab.detector && !lab.mothReady && !lab.mothFailed) {
    todo.push({ target: 'need-moth', text: 'Wait for the AI to finish looking at the close-ups.' })
  }
  if (step === 3) {
    const left = lab.unsure.filter((d) => lab.reviewChoices[d.id] === undefined).length
    if (left) todo.push({ target: 'need-review', text: `Check the ${left} close-up${left > 1 ? 's' : ''} left.` })
  }
  return todo
}

/** The first step at or before `step` that isn't finished, so a student can't skip past it. */
export function firstOpenStep(lab: Lab, step: number): number {
  for (let i = 0; i < step; i++) if (todosFor(lab, i).length) return i
  return step
}
