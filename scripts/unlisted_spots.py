"""Finds dark spots on each lesson photo that the experts didn't box.

The AMI-Traps experts boxed moths and other bigger insects but often skipped
gnats and specks only a few pixels long. Left alone, a student or the AI who
boxes one of those gets a "false alarm" for finding a real bug. This script
marks every dark spot outside the expert boxes, and the lesson scores a box on
one of them as neither right nor wrong.

Run from the repository root (needs numpy, pillow and scipy):
    python3 scripts/unlisted_spots.py
It rewrites public/samples/ami-traps/index.json with an "unlisted" list for
each photo, as [x1, y1, x2, y2] boxes in the photo's pixels.
"""

import json

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

DIR = 'public/samples/ami-traps/'
# how much darker than the sheet around it a pixel must be (0 to 255)
DARKER = 38
# smallest spot, in pixels of the 1600-wide photo
MIN_AREA = 10
# spots this close to an expert box belong to that insect (legs, antennae)
NEAR = 6

index = json.load(open(DIR + 'index.json'))
for s in index['images']:
    gray = Image.open(DIR + s['image']).convert('L')
    sheet = np.asarray(gray.filter(ImageFilter.GaussianBlur(25)), dtype=np.float32)
    dark = (sheet - np.asarray(gray, dtype=np.float32)) > DARKER
    labels, _ = ndimage.label(dark)
    spots = []
    for i, sl in enumerate(ndimage.find_objects(labels)):
        if (labels[sl] == i + 1).sum() < MIN_AREA:
            continue
        y1, y2, x1, x2 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        if any(b[0] - NEAR <= cx <= b[2] + NEAR and b[1] - NEAR <= cy <= b[3] + NEAR for b in s['boxes']):
            continue
        # the photo's own edges and corners are often dark, not bugs
        if x1 < 3 or y1 < 3 or x2 > gray.width - 3 or y2 > gray.height - 3:
            continue
        spots.append([int(x1), int(y1), int(x2), int(y2)])
    s['unlisted'] = spots
    print(f"{s['image']}: {len(spots)} unlisted spots")
json.dump(index, open(DIR + 'index.json', 'w'), indent=1)
