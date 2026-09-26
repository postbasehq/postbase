import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limit backed by Postgres (`rate_limit_hit`, migration 0031).
 * Returns true while `key` is within `limit` hits per `windowSeconds`.
 * Fails closed (logs) if the limiter itself errors: these limits guard paid
 * model calls, so an unknown state must not become unlimited spend.
 */
export async function rateLimit(key: string, windowSeconds: number, limit: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) {
    console.error(`[rate-limit] ${key}: ${error.message}`);
    return false;
  }
  return data === true;
}

/** Caller IP (Vercel sets x-forwarded-for), hashed so raw IPs are never stored. */
export function clientKey(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
