# Publishing Quick Wit publicly

The game is one static file (`index.html`) plus one serverless function (`api/claude.js`).
Deployed on Vercel, visitors get free AI coaching through your key **without ever seeing it**.

## How the three modes work

| Situation | What powers the AI coach |
|---|---|
| You, playing locally | The key you pasted in ⚙️ Settings (stored in your browser only) |
| Public visitors on Vercel | `/api/claude` proxy → your key lives in a server env var, rate-limited per visitor |
| No key, no proxy | The 🤖 copy-paste coaching button still works for everyone |

The game auto-detects which situation it's in at load (it probes `/api/claude`).

## Steps

1. Push this folder to a GitHub repo (`index.html` at the root, `api/claude.js` as is).
2. On [vercel.com](https://vercel.com) → **Add New Project** → import the repo. No framework, no build step — accept defaults.
3. In the project's **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` — **required.** A key from console.anthropic.com (make a **separate** key just for this, so you can revoke it without touching your personal one)
   - `LICENSE_SECRET` — **required for Pro.** A long random string that signs and verifies licence keys. Generate with:
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     Never commit it. If it leaks, anyone can mint themselves unlimited Pro keys, and the only fix is rotating it — which invalidates every paying customer's key at once.
   - `UPGRADE_URL` — your checkout link (Paddle / Lemon Squeezy / Stripe). Without it the paywall shows but can't sell.
   - `FREE_DAILY` — optional, free AI rounds per visitor per day (default 3)
   - `PRO_DAILY` — optional, AI rounds per licence per day (default 200; caps the damage if a key gets shared)
   - `COACH_MODEL` — optional, defaults to `claude-opus-4-8`; set `claude-haiku-4-5` if you want the public tier ~5× cheaper

## Selling Pro

The paywall is enforced in `api/claude.js`, never in the browser. Local delivery
scoring (pace, fillers, tone, stamina) is free and unlimited because it costs
nothing and runs entirely client-side; only the AI features are metered.

When someone pays, mint them a key on **your** machine:

```bash
LICENSE_SECRET=<the same secret you set in Vercel> node scripts/make-license.js 1 buyer@example.com
```

Send them the `licence` line; they paste it into ⚙️ Settings. Record the printed
`id` against their name — that's how you'd identify a shared key later.

Fulfilment is manual by design at this stage. It's fine for the first customers
and becomes painful past a few dozen; that's the point to add accounts and a
database.
4. Deploy. Open the site — the ⚙️ settings key is now optional for visitors.

## Protect your wallet

- In **console.anthropic.com → Settings → Limits**, set a monthly spend cap. This is the real safety net — the per-IP daily limit in the proxy is best-effort only (serverless memory resets).
- Each coaching costs roughly 1–3¢ on Opus, ~0.3¢ on Haiku. Simulator replies are a fraction of that.
- If costs ever spike, revoke the key in the console; the game degrades gracefully to copy-paste coaching.

## Never do

- Never put an API key anywhere in `index.html` — everything in that file is public.
- Never commit a key to the repo. The env var is the only place it should exist.
