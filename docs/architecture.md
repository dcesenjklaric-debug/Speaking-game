# Architecture

## Shape of the project
```
index.html        the entire game — markup, CSS, and JS in one file
api/
  claude.js        AI proxy + paywall enforcement (see docs/api.md)
  license.js       licence validity check (see docs/api.md)
lib/
  license.js       HMAC sign/verify for licence keys — shared by api/ and scripts/
scripts/
  make-license.js  run by hand to mint a licence for a paying customer
serve.js           local dev server (ESM) — do not add require()/__dirname to it
design/            visual design system + the background generator (see [[README|design/README.md]])
```

## The round lifecycle
A `round` object drives every game mode. `phase` moves
`"prep" → "speak" → "between" → (repeat or) feedback`. `round.plan` is an array
of steps (`{label, sub, seconds, topic}`); most modes have one step, Rapid-Fire
has three, Debate Roulette has two (for/against).

`topic` is the field the automated "On topic" scorer keys off — see
[[decisions]] for why some modes intentionally leave it `null` rather
than faking one.

`stopEverything()` is the single cleanup path: clears all `timers`, stops any
active recognizer/recorder, nulls `round`/`sim`. Any new long-running timer
should register through `every()`/`later()` (not a raw `setInterval`/
`setTimeout`) so it's swept here automatically.

## The paywall
Client (`index.html`) → `POST /api/claude` → Anthropic. The client sends
`x-qw-license` if a licence key is stored; the server is the only place
entitlement is decided (`api/claude.js`). A `402` response means "free rounds
gone today" and triggers `showPaywall()`; a `429` means "your licence itself
hit its daily cap." `isPro`/`freeLeft` in the client are purely for display —
never gate a feature on them client-side.

Full request/response shapes: [[api]].

## Sound
`sfx` (in `index.html`) synthesizes short tones with the Web Audio API — no
audio files. Every call to `sfx.play()` is guarded: it silently no-ops if
`round.phase === "speak"` or the simulator's mic is live, because a synthesized
tone is a pure steady pitch and would corrupt the tone-variation score exactly
the way it would corrupt a speech transcript. See [[decisions]].

## Save data (`localStorage`)
`loadSave()` no longer trusts a parsed save blindly — `sanitizeSave()` coerces
every field to its expected type before use. (A hand-edited or corrupted save
used to throw inside `renderTopbar()` at boot and leave a permanently blank
page; see [[lessons]].) If you add a new field to the save object, add
its coercion to `sanitizeSave()` too, not just to `defaultSave()`.

## Background / visual design
Lives in `#bgfx` and its CSS, kept deliberately separate from `#app`'s
z-index stack (see the comment at the top of `index.html`'s `<style>` block for
why `#bgfx` isn't `z-index: -1`). The design rationale, palette, and the
background-generator tool are documented in [[README|design/README.md]] — read
that before touching the scene, not this file.
