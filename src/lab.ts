import { useMemo, useState } from 'react'
import { runDetector, type DetectorOutput } from './lib/detector'
import { matchBoxes } from './lib/geometry'
import { identify, type AiGuess } from './lib/identifier'
import type { Box, Detection, GroupId, Scene, TruthItem } from './lib/types'

export interface Score {
  hits: number
  misses: number
  falseAlarms: number
  total: number
}

/** All of the lesson's state, plus the numbers worked out from it. */
export function useLab() {
  const [scene, setSceneRaw] = useState<Scene | null>(null)
  const [guess, setGuess] = useState<string>('')
  const [studentBoxes, setStudentBoxes] = useState<Box[]>([])
  const [detector, setDetector] = useState<DetectorOutput | null>(null)
  const [threshold, setThreshold] = useState(0.4)
  const [sortChoices, setSortChoices] = useState<Record<string, GroupId>>({})
  const [aiRevealed, setAiRevealed] = useState(false)
  const [reviewChoices, setReviewChoices] = useState<Record<string, string>>({})

  const setScene = (s: Scene | null) => {
    setSceneRaw(s)
    setGuess('')
    setStudentBoxes([])
    setDetector(null)
    setSortChoices({})
    setAiRevealed(false)
    setReviewChoices({})
  }

  const runIt = () => {
    if (scene) setDetector(runDetector(scene.canvas))
  }

  const derived = useMemo(() => {
    const truth = scene?.truth ?? []
    const insects = truth.filter((t) => t.kind === 'insect')
    const kept: Detection[] = detector ? detector.detections.filter((d) => d.score >= threshold) : []

    // what each kept detection really is (sample nights only)
    const truthFor = new Map<string, TruthItem>()
    if (truth.length) {
      const m = matchBoxes(
        kept.map((d) => d.box),
        truth.map((t) => t.box),
      )
      m.pairs.forEach((ti, di) => truthFor.set(kept[di].id, truth[ti]))
    }

    // the answer key: real insects on sample nights, or the student's own boxes on a photo
    const answerBoxes = scene?.source === 'sample' ? insects.map((t) => t.box) : studentBoxes
    let detectorScore: Score | null = null
    if (detector && answerBoxes.length) {
      if (scene?.source === 'sample') {
        const hits = kept.filter((d) => truthFor.get(d.id)?.kind === 'insect').length
        detectorScore = { hits, misses: insects.length - hits, falseAlarms: kept.length - hits, total: insects.length }
      } else {
        const m = matchBoxes(
          kept.map((d) => d.box),
          answerBoxes,
        )
        detectorScore = { hits: m.hits, misses: m.misses, falseAlarms: m.falseAlarms, total: answerBoxes.length }
      }
    }

    let studentScore: Score | null = null
    if (scene?.source === 'sample' && studentBoxes.length) {
      const m = matchBoxes(
        studentBoxes,
        insects.map((t) => t.box),
      )
      studentScore = { hits: m.hits, misses: m.misses, falseAlarms: m.falseAlarms, total: insects.length }
    }

    // the cards for sorting: the most confident detections first, at most 48
    const cards = kept.slice(0, 48)
    const ai = new Map<string, AiGuess>()
    if (scene?.source === 'sample') {
      for (const d of cards) ai.set(d.id, identify(scene.key, d.id, truthFor.get(d.id)))
    }
    const unsure = cards.filter((d) => {
      const g = ai.get(d.id)
      if (!g) return false
      const conf = g.speciesId ? g.species.confidence : g.order.confidence
      return conf < 0.6
    })
    const finalLabel = (id: string): string | null => {
      const chosen = reviewChoices[id]
      if (chosen !== undefined) return chosen === 'notbug' ? null : chosen
      return ai.get(id)?.speciesId ?? null
    }

    return { truth, insects, kept, truthFor, detectorScore, studentScore, cards, ai, unsure, finalLabel }
  }, [scene, detector, threshold, studentBoxes, reviewChoices])

  return {
    scene,
    setScene,
    guess,
    setGuess,
    studentBoxes,
    setStudentBoxes,
    detector,
    runIt,
    threshold,
    setThreshold,
    sortChoices,
    setSortChoices,
    aiRevealed,
    setAiRevealed,
    reviewChoices,
    setReviewChoices,
    ...derived,
  }
}

export type Lab = ReturnType<typeof useLab>
