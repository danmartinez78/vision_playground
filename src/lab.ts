import { useMemo, useRef, useState } from 'react'
import { detect, type DetectResult } from './lib/detect'
import { judgeBoxes, type Judgement } from './lib/geometry'
import { identify, identifyMoth, type AiGuess, type MothGuess } from './lib/identifier'
import type { Box, Detection, GroupId, RealGroup, Scene, TruthItem } from './lib/types'

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
  const [detector, setDetector] = useState<DetectResult | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [threshold, setThreshold] = useState(0.25)
  const [sortChoices, setSortChoices] = useState<Record<string, GroupId | RealGroup>>({})
  const [aiRevealed, setAiRevealed] = useState(false)
  const [reviewChoices, setReviewChoices] = useState<Record<string, string>>({})
  // stopwatches for the "by hand" jobs, so students can compare with the computer
  const [handTimer, setHandTimer] = useState<{ start: number | null; end: number | null }>({ start: null, end: null })
  const [sortTimer, setSortTimer] = useState<{ start: number; last: number; count: number } | null>(null)

  const currentScene = useRef<Scene | null>(null)
  const setScene = (s: Scene | null) => {
    currentScene.current = s
    setSceneRaw(s)
    setGuess('')
    setStudentBoxes([])
    setDetector(null)
    setSortChoices({})
    setAiRevealed(false)
    setReviewChoices({})
    setHandTimer({ start: null, end: null })
    setSortTimer(null)
  }

  const chooseGroup = (id: string, group: GroupId | RealGroup) => {
    const now = Date.now()
    if (!sortChoices[id]) {
      setSortTimer((t) => (t ? { ...t, last: now, count: t.count + 1 } : { start: now, last: now, count: 1 }))
    }
    setSortChoices({ ...sortChoices, [id]: group })
  }

  const runIt = async () => {
    if (!scene || detecting) return
    setDetecting(true)
    try {
      const out = await detect(scene.canvas)
      // ignore the result if the student picked another photo meanwhile
      if (currentScene.current === scene) setDetector(out)
    } finally {
      setDetecting(false)
    }
  }

  const derived = useMemo(() => {
    const truth = scene?.truth ?? []
    const insects = truth.filter((t) => t.kind === 'insect')
    const kept: Detection[] = detector ? detector.detections.filter((d) => d.score >= threshold) : []

    // the answer key: everything really on the sheet for sample nights, or the student's own boxes on a photo
    const answers =
      scene?.source === 'sample'
        ? truth.map((t) => ({ box: t.box, insect: t.kind === 'insect' }))
        : studentBoxes.map((box) => ({ box, insect: true }))
    const total = answers.filter((a) => a.insect).length
    const toScore = (j: Judgement): Score => ({ hits: j.hits, misses: j.misses, falseAlarms: j.falseAlarms, total })

    // both the student and the detector are scored with the same rules
    const detectorJudgement =
      detector && total
        ? judgeBoxes(
            kept.map((d) => d.box),
            answers,
          )
        : null
    const detectorScore = detectorJudgement ? toScore(detectorJudgement) : null
    const studentJudgement =
      scene?.source === 'sample' && studentBoxes.length ? judgeBoxes(studentBoxes, answers) : null
    const studentScore = studentJudgement ? toScore(studentJudgement) : null

    // what each kept detection really is (sample nights only)
    const truthFor = new Map<string, TruthItem>()
    if (scene?.source === 'sample' && detectorJudgement) {
      detectorJudgement.verdicts.forEach((v, di) => {
        if (v.kind === 'found' || v.kind === 'not-insect') truthFor.set(kept[di].id, truth[v.answer])
      })
    }

    // the cards for sorting: the most confident detections first, at most 24
    const cards = kept.slice(0, 24)
    // the AI's answers: species for drawn nights, moth or not for real photos
    const real = Boolean(scene?.real)
    const ai = new Map<string, AiGuess>()
    const mothAi = new Map<string, MothGuess>()
    if (scene?.source === 'sample') {
      for (const d of kept) {
        if (real) mothAi.set(d.id, identifyMoth(scene.key, d.id, truthFor.get(d.id)))
        else ai.set(d.id, identify(scene.key, d.id, truthFor.get(d.id)))
      }
    }
    const confidence = (id: string): number | null => {
      if (real) return mothAi.get(id)?.confidence ?? null
      const g = ai.get(id)
      return g ? (g.speciesId ? g.species.confidence : g.order.confidence) : null
    }
    const unsure = cards.filter((d) => {
      const c = confidence(d.id)
      return c !== null && c < (real ? 0.6 : 0.5)
    })
    /** The answer after the student's check: a species id (drawn) or group (real); null for not a bug. */
    const finalLabel = (id: string): string | null => {
      const chosen = reviewChoices[id]
      if (chosen !== undefined) return chosen === 'notbug' ? null : chosen
      if (real) {
        const g = mothAi.get(id)?.group
        return g && g !== 'notbug' ? g : null
      }
      return ai.get(id)?.speciesId ?? null
    }

    // seconds per insect for each by-hand job (null until measured)
    const handSeconds =
      handTimer.start && handTimer.end && studentBoxes.length
        ? (handTimer.end - handTimer.start) / 1000 / studentBoxes.length
        : null
    const sortSeconds =
      sortTimer && sortTimer.count > 1 ? (sortTimer.last - sortTimer.start) / 1000 / (sortTimer.count - 1) : null

    return {
      truth,
      insects,
      kept,
      truthFor,
      detectorScore,
      studentScore,
      detectorJudgement,
      studentJudgement,
      cards,
      real,
      ai,
      mothAi,
      unsure,
      finalLabel,
      handSeconds,
      sortSeconds,
    }
  }, [scene, detector, threshold, studentBoxes, reviewChoices, handTimer, sortTimer])

  return {
    scene,
    setScene,
    guess,
    setGuess,
    studentBoxes,
    setStudentBoxes,
    detector,
    detecting,
    runIt,
    clearDetector: () => setDetector(null),
    threshold,
    setThreshold,
    sortChoices,
    chooseGroup,
    handTimer,
    setHandTimer,
    aiRevealed,
    setAiRevealed,
    reviewChoices,
    setReviewChoices,
    ...derived,
  }
}

export type Lab = ReturnType<typeof useLab>
