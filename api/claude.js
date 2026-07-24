/* Quick Wit — serverless Claude proxy (Vercel)
 *
 * Lets public visitors get AI coaching without an API key: the game calls
 * /api/claude, and this function forwards to Anthropic using the key stored
 * server-side in the ANTHROPIC_API_KEY environment variable. The key is never
 * sent to the browser.
 *
 * Setup on Vercel (see DEPLOY.md):
 *   ANTHROPIC_API_KEY  (required)  your key from console.anthropic.com
 *   COACH_MODEL        (optional)  defaults to claude-opus-4-8
 *   DAILY_LIMIT        (optional)  free requests per visitor per day, default 25
 */

const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT || "25", 10);
const MODEL = process.env.COACH_MODEL || "claude-opus-4-8";

// Best-effort per-IP daily counter. Serverless instances are ephemeral, so this
// resets whenever the instance recycles — it's a speed bump against abuse, not
// a guarantee. Set a hard monthly spend limit in the Anthropic console too.
const usage = new Map();
function rateLimited(ip) {
  const today = new Date().toISOString().slice(0, 10);
  const rec = usage.get(ip);
  if (!rec || rec.day !== today) {
    usage.set(ip, { day: today, count: 1 });
    if (usage.size > 10000) usage.clear(); // crude memory cap
    return false;
  }
  rec.count++;
  return rec.count > DAILY_LIMIT;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    // health check — the game probes this to detect the proxy
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is missing its API key" });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({
      error: "You've used today's free coaching — come back tomorrow, or add your own API key in Settings.",
    });
  }

  const { system, messages, maxTokens, thinking } = req.body || {};

  // ---- validate: this endpoint serves the game, not arbitrary API traffic ----
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

  const body = {
    model: MODEL, // model is decided HERE, never by the client
    max_tokens: Math.min(Math.max(parseInt(maxTokens, 10) || 1024, 1), 2048),
    messages,
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
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: publicMsg });
    }
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return res.status(200).json({ text });
  } catch (e) {
    console.error("Proxy failure", e);
    return res.status(502).json({ error: "Coach unavailable right now." });
  }
}
