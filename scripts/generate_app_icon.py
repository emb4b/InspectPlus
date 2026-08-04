"""One-off generator for the Android launcher icons, sourced from the
final night-mode app icon artwork (assets/icons/app_icon_night_mode.png —
already a navy rounded-square with transparent corners). Run manually —
not part of the app build. Produces:
  - android mipmap-*/ic_launcher.webp        (source, resized as-is)
  - android mipmap-*/ic_launcher_round.webp  (circle-masked)
"""

import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "assets", "icons", "app_icon_night_mode.png")

MIPMAP_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def circle_mask(im):
    size = im.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


def main():
    source = Image.open(SOURCE).convert("RGBA")

    for folder, size in MIPMAP_SIZES.items():
        res_dir = os.path.join(ROOT, "android", "app", "src", "main", "res", folder)
        os.makedirs(res_dir, exist_ok=True)

        resized = source.resize((size, size), Image.LANCZOS)

        square_path = os.path.join(res_dir, "ic_launcher.webp")
        resized.save(square_path, "WEBP", lossless=True)

        round_path = os.path.join(res_dir, "ic_launcher_round.webp")
        circle_mask(resized).save(round_path, "WEBP", lossless=True)

        print("wrote", square_path, "and", round_path)


if __name__ == "__main__":
    main()
