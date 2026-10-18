"""Make the small preview pictures for the sample photos.

The photo pickers show these instead of the full photos, so phones load
them fast. Run from the repo root after adding or changing sample photos:

    python3 scripts/make_thumbs.py
"""

from pathlib import Path

from PIL import Image

SAMPLES = Path('public/samples/ami-traps')
WIDTH = 480

out = SAMPLES / 'thumbs'
out.mkdir(exist_ok=True)
for photo in sorted(SAMPLES.glob('*.jpg')):
    im = Image.open(photo).convert('RGB')
    im.thumbnail((WIDTH, WIDTH))
    im.save(out / photo.name, quality=80, optimize=True, progressive=True)
    print(photo.name, im.size)
