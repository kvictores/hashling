"""Export the hashling-pixel-overhaul-v3 art into web/public/assets/hashling/pixel and extension/assets/hashling/pixel.

Dev-only (needs Pillow, numpy, scipy). Usage from the repo root:
    python scripts/export_pixel_assets.py "/path/to/hashling-pixel-overhaul-v3"

* hashling-kitten-sleep.png in the pack is a byte copy of growth-moods-atlas.png, so the real kitten-sleep sprite is cut out of the atlas
  (bottom-left cell) and nearest-neighbour scaled to the size of the other kitten sprites.
* Fur-only recolours (moss / amber / cyan) are derived per sprite with a calibrated lookup: only neutral fur pixels (cream coat + the
  lavender shading on it) are shifted; plum outlines, rosettes, tail bands, eyes, pink nose/ears/paw pads and all gear are untouched.
* hat_sprout.png and collar_vine.png in the pack are not the items (the vine file is a byte copy of wearables-atlas.png), so those two
  are cut from their atlas cells (same pixel scale as the other items) and centred on a 397x397 canvas.
* Pixel art is copied without resampling (alpha preserved). alphaBounds (alpha >= 32) are measured from the exported files.
"""
import colorsys
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web/public/assets/hashling/pixel"
EXT = ROOT / "extension/assets/hashling/pixel"
STAGES = ["kitten", "cub", "adult"]
MOODS = ["idle", "happy", "sleep"]
WEARABLES = ["hat_sprout", "hat_visor", "hat_flower", "hat_antenna", "collar_bell", "collar_vine", "collar_led", "acc_solar", "acc_glass", "acc_shield"]
BACKGROUNDS = ["bg-glasshouse", "bg-rooftop", "bg-canal"]
# fur id -> (target hue deg, saturation multiplier floor, value gain)
FURS = {"moss": (108, 0.24, 0.98), "amber": (36, 0.52, 1.0), "cyan": (176, 0.27, 1.0)}


def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)


def kitten_sleep_from_atlas(pack):
    at = Image.open(pack / "assets/growth-moods-atlas.png").convert("RGBA")
    a = np.array(at)[:, :, 3] > 32
    lab, _ = ndi.label(ndi.binary_dilation(a, iterations=6))
    cells = []
    for sl in ndi.find_objects(lab):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h * w > 3000:
            cells.append((sl[0].start, sl[1].start, sl[0].stop, sl[1].stop))
    cells.sort(key=lambda c: (round(c[0] / 300), c[1]))
    y0, x0, y1, x1 = cells[6]  # row 3 (sleep), column A (kitten)
    crop = at.crop((x0 - 4, y0 - 4, x1 + 4, y1 + 4))
    k = 1.15
    crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.NEAREST)
    canvas = Image.new("RGBA", (410, 418), (0, 0, 0, 0))
    canvas.alpha_composite(crop, ((410 - crop.width) // 2, 418 - crop.height - 50))
    return canvas


def wearable_from_atlas(pack, index):
    at = Image.open(pack / "assets/wearables-atlas.png").convert("RGBA")
    a = np.array(at)[:, :, 3] > 32
    lab, _ = ndi.label(ndi.binary_dilation(a, iterations=8))
    cells = []
    for sl in ndi.find_objects(lab):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h * w > 2500:
            cells.append((sl[0].start, sl[1].start, sl[0].stop, sl[1].stop))
    cells.sort(key=lambda c: (round(c[0] / 250), c[1]))
    y0, x0, y1, x1 = cells[index]
    crop = at.crop((x0 - 4, y0 - 4, x1 + 4, y1 + 4))
    canvas = Image.new("RGBA", (397, 397), (0, 0, 0, 0))
    canvas.alpha_composite(crop, ((397 - crop.width) // 2, (397 - crop.height) // 2))
    return canvas


def recolor(im, hue, sat_floor, vgain):
    """Fur-only recolour. Fur = light, non-pink pixels (cream coat or its lavender shading). Dark plum, pink and eyes are kept."""
    a = np.array(im).astype(np.float32) / 255.0
    rgb, al = a[:, :, :3], a[:, :, 3]
    mx, mn = rgb.max(2), rgb.min(2)
    v = mx
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    h = np.zeros_like(v)
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60.0
    pink = ((h > 318) | (h < 14)) & (s > 0.16) & (v > 0.55)          # nose, inner ears, paw pads, tongue
    dark = v < 0.50                                                     # plum outlines / rosettes / tail bands / eyes
    glossy = (v > 0.97) & (s < 0.06)                                    # eye highlights, whites
    wv = np.clip((v - 0.50) / 0.12, 0, 1)                               # soft edge so anti-aliased outline pixels stay plum
    w = wv * (~pink) * (~glossy) * (al > 0.5)
    # new colour keeps each pixel's lightness; hue is the target, saturation follows the original warm/lavender tint
    new_s = np.clip(np.maximum(s * 1.6, sat_floor) * np.clip((v - 0.45) * 2.2, 0.3, 1.0), 0, 0.95)
    out = rgb.copy()
    hh = (hue / 60.0) % 6
    c = v * vgain * new_s
    x = c * (1 - abs((hh % 2) - 1))
    m = v * vgain - c
    sec = int(hh)
    base = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][sec]
    nr, ng, nb = base[0] + m, base[1] + m, base[2] + m
    for ch, nv in enumerate((nr, ng, nb)):
        out[:, :, ch] = rgb[:, :, ch] * (1 - w) + np.clip(nv, 0, 1) * w
    res = np.dstack([out, al])
    return Image.fromarray((res * 255 + 0.5).astype(np.uint8), "RGBA")


def main(pack: Path):
    sprites = {"hashling-egg": Image.open(pack / "assets/hashling-egg.png").convert("RGBA")}
    for st in STAGES:
        for mo in MOODS:
            n = f"hashling-{st}-{mo}"
            sprites[n] = kitten_sleep_from_atlas(pack) if n == "hashling-kitten-sleep" else Image.open(pack / f"assets/{n}.png").convert("RGBA")
    for n, im in sprites.items():
        for dest in (WEB, EXT):
            save(im, dest / f"{n}.png")
        if n != "hashling-egg":
            for fur, (hue, sf, vg) in FURS.items():
                d = recolor(im, hue, sf, vg)
                for dest in (WEB, EXT):
                    save(d, dest / f"{n}-{fur}.png")
    bounds = {}
    for n in WEARABLES:
        im = wearable_from_atlas(pack, 0) if n == "hat_sprout" else wearable_from_atlas(pack, 5) if n == "collar_vine" else Image.open(pack / f"assets/{n}.png").convert("RGBA")
        al = np.array(im)[:, :, 3] >= 32
        ys, xs = np.where(al)
        bounds[n] = [im.width, im.height, int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
        for dest in (WEB / "wearables", EXT / "wearables"):
            save(im, dest / f"{n}.png")
    print("wearable alpha bounds [w, h, x0, y0, x1, y1]:", bounds)
    for n in BACKGROUNDS:  # website only; pixel art stays PNG (no JPEG smearing)
        Image.open(pack / f"assets/{n}.png").convert("RGB").save(WEB / f"{n}.png", optimize=True)
    print("exported", len(list(WEB.rglob('*.png'))), "web files,", len(list(EXT.rglob('*.png'))), "extension files")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]))
