import { count, type CountRule } from "@/lib/char-count";

/*
 * What each network will actually accept and send, checked before a post is
 * scheduled — in the composer (live notes), the composer's server actions, and
 * the public API / MCP / agent (lib/api-core). Mirrors lib/publish/adapters.ts:
 * anything an adapter would reject is an error; anything it would quietly drop
 * or trim is an info note, so nothing changes without the user seeing it.
 * Pure (no server imports): safe for client components.
 */

export type MediaRef = { type: string };

/** Most posts in a thread (the composer's own cap). */
export const MAX_PARTS = 25;
export type Check = { level: "error" | "info"; text: string };

type TextShape =
  | "thread" // each part is its own post (a reply chain)
  | "lead+comment" // first part is the post, the rest a first comment
  | "caption"; // all parts folded into one caption
type Rules = {
  label: string;
  limit: number;
  rule: CountRule;
  shape: TextShape;
  /** How parts are joined when folded into a caption (matches the adapter). */
  join?: string;
  maxImages: number;
  video: "alone" | "first" | "dropped" | "required";
  needsMedia?: boolean;
};

const RULES: Record<string, Rules> = {
  x: { label: "X", limit: 280, rule: "x", shape: "thread", maxImages: 4, video: "alone" },
  bluesky: { label: "Bluesky", limit: 300, rule: "graphemes", shape: "thread", maxImages: 4, video: "dropped" },
  mastodon: { label: "Mastodon", limit: 500, rule: "mastodon", shape: "thread", maxImages: 4, video: "alone" },
  linkedin: { label: "LinkedIn", limit: 3000, rule: "codepoints", shape: "lead+comment", maxImages: 20, video: "dropped" },
  instagram: { label: "Instagram", limit: 2200, rule: "codepoints", shape: "caption", join: "\n\n", maxImages: 10, video: "first", needsMedia: true },
  facebook: { label: "Facebook", limit: 63206, rule: "codepoints", shape: "caption", join: "\n\n", maxImages: 10, video: "first" },
  tiktok: { label: "TikTok", limit: 2200, rule: "codepoints", shape: "caption", join: " ", maxImages: 35, video: "first", needsMedia: true },
  youtube: { label: "YouTube", limit: 5000, rule: "codepoints", shape: "caption", join: "\n\n", maxImages: 0, video: "required" },
};

export function platformLabel(platform: string): string {
  return RULES[platform]?.label ?? platform;
}

/** Characters a piece of text uses on a network, counted the way it counts. */
export function charCount(platform: string, text: string): number {
  return count(text, RULES[platform]?.rule ?? "codepoints");
}

export function charLimit(platform: string): number | null {
  return RULES[platform]?.limit ?? null;
}

/**
 * Checks for one network. `parts` is what this channel will send (the thread,
 * or a per-channel variant as a single part); media rides on the first post.
 */
