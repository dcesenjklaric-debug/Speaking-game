/* Quick Wit — license keys.
 *
 * A key is self-contained and signed, so the server can verify it without a
 * database: the payload travels inside the key and the HMAC proves the server
 * minted it. Nobody can forge one without LICENSE_SECRET.
 *
 *   QW.<base64url(payload)>.<base64url(hmac-sha256)>
 *   payload = { i: "<short id>", e: "YYYY-MM-DD" }   (id, expiry)
 *
 * The separator is "." and NOT "-": base64url's alphabet contains "-", so a
 * "-" separator made the split ambiguous and ~49% of minted keys failed to
 * verify (the greedy match swallowed part of the signature). "." is outside
 * the alphabet, so the three fields are always unambiguous.
 *
 * What this DOES stop: forged keys, edited expiry dates, client-side tampering.
 * What it does NOT stop: one buyer sharing their key with the world. That needs
 * per-key rate limiting (api/claude.js does this) and, to fix properly,
 * accounts plus a database.
 */
import crypto from "node:crypto";

const enc = (buf) => Buffer.from(buf).toString("base64url");
const dec = (s) => Buffer.from(s, "base64url");

const KEY_RE = /^QW\.([A-Za-z0-9_-]{1,512})\.([A-Za-z0-9_-]{1,128})$/;

export function signLicense(payload, secret) {
  if (!secret) throw new Error("LICENSE_SECRET is required to mint a key");
  if (!payload || typeof payload.i !== "string" || !payload.i) throw new Error("payload.i is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.e || "")) throw new Error("payload.e must be YYYY-MM-DD");
  const body = enc(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(body).digest();
  return `QW.${body}.${enc(sig)}`;
}

/** Returns the payload for a valid, unexpired key, else null. Never throws. */
export function verifyLicense(key, secret) {
  if (!key || !secret || typeof key !== "string") return null;
  const m = KEY_RE.exec(key.trim());
  if (!m) return null;
  const [, body, sigPart] = m;

  let given;
  try { given = dec(sigPart); } catch { return null; }
  const expect = crypto.createHmac("sha256", secret).update(body).digest();
  // length check first: timingSafeEqual throws on a mismatch
  if (given.length !== expect.length) return null;
  if (!crypto.timingSafeEqual(given, expect)) return null;

  let payload;
  try { payload = JSON.parse(dec(body).toString("utf8")); } catch { return null; }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (typeof payload.i !== "string" || !payload.i) return null;

  // expiry is REQUIRED: a missing/empty `e` used to mean "never expires", which
  // is a footgun for a hand-minted key rather than a feature
  if (typeof payload.e !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(payload.e)) return null;
  const until = Date.parse(payload.e + "T23:59:59Z");
  if (!Number.isFinite(until) || Date.now() > until) return null;   // expired
  return payload;
}
