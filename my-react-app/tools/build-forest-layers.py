"""
Builds Type Runner's two forest layers from your painted scenes.

    python3 tools/build-forest-layers.py [VISTA] [SCENE ...]      (needs Pillow and NumPy)

    VISTA  the far-away view: sky, misty hills, distant trees
           (default design/forest-source/vista.jpg)
    SCENE  one or more forest scenes with big trees in front and a path along the bottom
           (default design/forest-source/scene.jpg and scene-2.jpg)

Writes:
    public/forest/back.webp   the vista, scrolls slowly
    public/forest/front.webp  the scenes side by side, with their sky and mist made see-through
                              so the vista shows behind the trees. The path is where the bulbul runs.

Both are cropped to the same band (the top of the canopy is trimmed, so the path sits at about 80%
of the height, where the runner's feet are). To repeat without a visible join:
  - the vista is set next to a mirrored copy of itself (soft hills mirror naturally);
  - the scenes are chained with a short cross-fade at each join, including from the last scene
    back to the first. Scenes with trees at their edges join best: two trunks stand side by side.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..')
vista_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'design/forest-source/vista.jpg')
scene_paths = sys.argv[2:] or [os.path.join(ROOT, 'design/forest-source', name) for name in ('scene.jpg', 'scene-2.jpg')]
OUT = os.path.join(ROOT, 'public/forest')
os.makedirs(OUT, exist_ok=True)

CROP_TOP = 0.22   # trim this much of the top (sky / canopy), as a fraction of the height
HEIGHT = 450      # output height in px (the scene shows at up to 200 px; this keeps it sharp)


def band(image):
    w, h = image.size
    cropped = image.crop((0, int(h * CROP_TOP), w, h))
    scale = HEIGHT / cropped.height
    return cropped.resize((round(cropped.width * scale), HEIGHT), Image.LANCZOS)


def mirrored(image):
    """The image followed by its mirror image: the pair repeats with no visible join."""
    w, h = image.size
    pair = Image.new(image.mode, (w * 2, h))
    pair.paste(image, (0, 0))
    pair.paste(image.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    return pair


def chained(images, overlap=0.05):
    """Joins images left to right with a short cross-fade, and fades the end back into the start."""
    arrays = [np.array(image).astype(float) for image in images]
    o = int(arrays[0].shape[1] * overlap)
    ramp = np.linspace(0, 1, o)[None, :, None]
    strip = arrays[0]
    for nxt in arrays[1:]:
        seam = strip[:, -o:] * (1 - ramp) + nxt[:, :o] * ramp
        strip = np.concatenate([strip[:, :-o], seam, nxt[:, o:]], axis=1)
    strip[:, :o] = strip[:, -o:] * (1 - ramp) + strip[:, :o] * ramp  # wrap around
    strip = strip[:, :-o]
    return Image.fromarray(strip.clip(0, 255).astype(np.uint8), images[0].mode)


def without_sky(image):
    """Makes bright, grey sky and mist see-through; keeps trees, rocks and the path solid."""
    a = np.array(image.convert('RGB')).astype(float)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    grey = a.max(2) - a.min(2)
    sky = np.clip((lum - 150) / 40, 0, 1) * np.clip((40 - grey) / 20, 0, 1)
    rows = np.linspace(0, 1, a.shape[0])[:, None]
    sky *= np.clip((0.7 - rows) / 0.08, 0, 1)  # never touch the path along the bottom
    alpha = Image.fromarray(((1 - sky) * 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1))
    out = image.convert('RGBA')
    out.putalpha(alpha)
    return out


back = mirrored(band(Image.open(vista_path).convert('RGB')))
front = chained([without_sky(band(Image.open(path).convert('RGB'))) for path in scene_paths])
back.save(os.path.join(OUT, 'back.webp'), quality=80, method=6)
front.save(os.path.join(OUT, 'front.webp'), quality=82, method=6)
for name in ('back', 'front'):
    path = os.path.join(OUT, f'{name}.webp')
    print(name, Image.open(path).size, os.path.getsize(path) // 1024, 'KB')
