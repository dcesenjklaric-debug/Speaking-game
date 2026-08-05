/* Quick Wit — licence status check.
 *
 * The game calls this after someone pastes a key, so it can say "Pro active"
 * instead of waiting for the next AI call to find out. Verification is the same
 * HMAC check the proxy uses; this endpoint only ever reports validity, it never
 * mints keys and never returns the secret.
 */

import { verifyLicense } from "../lib/license.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = (req.body && req.body.key) || req.headers["x-qw-license"];
  const lic = verifyLicense(Array.isArray(key) ? key[0] : key, process.env.LICENSE_SECRET);

  if (!lic) return res.status(200).json({ pro: false });
  return res.status(200).json({ pro: true, expires: lic.e || null });
}
