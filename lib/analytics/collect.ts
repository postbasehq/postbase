import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { getTweetMetrics, refreshTokens as xRefresh } from "@/lib/platforms/x";
import { getMediaInsights } from "@/lib/platforms/meta";
import { getSocialActions, refreshTokens as liRefresh } from "@/lib/platforms/linkedin";
import { getVideoMetrics, refreshTokens as ttRefresh } from "@/lib/platforms/tiktok";
import { getVideoStats, refreshTokens as ytRefresh } from "@/lib/platforms/youtube";

/**
 * Metrics collector — refreshes normalized engagement metrics for recently
 * published targets, on a cadence, bounded to keep API reads (esp. X, which are
 * metered) cheap. Refreshes short-lived tokens (X/TikTok/LinkedIn) as needed.
 * Called by the cron poller alongside publishing; best-effort.
 */

const STALE_HOURS = 6;
const WINDOW_DAYS = 14;
const BATCH = 25;

type Channel = {
  id: string;
  platform: string;
  encrypted_tokens: string | null;
  token_expiry: string | null;
};
type Row = { id: string; platform_post_id: string | null; channels: Channel | null };
type Tokens = { access_token: string; refresh_token?: string };

function isExpiring(iso: string | null): boolean {
  return iso ? Date.now() >= Date.parse(iso) - 120_000 : false;
}

/** Return a valid access token, refreshing + persisting short-lived ones if needed. */
async function ensureToken(db: SupabaseClient, ch: Channel, tokens: Tokens): Promise<string> {
  // Instagram/Facebook Page tokens are long-lived — no refresh.
  if (ch.platform === "instagram" || !tokens.refresh_token || !isExpiring(ch.token_expiry)) {
    return tokens.access_token;
  }
  let refreshed: { access_token?: string; refresh_token?: string; expires_in?: number };
  try {
    if (ch.platform === "x") refreshed = await xRefresh(tokens.refresh_token);
    else if (ch.platform === "tiktok") refreshed = await ttRefresh(tokens.refresh_token);
    else if (ch.platform === "linkedin") refreshed = await liRefresh(tokens.refresh_token);
    else if (ch.platform === "youtube") refreshed = await ytRefresh(tokens.refresh_token);
    else return tokens.access_token;
  } catch {
    return tokens.access_token; // fall back; the read may still work or fail gracefully
  }
  if (!refreshed.access_token) return tokens.access_token;
  const next = {
    ...tokens,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? tokens.refresh_token,
  };
  await db
    .from("channels")
    .update({
      encrypted_tokens: encryptJson(next),
      token_expiry: refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : null,
    })
    .eq("id", ch.id);
  return next.access_token;
}

async function fetchMetrics(
  platform: string,
  token: string,
  postId: string,
): Promise<Record<string, number>> {
  switch (platform) {
    case "x":
      return getTweetMetrics(token, postId);
    case "instagram":
      return getMediaInsights(token, postId);
    case "linkedin":
      return getSocialActions(token, postId);
    case "tiktok":
      return getVideoMetrics(token, postId);
    case "youtube":
      return getVideoStats(token, postId);
    default:
      throw new Error(`No metrics collector for ${platform}`);
  }
}

export async function refreshMetrics(): Promise<{ refreshed: number }> {
  const db = createAdminClient();
  const staleIso = new Date(Date.now() - STALE_HOURS * 3600_000).toISOString();
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();

  const { data } = await db
    .from("post_targets")
    .select(
      "id, platform_post_id, channels(id, platform, encrypted_tokens, token_expiry), posts!inner(scheduled_at)",
    )
    .eq("status", "published")
    .not("platform_post_id", "is", null)
    .gte("posts.scheduled_at", sinceIso)
    .or(`metrics_updated_at.is.null,metrics_updated_at.lt.${staleIso}`)
    .limit(BATCH);

  const rows = (data ?? []) as unknown as Row[];
  const now = new Date().toISOString();
  let refreshed = 0;

  for (const r of rows) {
    const ch = r.channels;
    if (!ch?.platform || !ch.encrypted_tokens || !r.platform_post_id) {
      await db.from("post_targets").update({ metrics_updated_at: now }).eq("id", r.id);
      continue;
    }
    try {
      const tokens = decryptJson<Tokens>(ch.encrypted_tokens);
      const token = await ensureToken(db, ch, tokens);
      const metrics = await fetchMetrics(ch.platform, token, r.platform_post_id);
      await db.from("post_targets").update({ metrics, metrics_updated_at: now }).eq("id", r.id);
      refreshed++;
    } catch {
      // Unavailable (missing scope, restricted API, expired token) — mark checked
      // so we don't hammer it before the next cadence.
      await db.from("post_targets").update({ metrics_updated_at: now }).eq("id", r.id);
    }
  }

  return { refreshed };
}
