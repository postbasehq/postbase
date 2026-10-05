import { needsReconnect } from "@/lib/channel-health";

export type PostErrorFix = "reconnect" | "retry" | "edit";

export const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

/**
 * A failed delivery's error in plain words, plus what fixes it. Platforms
 * return codes and policy links; people need to know what happened and what to
 * do. Our own adapter messages are already readable, so they pass through.
 */
export function explainPostError(
  error: string | null | undefined,
  platform?: string | null,
): { text: string; fix: PostErrorFix } {
  const e = error ?? "";
  const name = PLATFORM_LABEL[platform ?? ""] ?? platform ?? "The platform";

  if (!e) return { text: "Delivery failed.", fix: "retry" };
  if (needsReconnect(e)) {
    return { text: `${name} stopped accepting Postbase’s access. Reconnect it, then retry.`, fix: "reconnect" };
  }
  if (/unaudited_client_can_only_post_to_private_accounts/i.test(e)) {
    return {
      text: "TikTok only lets Postbase post to private accounts until our TikTok review is complete. Set your TikTok account to private to post now.",
      fix: "retry",
    };
  }
  if (/spam_risk_too_many_posts/i.test(e)) {
    return { text: "This TikTok account hit TikTok’s daily posting limit. Retry tomorrow.", fix: "retry" };
  }
  if (/spam_risk_user_banned_from_posting/i.test(e)) {
    return { text: "TikTok has blocked this account from posting. Check the TikTok app for details.", fix: "retry" };
  }
  if (/reached_active_user_cap/i.test(e)) {
    return { text: "TikTok’s daily limit for Postbase was reached. Retry tomorrow.", fix: "retry" };
  }
  if (/privacy_level_option_mismatch/i.test(e)) {
    return { text: "That TikTok privacy option isn’t available for this account. Edit the post and pick another.", fix: "edit" };
  }
  if (/url_ownership_unverified/i.test(e)) {
    return { text: "TikTok couldn’t fetch the photos. Retry, or post a video instead.", fix: "retry" };
  }
  if (/\b429\b|rate.?limit|too many requests/i.test(e)) {
    return { text: `${name} is limiting how fast posts go out. Retry in a few minutes.`, fix: "retry" };
  }
  // Raw platform text sometimes carries a policy URL; it isn't actionable.
  return { text: e.replace(/\s*https?:\/\/\S+/g, "").trim() || "Delivery failed.", fix: "retry" };
}
