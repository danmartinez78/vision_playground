import { SPECIES_BY_ID } from './species'
import type { GroupId, RealGroup, TruthItem } from './types'

export function truthGroup(t: TruthItem | undefined): GroupId {
  if (!t || t.kind === 'debris' || !t.speciesId) return 'notbug'
  return SPECIES_BY_ID.get(t.speciesId)!.group
}

export function truthName(t: TruthItem | undefined): string {
  if (!t) return 'Nothing there (a false alarm)'
  if (t.kind === 'debris') return `${t.debrisLabel} (not an insect)`
  return SPECIES_BY_ID.get(t.speciesId!)!.common
}

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
