# Project context

## What this is
Quick Wit — a browser-based impromptu-speaking practice game. Four Quick Rounds
(Sell Me This, Rapid-Fire, Story Spinner, Debate Roulette) score delivery
(pace/fillers/tone/stamina) entirely client-side, no API needed. Deep Practice
(Crash Course, Prep for Real Life, Small Talk Trainer's live simulator) uses
Claude for content generation and coaching feedback. Single-file app
(`index.html`), a couple of Vercel serverless functions (`api/`), deployed via
`DEPLOY.md`'s instructions.

## Status as of the last work session
Shipped and pushed to `main` this cycle:
- Home screen laid out per the design mockup (capsule nav, hero, one-row Quick
  Round cards with per-mode SVG art, line-icon Deep Practice cards, progress
  strip). Background and game modes untouched throughout.
- New mode: **Crash Course** — AI writes a short explainer on something the
  player likely doesn't know, 10-minute study timer (unlimited extensions),
  then a 60-second teach-back with the source text off-screen. Coach grades
  60% understanding / 40% clarity against the source.
- Fixed a scoring bug where four modes got a free 25/25 "On topic" score for
  any 60+ words spoken (see [[decisions]]).
- Added synthesized sound cues (Web Audio, no files, muteable), hard-gated off
  during any live-mic phase.
- Built a server-enforced paywall: 3 free AI rounds/day, HMAC-signed licence
  keys unlock more. Security-audited by two independent reviews; findings
  fixed (see [[lessons]] for the two worst ones).
- Fixed `serve.js` after `package.json`'s `"type": "module"` broke its
  CommonJS `require()` calls.
- Drafted a marketing plan (see [[todo]] — not yet executed).

## Known open gaps (accepted, not yet fixed)
- **`/api/claude` still accepts a client-supplied system prompt.** It's rate-
  limited (3/day/IP for free users) but is technically still usable as a
  general-purpose Claude proxy on the owner's key. Real fix is server-side
  prompt templates — see [[todo]].
- **Rate limiting is per-lambda-instance**, not exact. True ceiling is
  `FREE_DAILY × concurrently-live instances`; a cold start resets it. The
  Anthropic console's monthly spend cap is the actual financial backstop —
  confirm it's set before publishing, this isn't optional.
- **Licence fulfillment is manual.** Owner runs `scripts/make-license.js` by
  hand per paying customer. Fine at low volume, not scalable past a few dozen.
- **No accounts or database.** Everything is either signed-token-based
  (licences) or `localStorage` (game progress) — by design for now, see
  [[decisions]].

## Not yet built, discussed and scoped
- **Shareable result card** — generate an image of a round's score/grade for
  social sharing. Recommended as the highest-leverage unbuilt feature, and
  becomes directly relevant now that a marketing push is being planned: every
  channel in the plan depends on other people sharing the app, which currently
  has nothing shareable to show off.
- **Voice output for the live simulator** — persona-specific TTS voices
  (OpenAI TTS recommended over ElevenLabs for cost: ~1–3¢/conversation vs
  ~17–29¢). Requires a new `api/tts.js` proxy following the same pattern as
  `api/claude.js`, plus sequencing the simulator's mic-open (hard mode) to wait
  for `audio.onended` — playing a voice line while the mic is already listening
  would corrupt the transcript the same way sound effects would corrupt the
  tone score.
