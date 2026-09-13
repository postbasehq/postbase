import { createAdminClient } from "@/lib/supabase/admin";
import { decryptJson } from "@/lib/crypto";
import { getTweetMetrics } from "@/lib/platforms/x";
import { getMediaInsights } from "@/lib/platforms/meta";
import { getSocialActions } from "@/lib/platforms/linkedin";
import { getVideoMetrics } from "@/lib/platforms/tiktok";

/**
 * Metrics collector — refreshes normalized engagement metrics for recently
 * published targets, on a cadence, bounded to keep API reads (esp. X, which are
 * metered) cheap. Called by the cron poller alongside publishing.
 */

const STALE_HOURS = 6; // refresh a target's metrics at most this often
const WINDOW_DAYS = 14; // only chase metrics for posts this recent
const BATCH = 25; // targets refreshed per run

type Row = {
  id: string;
  platform_post_id: string | null;
  channels: { platform: string; encrypted_tokens: string | null } | null;
};

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
    .select("id, platform_post_id, channels(platform, encrypted_tokens), posts!inner(scheduled_at)")
    .eq("status", "published")
    .not("platform_post_id", "is", null)
    .gte("posts.scheduled_at", sinceIso)
    .or(`metrics_updated_at.is.null,metrics_updated_at.lt.${staleIso}`)
    .limit(BATCH);

  const rows = (data ?? []) as unknown as Row[];
  const now = new Date().toISOString();
  let refreshed = 0;

  for (const r of rows) {
    const platform = r.channels?.platform;
    const enc = r.channels?.encrypted_tokens;
    if (!platform || !enc || !r.platform_post_id) {
      await db.from("post_targets").update({ metrics_updated_at: now }).eq("id", r.id);
      continue;
    }
    try {
      const { access_token } = decryptJson<{ access_token: string }>(enc);
      const metrics = await fetchMetrics(platform, access_token, r.platform_post_id);
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
