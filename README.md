# Mothbox Vision Lab

A browser lesson for our FIRST LEGO League team (6th to 8th grade) about the computer-vision side of the [Mothbox](https://mothbox.org/), the open-source automated insect light trap our project uses.

Students walk through the same steps as the real Mothbox pipeline, doing each job themselves before seeing how the computer does it:

| Step | What students do | Real Mothbox equivalent |
|---|---|---|
| 1. Look at a photo | Pick one of 23 real light-trap photos (or the bonus drawn night), zoom around, guess the count | UV light attracts insects, camera photographs the sheet |
| 2. Find the insects | Box every insect against a stopwatch and see why each box counted or not; then run the computer's detector live in the browser and compare found, missed, false alarms and time; experiment with the confidence slider | YOLO detector finds each insect |
| 3. Name the insects | Sort each close-up as moth, other insect or not a bug, then reveal the AI's answer and the experts' label (the drawn night uses order, family and species instead) | A classifier and BioCLIP name each close-up |
| 4. Check the AI's work | For each close-up the AI was least sure about, compare it with a field guide (real moth and non-moth close-ups; species pictures on the drawn night), agree or pick another, then see the truth; "AI alone" vs. "AI + you" | People review results in FiftyOne |
| 5. What did we learn? | Moths vs. other insects counted against the experts and the moths they named (pest watch and helpers on the drawn night), then vs. now, "Scale it up" to a 300-photo night and a season, seeing vs. guessing | Biodiversity counts and pest monitoring |

Outside the lesson, **How the AI works** (header button, also linked from step 2) is an optional extra in two parts: how the AI sees (pixels and resolution, a 3 x 3 filter playground with the math shown, layers of filters, how YOLO turns grid guesses into one box per insect) and how it learns (train a real 309-number CNN in the browser, then test it on a night it never saw).

**Try your own photo** (header button) runs the detector on any uploaded photo, with the confidence slider, "what the detector sees", and close-ups the student marks as insect or not (there is no answer key for their photo). Photos never leave the browser.

Student boxes and the detector are scored with the same kid-friendly rule (`judgeBoxes` in `src/lib/geometry.ts`): a box finds an insect if it covers the insect's middle and isn't more than about 4 times its size (tiny insects get extra slack), or overlaps it well. Each box gets a reason: found, too big, counted twice, not an insect, or nothing here.

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

### Docker (same setup as the scent and SPIKE simulators)

Every push to `main` runs `.github/workflows/docker.yml`, which builds the `Dockerfile` and publishes `ghcr.io/danmartinez78/vision_playground:latest`. Other `claude/**` and `feature/**` branches publish `:branch-<name>` (slashes become dashes) for a test container. The image is nginx serving the built site on port 8080, with no volume or settings, because everything runs in the student's browser.

```bash
docker run -d --name mothbox-vision-lab --restart unless-stopped \
    -p 8096:8080 ghcr.io/danmartinez78/vision_playground:latest
```

nginx sends the cross-origin isolation headers (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`) so the in-browser AI model can use several CPU threads, and caches the model, the AI runtime and sample photos for a week. Serve it over HTTPS (for example behind a reverse proxy) so browsers allow WebGPU. If the package is private on GitHub, make it public (Packages, Package settings, Change visibility) or `docker login ghcr.io` on the server first.

## What is real and what is practice (MVP)

- **The detector is a real trained AI running in the browser**: YOLO11n trained on AMI-Traps (`src/lib/yolo.ts`, details and test results in `docs/yolo-model.md`). With WebGPU it runs the 1280 model; otherwise the 960 model on WebAssembly (about half a second per photo on a laptop). If the model can't load, the page falls back to a simple spot finder (`src/lib/detector.ts`) and says so.
- **The lesson uses real light-trap photos**: 24 AMI-Traps test photos (`public/samples/ami-traps`, `src/lib/samples.ts`) with the experts' boxes and labels, simplified to moth / not a moth / unknown. The detector never trained on them. One photo, where the detector boxes dozens of tiny insects the experts left out, is only in "Try your own photo". The field guide close-ups in step 4 are cut from these photos (`examples/`).
- **The bonus drawn night** (`src/lib/scene.ts`) keeps the species version of steps 3 to 5, with real North American insects including three crop-pest moths and several helpers (`src/lib/species.ts`).
- **The AI identifier is simulated** (`src/lib/identifier.ts`). On real photos it makes moth / not-a-moth answers: usually right and sure, unsure when it's wrong. On the drawn night it acts like BioCLIP: very sure about the order, less sure about the family, often unsure between look-alike species. On uploaded photos, steps 3 to 5 use only the students' own sorting for now.

## Next steps

1. Use the team's own Mothbox nights.
2. Show real AI results (the AMI moth classifier or BioCLIP), precomputed for each sample photo.
3. Before-and-after nights to check a scent treatment: did the pest count drop while helpers stayed?

## License

AGPL-3.0 (see `LICENSE`), because the trained YOLO detector is built with Ultralytics, which is AGPL-3.0.

## Credits

The site has a full Credits and links page (footer link). In short:

- [Mothbox](https://mothbox.org/) by Digital Naturalism Laboratories ([GitHub](https://github.com/Digital-Naturalism-Laboratories/Mothbox)). This lab is a separate teaching tool and is not affiliated with them.
- AMI dataset from the Automated Monitoring of Insects project, Rolnick Lab: Jain et al., [Insect Identification in the Wild: The AMI Dataset](https://arxiv.org/abs/2406.12452), ECCV 2024; data on [Zenodo](https://zenodo.org/records/11358689) (MIT).
- [Ultralytics YOLO11](https://docs.ultralytics.com/models/yolo11/) (AGPL-3.0).
- [BioCLIP](https://imageomics.github.io/bioclip/) by the Imageomics Institute (Stevens et al., CVPR 2024), which the practice identifier imitates.
- [FiftyOne](https://docs.voxel51.com/) by Voxel51, which the Mothbox team uses to review results.
