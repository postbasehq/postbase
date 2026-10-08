import { createAdminClient } from "@/lib/supabase/admin";
import { insertPostWhole } from "@/lib/publish/save-post";
import { cancelPostForOrg, type CancelOutcome } from "@/lib/publish/cancel";
import { firstBlockingProblem, parseScheduleTime, pastTimeProblem } from "@/lib/post-validation";
import { schedulingProblem } from "@/lib/billing-guard";
import { xLinkWarningFor } from "@/lib/x-links";

/**
 * Core operations exposed to the public API / MCP server, always scoped to one org.
 * Uses the admin client (no user session on API calls), so EVERY query filters by
 * orgId explicitly — never trust the caller for tenant scope.
 */

export async function listChannels(orgId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("channels")
    .select("id, platform, handle, status")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function listPosts(orgId: string, status?: string) {
  const db = createAdminClient();
  let q = db
    .from("posts")
    .select("id, body, scheduled_at, status, post_targets(channel_id, status)")
    .eq("org_id", orgId)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return data ?? [];
}

/**
 * The workspace's media library (newest first), so an agent can pick files to
 * attach by id. Optional `type` ("image" or "video") and a name search.
 */
export async function listMedia(orgId: string, opts: { type?: string; search?: string } = {}) {
  const db = createAdminClient();
  let q = db
    .from("media_library")
    .select("id, name, type, size_bytes, url, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (opts.type === "image" || opts.type === "video") q = q.like("type", `${opts.type}/%`);
  const search = opts.search?.trim().replace(/[%_\\,()]/g, "");
  if (search) q = q.ilike("name", `%${search}%`);
  const { data } = await q;
  return data ?? [];
}

/** Most files one post can carry (the most any network takes: TikTok's 35-photo carousel). */
export const MAX_POST_MEDIA = 35;

export type CreatePostInput = {
  body?: string;
  thread?: string[];
  channelIds: string[];
  scheduledAt: string | null;
  /** Media library ids, in the order they should appear. */
  mediaIds?: string[];
  /** YouTube details; `madeForKids` is required to schedule to YouTube. */
  youtube?: { title?: string; privacy?: string; madeForKids?: boolean };
};

/** The library files for `ids`, in the caller's order, all from this workspace. */
async function mediaForPost(db: ReturnType<typeof createAdminClient>, orgId: string, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  if (unique.length > MAX_POST_MEDIA) throw new Error(`A post can carry up to ${MAX_POST_MEDIA} files`);
  const { data } = await db.from("media_library").select("id, url, type").eq("org_id", orgId).in("id", unique);
  const byId = new Map((data ?? []).map((m) => [m.id as string, m]));
  if (unique.some((id) => !byId.has(id))) {
    throw new Error("one or more media_ids aren't in this workspace's media library (see list_media)");
  }
  return unique.map((id) => ({ url: byId.get(id)!.url as string, type: byId.get(id)!.type as string }));
}

export async function createPost(orgId: string, input: CreatePostInput) {
  const db = createAdminClient();
  // A thread (array) takes precedence; otherwise the single body.
  const segments = (
    input.thread && input.thread.length ? input.thread : [input.body ?? ""]
  )
    .map((s) => String(s).trim())
    .filter(Boolean);
  const media = await mediaForPost(db, orgId, input.mediaIds ?? []);
  if (segments.length === 0 && media.length === 0) throw new Error("body (or thread) or media_ids is required");
  const body = segments[0] ?? "";
  const threadTail = segments.slice(1);

  const channelIds = (input.channelIds ?? []).filter(Boolean);
  let platforms: string[] = [];
  if (channelIds.length > 0) {
    const { data: owned } = await db
      .from("channels")
      .select("id, platform")
      .eq("org_id", orgId)
      .in("id", channelIds);
    platforms = (owned ?? []).map((c) => c.platform as string);
    const ownedIds = new Set((owned ?? []).map((c) => c.id));
    if (channelIds.some((id) => !ownedIds.has(id))) {
      throw new Error("one or more channel_ids are invalid for this workspace");
    }
  }

  const parsedAt = input.scheduledAt ? parseScheduleTime(input.scheduledAt, true) : null;
  if (parsedAt && "error" in parsedAt) throw new Error(parsedAt.error);
  const scheduledAt = parsedAt ? parsedAt.iso : null;
  const status = scheduledAt ? "scheduled" : "draft";
  if (scheduledAt && channelIds.length === 0) {
    // It would "publish" with nothing sent. Drafts can wait for their channels.
    throw new Error("channel_ids is required to schedule a post (omit scheduled_at to save a draft)");
  }
  if (status === "scheduled") {
    const blocked = await schedulingProblem(orgId);
    if (blocked) throw new Error(blocked);
  }
  if (scheduledAt) {
    // Same checks as the composer: fail now, not when it's due (length, and
    // media a network needs, e.g. a video for YouTube).
    const problem = pastTimeProblem(scheduledAt) ?? firstBlockingProblem(platforms.map((platform) => ({ platform, parts: segments })), media);
    if (problem) throw new Error(problem);
    // TikTok's Content Sharing Guidelines need the creator to choose who sees
    // each post and agree to its terms in the composer, so agents only draft.
    if (platforms.includes("tiktok")) {
      throw new Error("TikTok posts can't be scheduled from an AI tool or the API: save a draft (omit the time) and schedule it in Postbase, where you choose who sees it.");
    }
    if (platforms.includes("youtube") && typeof input.youtube?.madeForKids !== "boolean") {
      throw new Error("YouTube needs to know whether the video is made for kids: set youtube.made_for_kids to true or false.");
    }
    if (platforms.includes("youtube") && !body.trim() && !input.youtube?.title?.trim()) {
      throw new Error("Give the YouTube video a title (youtube.title). The post has no text to take it from.");
    }
  }
  const youtube = platforms.includes("youtube") ? youtubeFields(input.youtube) : {};

  // Written as a draft and given its status last, so it's never left
  // scheduled with missing channels (lib/publish/save-post.ts).
  const { id } = await insertPostWhole(
    db,
    { org_id: orgId, body, thread_tail: threadTail, scheduled_at: scheduledAt, ...youtube },
    status,
    channelIds.map((channel_id) => ({ channel_id })),
    media,
  );
  const post = { id, body, scheduled_at: scheduledAt, status, media: media.length };

  // The cron poller publishes scheduled posts when due — no event needed.
  // Over the X link allowance? Say so now; the publisher enforces it when due.
  const warning = status === "scheduled" ? await xLinkWarningFor(orgId, channelIds, segments, scheduledAt) : null;
  return warning ? { ...post, warning } : post;
}

/** posts.youtube_privacy / youtube_options from the caller's YouTube details. */
function youtubeFields(y: CreatePostInput["youtube"]) {
  const privacy = y?.privacy && ["public", "unlisted", "private"].includes(y.privacy) ? y.privacy : null;
  const title = y?.title?.trim().slice(0, 100);
  const options = {
    ...(title ? { title } : {}),
    ...(typeof y?.madeForKids === "boolean" ? { madeForKids: y.madeForKids } : {}),
  };
  return {
    ...(privacy ? { youtube_privacy: privacy } : {}),
    ...(Object.keys(options).length ? { youtube_options: options } : {}),
  };
}

/** Cancel a post back to a draft (see lib/publish/cancel.ts). */
export async function cancelPost(orgId: string, postId: string): Promise<CancelOutcome> {
  return cancelPostForOrg(orgId, postId);
}
