# Trained insect detector (YOLO11n on AMI-Traps)

These are the trained detector files for the lesson. The site runs them with ONNX Runtime Web in `src/lib/yolo.ts`: the 1280 model on WebGPU, otherwise the 960 model on WebAssembly. If neither can load, it falls back to the hand-written spot finder in `src/lib/detector.ts`.

## Files

| File | Size | sha256 |
|---|---|---|
| `public/models/yolo11n_ami_train1280_imgsz1280.onnx` | 11.2 MB | `44c4eacfd08c455212af23bd0cb43e7972803d2dafc276af21aecd26675dd7a2` |
| `public/models/yolo11n_ami_train960_imgsz960.onnx` | 10.9 MB | `a7f5804cf486769fdab952ff6b6359a89a7c8e622ca87df418eae870d5b73a52` |
| `public/samples/ami-traps/` | 7.2 MB | 24 real trap photos from the test split (see below), resized to 1600 px wide, each with an answer-key JSON, plus `index.json` |

## How it was trained

- **Model:** YOLO11n from Ultralytics 8.4.180, fine-tuned from the COCO `yolo11n.pt` weights.
- **Data:** the AMI-Traps part of the AMI dataset (Zenodo record 11358689, MIT license). It has 2,893 light-trap photos (most 4096×2160 or 3840×2160) and 52,948 boxes.
- **One class:** every label was mapped to class 0, "insect". The model's metadata calls it `item`. It only finds insects; it does not name them.
- **Split:** a seeded 80/10/10 split by image (2,314 train, 289 val, 290 test), because AMI ships no detection split. Frames from the same trap and night can land in both train and test, so the scores may be slightly optimistic.
- **Training run:** imgsz 1280 (or 960), 100 epochs, batch 16, seed 0.

## Test-split results (290 images, 5,738 boxes)

| Model | AP@0.5 | Precision | Recall | CPU ms per image* |
|---|---|---|---|---|
| YOLO11n, imgsz 1280 | 0.824 | 0.78 | 0.72 | 89 |
| YOLO11n, imgsz 960 | 0.777 | 0.75 | 0.66 | 51 |
| AMI Faster R-CNN R50 2021, short side 1080 (for comparison) | 0.470 | 0.69 | 0.46 | 3577 |
| AMI Faster R-CNN MobileNetV3 2023, short side 1080 (for comparison) | 0.343 | 0.40 | 0.45 | 148 |

AP@0.5 is VOC-style (all-point interpolation), with greedy matching at IoU 0.5. YOLO precision and recall are the Ultralytics test-split values. The AMI rows use the repo's thresholds: 0.99 for R50, 0.5 for MobileNet. The MobileNet row was run in ONNX Runtime, the R50 row in PyTorch.

\*Model call only, 20 Arm CPU cores, ONNX Runtime 1.31. A browser will be slower: expect roughly 1–3 s per photo at 1280 on the WASM backend on a mid-range phone, and much less on WebGPU.

## Lesson photos

The 24 photos in `public/samples/ami-traps/` are all from the test split, so the model never saw them in training. Each one has 6 to 40 insects, few enough for a student to box by hand: 369 insects in all, 10 from northeastern America, 10 from western Europe and 4 from Central America.

Each JSON (and each entry in `index.json`) has:
- `boxes`: `[x1, y1, x2, y2]` in pixels of the 1600 px photo
- `labels`: the AMI expert label for each box, a species, family or "Non-Moth"
- `groups`: the same labels simplified to `moth`, `not a moth` or `unknown` (180 / 173 / 16)

YOLO11n on these photos, at a 0.25 score threshold and IoU 0.5:

| Model | Found | False alarms |
|---|---|---|
| imgsz 1280 | 340 of 369 (92%) | 88 |
| imgsz 960 | 337 of 369 (91%) | 82 |

Some of these "false alarms" are tiny insects the experts didn't box. One photo, `20220531204321-00-11`, accounts for 31 of them.

## Answer key on the lesson photos

The lesson uses only 2 photos, `20220616022535-00-16` and `20220602015906-00-188`. On both, every insect is boxed and labeled, and YOLO11n (score 0.25 or more) finds all 34 of them with the lesson's own box rules (`judgeBoxes`). The other 4 photos we checked had insects the experts skipped that the detector misses too, so they stay in "Try your own photo".

- **The key:** every AMI expert box, plus one small insect our team boxed on photo 16 and one "Unidentifiable" box on photo 188 relabeled as `Moth`. Each box has a `sources` entry: `ami` or `team`.
- **Everything else is not a bug:** the other dark spots (`unlisted`: specks, fibers, the scale card, mites) were checked by our team. On a lesson photo a box on one is a false alarm, and its close-up's right answer is "Not a bug".
- **Other photos:** outside the lesson, `unlisted` spots count neither way, since nobody checked them.
- The `scored` and `px_per_cm` fields in `index.json` are left from an earlier 1 cm rule and are not used.

## Precomputed results for devices that can't run the models

`public/samples/ami-traps/precomputed.json` holds the real results of both models on every lesson photo. They were computed ahead of time with the site's own settings:
- detector: score ≥ 0.05, NMS 0.5, at most 500 boxes (`src/lib/yolo.ts`)
- classifier: 128 px close-ups padded with `#f2f0ec` (`src/lib/mothModel.ts`)

The models are `yolo11n_ami_train1280_imgsz1280.onnx` and `moth_classifier.onnx`. The file is meant for devices that can't run either model, so the lesson still works there.

- **Format:** `images[<photo>]` is a list of rows `[x, y, w, h, score, moth_chance]`. x, y, w and h are pixels of the 1600 px photo. `score` is the detector's confidence and `moth_chance` is the classifier's.
- **Tell the student:** when the site uses this file, it should say so, for example "This device can't run the AI itself, so you're seeing the answers the same AI gave when we ran it on a bigger computer."
- **Own photos:** these can't be precomputed. On those devices, "Try your own photo" should say that the AI can't run there.

## Input and output

- **Input** `images`: float32 `[1, 3, S, S]` with S = 1280 or 960. Channels are RGB, values 0–1. Letterbox the photo: scale it so the long side is S, keep the aspect ratio, and pad the rest with gray 114/255, centered.
- **Output** `output0`: float32 `[1, 5, N]`, where N is 33,600 for 1280 or 18,900 for 960. For each of the N candidates the rows are `cx, cy, w, h, score`. Box values are in letterboxed input pixels, and the score is already 0–1.
- **Post-processing:**
  1. Keep candidates with score ≥ conf. 0.25 is a good default; 0.001 to draw the full precision/recall curve.
  2. Convert to x1, y1, x2, y2.
  3. Run NMS at IoU 0.7. A trap photo can hold several hundred insects, so allow up to 500 boxes.
  4. Undo the letterbox: subtract the padding, then divide by the scale.

## Serving notes

- Serve `.onnx` files with long cache headers. `nginx.conf` already caches static files.
- For multithreaded WASM, the page has to be cross-origin isolated. Send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.
- WebGPU needs HTTPS.

## Credits and license

- **Detector:** YOLO11n by Ultralytics (AGPL-3.0, the same license as this repo), trained for this site on AMI-Traps.
- **Photos and answer key:** AMI-Traps, from "The AMI Dataset: Insect Identification in the Wild" (ECCV 2024), MIT license.
