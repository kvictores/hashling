"""Export the Hashling visual-kit art into web/public/assets/hashling and extension/assets/hashling.

Dev-only tool (needs Pillow: `pip install pillow`); the exported files are committed, so nothing at runtime depends on it.
Usage from the repo root:
    python scripts/export_hashling_assets.py "/path/to/hashling-visual-kit-v2/assets"

* pets / icons keep their alpha channel and are resized to a web-friendly size
* opaque scenes (den, quiz backdrop) are exported as JPEG
* favicon + extension 16/32/48/128 icons are built from the head icon, trimmed and padded
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web/public/assets/hashling"
EXT = ROOT / "extension/assets/hashling"

PETS = [
    "hashling-egg", "hashling-kitten", "hashling-cub", "hashling-cub-alert",
    "hashling-adult-classic-v3", "hashling-adult-moss-v3", "hashling-adult-amber-v3", "hashling-adult-cyan-v3",
]
ICONS = ["sun-coin", "streak-flame", "protection-shield"]


def save_png(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)
    print(f"  {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} KB")


def resized(im: Image.Image, size) -> Image.Image:
    return im.resize(size, Image.LANCZOS)


def main(src: Path):
    # Trim the fringe: stray, almost-transparent pixels would otherwise add haze around the pets on light backgrounds.
    def load(name):
        im = Image.open(src / f"{name}.png").convert("RGBA")
        a = im.getchannel("A").point(lambda v: 0 if v < 10 else v)
        im.putalpha(a)
        return im

    print("pets (web 768px, extension 384px)")
    for n in PETS:
        im = load(n)
        save_png(resized(im, (768, 768)), WEB / f"{n}.png")
        save_png(resized(im, (384, 384)), EXT / f"{n}.png")

    print("icons (web 256px, extension 128px)")
    for n in ICONS:
        im = load(n)
        save_png(resized(im, (256, 256)), WEB / f"{n}.png")
        save_png(resized(im, (128, 128)), EXT / f"{n}.png")

    head = load("hashling-head-icon")
    save_png(resized(head, (256, 256)), WEB / "hashling-head-icon.png")
    save_png(resized(head, (128, 128)), EXT / "hashling-head-icon.png")

    print("scenes")
    ledge = load("quiz-garden-ledge")
    save_png(resized(ledge, (ledge.width // 2, ledge.height // 2)), WEB / "quiz-garden-ledge.png")
    for name, width in (("den-greenhouse", 1600), ("quiz-greenhouse-backdrop", 720)):
        im = Image.open(src / f"{name}.png").convert("RGB")
        im = resized(im, (width, round(im.height * width / im.width)))
        p = WEB / f"{name}.jpg"
        im.save(p, quality=86, optimize=True, progressive=True)
        print(f"  {p.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {p.stat().st_size // 1024} KB")

    print("favicon + extension icons")
    box = head.getbbox()
    trimmed = head.crop(box)
    side = max(trimmed.size)
    for px, dest in ((16, EXT.parent / "../icons/icon16.png"), (32, EXT.parent / "../icons/icon32.png"),
                     (48, EXT.parent / "../icons/icon48.png"), (128, EXT.parent / "../icons/icon128.png"),
                     (32, ROOT / "web/public/favicon-32.png"), (180, ROOT / "web/public/apple-touch-icon.png")):
        pad = max(1, round(px * 0.04))
        inner = px - 2 * pad
        canvas = Image.new("RGBA", (px, px), (0, 0, 0, 0))
        scale = inner / side
        t = trimmed.resize((max(1, round(trimmed.width * scale)), max(1, round(trimmed.height * scale))), Image.LANCZOS)
        canvas.alpha_composite(t, ((px - t.width) // 2, (px - t.height) // 2))
        save_png(canvas, Path(dest).resolve())


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]))
