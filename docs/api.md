# API

Both endpoints are Vercel serverless functions using ESM `import`
(`package.json` sets `"type": "module"` — see [[lessons]] for what that
implies for any *other* `.js` file added to the repo).

## `POST /api/claude`
The only path to the AI coach, content generation, and the simulator. Also
where the paywall is enforced — see [[decisions]].

**Request headers:** `x-qw-license` (optional) — a licence key string.

**Request body:** `{ system, messages, maxTokens, thinking }` — `messages` is
capped at 60 entries / 40,000 total characters, `system` at 25,000 characters.
`model` is never accepted from the client — it's pinned server-side
(`COACH_MODEL` env, default `claude-opus-4-8`).

**Responses:**
| Status | Meaning |
|---|---|
| 200 | `{ text, pro, freeLeft }` — `freeLeft` is `null` for Pro callers |
| 402 | Free daily allowance spent. `{ error, paywall:true, free, upgradeUrl }` — client shows the paywall modal |
| 429 | A *licensed* caller hit `PRO_DAILY` (likely a shared key), or Anthropic itself rate-limited |
| 400 | Malformed request shape (does not consume a round — quota is checked before validation runs) |
| 500 / 502 | Server misconfigured / upstream failure (also does not consume a round — refunded if it was already taken) |

**`GET /api/claude`** — health probe the client uses to detect the proxy.
Returns `{ ok:true, free: FREE_DAILY, upgradeUrl }`.

## `POST /api/license`
**Request:** `{ key }` (or `x-qw-license` header).
**Response:** `{ pro:false }` or `{ pro:true, expires:"YYYY-MM-DD" }`. Never
returns the secret or any other licence internals — safe to call from anywhere
without additional protection (see [[lessons]]'s note on this being an
unrated but low-value oracle: brute-forcing HMAC-SHA256 is infeasible).

## Licence key format
`lib/license.js`: `QW.<base64url(JSON payload)>.<base64url(HMAC-SHA256 sig)>`.
Payload is `{i: "<random id>", e: "YYYY-MM-DD"}`. Separator is `.` —
**do not change this to `-`**, base64url's alphabet includes `-` and that
exact mistake once broke ~49% of minted keys (see [[lessons]]).
Expiry is mandatory; a key with no expiry is rejected, not treated as
perpetual.

## Environment variables
| Name | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Billed for every AI call |
| `LICENSE_SECRET` | yes, for Pro | Signs/verifies licence keys. Never commit. Rotating it invalidates every issued key. |
| `UPGRADE_URL` | for selling | Checkout link shown in the paywall |
| `FREE_DAILY` | no (default 3) | Free AI rounds/day/IP |
| `PRO_DAILY` | no (default 200) | AI rounds/day/licence — caps damage if a key is shared |
| `COACH_MODEL` | no (default `claude-opus-4-8`) | Model used for every call |

## Minting a licence
Run on your own machine, never on the server:
```bash
LICENSE_SECRET=<same value as in Vercel> node scripts/make-license.js 1 buyer@example.com
```
First arg is months (default 1), second is a free-text note for your own
records. The script verifies its own output before printing — if it can't
mint a key that round-trips, it refuses rather than issuing a dead one.
