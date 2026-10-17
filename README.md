# Mothbox Vision Lab

A browser lesson for our FIRST LEGO League team (6th to 8th grade) about the computer-vision side of the [Mothbox](https://digital-naturalism-laboratories.github.io/Mothbox/), the open-source automated insect light trap our project uses.

Students walk through the same steps as the real Mothbox pipeline, doing each job themselves before seeing how the computer does it:

| Step | What students do | Real Mothbox equivalent |
|---|---|---|
| 1. The night | Pick a sample night (or load a photo), look around, guess the count | UV light attracts insects, camera photographs the sheet |
| 2. Find the bugs | Race a stopwatch to box insects by hand, run the detector, move the confidence slider and watch hits, misses and false alarms change; peek at "what the detector sees" | YOLO detector finds and crops each insect |
| 3. Sort the crops | Sort each crop into a group, then compare with the AI's order, family and species guesses | BioCLIP names each crop at several levels of the tree of life |
| 4. Be the reviewer | Fix only the guesses the AI was least sure about; compare "AI alone" with "AI + you" | People review results in FiftyOne |
| 5. What did we learn? | Night tally, pest watch, helpers, number of kinds; then vs. now (counting by hand vs. camera + AI + people); "Scale it up" runs the detector on 20 new photos and turns the student's own speed into by-hand time for a 300-photo night and a season; discussion of direct observation vs. estimation | Biodiversity counts and pest monitoring |

## Run it locally

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm run dev      # open the address it prints (usually http://localhost:5173)
```

Other commands:

```bash
npm run build    # type-check and build the static site into dist/
npm run preview  # serve the built site
npm run lint
```

There is no backend, login or network dependency. Everything runs in the browser, and uploaded photos never leave the computer.

## What is real and what is practice (MVP)

- **The detector really runs on the picture**, including your own photos. It is a simple, explainable method rather than a trained AI: estimate what the empty sheet looks like, mark pixels that are much darker or more colorful than it, group touching pixels into blobs, and score each blob by contrast and size (`src/lib/detector.ts`). It is fooled by leaves and twigs, which is part of the lesson. A trained YOLO model can replace it later.
- **The sample nights are computer drawn** (`src/lib/scene.ts`), so the lab knows the right answer for every insect, leaf and smudge. The species are real North American insects, including three crop-pest moths and several helpers (`src/lib/species.ts`).
- **The AI identifier is simulated on sample nights** (`src/lib/identifier.ts`). It acts like BioCLIP does on real photos: very sure about the order, less sure about the family, and often unsure or wrong between look-alike species (the three brown pest moths). On uploaded photos, steps 3 to 5 use only the students' own sorting for now.

## Next steps

1. Swap in real light-trap photos with expert boxes and labels: AMI-Traps from the Automated Monitoring of Insects project (MIT license, [Zenodo](https://zenodo.org/records/11358689)), then the team's own Mothbox nights.
2. Replace the simple detector with a small YOLO model running in the browser (ONNX).
3. Show real BioCLIP results, precomputed for each sample photo.
4. Before-and-after nights to check a scent treatment: did the pest count drop while helpers stayed?

## Credits

Based on the open-source Mothbox and Mothbot by [Digital Naturalism Laboratories](https://mothbox.org/). This lab is a separate teaching tool and is not affiliated with them.
