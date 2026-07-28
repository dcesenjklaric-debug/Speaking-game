# Design reference

Exploration for a redesigned Quick Wit home screen. **Nothing here is wired into
the game** — `index.html` is untouched by any of it.

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
