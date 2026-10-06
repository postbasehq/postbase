import { createAdminClient } from "@/lib/supabase/admin";
import { decryptJson } from "@/lib/crypto";
import { revokeAccess as revokeTikTokAccess, type TikTokTokens } from "@/lib/platforms/tiktok";
import { revokeAccess as revokeXAccess, type XTokens } from "@/lib/platforms/x";
import { revokeAccess as revokeYouTubeAccess, type YouTubeTokens } from "@/lib/platforms/youtube";
import { revokeAccess as revokeMetaAccess } from "@/lib/platforms/meta";
import { revokeAccess as revokeLinkedInAccess, type LinkedInTokens } from "@/lib/platforms/linkedin";
import { revokeAccess as revokeMastodonAccess, type MastodonTokens } from "@/lib/platforms/mastodon";

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
 * Bluesky has nothing to revoke from here: it connects with an app password,
 * which only the account owner can delete (Bluesky Settings → App passwords);
 * deleting the row discards our copy.
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
    } else if (channel.platform === "linkedin") {
      // Only when no other channel uses the same LinkedIn member: a revoke may
      // end Postbase's authorisation for that member altogether.
      if (await lastChannelForLogin(channel, ["linkedin"], goingAway)) {
        await revokeLinkedInAccess(decryptJson<LinkedInTokens>(enc).access_token);
      }
    } else if (channel.platform === "mastodon") {
      await revokeMastodonAccess(decryptJson<MastodonTokens>(enc));
    } else if (channel.platform === "instagram" || channel.platform === "facebook") {
      const t = decryptJson<{ user_access_token?: string }>(enc);
      if (t.user_access_token && (await lastChannelForLogin(channel, ["instagram", "facebook"], goingAway))) {
        await revokeMetaAccess(t.user_access_token);
      }
    }
  } catch {
    // Best-effort: a network refusing the revoke never blocks the removal.
  }
}

async function lastChannelForLogin(
  channel: RevocableChannel,
  platforms: string[],
  goingAway: { channelIds?: string[]; orgId?: string },
): Promise<boolean> {
  if (!channel.provider_user_id) return false;
  let q = createAdminClient()
    .from("channels")
    .select("id", { count: "exact", head: true })
    .eq("provider_user_id", channel.provider_user_id)
    .in("platform", platforms)
    .not("id", "in", `(${[channel.id, ...(goingAway.channelIds ?? [])].join(",")})`);
  if (goingAway.orgId) q = q.neq("org_id", goingAway.orgId);
  const { count, error } = await q;
  return !error && count === 0;
}
