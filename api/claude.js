/* Quick Wit — serverless Claude proxy + paywall (Vercel)
 *
 * Every AI feature in the game routes through here, so this is the only place a
 * paywall can actually be enforced. The browser is not trusted for anything: the
 * free-round counter in localStorage is cosmetic, and this function decides
 * independently whether a request is allowed.
 *
 * Setup on Vercel (see DEPLOY.md):
 *   ANTHROPIC_API_KEY  (required)  your key from console.anthropic.com
 *   LICENSE_SECRET     (required)  long random string; signs and verifies licenses
 *   COACH_MODEL        (optional)  defaults to claude-opus-4-8
 *   FREE_DAILY         (optional)  free AI rounds per visitor per day, default 3
 *   PRO_DAILY          (optional)  AI rounds per licence per day, default 200
 *   UPGRADE_URL        (optional)  where the paywall sends people to subscribe
 */

import { verifyLicense } from "../lib/license.js";

const FREE_DAILY = parseInt(process.env.FREE_DAILY || "3", 10);
const PRO_DAILY = parseInt(process.env.PRO_DAILY || "200", 10);
const MODEL = process.env.COACH_MODEL || "claude-opus-4-8";
const UPGRADE_URL = process.env.UPGRADE_URL || "";

/* Identify the caller for rate limiting.
 *
 * NEVER trust the left-most x-forwarded-for entry: that element is supplied by
 * the client, so a caller can mint a fresh identity per request and bypass the
 * limit entirely. The right-most entry is the one appended by the proxy nearest
 * us, and Vercel sets x-real-ip itself, so those are the trustworthy sources. */
function clientIp(req) {
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  const real = first(req.headers["x-real-ip"]);
  if (real) return String(real).trim();
  const xff = first(req.headers["x-forwarded-for"]);
  if (xff) {
    const parts = String(xff).split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];   // right-most, not left
  }
  return req.socket?.remoteAddress || "unknown";
}

/* Best-effort daily counter. Serverless instances are ephemeral and Vercel runs
 * many of them, so the true ceiling is FREE_DAILY × live instances — this is a
 * speed bump, not a guarantee. The hard monthly spend cap in the Anthropic
 * console is the real protection. Moving this to Vercel KV would make it exact.
 * Licences are counted separately so a shared key hits its own ceiling instead
 * of costing you once per person holding it. */
const usage = new Map();
const MAX_BUCKETS = 10000;

function prune(today) {
  // Evict stale days first. A blanket .clear() would let anyone with a few
  // thousand requests wipe every counter, including paying customers'.
  for (const [k, v] of usage) {
    if (v.day !== today) usage.delete(k);
    if (usage.size <= MAX_BUCKETS) break;
  }
  while (usage.size > MAX_BUCKETS) usage.delete(usage.keys().next().value);
}

function peek(bucket, limit) {
  const today = new Date().toISOString().slice(0, 10);
  const rec = usage.get(bucket);
  const used = rec && rec.day === today ? rec.count : 0;
  return { ok: used < limit, used, today };
}

function take(bucket, limit) {
  const { today } = peek(bucket, limit);
  const rec = usage.get(bucket);
  if (!rec || rec.day !== today) {
    usage.set(bucket, { day: today, count: 1 });
    if (usage.size > MAX_BUCKETS) prune(today);
    return { used: 1 };
  }
  rec.count++;
  return { used: rec.count };
}

function refund(bucket) {
  const rec = usage.get(bucket);
  if (rec && rec.count > 0) rec.count--;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    // the game probes this on load to detect the proxy
    return res.status(200).json({ ok: true, free: FREE_DAILY, upgradeUrl: UPGRADE_URL });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is missing its API key" });
  }

  // ---- who is calling ----------------------------------------------------
  const licenseKey = req.headers["x-qw-license"];
  const lic = verifyLicense(
    Array.isArray(licenseKey) ? licenseKey[0] : licenseKey,
    process.env.LICENSE_SECRET
  );
  const pro = !!lic;
  const bucket = pro ? "lic:" + lic.i : "ip:" + clientIp(req);
  const limit = pro ? PRO_DAILY : FREE_DAILY;

  // Check entitlement BEFORE spending it, so a malformed request or an upstream
  // failure can't burn someone's allowance.
  if (!peek(bucket, limit).ok) {
    if (pro) {
      return res.status(429).json({
        error: "That licence has hit today's limit. If this wasn't you, your key may have been shared.",
      });
    }
    return res.status(402).json({
      error: `You've used your ${FREE_DAILY} free AI rounds for today.`,
      paywall: true,
      free: FREE_DAILY,
      upgradeUrl: UPGRADE_URL,
    });
  }

  // ---- validate: this endpoint serves the game, not arbitrary API traffic ----
  const { system, messages, maxTokens, thinking } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
    return res.status(400).json({ error: "Bad request" });
  }
  let totalChars = 0;
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return res.status(400).json({ error: "Bad request" });
    }
    totalChars += m.content.length;
  }
  if (totalChars > 40000 || (system && String(system).length > 25000)) {
    return res.status(400).json({ error: "Request too large" });
  }

  const gate = take(bucket, limit);   // only now does it cost them a round

  const body = {
    model: MODEL, // model is decided HERE, never by the client
    max_tokens: Math.min(Math.max(parseInt(maxTokens, 10) || 1024, 1), 2048),
    // rebuild each message from scratch: forwarding the client's object whole
    // would let it smuggle extra fields upstream
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (system) body.system = String(system);
  if (thinking) body.thinking = { type: "adaptive" };

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const msg = (data && data.error && data.error.message) || "Upstream error";
      // don't leak account details to visitors
      const publicMsg = upstream.status === 429 ? "The coach is busy — try again in a minute." : "Coach unavailable right now.";
      console.error("Anthropic error", upstream.status, msg);
      refund(bucket);   // our failure, not theirs — don't spend their round
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: publicMsg });
    }
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const left = pro ? null : Math.max(0, FREE_DAILY - gate.used);
    return res.status(200).json({ text, pro, freeLeft: left });
  } catch (e) {
    console.error("Proxy failure", e);
    refund(bucket);
    return res.status(502).json({ error: "Coach unavailable right now." });
  }
}
