# Design reference

Exploration for a redesigned Quick Wit home screen. **This is now live in the game** —
the scene, the palette and the card chrome were ported into `index.html` on
2026-07-28. The mockup stays as the reference for the look; the app is the thing that
ships. If you change one, change the other.

| File | What it is |
|---|---|
| `hero-mockup.html` | The mockup. Open it in a browser directly, no server needed. |
| `background-generator.py` | Generates the background's CSS and renders it to a PNG. |
| `background-preview.png` | The background on its own, most recent render. |

## Working on the background

The background is a stack of layered CSS radial gradients. Editing them by hand
is guesswork, so `background-generator.py` owns them instead:

```bash
pip install Pillow                              # once
python background-generator.py 742 528 out.png  # render to look at it
python background-generator.py css              # print the CSS
```

Edit `LAYERS` in that file, render, look, repeat. When it looks right, paste the
`css` output into the `.screen { background: … }` rule in `hero-mockup.html`.
Generating both from the same data keeps the picture and the CSS in sync.

Each layer is `(rx%, ry%, cx%, cy%, stops)` — CSS order, so the first entry paints
on top. `ramp()` builds the stops on a smooth curve (37 per layer) rather than by
hand; evenly spaced stops with small colour deltas are what prevents banding.

Two things worth knowing if you tweak the geometry:

- A radial gradient's `rx` is a percentage of **width** and `ry` a percentage of
  **height**. For a shape to read as a true half-circle, those have to work out
  **equal in pixels** — hence `33% × 46%` at this aspect ratio, not `40% × 40%`.
- Where two layers meet, they should be a similar colour. A visible "edge" is
  almost always two different colours meeting, not a lack of gradient stops.

## Scene

Coral ribbon along the top edge, a velvety black-purple void, and a glowing
semicircular limb at the bottom with a thin white-hot beam rising from it —
yellow-white core, indigo mid, purple rim. Three parallax starfield layers over
the top.

## What changed on the way into the app

The mockup lives in a fixed 742×528 box. The app's `#bgfx` is the whole viewport, at
whatever aspect the window happens to be, so two things had to be re-expressed rather
than copy-pasted — both of them instances of the same trap described above:

- **The bottom layers are sized off one length, `--nova`** (the dome's radius), with
  every other radius written as a multiple of it. Percentages would have made the dome
  a flat wide ellipse on a desktop window. The multipliers ARE the mockup's
  proportions: beam `.18 × 1.02`, beam glow `.364 × .523`, dome `1 × .99`, haze
  `2 × 1.35`, column `.606 × 1.13`.
- **The coral ribbon is sized in px** (`96% 110px at 50% -20px`), so the band stays the
  mockup's ~90px instead of growing with viewport height — which also keeps it clear of
  the hero. The topbar sits inside the band, so it got the mockup's glass-pill nav
  treatment to stay legible.

One thing the mockup can't tell you: the app *scrolls* over this background, so text
travels across the beam. The card glass is at `.90/.84` alpha and `--muted` was lifted
from `#9d94b8` to `#a89fc4` for that reason — at the mockup's values, body text over
the beam measured 2.35:1. Re-check with a worst-case contrast sample if you brighten
the nova or thin the glass.
