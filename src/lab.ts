import { useEffect, useMemo, useRef, useState } from 'react'
import { detect, type DetectResult } from './lib/detect'
import { judgeBoxes, type Judgement } from './lib/geometry'
import { mothChances } from './lib/mothModel'
import type { Box, Detection, RealGroup, Scene, TruthItem } from './lib/types'

export interface MothGuess {
  group: RealGroup
  confidence: number
}

/** How many of the AI's least-sure moth-or-not answers go to a person to check. */
export const REVIEW_COUNT = 4

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
  const [sortChoices, setSortChoices] = useState<Record<string, RealGroup>>({})
  const [aiRevealed, setAiRevealed] = useState(false)
  const [reviewChoices, setReviewChoices] = useState<Record<string, string>>({})
  // stopwatches for the "by hand" jobs, so students can compare with the computer
  const [handTimer, setHandTimer] = useState<{ start: number | null; end: number | null }>({ start: null, end: null })
  const [sortTimer, setSortTimer] = useState<{ start: number; last: number; count: number } | null>(null)
  // the moth classifier's answers, filled in as the detections come in
  const [mothAi, setMothAi] = useState<Map<string, MothGuess>>(new Map())
  const [mothFailed, setMothFailed] = useState(false)

  const currentScene = useRef<Scene | null>(null)
  const setScene = (s: Scene | null) => {
    currentScene.current = s
    setSceneRaw(s)
    setGuess('')
    setStudentBoxes([])
    setDetector(null)
    setMothAi(new Map())
    setSortChoices({})
    setAiRevealed(false)
    setReviewChoices({})
    setHandTimer({ start: null, end: null })
    setSortTimer(null)
  }

  const chooseGroup = (id: string, group: RealGroup) => {
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
      if (currentScene.current === scene) {
        setMothAi(new Map())
        setDetector(out)
      }
    } finally {
      setDetecting(false)
    }
  }

  // the moth classifier looks at every close-up the detector kept; lowering the
  // "how sure" slider brings in more, so only the new ones are classified
  useEffect(() => {
    if (!scene?.real || !detector || detector.engine !== 'yolo') return
    const todo = detector.detections.filter((d) => d.score >= threshold && !mothAi.has(d.id))
    if (!todo.length) return
    let stale = false
    mothChances(
      scene.canvas,
      todo.map((d) => d.box),
    )
      .then((chances) => {
        if (stale) return
        setMothAi((m) => {
          const next = new Map(m)
          todo.forEach((d, i) => {
            const p = chances[i]
            next.set(d.id, { group: p >= 0.5 ? 'moth' : 'other', confidence: Math.max(p, 1 - p) })
          })
          return next
        })
      })
      .catch((e) => {
        console.warn('The moth classifier could not run', e)
        if (!stale) setMothFailed(true)
      })
    return () => {
      stale = true
    }
  }, [scene, detector, threshold, mothAi])

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

    // what each kept detection really is (sample nights only); a second box on
    // an insect that was already found is still that insect
    const truthFor = new Map<string, TruthItem>()
    const twice = new Set<string>()
    if (scene?.source === 'sample' && detectorJudgement) {
      detectorJudgement.verdicts.forEach((v, di) => {
        if (v.kind === 'found' || v.kind === 'not-insect' || v.kind === 'twice')
          truthFor.set(kept[di].id, truth[v.answer])
        if (v.kind === 'twice') twice.add(kept[di].id)
      })
    }
    // on real photos a box with no expert box under it might be a false alarm or
    // an insect the experts missed, and some obvious moths are labeled only
    // "Unidentifiable", so neither kind of close-up is scored
    const scored = (id: string) => !scene?.real || (truthFor.get(id)?.label?.group ?? 'unknown') !== 'unknown'

    // the cards for sorting: the most confident detections first, at most 24
    const cards = kept.slice(0, 24)
    // like sorting by confidence in FiftyOne: people check the answers the AI was least sure about
    const unsure = cards
      .filter((d) => mothAi.has(d.id))
      .sort((a, b) => mothAi.get(a.id)!.confidence - mothAi.get(b.id)!.confidence)
      .slice(0, REVIEW_COUNT)
    /** The group after the student's check, or null for not a bug. */
    const finalLabel = (id: string): RealGroup | null => {
      const g = (reviewChoices[id] as RealGroup | undefined) ?? mothAi.get(id)?.group
      return g && g !== 'notbug' ? g : null
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
      twice,
      scored,
      detectorScore,
      studentScore,
      detectorJudgement,
      studentJudgement,
      cards,
      mothAi,
      mothReady: !scene?.real || cards.every((d) => mothAi.has(d.id)),
      mothFailed,
      unsure,
      finalLabel,
      handSeconds,
      sortSeconds,
    }
  }, [scene, detector, threshold, studentBoxes, reviewChoices, handTimer, sortTimer, mothAi, mothFailed])

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
