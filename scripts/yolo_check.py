"""Work out the boxes the browser uses to check that WebGPU runs the detector correctly.

Runs the 1280 model on the check photo on the regular CPU and prints the
boxes it finds at 25% or more, surest first. CHECK_BOXES in src/lib/yolo.ts
holds the ones at 60% or more. Rerun after retraining the model:

    python3 scripts/yolo_check.py
"""

import numpy as np
import onnxruntime as ort
from PIL import Image

PHOTO = 'public/samples/ami-traps/20220628003000-00-75.jpg'
MODEL = 'public/models/yolo11n_ami_train1280_imgsz1280.onnx'
SIZE = 1280


def iou(a, b):
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[0] + a[2], b[0] + b[2]), min(a[1] + a[3], b[1] + b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    return inter / (a[2] * a[3] + b[2] * b[3] - inter)


im = Image.open(PHOTO).convert('RGB')
scale = SIZE / max(im.size)
w, h = round(im.size[0] * scale), round(im.size[1] * scale)
pad_x, pad_y = (SIZE - w) // 2, (SIZE - h) // 2
canvas = Image.new('RGB', (SIZE, SIZE), (114, 114, 114))
canvas.paste(im.resize((w, h), Image.BILINEAR), (pad_x, pad_y))
x = np.asarray(canvas, dtype=np.float32).transpose(2, 0, 1)[None] / 255

session = ort.InferenceSession(MODEL)
out = session.run(None, {session.get_inputs()[0].name: x})[0][0]
found = sorted(
    (
        (float(out[4, i]), [(out[0, i] - out[2, i] / 2 - pad_x) / scale, (out[1, i] - out[3, i] / 2 - pad_y) / scale, out[2, i] / scale, out[3, i] / scale])
        for i in np.where(out[4] >= 0.25)[0]
    ),
    key=lambda t: -t[0],
)
kept = []
for score, box in found:
    if all(iou(box, k[1]) < 0.5 for k in kept):
        kept.append((score, box))
for score, box in kept:
    print(f'{score:.2f}', [round(v) for v in box])
