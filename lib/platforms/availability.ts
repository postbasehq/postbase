/**
 * Platforms whose publishing is built but can't be connected yet (waiting on
 * the platform's app review). Shown as "Awaiting approval" with a "Notify me"
 * button in Channels; already-connected accounts keep working. Delete the entry
 * once approved.
 */
export const COMING_SOON: Record<string, string> = {
  instagram: "Waiting on Meta’s app review. We’ll email you the day it opens.",
  facebook: "Waiting on Meta’s app review. We’ll email you the day it opens.",
};

/**
 * Platforms not built yet, shown as "Coming soon" with "Notify me". Unlike
 * COMING_SOON there's nothing to connect, so early access doesn't unlock them.
 */
export const IN_DEVELOPMENT: Record<string, string> = {
  threads: "We’re building it. We’ll email you when it’s ready.",
};

/**
 * Platforms that connect and post, but with a limit until an audit passes.
 * TikTok: posts go out private (SELF_ONLY) until the Direct Post audit clears.
 */
export const LIMITED: Record<string, string> = {
  tiktok: "Posts go out as private (only you can see them) until TikTok approves public posting.",
};

/**
 * Marketing/docs caveat while TikTok is LIMITED (private-only). Returns "" once
 * the LIMITED.tiktok entry is deleted, so every caveat disappears with it.
 */
export function tiktokCaveat(text = " (TikTok posts are private for now, until TikTok approves public posting)"): string {
  return "tiktok" in LIMITED ? text : "";
}

/** Platforms people can join the waitlist for (matches the DB check). */
export const WAITLIST_PLATFORMS = ["instagram", "facebook", "threads", "tiktok"] as const;

/**
 * Accounts let through the review gate early: emails also added as testers in
 * the Meta app, where an unreviewed app works for them. Comma-separated env.
 */
export function hasEarlyAccess(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.EARLY_ACCESS_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
