import type { RealGroup, TruthItem } from './types'

/** The right group for a real-photo close-up ('unknown' accepts any insect). */
export function truthRealGroup(t: TruthItem | undefined): RealGroup | 'unknown' {
  return t?.label?.group ?? 'notbug'
}

/** Whether a group answer matches the experts, for a real-photo close-up. */
export function realRight(answer: RealGroup | null | undefined, t: TruthItem | undefined): boolean {
  const real = truthRealGroup(t)
  if (!answer) return false
  return real === 'unknown' ? answer !== 'notbug' : answer === real
}

export const REAL_GROUPS: { id: RealGroup; label: string; emoji: string }[] = [
  { id: 'moth', label: 'Moth', emoji: '🦋' },
  { id: 'other', label: 'Other insect', emoji: '🐞' },
  { id: 'notbug', label: 'Not a bug', emoji: '🍂' },
]

export const REAL_GROUP_LABEL = new Map(REAL_GROUPS.map((g) => [g.id, g.label]))
