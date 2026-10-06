import { createAdminClient } from "@/lib/supabase/admin";
import { decryptJson } from "@/lib/crypto";
import { revokeAccess as revokeTikTokAccess, type TikTokTokens } from "@/lib/platforms/tiktok";
import { revokeAccess as revokeXAccess, type XTokens } from "@/lib/platforms/x";
import { revokeAccess as revokeYouTubeAccess, type YouTubeTokens } from "@/lib/platforms/youtube";
import { revokeAccess as revokeMetaAccess } from "@/lib/platforms/meta";

export type RevocableChannel = {
  id: string;
  org_id: string;
  platform: string;
  encrypted_tokens: string | null;
  provider_user_id: string | null;
};

/**
 * Revoke Postbase's access on the network's side before a channel row goes
 * (disconnect, workspace or account deletion), so removing it truly
 * de-authorises Postbase rather than just deleting our copy of the token.
 * Best-effort: never throws.
 *
 * Meta's revoke removes Postbase from the whole Facebook login, which would
 * break every other Instagram account or Page connected through it, so it only
 * runs when no channel outside `goingAway` still uses that login.
 */
export async function revokeChannelAccess(
  channel: RevocableChannel,
  goingAway: { channelIds?: string[]; orgId?: string } = {},
): Promise<void> {
  const enc = channel.encrypted_tokens;
  if (!enc) return;
  try {
    if (channel.platform === "tiktok") {
      await revokeTikTokAccess(decryptJson<TikTokTokens>(enc).access_token);
    } else if (channel.platform === "x") {
      await revokeXAccess(decryptJson<XTokens>(enc).access_token);
    } else if (channel.platform === "youtube") {
      const t = decryptJson<YouTubeTokens>(enc);
      await revokeYouTubeAccess(t.refresh_token ?? t.access_token);
    } else if (channel.platform === "instagram" || channel.platform === "facebook") {
      const t = decryptJson<{ user_access_token?: string }>(enc);
      if (t.user_access_token && (await lastMetaChannel(channel, goingAway))) {
        await revokeMetaAccess(t.user_access_token);
      }
    }
  } catch {
    // Best-effort: a network refusing the revoke never blocks the removal.
  }
}

async function lastMetaChannel(channel: RevocableChannel, goingAway: { channelIds?: string[]; orgId?: string }): Promise<boolean> {
  if (!channel.provider_user_id) return false;
  let q = createAdminClient()
    .from("channels")
    .select("id", { count: "exact", head: true })
    .eq("provider_user_id", channel.provider_user_id)
    .in("platform", ["instagram", "facebook"])
    .not("id", "in", `(${[channel.id, ...(goingAway.channelIds ?? [])].join(",")})`);
  if (goingAway.orgId) q = q.neq("org_id", goingAway.orgId);
  const { count, error } = await q;
  return !error && count === 0;
}
