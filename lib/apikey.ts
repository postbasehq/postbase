import crypto from "node:crypto";

/** Generate a new plaintext API key. Shown to the user once; only its hash is stored. */
export function generateApiKey(): string {
  return "pb_live_" + crypto.randomBytes(24).toString("base64url");
}

/**
 * Hash an API key for storage/lookup. The key is high-entropy, so a fast hash is
 * appropriate (unlike passwords). Uses HMAC with API_KEY_PEPPER when set.
 */
export function hashApiKey(key: string): string {
  const pepper = process.env.API_KEY_PEPPER;
  return pepper
    ? crypto.createHmac("sha256", pepper).update(key).digest("hex")
    : crypto.createHash("sha256").update(key).digest("hex");
}

/** A masked preview for display, e.g. "pb_live_…a1b2". */
export function maskApiKey(key: string): string {
  return `pb_live_…${key.slice(-4)}`;
}
