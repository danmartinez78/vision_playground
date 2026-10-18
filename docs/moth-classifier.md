# Moth / not-a-moth classifier

This is the second step of the AMI pipeline. After YOLO11n finds each insect, this model looks at one close-up and says whether it's a moth. It runs in the browser through `src/lib/mothModel.ts`.

## File

| File | Size | sha256 |
|---|---|---|
| `public/models/moth_classifier.onnx` | 6.1 MB | `b4d4d063bc8107dac46ac96482fc25eb94a81b033766a1fbac0201e1c4ae995e` |

## Input and output

- **Input** `crops`: float32 `[N, 3, 128, 128]`, RGB, normalized with the ImageNet mean `[0.485, 0.456, 0.406]` and std `[0.229, 0.224, 0.225]`.
- **Output** `logits`: float32 `[N, 2]`. Index 0 is moth and index 1 is not a moth. The moth chance is `1 / (1 + exp(l1 - l0))`.
- **Close-up:** a square around the detector box, the same one the cards show.
  - `pad = max(w, h) * 0.25 + 4`
  - `side = max(w, h) + 2 * pad`
  - Center it on the box, cut it from the 1600 px scene canvas and scale it to 128 × 128.
  - Fill any part outside the photo with `#f2f0ec`, as `cropToDataUrl` does.

  The training crops were cut exactly this way, from photos shrunk to 1600 px wide.

## How it was trained

- **Model:** MobileNetV3-small with ImageNet weights, fine-tuned for 12 epochs with torchvision. 1.5M parameters.
- **Data:** every expert box in AMI-Traps, cut as above.
  - Moth = every moth label, from order down to species.
  - Not a moth = `Non-Moth`.
  - `Unidentifiable` boxes were left out.
- **Split:** the same image split as the detector, so none of the 24 lesson photos were used in training.

| Split | Moth | Not a moth |
|---|---|---|
| train | 11,526 | 29,302 |
| val | 1,182 | 3,618 |
| test | 1,397 | 4,185 |

- **Augmentation:** random crop, flips, rotation, color jitter. Class-weighted loss.

## Results

**Test split** (5,582 close-ups from photos the model never saw):

| Accuracy | Balanced accuracy | Moth recall | Moth precision | Not-a-moth recall |
|---|---|---|---|---|
| 97.9% | 97.9% | 98.1% | 93.6% | 97.8% |

**The 24 lesson photos, end to end:** YOLO11n at 1280 with a score threshold of 0.25 and NMS 0.5, then this classifier on the site-style close-ups. Of the 320 insects that YOLO found (IoU ≥ 0.5) and that have a moth / not-a-moth label, it got **312 right (97.5%)**:

- moth called moth: 172
- moth called not a moth: 1
- not a moth called not a moth: 140
- not a moth called moth: 7

On the 14 found insects the experts marked `Unidentifiable`, it says moth for most of them.

**Speed:** about 0.75 ms per close-up on 4 CPU threads with ONNX Runtime. Expect a few ms per close-up in a browser on WASM.

## Credits and license

- Trained for this site on AMI-Traps (MIT).
- MobileNetV3 architecture and ImageNet weights from torchvision (BSD-3-Clause).
