import { SPECIES_BY_ID } from './species'
import type { GroupId, TruthItem } from './types'

export function truthGroup(t: TruthItem | undefined): GroupId {
  if (!t || t.kind === 'debris' || !t.speciesId) return 'notbug'
  return SPECIES_BY_ID.get(t.speciesId)!.group
}

export function truthName(t: TruthItem | undefined): string {
  if (!t) return 'Nothing there (a false alarm)'
  if (t.kind === 'debris') return `${t.debrisLabel} (not an insect)`
  return SPECIES_BY_ID.get(t.speciesId!)!.common
}
