# BioCLIP species answers (run ahead of time)

The "Name the moth" step shows what [BioCLIP 2](https://huggingface.co/imageomics/bioclip-2) (MIT license) says about each moth in the lesson photos. BioCLIP is the kind of large species model a real Mothbox uses. It is far too big for a browser, so we ran it once and saved its answers.

## Files

- `public/samples/ami-traps/bioclip.json` maps image name → expert box index → BioCLIP's top 3 guesses, as `[species, confidence]`, surest first. Every expert box in all 24 lesson photos has an entry. `src/lib/bioclip.ts` reads this file.
- `public/samples/ami-traps/species/<Genus_species>.jpg` holds field-guide pictures for 497 moth species: 192 px close-ups of the largest example of each species in AMI-Traps.
  - They come only from training and validation photos, never from the test split that the lesson photos are drawn from. So the field-guide picture is never the lesson moth itself.
- `public/samples/ami-traps/species/index.json` lists each picture's species, genus and family, so the step can pick look-alike choices that all have pictures.

## How it was run

- **Model:** `imageomics/bioclip-2` with open_clip 3.3, zero-shot, on CPU.
- **Species list:** AMI's moth list for the photo's region. That's 2,497 species for northeastern North America, 2,603 for western Europe and 636 for Central America (from the AMI-GBIF category maps and `taxonomy_map.csv`).
- **Prompt for each species:** `a photo of Animalia Arthropoda Insecta Lepidoptera <family> <genus species>.`
- **Image:** a square crop around the expert box, from the full-size 4K photo, with 15% padding.
- **Confidence:** the softmax share among that region's species.

## How good it is

**AMI-Traps test split:** 1,007 trap close-ups that experts named to family, genus or species, from photos that are not lesson photos.

| Level | Right (BioCLIP's first guess) |
|---|---|
| Species | 57% (322 of 566), 61% when the species is in the region list |
| Species, in the top 5 | 74% |
| Genus | 64% (464 of 726) |
| Family | 78% (786 of 1,007) |

**Its confidence means something:**

| BioCLIP's top confidence | Species right |
|---|---|
| 80% or more | 93% (222 close-ups) |
| 60–80% | 60% |
| 40–60% | 38% |
| 20–40% | 25% |
| under 20% | 4% |

**On the 24 lesson photos:**
- On the 68 moths the experts named to species, BioCLIP's first guess is right on 32 (47%).
- When it is at least 70% sure, it's right on 22 of 28. At 80% or more, it's right on 19 of 24.

That's the story the lesson can tell: the AI is often right when it's sure, and people check the unsure ones.

## A note for the step's choices

**Problem:** the expert's species almost always has a field-guide picture (67 of 68), because it was seen in other trap photos. BioCLIP's wrong guesses usually don't (24 of 166). If the choices are BioCLIP's top 3 plus the expert's answer, the one with a picture gives the answer away.

**Fix:** build the choices from the expert's species plus look-alikes that have pictures, using `species/index.json` (same genus first, then same family). Reveal BioCLIP's answer separately after the student picks.

## Credits

- BioCLIP 2 by the Imageomics Institute (MIT).
- Moth species lists and taxonomy from the AMI dataset (MIT).
- Field-guide pictures cut from AMI-Traps photos (MIT).
