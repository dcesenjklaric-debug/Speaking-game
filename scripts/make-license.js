/* Mint a licence key for someone who has paid.
 *
 *   LICENSE_SECRET=<your secret> node scripts/make-license.js            # 1 month
 *   LICENSE_SECRET=<your secret> node scripts/make-license.js 12         # 12 months
 *   LICENSE_SECRET=<your secret> node scripts/make-license.js 1 ada@x.com
 *
 * Run this on YOUR machine, never on the site. The secret must match the
 * LICENSE_SECRET set in Vercel, otherwise the key will not verify.
 *
 * Keep a note of which key went to which customer — the id is printed so you can
 * match a key to a buyer later, e.g. if one gets shared around and you want to
 * stop honouring it (rotate LICENSE_SECRET and reissue).
 */
import crypto from "node:crypto";
import { signLicense, verifyLicense } from "../lib/license.js";

const secret = process.env.LICENSE_SECRET;
if (!secret) {
  console.error("Set LICENSE_SECRET first. To generate one:\n  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  process.exit(1);
}
if (secret.length < 24) {
  console.error("LICENSE_SECRET is too short to be safe — use at least 32 random characters.");
  process.exit(1);
}

const months = Math.max(1, Math.min(120, parseInt(process.argv[2] || "1", 10)));
const note = process.argv[3] || "";

const until = new Date();
until.setUTCMonth(until.getUTCMonth() + months);

const payload = { i: crypto.randomBytes(5).toString("hex"), e: until.toISOString().slice(0, 10) };
const key = signLicense(payload, secret);

// prove it round-trips before handing it to a paying customer
if (!verifyLicense(key, secret)) {
  console.error("Generated a key that does not verify — refusing to issue it.");
  process.exit(1);
}

console.log("\n  licence : " + key);
console.log("  id      : " + payload.i + (note ? "   (" + note + ")" : ""));
console.log("  expires : " + payload.e);
console.log("\n  Send the licence line to the customer. Record the id against their name.\n");
