#!/usr/bin/env python3
"""
Regenerate the Postbase icon set from the master PNG.

Master:  assets/postbase-icon.png  (square, full-bleed, ideally >= 512px)
Outputs: favicon.ico + PNG sizes + icon.svg + site.webmanifest, all in assets/.

Icons are kept SQUARE and FULL-BLEED on purpose: X (circle) and
GitHub/Android (rounded square) mask avatars themselves, so a pre-rounded
file would show gaps under the mask. The slight corner-rounding is applied
at display time (e.g. border-radius in the app/site), not baked in.

Usage:
    python3 assets/generate-icons.py            # uses assets/postbase-icon.png
    python3 assets/generate-icons.py path.png   # use a different master

Requires Pillow:  pip install Pillow
"""
import base64
import pathlib
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required. Install it with:  pip install Pillow")

HERE = pathlib.Path(__file__).resolve().parent
MASTER = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "postbase-icon.png"

# Brand tokens (keep in sync with docs/DESIGN.md)
THEME_COLOR = "#3B5BDB"       # brand blue
BACKGROUND_COLOR = "#F8F9FA"  # Google-grey UI ground

# name -> pixel size
PNG_SIZES = {
    "favicon-16.png": 16,
    "favicon-32.png": 32,
    "favicon-48.png": 48,
    "apple-touch-icon.png": 180,  # iOS auto-rounds
    "icon-192.png": 192,          # PWA / Android
    "icon-512.png": 512,          # PWA / Android
}
ICO_SIZES = [(16, 16), (32, 32), (48, 48)]


def main() -> None:
    if not MASTER.exists():
        sys.exit(f"Master not found: {MASTER}")

    src = Image.open(MASTER).convert("RGB")
    if src.width != src.height:
        print(f"warning: master is not square ({src.size}); output may distort")
    print(f"master: {MASTER.name} {src.size}")

    for name, size in PNG_SIZES.items():
        src.resize((size, size), Image.LANCZOS).save(HERE / name, "PNG", optimize=True)
        print(f"  wrote {name}")

    # Multi-resolution .ico
    src.resize((256, 256), Image.LANCZOS).save(
        HERE / "favicon.ico", format="ICO", sizes=ICO_SIZES
    )
    print(f"  wrote favicon.ico {'/'.join(str(w) for w, _ in ICO_SIZES)}")

    # SVG wrapper embedding the 512px raster (scalable container)
    b64 = base64.b64encode((HERE / "icon-512.png").read_bytes()).decode()
    (HERE / "icon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" '
        'width="512" height="512">\n'
        f'  <image width="512" height="512" href="data:image/png;base64,{b64}"/>\n'
        "</svg>\n"
    )
    print("  wrote icon.svg")

    # PWA manifest
    (HERE / "site.webmanifest").write_text(
        "{\n"
        '  "name": "Postbase",\n'
        '  "short_name": "Postbase",\n'
        '  "description": "The social scheduler even your AI can run.",\n'
        '  "icons": [\n'
        '    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },\n'
        '    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },\n'
        '    { "src": "/icon.svg", "type": "image/svg+xml" }\n'
        "  ],\n"
        f'  "theme_color": "{THEME_COLOR}",\n'
        f'  "background_color": "{BACKGROUND_COLOR}",\n'
        '  "display": "standalone"\n'
        "}\n"
    )
    print("  wrote site.webmanifest")
    print("done.")


if __name__ == "__main__":
    main()
