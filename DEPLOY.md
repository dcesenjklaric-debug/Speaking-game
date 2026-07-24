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
   - `ANTHROPIC_API_KEY` — a key from console.anthropic.com (make a **separate** key just for this, so you can revoke it without touching your personal one)
   - `DAILY_LIMIT` — optional, free coachings per visitor per day (default 25)
   - `COACH_MODEL` — optional, defaults to `claude-opus-4-8`; set `claude-haiku-4-5` if you want the public tier ~5× cheaper
4. Deploy. Open the site — the ⚙️ settings key is now optional for visitors.

## Protect your wallet

- In **console.anthropic.com → Settings → Limits**, set a monthly spend cap. This is the real safety net — the per-IP daily limit in the proxy is best-effort only (serverless memory resets).
- Each coaching costs roughly 1–3¢ on Opus, ~0.3¢ on Haiku. Simulator replies are a fraction of that.
- If costs ever spike, revoke the key in the console; the game degrades gracefully to copy-paste coaching.

## Never do

- Never put an API key anywhere in `index.html` — everything in that file is public.
- Never commit a key to the repo. The env var is the only place it should exist.
