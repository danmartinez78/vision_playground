// The moths in the lesson photos that experts named to species and that show
// up at least twice, so every close-up has another photo of its species to
// compare with. Pictures are close-ups cut from the lesson photos
// (public/samples/ami-traps/species).

export interface GuidePicture {
  file: string
  /** The lesson photo (without .jpg) and expert box it was cut from. */
  image: string
  box: number
}

export interface GuideSpecies {
  scientific: string
  common: string
  family: string
  /** What to look for, in a few words. */
  look: string
  pictures: GuidePicture[]
}

export const MOTH_GUIDE: GuideSpecies[] = [
  {
    scientific: 'Eilema lurideola',
    common: 'Common footman',
    family: 'Erebidae',
    look: 'Long, narrow brown-gray wings with a thin yellow edge.',
    pictures: [
      {
        file: 'eilema-lurideola-20230722030832-00-44-0.jpg',
        image: '20230722030832-00-44',
        box: 0,
      },
      {
        file: 'eilema-lurideola-20230722030832-00-44-1.jpg',
        image: '20230722030832-00-44',
        box: 1,
      },
      {
        file: 'eilema-lurideola-20230722030832-00-44-12.jpg',
        image: '20230722030832-00-44',
        box: 12,
      },
      {
        file: 'eilema-lurideola-20230722030832-00-44-2.jpg',
        image: '20230722030832-00-44',
        box: 2,
      },
      {
        file: 'eilema-lurideola-20230722030832-00-44-4.jpg',
        image: '20230722030832-00-44',
        box: 4,
      },
      {
        file: 'eilema-lurideola-20230722030832-00-44-6.jpg',
        image: '20230722030832-00-44',
        box: 6,
      },
      {
        file: 'eilema-lurideola-20230810041943-00-207-9.jpg',
        image: '20230810041943-00-207',
        box: 9,
      },
    ],
  },
  {
    scientific: 'Chrysoteuchia culmella',
    common: 'Garden grass-veneer',
    family: 'Crambidae',
    look: 'Slim, pale wings rolled around its body like a tube.',
    pictures: [
      {
        file: 'chrysoteuchia-culmella-20230706025959-125-snapshot-3.jpg',
        image: '20230706025959-125-snapshot',
        box: 3,
      },
      {
        file: 'chrysoteuchia-culmella-20230722025959-119-snapshot-5.jpg',
        image: '20230722025959-119-snapshot',
        box: 5,
      },
      {
        file: 'chrysoteuchia-culmella-20230722030832-00-44-10.jpg',
        image: '20230722030832-00-44',
        box: 10,
      },
      {
        file: 'chrysoteuchia-culmella-20230722030832-00-44-13.jpg',
        image: '20230722030832-00-44',
        box: 13,
      },
      {
        file: 'chrysoteuchia-culmella-20230722030832-00-44-9.jpg',
        image: '20230722030832-00-44',
        box: 9,
      },
      {
        file: 'chrysoteuchia-culmella-20230803013236-00-149-3.jpg',
        image: '20230803013236-00-149',
        box: 3,
      },
    ],
  },
  {
    scientific: 'Campaea perlata',
    common: 'Pale beauty',
    family: 'Geometridae',
    look: 'Big, pale wings spread flat with two faint lines.',
    pictures: [
      {
        file: 'campaea-perlata-20220820030901-00-156-1.jpg',
        image: '20220820030901-00-156',
        box: 1,
      },
      {
        file: 'campaea-perlata-20220820030901-00-156-10.jpg',
        image: '20220820030901-00-156',
        box: 10,
      },
      {
        file: 'campaea-perlata-20220820030901-00-156-11.jpg',
        image: '20220820030901-00-156',
        box: 11,
      },
      {
        file: 'campaea-perlata-20220820030901-00-156-12.jpg',
        image: '20220820030901-00-156',
        box: 12,
      },
      {
        file: 'campaea-perlata-20220820030901-00-156-5.jpg',
        image: '20220820030901-00-156',
        box: 5,
      },
    ],
  },
  {
    scientific: 'Pasiphila rectangulata',
    common: 'Green pug',
    family: 'Geometridae',
    look: 'Small, wings spread flat, wavy dark bands.',
    pictures: [
      {
        file: 'pasiphila-rectangulata-20220602015906-00-188-5.jpg',
        image: '20220602015906-00-188',
        box: 5,
      },
      {
        file: 'pasiphila-rectangulata-20220628003000-00-75-3.jpg',
        image: '20220628003000-00-75',
        box: 3,
      },
      {
        file: 'pasiphila-rectangulata-20220628003000-00-75-5.jpg',
        image: '20220628003000-00-75',
        box: 5,
      },
    ],
  },
  {
    scientific: 'Agriphila selasella',
    common: 'Pale-streak grass-veneer',
    family: 'Crambidae',
    look: 'Narrow, straw-colored wings with a white streak.',
    pictures: [
      {
        file: 'agriphila-selasella-20230823030000-186-snapshot-1.jpg',
        image: '20230823030000-186-snapshot',
        box: 1,
      },
      {
        file: 'agriphila-selasella-20230823030000-186-snapshot-4.jpg',
        image: '20230823030000-186-snapshot',
        box: 4,
      },
      {
        file: 'agriphila-selasella-20230823030000-186-snapshot-5.jpg',
        image: '20230823030000-186-snapshot',
        box: 5,
      },
    ],
  },
  {
    scientific: 'Agriphila tristella',
    common: 'Common grass-veneer',
    family: 'Crambidae',
    look: 'Narrow brown wings with a pale stripe down the middle.',
    pictures: [
      {
        file: 'agriphila-tristella-20230817034105-00-141-3.jpg',
        image: '20230817034105-00-141',
        box: 3,
      },
      {
        file: 'agriphila-tristella-20230817042106-00-295-2.jpg',
        image: '20230817042106-00-295',
        box: 2,
      },
    ],
  },
  {
    scientific: 'Scoparia biplagialis',
    common: 'Double-striped scoparia',
    family: 'Crambidae',
    look: 'Small, gray and white speckled wings.',
    pictures: [
      {
        file: 'scoparia-biplagialis-20220608005346-00-47-6.jpg',
        image: '20220608005346-00-47',
        box: 6,
      },
      {
        file: 'scoparia-biplagialis-20220820030901-00-156-15.jpg',
        image: '20220820030901-00-156',
        box: 15,
      },
    ],
  },
  {
    scientific: 'Palpita magniferalis',
    common: 'Splendid palpita',
    family: 'Crambidae',
    look: 'Wings spread wide, brown with dark zigzag marks.',
    pictures: [
      {
        file: 'palpita-magniferalis-20220616022535-00-16-1.jpg',
        image: '20220616022535-00-16',
        box: 1,
      },
      {
        file: 'palpita-magniferalis-20220623013311-00-137-5.jpg',
        image: '20220623013311-00-137',
        box: 5,
      },
    ],
  },
  {
    scientific: 'Lophocampa caryae',
    common: 'Hickory tussock moth',
    family: 'Erebidae',
    look: 'Orange-brown wings covered in pale spots.',
    pictures: [
      {
        file: 'lophocampa-caryae-20220623013311-00-137-2.jpg',
        image: '20220623013311-00-137',
        box: 2,
      },
      {
        file: 'lophocampa-caryae-20220623013311-00-137-3.jpg',
        image: '20220623013311-00-137',
        box: 3,
      },
    ],
  },
  {
    scientific: 'Lymantria dispar',
    common: 'Spongy moth',
    family: 'Erebidae',
    look: 'Large, brown triangle wings with dark wavy lines.',
    pictures: [
      {
        file: 'lymantria-dispar-20220820030901-00-156-13.jpg',
        image: '20220820030901-00-156',
        box: 13,
      },
      {
        file: 'lymantria-dispar-20230817042106-00-295-1.jpg',
        image: '20230817042106-00-295',
        box: 1,
      },
    ],
  },
  {
    scientific: 'Ochropacha duplaris',
    common: 'Common lutestring',
    family: 'Drepanidae',
    look: 'Gray triangle wings with a dark smudge.',
    pictures: [
      {
        file: 'ochropacha-duplaris-20230706025959-125-snapshot-0.jpg',
        image: '20230706025959-125-snapshot',
        box: 0,
      },
      {
        file: 'ochropacha-duplaris-20230722025959-119-snapshot-1.jpg',
        image: '20230722025959-119-snapshot',
        box: 1,
      },
    ],
  },
  {
    scientific: 'Idaea aversata',
    common: 'Riband wave',
    family: 'Geometridae',
    look: 'Wings spread flat, pale tan with thin wavy lines.',
    pictures: [
      {
        file: 'idaea-aversata-20230722030832-00-44-3.jpg',
        image: '20230722030832-00-44',
        box: 3,
      },
      {
        file: 'idaea-aversata-20230802235103-00-38-0.jpg',
        image: '20230802235103-00-38',
        box: 0,
      },
    ],
  },
  {
    scientific: 'Cosmia trapezina',
    common: 'Dun-bar',
    family: 'Noctuidae',
    look: 'Pale yellow-brown wings with a dark spot near the middle.',
    pictures: [
      {
        file: 'cosmia-trapezina-20230810041943-00-207-1.jpg',
        image: '20230810041943-00-207',
        box: 1,
      },
      {
        file: 'cosmia-trapezina-20230810041943-00-207-4.jpg',
        image: '20230810041943-00-207',
        box: 4,
      },
    ],
  },
]

export const GUIDE_BY_NAME = new Map(MOTH_GUIDE.map((s) => [s.scientific, s]))
