# Decisions

Real choices with a tradeoff, newest first. If you're about to redo one of
these differently, read the reasoning first — it may already have been tried.

## Paywall is enforced only in `api/claude.js`, never in the browser
A client-side check is not a paywall — anyone can edit `localStorage` or watch
the network tab. The server decides entitlement on every call and returns
`402` when the free allowance is gone; the client only *reacts* to that. Local
delivery scoring (pace/fillers/tone/stamina) stays free and unlimited, both
because it costs nothing and because it runs entirely client-side and
couldn't be enforced anyway.
See [[api]] for the request/response shape.

## Free tier is a *daily* allowance (3/day), not a lifetime cap
Considered "3 rounds total, ever." Rejected: a lifetime cap permanently locks
out anyone who doesn't pay on day one and never comes back, which kills the
return-visits that make an app spreadable. A daily reset keeps free users
returning, which matters more than squeezing early conversions.

## Licence keys are self-contained and HMAC-signed, not looked up in a database
`lib/license.js` signs `{i, e}` (id, expiry) and verifies the signature
server-side with `LICENSE_SECRET`. No database needed to check a key is real.
Tradeoff accepted: this cannot detect or prevent one customer sharing their key
— `PRO_DAILY` caps the damage (200/day) but doesn't stop it. Proper fix is
accounts + a database; deferred until manual fulfillment (you mint each key by
hand) actually becomes painful.

## Recommended Paddle/Lemon Squeezy over raw Stripe for checkout
Both are merchant-of-record: they handle international VAT so the owner isn't
personally liable for sales tax in every country a subscription sells into.
Raw Stripe would put that burden on the owner directly.

## Pricing: €4.99/month
Anchored to comparable consumer AI-practice apps (Duolingo Max, Grammarly,
$5–15/mo range) and to actual per-call cost (~1–3¢/coaching call per
`DEPLOY.md`), which €4.99/mo comfortably covers even for a heavy user.

## Sound cues never play while the microphone is live
`sfx.play()` hard-guards on `round.phase === "speak"` and on the simulator's
live-turn state. A synthesized chime is a pure, steady pitch — exactly what
the tone-variation score measures — so playing one during a speech would both
corrupt that score and risk being transcribed as part of the answer. Every
cue fires at a phase boundary instead (prep countdown's last 3s, go, done,
grade, badge).

## "On topic" scoring: real subject tags, not free points for topicless modes
`topicScore()` used to award `words/60 × 25` (a free 25/25 for any 60+ words)
whenever a round passed `topic: null` — Small Talk Drill, Real-Life Prep,
Weakness Drill, Daily Challenge all did this, inflating scores by up to a full
grade band. Fix: Daily Challenge scenarios and the two AI-generated modes now
carry a real subject where one exists (a few keywords a good answer would
actually contain). Small Talk Drill has no real subject (it trains a
technique, not a topic) and stays intentionally unmeasured — the component
drops out and the total rescales, the same way Tone already does without mic
audio, rather than inventing a fake topic that would falsely penalize good
answers.

## Home layout ported from the mockup — scope was explicitly narrowed twice
First pass: only the Quick Rounds card layout changed (chips, artwork,
one-row grid), because the user's instruction was "just change the layout of
the games, keep the background and gamemodes the same." Second pass, after
the user clarified they'd meant the whole page: nav → capsule pill, hero
simplified, Deep Practice cards got line-icon art, stats moved from the
topbar into a progress strip at the foot of the home screen. **Background and
all four game modes were never touched in either pass** — that constraint held
across both instructions.

## Marketing beachhead: public speaking / Toastmasters first, not a broad push
Toastmasters' "Table Topics" exercise (random prompt, unprepared 1–2 min
speech, feedback) is structurally identical to the Quick Rounds loop — this
audience doesn't need the concept explained. Career/interview prep (maps to
"Prep for Real Life") is the secondary paying audience. Dating/small-talk is
treated as a short-form-video content wedge (TikTok/Reels), not a primary
revenue target — that angle also carries "AI pickup app" backlash risk (see
the 2023 "Rizz app" reception) that public-speaking framing avoids.
