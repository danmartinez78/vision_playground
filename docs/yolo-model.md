# Trained insect detector (YOLO11n on AMI-Traps)

These are the trained detector files for the lesson. The site doesn't use them yet: `src/lib/detector.ts` is still the hand-written blob detector. This file lists everything needed to wire them in with ONNX Runtime Web.

## Files

| File | Size | sha256 |
|---|---|---|
| `public/models/yolo11n_ami_train1280_imgsz1280.onnx` | 11.2 MB | `44c4eacfd08c455212af23bd0cb43e7972803d2dafc276af21aecd26675dd7a2` |
| `public/models/yolo11n_ami_train960_imgsz960.onnx` | 10.9 MB | `a7f5804cf486769fdab952ff6b6359a89a7c8e622ca87df418eae870d5b73a52` |
| `public/samples/ami-traps/` | 3.5 MB | 12 real trap photos from the test split, resized to 1600 px wide, each with an answer-key JSON, plus `index.json` |

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
