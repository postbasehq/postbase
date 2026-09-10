# Postbase — Brand Assets

Icon and favicon set for Postbase. All icons derive from a single master and
are regenerated with [`generate-icons.py`](generate-icons.py).

## Files

| File | Size | Use |
|---|---|---|
| `postbase-icon.png` | 1000×1000 | **Master.** Edit/replace this, then regenerate the rest. |
| `favicon.ico` | 16 / 32 / 48 | Classic browser-tab favicon (multi-resolution). |
| `favicon-16.png` | 16×16 | Modern `<link rel="icon">`. |
| `favicon-32.png` | 32×32 | Modern `<link rel="icon">`. |
| `favicon-48.png` | 48×48 | Higher-DPI tab / bookmark. |
| `apple-touch-icon.png` | 180×180 | iOS home-screen (iOS applies its own rounding). |
| `icon-192.png` | 192×192 | PWA / Android. |
| `icon-512.png` | 512×512 | PWA / Android / social. |
| `icon.svg` | vector | Scalable `rel="icon"` (wraps the 512px raster). |
| `site.webmanifest` | — | PWA manifest referencing the 192/512/SVG icons. |
| `generate-icons.py` | — | Regenerates everything above from the master. |

## Design notes

- **Square, full-bleed on purpose.** X (circle) and GitHub / Android
  (rounded square) mask avatars themselves, so a pre-rounded file would show
  transparent gaps under the mask. The slight corner-rounding Postbase uses is
  applied **at display time** (e.g. `border-radius` in the app/site), never
  baked into these files.
- **Palette is locked:** Brand Blue `#3B5BDB`, Terracotta `#C0492F`,
  Amber `#E3A82C` on the blue ground. See [`../docs/DESIGN.md`](../docs/DESIGN.md).
- The mark is the finalized `p`/`b` capsule monogram (180° rotationally
  symmetric). It holds down to favicon size.

## Regenerating

After editing `postbase-icon.png` (keep it square, ≥ 512px):

```bash
python3 assets/generate-icons.py
```

Or point it at a different master:

```bash
python3 assets/generate-icons.py path/to/new-master.png
```

Requires Pillow (`pip install Pillow`).

## Wiring it into the site `<head>`

With the files served from the web root:

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#3B5BDB">
```

`theme_color` is Brand Blue; the manifest `background_color` is the app's
Google-grey ground `#F8F9FA` (see DESIGN.md §3).
