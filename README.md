# Mothbox Vision Lab

A browser lesson for our FIRST LEGO League team (6th to 8th grade) about the computer-vision side of the [Mothbox](https://mothbox.org/), the open-source automated insect light trap our project uses.

Students walk through the same steps as the real Mothbox pipeline, doing each job themselves before seeing how the computer does it:

| Step | What students do | Real Mothbox equivalent |
|---|---|---|
| 1. Look at a photo | Pick one of 23 real light-trap photos, zoom around, guess the count | UV light attracts insects, camera photographs the sheet |
| 2. Find the insects | Box every insect against a stopwatch and see why each box counted or not; then run the computer's detector live in the browser and compare found, missed, false alarms and time; experiment with the confidence slider | YOLO detector finds each insect |
| 3. Moth or not? | Sort each close-up as moth, other insect or not a bug, then reveal the AI's answer and the experts' label | A moth / not-a-moth classifier sorts each close-up |
| 4. Name the moth | For each moth the experts named to species, pick the matching field-guide picture, then reveal BioCLIP's top answer and the experts' name | BioCLIP names each moth (run ahead of time, too big for a browser) |
| 5. Check the AI's work | For each close-up the AI was least sure about, compare it with a field guide of real moth and non-moth close-ups, agree or pick another, then see the truth; "AI alone" vs. "AI + you" | People review results in FiftyOne |
| 6. What did we learn? | Moths vs. other insects counted against the experts and the moths they named, then vs. now, "Scale it up" to a 300-photo night and a season, seeing vs. guessing, and an optional extra: our AI on a computer-drawn night | Biodiversity counts and pest monitoring |

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
- **The lesson uses real light-trap photos**: 24 AMI-Traps test photos (`public/samples/ami-traps`, `src/lib/samples.ts`) with the experts' boxes and labels, simplified to moth / not a moth / unknown. The detector never trained on them. One photo, where the detector boxes dozens of tiny insects the experts left out, is only in "Try your own photo". The field guide close-ups in step 5 are cut from these photos (`examples/`).
- **On phones and tablets** (`src/lib/touch.ts`, `src/SceneView.tsx`): the photo on the page is a preview that opens full screen, with its own pinch-zoom and pan, zoom-to-a-corner buttons, and tap-to-mark instead of drawing boxes. A tap makes a small square, scored with the same rules as a drawn box.
- **The drawn night** (`src/lib/scene.ts`) is only used for the optional extra at the end of step 6 and the tiny-CNN demo in How the AI works: it shows that an AI only knows what it was trained on.
- **The moth / not-a-moth answers come from a real classifier** (`src/lib/mothModel.ts`, `docs/moth-classifier.md`): a small MobileNetV3 trained on AMI-Traps insect close-ups from the train split, running in the browser on each close-up the detector kept. Its 4 least-sure answers go to the student in step 5.
- **The species answers come from BioCLIP** (`public/samples/ami-traps/bioclip.json`, `docs/bioclip.md`): run once ahead of time on the full-size lesson photos, since it's far too big for a browser. Step 4 shows its top answer for each moth the experts named to species; field-guide pictures (`species/`) come from training photos. AMI labels non-moths only as "Non-Moth", so the lesson doesn't split them into beetles, flies and so on.

## Next steps

1. Use the team's own Mothbox nights.
2. Before-and-after nights to check a scent treatment: did the pest count drop while helpers stayed?

## License

AGPL-3.0 (see `LICENSE`), because the trained YOLO detector is built with Ultralytics, which is AGPL-3.0.

## Credits

The site has a full Credits and links page (footer link). In short:

- [Mothbox](https://mothbox.org/) by Digital Naturalism Laboratories ([GitHub](https://github.com/Digital-Naturalism-Laboratories/Mothbox)). This lab is a separate teaching tool and is not affiliated with them.
- AMI dataset from the Automated Monitoring of Insects project, Rolnick Lab: Jain et al., [Insect Identification in the Wild: The AMI Dataset](https://arxiv.org/abs/2406.12452), ECCV 2024; data on [Zenodo](https://zenodo.org/records/11358689) (MIT).
- [Ultralytics YOLO11](https://docs.ultralytics.com/models/yolo11/) (AGPL-3.0).
- [FiftyOne](https://docs.voxel51.com/) by Voxel51, which the Mothbox team uses to review results.