export function checkForPlatform(platform: string, parts: string[], media: MediaRef[]): Check[] {
  const r = RULES[platform];
  if (!r) return [];
  const out: Check[] = [];
  const text = parts.map((t) => t.trim()).filter(Boolean);

  // Bound the work before counting: this runs on the server for every
  // scheduled post, and network-accurate counting (URL matching, grapheme
  // segmentation) gets slow on huge or hostile input. Nothing this long can
  // fit any network, so say so without counting it.
  if (text.length > MAX_PARTS) {
    out.push({ level: "error", text: `Threads can have up to ${MAX_PARTS} posts` });
    return out;
  }
  const hardCap = Math.max(r.limit * 8, 4000);
  if (text.some((t) => t.length > hardCap) || (r.shape === "caption" && text.join("").length > hardCap)) {
    out.push({ level: "error", text: `Far over the ${r.limit.toLocaleString()} character limit` });
    return out;
  }

  // Length, counted the network's way.
  if (r.shape === "caption") {
    const over = charCount(platform, text.join(r.join ?? "\n\n")) - r.limit;
    if (over > 0) out.push({ level: "error", text: `Caption is ${over} over ${r.limit.toLocaleString()}` });
    if (text.length > 1) out.push({ level: "info", text: "Extra posts are added to the post text" });
  } else {
    text.forEach((t, i) => {
      const over = charCount(platform, t) - r.limit;
      if (over <= 0) return;
      const what = r.shape === "lead+comment" && i > 0 ? "The first comment" : text.length > 1 ? `Post ${i + 1}` : "This post";
      out.push({ level: "error", text: `${what} is ${over} over ${r.limit.toLocaleString()}` });
    });
    if (r.shape === "lead+comment" && text.length > 1) out.push({ level: "info", text: "Extra posts publish as a first comment" });
  }

  // Media, as the adapter will handle it.
  const images = media.filter((m) => m.type.startsWith("image/"));
  const videos = media.filter((m) => m.type.startsWith("video/"));
  const gifs = images.filter((m) => m.type === "image/gif");

  if (r.video === "required") {
    if (videos.length === 0) out.push({ level: "error", text: "Needs a video" });
    else if (videos.length > 1 || images.length) out.push({ level: "info", text: "Only the first video is uploaded" });
    return out;
  }
  if (r.needsMedia && media.length === 0) {
    out.push({ level: "error", text: platform === "tiktok" ? "Needs a video or images" : "Needs an image or video" });
    return out;
  }

  if (r.video === "alone") {
    if (videos.length && media.length > 1) out.push({ level: "error", text: `${r.label} can't mix a video with other media` });
    else if (gifs.length && media.length > 1) out.push({ level: "error", text: `${r.label} can't mix a GIF with other media` });
    else if (images.length > r.maxImages) {
      // X rejects the post; Mastodon's adapter would quietly send the first 4.
      out.push(
        platform === "x"
          ? { level: "error", text: `X allows up to ${r.maxImages} images` }
          : { level: "info", text: `Only the first ${r.maxImages} images are posted` },
      );
    }
  } else if (r.video === "dropped") {
    if (videos.length) out.push({ level: "info", text: `Videos aren't posted to ${r.label}${images.length ? ", only the images" : ""}` });
    if (images.length > r.maxImages) out.push({ level: "info", text: `Only the first ${r.maxImages} images are posted` });
  } else if (r.video === "first") {
    if (videos.length && (images.length || videos.length > 1)) out.push({ level: "info", text: "Posts the first video only" });
    else if (images.length > r.maxImages) out.push({ level: "info", text: `Only the first ${r.maxImages} images are posted` });
    if (platform === "tiktok" && media.length && !videos.length) out.push({ level: "info", text: "Posts as a photo carousel" });
  }
  return out;
}

/**
 * Server-side gate for scheduling: the first blocking problem across the
 * channels, as a sentence, or null. Drafts aren't checked.
 */
export function firstBlockingProblem(
  targets: { platform: string; parts: string[] }[],
  media: MediaRef[],
): string | null {
  // Many channels on one network usually send the same text: check each
  // network + text combination once.
  const seen = new Set<string>();
  for (const t of targets) {
    const key = `${t.platform}\u0000${t.parts.join("\u0001")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const err = checkForPlatform(t.platform, t.parts, media).find((c) => c.level === "error");
    if (err) return `${platformLabel(t.platform)}: ${err.text}.`;
  }
  return null;
}

/** Scheduled times more than this far in the past are rejected (allows for clock skew and "now"). */
export const PAST_GRACE_MS = 5 * 60_000;

export function pastTimeProblem(scheduledAtIso: string | null, now = Date.now()): string | null {
  if (!scheduledAtIso) return null;
  const t = Date.parse(scheduledAtIso);
  if (Number.isNaN(t)) return "That date and time isn't valid.";
  return t < now - PAST_GRACE_MS ? "That time is in the past. Pick a time from now on." : null;
}

/**
 * TikTok's Content Sharing Guidelines, re-checked on the server: the user must
 * pick who sees the post (no default), and branded content can't be private.
 * `override` is TIKTOK_PRIVACY_LEVEL, which forces every post to that level
 * while the app is unaudited.
 */
export function tiktokSettingsProblem(
  privacy: string | null,
  options: { brandedContent?: boolean } | null,
  override?: string,
): string | null {
  if (!privacy) return "Choose who can see your TikTok post.";
  if (options?.brandedContent && (override || privacy) === "SELF_ONLY") {
    return override
      ? "TikTok posts are private for now, and branded content can't be private. Turn off branded content to post."
      : "Branded content can't be private on TikTok. Choose who can see it.";
  }
  return null;
}
