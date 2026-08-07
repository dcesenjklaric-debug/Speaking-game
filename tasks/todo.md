# Open work

Newest/highest-priority first. Move an item here when it's decided but not yet
built; move it to [[decisions]] or [[project-context]] once
it's done, don't leave it duplicated in both places.

## Recommended next
- **Shareable result card.** Generate an image of a round's score/grade for
  sharing. Flagged as the highest-leverage unbuilt feature specifically
  because a marketing push is now being planned (see below) — every channel in
  that plan depends on players sharing the app, and there's currently nothing
  shareable to show off.
- **Execute the marketing plan** (not yet started, only drafted):
  1. Set up analytics (Vercel Analytics or Plausible) + UTM tags per channel,
     before spending effort on any of the below — otherwise there's no way to
     tell what's working.
  2. Build the shareable result card (above) before the push, not after.
  3. Organic first: participate genuinely in r/Toastmasters, r/PublicSpeaking,
     r/socialskills for a while before posting anything; post build-process
     content on LinkedIn; start clipping TikToks/Reels of actual rounds
     (the gameplay format — timed speaking to camera — is already native
     short-form video).
  4. Product Hunt launch once there are a few organic users/testimonials to
     seed the comments with. Launch Tue–Thu.
  5. Ongoing: 1–2 SEO-targeted blog posts a month (e.g. "impromptu speaking
     exercises to practice alone," "how to prepare for a job interview with
     AI"). Slow compounding channel, don't expect early results.
  6. Hold off on paid ads until organic conversion/retention numbers exist —
     at €4.99/mo, cold paid acquisition on an unproven, unbranded app will
     likely cost more per signup than the subscriber is worth.

## Security / robustness follow-ups (known gaps, accepted for now)
- **Close the open-proxy issue.** `/api/claude` still accepts a client-supplied
  system prompt — rate-limited, but still technically a general Claude proxy
  on the owner's key. Fix: server-side prompt templates, client sends a `mode`
  key rather than raw prompt text. This is a real refactor touching every AI
  feature (coach verdicts, Crash Course, Real-Life Prep, the simulator) — do it
  as a dedicated pass, not bundled into an unrelated change.
- **Move the rate-limit counter to shared storage** (Vercel KV or similar).
  Currently per-lambda-instance in memory, so the true ceiling is
  `FREE_DAILY × live instances` and resets on cold start. The Anthropic
  monthly spend cap is the real backstop in the meantime — confirm it's set.
- **Accounts + database**, once manual licence fulfillment
  (`scripts/make-license.js` run by hand per sale) becomes painful past a
  handful of customers. Also the only real fix for licence-sharing (`PRO_DAILY`
  currently just caps the damage).

## Scoped but not started
- **Voice output for the live simulator.** Persona-specific TTS voices.
  Recommended: OpenAI TTS over ElevenLabs on cost (~1–3¢ vs ~17–29¢ per
  conversation). Needs: a new `api/tts.js` following `api/claude.js`'s
  pattern; a `voice` tag added to each persona in the `everyday`/`dating`/
  `business` tracks; and — the part that's easy to get wrong — gating
  `simBeginLiveTurn()`'s mic-open behind the voice line's `audio.onended`,
  otherwise the mic listens while the AI is still talking and both the
  transcript and the "hear yourself back" recording pick up the AI's own
  voice.
