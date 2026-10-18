import type { GroupId } from './types'

export type Role = 'pest' | 'helper' | 'neutral'

export interface Species {
  id: string
  common: string
  scientific: string
  order: string
  orderCommon: string
  family: string
  group: GroupId
  role: Role
  /** One short line students can read on a card. */
  note: string
}

// A small, real North American list. Moths at a light are mostly
// harmless; a few are crop pests and several other visitors are helpers.
export const SPECIES: Species[] = [
  {
    id: 'fall-armyworm',
    common: 'Fall armyworm moth',
    scientific: 'Spodoptera frugiperda',
    order: 'Lepidoptera',
    orderCommon: 'moths and butterflies',
    family: 'Noctuidae',
    group: 'moth',
    role: 'pest',
    note: 'Its caterpillars eat corn and many other crops.',
  },
  {
    id: 'corn-earworm',
    common: 'Corn earworm moth',
    scientific: 'Helicoverpa zea',
    order: 'Lepidoptera',
    orderCommon: 'moths and butterflies',
    family: 'Noctuidae',
    group: 'moth',
    role: 'pest',
    note: 'Its caterpillars tunnel into corn ears and tomatoes.',
  },
  {
    id: 'black-cutworm',
    common: 'Black cutworm moth',
    scientific: 'Agrotis ipsilon',
    order: 'Lepidoptera',
    orderCommon: 'moths and butterflies',
    family: 'Noctuidae',
    group: 'moth',
    role: 'pest',
    note: 'Its caterpillars cut young plants off at the ground.',
  },
  {
    id: 'rosy-maple',
    common: 'Rosy maple moth',
    scientific: 'Dryocampa rubicunda',
    order: 'Lepidoptera',
    orderCommon: 'moths and butterflies',
    family: 'Saturniidae',
    group: 'moth',
    role: 'neutral',
    note: 'A pink and yellow moth that lives on maple trees.',
  },
  {
    id: 'isabella-tiger',
    common: 'Isabella tiger moth',
    scientific: 'Pyrrharctia isabella',
    order: 'Lepidoptera',
    orderCommon: 'moths and butterflies',
    family: 'Erebidae',
    group: 'moth',
    role: 'neutral',
    note: 'The adult of the woolly bear caterpillar.',
  },
  {
    id: 'june-beetle',
    common: 'June beetle',
    scientific: 'Phyllophaga sp.',
    order: 'Coleoptera',
    orderCommon: 'beetles',
    family: 'Scarabaeidae',
    group: 'beetle',
    role: 'neutral',
    note: 'A big brown beetle that crashes into porch lights.',
  },
  {
    id: 'ladybug',
    common: 'Convergent lady beetle',
    scientific: 'Hippodamia convergens',
    order: 'Coleoptera',
    orderCommon: 'beetles',
    family: 'Coccinellidae',
    group: 'beetle',
    role: 'helper',
    note: 'Eats aphids. A farmer’s friend.',
  },
  {
    id: 'ground-beetle',
    common: 'Ground beetle',
    scientific: 'Harpalus pensylvanicus',
    order: 'Coleoptera',
    orderCommon: 'beetles',
    family: 'Carabidae',
    group: 'beetle',
    role: 'helper',
    note: 'Hunts caterpillars and eats weed seeds.',
  },
  {
    id: 'crane-fly',
    common: 'Crane fly',
    scientific: 'Tipula sp.',
    order: 'Diptera',
    orderCommon: 'flies',
    family: 'Tipulidae',
    group: 'fly',
    role: 'neutral',
    note: 'Looks like a giant mosquito but does not bite.',
  },
  {
    id: 'midge',
    common: 'Midge',
    scientific: 'Chironomus sp.',
    order: 'Diptera',
    orderCommon: 'flies',
    family: 'Chironomidae',
    group: 'fly',
    role: 'neutral',
    note: 'Tiny fly that comes from ponds and streams.',
  },
  {
    id: 'ichneumon',
    common: 'Ichneumon wasp',
    scientific: 'Ophion sp.',
    order: 'Hymenoptera',
    orderCommon: 'wasps, bees and ants',
    family: 'Ichneumonidae',
    group: 'wasp',
    role: 'helper',
    note: 'Lays its eggs inside caterpillars. A natural pest control.',
  },
  {
    id: 'green-lacewing',
    common: 'Green lacewing',
    scientific: 'Chrysoperla carnea',
    order: 'Neuroptera',
    orderCommon: 'lacewings',
    family: 'Chrysopidae',
    group: 'lacewing',
    role: 'helper',
    note: 'Its larvae are called aphid lions.',
  },
]

export const SPECIES_BY_ID = new Map(SPECIES.map((s) => [s.id, s]))
