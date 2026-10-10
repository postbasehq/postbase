import { createAdminClient } from "@/lib/supabase/admin";
import { insertPostWhole, replaceTargetsAndMedia, type NewMedia } from "@/lib/publish/save-post";
import { cancelPostForOrg, holdPostForEdit, type CancelOutcome } from "@/lib/publish/cancel";
import { firstBlockingProblem, parseScheduleTime, pastTimeProblem } from "@/lib/post-validation";
import { schedulingProblem } from "@/lib/billing-guard";
import { xLinkWarningFor } from "@/lib/x-links";
import { importMediaFromUrl, MAX_MEDIA_URLS } from "@/lib/media-import";
import { postUrl } from "@/lib/post-urls";

/**
 * Core operations exposed to the public API / MCP server, always scoped to one org.
 * Uses the admin client (no user session on API calls), so EVERY query filters by
 * orgId explicitly — never trust the caller for tenant scope.
 */

type Db = ReturnType<typeof createAdminClient>;

/** A failure the REST API maps to an HTTP status (anything else is a 400). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export async function getMe(orgId: string) {
  const db = createAdminClient();
  const [{ data: org }, { count }] = await Promise.all([
    db.from("orgs").select("id, name").eq("id", orgId).maybeSingle(),
    db.from("channels").select("id", { count: "exact", head: true }).eq("org_id", orgId),
  ]);
  return { workspace: { id: orgId, name: (org?.name as string | undefined) ?? null }, channels: count ?? 0 };
}

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

/** Add a file to the media library from a public URL. */
export async function importMedia(orgId: string, url: string, name?: string) {
  return importMediaFromUrl(orgId, url, name);
}

/** Most files one post can carry (the most any network takes: TikTok's 35-photo carousel). */
export const MAX_POST_MEDIA = 35;

type YoutubeInput = { title?: string; privacy?: string; madeForKids?: boolean };

export type CreatePostInput = {
  body?: string;
  thread?: string[];
  channelIds: string[];
  /** Text for particular channels instead of `body` (a single post, no thread), keyed by channel id. */
  channelBodies?: Record<string, string>;
  scheduledAt: string | null;
  /** Media library ids, in the order they should appear. */
  mediaIds?: string[];
  /** Public URLs to fetch into the media library and attach, after `mediaIds`. */
  mediaUrls?: string[];
  /** YouTube details; `madeForKids` is required to schedule to YouTube. */
  youtube?: YoutubeInput;
  /** A caller-chosen key: repeating a create with it returns the first post instead of making another. */
  idempotencyKey?: string;
};

/** The library files for `ids`, in the caller's order, all from this workspace. */
async function mediaForPost(db: Db, orgId: string, ids: string[]) {
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

/** Library files by id, then files fetched from URLs (added to the library), in that order. */
async function resolveMedia(db: Db, orgId: string, ids: string[], urls: string[]): Promise<NewMedia[]> {
  const fromUrls = urls.map((u) => u.trim()).filter(Boolean);
  if (fromUrls.length > MAX_MEDIA_URLS) throw new Error(`Send up to ${MAX_MEDIA_URLS} media_urls at a time`);
  const library = await mediaForPost(db, orgId, ids);
  if (library.length + fromUrls.length > MAX_POST_MEDIA) throw new Error(`A post can carry up to ${MAX_POST_MEDIA} files`);
  const imported: NewMedia[] = [];
  // One at a time: each file is held in memory while it's stored.
  for (const url of fromUrls) {
    const m = await importMediaFromUrl(orgId, url);
    imported.push({ url: m.url, type: m.type });
  }
  return [...library, ...imported];
}

/** Each channel id in `ids` mapped to its platform; throws if any isn't this workspace's. */
async function ownedChannels(db: Db, orgId: string, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await db.from("channels").select("id, platform").eq("org_id", orgId).in("id", ids);
  const owned = new Map((data ?? []).map((c) => [c.id as string, c.platform as string]));
  if (ids.some((id) => !owned.has(id))) throw new Error("one or more channel_ids are invalid for this workspace");
  return owned;
}

/** Per-channel text, trimmed, for channels in the post only. */
function cleanChannelBodies(bodies: Record<string, unknown> | undefined, channelIds: string[]): Record<string, string> {
  if (!bodies) return {};
  const out: Record<string, string> = {};
  for (const [id, text] of Object.entries(bodies)) {
    if (!channelIds.includes(id)) throw new Error(`channel_bodies has ${id}, which isn't in channel_ids`);
    if (typeof text === "string" && text.trim()) out[id] = text.trim();
  }
  return out;
}

function idempotencyKeyFrom(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string" || raw.length > 255 || !raw.trim()) {
    throw new Error("idempotency_key must be a string of 1 to 255 characters");
  }
  return raw.trim();
}

/** The post a repeated create (same idempotency key) refers to, in create_post's shape. */
async function priorPost(db: Db, orgId: string, key: string) {
  const { data } = await db
    .from("posts")
    .select("id, body, scheduled_at, status, media(id)")
    .eq("org_id", orgId)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    body: data.body as string,
    scheduled_at: data.scheduled_at as string | null,
    status: data.status as string,
    media: ((data.media ?? []) as unknown[]).length,
    idempotent_replay: true,
  };
}

type Draft = {
  channelIds: string[];
  platforms: Map<string, string>;
  segments: string[];
  variants: Record<string, string>;
  media: NewMedia[];
  scheduledAt: string | null;
  youtube: YoutubeInput | undefined;
};

/** The same checks as the composer, for a post about to be scheduled: fail now, not when it's due. */
async function assertSchedulable(orgId: string, d: Draft): Promise<void> {
  if (!d.scheduledAt) return;
  if (d.channelIds.length === 0) {
    // It would "publish" with nothing sent. Drafts can wait for their channels.
    throw new Error("channel_ids is required to schedule a post (omit scheduled_at to save a draft)");
  }
  const blocked = await schedulingProblem(orgId);
  if (blocked) throw new ApiError(blocked, 402, "plan_required");
  const platformList = d.channelIds.map((id) => d.platforms.get(id)!);
  // Length, and media a network needs (e.g. a video for YouTube).
  const problem =
    pastTimeProblem(d.scheduledAt) ??
    firstBlockingProblem(
      d.channelIds.map((id) => ({ platform: d.platforms.get(id)!, parts: d.variants[id] ? [d.variants[id]] : d.segments })),
      d.media,
    );
  if (problem) throw new Error(problem);
  // TikTok's Content Sharing Guidelines need the creator to choose who sees
  // each post and agree to its terms in the composer, so agents only draft.
  if (platformList.includes("tiktok")) {
    throw new Error("TikTok posts can't be scheduled from an AI tool or the API: save a draft (omit the time) and schedule it in Postbase, where you choose who sees it.");
  }
  const youtubeIds = d.channelIds.filter((id) => d.platforms.get(id) === "youtube");
  if (youtubeIds.length > 0 && typeof d.youtube?.madeForKids !== "boolean") {
    throw new Error("YouTube needs to know whether the video is made for kids: set youtube.made_for_kids to true or false.");
  }
  const untitled = youtubeIds.some((id) => !(d.variants[id] ?? d.segments[0] ?? "").trim());
  if (untitled && !d.youtube?.title?.trim()) {
    throw new Error("Give the YouTube video a title (youtube.title). The post has no text to take it from.");
  }
}

function parseAt(raw: string | null): string | null {
  if (!raw) return null;
  const parsed = parseScheduleTime(raw, true);
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed.iso;
}

const segmentsOf = (thread: string[] | undefined, body: string | undefined) =>
  (thread && thread.length ? thread : [body ?? ""]).map((s) => String(s).trim()).filter(Boolean);

export async function createPost(orgId: string, input: CreatePostInput) {
  const db = createAdminClient();
  const key = idempotencyKeyFrom(input.idempotencyKey);
  if (key) {
    const prior = await priorPost(db, orgId, key);
    if (prior) return prior;
  }

  // A thread (array) takes precedence; otherwise the single body.
  const segments = segmentsOf(input.thread, input.body);
  const channelIds = [...new Set((input.channelIds ?? []).filter(Boolean))];
  const platforms = await ownedChannels(db, orgId, channelIds);
  const variants = cleanChannelBodies(input.channelBodies, channelIds);
  const scheduledAt = parseAt(input.scheduledAt);
  const status = scheduledAt ? "scheduled" : "draft";
  // Checks that need no downloads go first, so a bad request fetches nothing.
  if (segments.length === 0 && !input.mediaIds?.length && !input.mediaUrls?.length && Object.keys(variants).length === 0) {
    throw new Error("body (or thread) or media_ids is required");
  }
  if (scheduledAt) {
    const problem = pastTimeProblem(scheduledAt);
    if (problem) throw new Error(problem);
  }
  const media = await resolveMedia(db, orgId, input.mediaIds ?? [], input.mediaUrls ?? []);
  await assertSchedulable(orgId, { channelIds, platforms, segments, variants, media, scheduledAt, youtube: input.youtube });

  const body = segments[0] ?? "";
  const hasYoutube = [...platforms.values()].includes("youtube");
  const youtube = hasYoutube ? youtubeFields(input.youtube) : {};

  // Written as a draft and given its status last, so it's never left
  // scheduled with missing channels (lib/publish/save-post.ts).
  let id: string;
  try {
    ({ id } = await insertPostWhole(
      db,
      {
        org_id: orgId,
        body,
        thread_tail: segments.slice(1),
        scheduled_at: scheduledAt,
        ...youtube,
        ...(key ? { idempotency_key: key } : {}),
      },
      status,
      channelIds.map((channel_id) => ({ channel_id, variant_body: variants[channel_id] ?? null })),
      media,
    ));
  } catch (e) {
    // Two requests with the same key at once: the second loses the insert, and gets the first's post.
    if (key && e instanceof Error && e.message.includes("posts_org_idempotency_key")) {
      const prior = await priorPost(db, orgId, key);
      if (prior) return prior;
    }
    throw e;
  }
  const post = { id, body, scheduled_at: scheduledAt, status, media: media.length };

  // The cron poller publishes scheduled posts when due — no event needed.
  // Over the X link allowance? Say so now; the publisher enforces it when due.
  const texts = [...segments, ...Object.values(variants)];
  const warning = status === "scheduled" ? await xLinkWarningFor(orgId, channelIds, texts, scheduledAt) : null;
  return warning ? { ...post, warning } : post;
}

/** posts.youtube_privacy / youtube_options from the caller's YouTube details. */
function youtubeFields(y: YoutubeInput | undefined) {
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

type TargetRow = {
  channel_id: string;
  variant_body: string | null;
  status: string;
  error: string | null;
  platform_post_id: string | null;
  pending_ref?: string | null;
  thread_ids?: string[] | null;
  next_attempt_at: string | null;
  metrics: Record<string, number> | null;
  channels: { platform: string; handle: string | null } | null;
};

/**
 * One post with each channel's outcome: status, the live URL once it's out,
 * the error if it failed (or a warning if it went out with one), and when a
 * failed channel will be retried.
 */
export async function getPost(orgId: string, postId: string) {
  const db = createAdminClient();
  const { data: post } = await db
    .from("posts")
    .select(
      "id, body, thread_tail, scheduled_at, status, created_at, media(storage_url, type), post_targets(channel_id, variant_body, status, error, platform_post_id, next_attempt_at, metrics, channels(platform, handle))",
    )
    .eq("id", postId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!post) throw new ApiError("Post not found", 404, "not_found");

  const targets = (post.post_targets ?? []) as unknown as TargetRow[];
  const channels = targets.map((t) => {
    const platform = t.channels?.platform ?? null;
    const published = t.status === "published";
    return {
      channel_id: t.channel_id,
      platform,
      handle: t.channels?.handle ?? null,
      status: t.status,
      url: published && platform ? postUrl(platform, t.channels?.handle ?? null, t.platform_post_id) : null,
      error: t.status === "failed" ? t.error : null,
      warning: published ? t.error : null,
      retry_at: t.status === "failed" ? t.next_attempt_at : null,
      body: t.variant_body,
      metrics: t.metrics ?? null,
    };
  });
  const count = (s: string) => channels.filter((c) => c.status === s).length;
  return {
    id: post.id as string,
    status: post.status as string,
    body: post.body as string,
    thread: [post.body as string, ...((post.thread_tail as string[] | null) ?? [])].filter(Boolean),
    scheduled_at: post.scheduled_at as string | null,
    created_at: post.created_at as string,
    media: ((post.media ?? []) as { storage_url: string; type: string }[]).map((m) => ({ url: m.storage_url, type: m.type })),
    channels,
    summary: { published: count("published"), failed: count("failed"), pending: channels.length - count("published") - count("failed") },
  };
}

/** Fields to change; anything left out keeps its current value. `scheduledAt: null` makes it a draft. */
export type UpdatePostInput = Partial<Omit<CreatePostInput, "idempotencyKey" | "scheduledAt">> & { scheduledAt?: string | null };

const sentOrSending = (t: Pick<TargetRow, "status" | "platform_post_id" | "pending_ref" | "thread_ids">) =>
  t.status === "publishing" || t.status === "published" || !!t.platform_post_id || !!t.pending_ref || (t.thread_ids?.length ?? 0) > 0;

const STARTED = "This post has started publishing, so it can't be changed. Create a new post instead.";

/**
 * Edit a draft or scheduled post: text, channels, per-channel text, media,
 * time or YouTube details. Same checks as creating, and the same race-safe
 * path as the composer's edit (held still while its targets are rewritten).
 */
export async function updatePost(orgId: string, postId: string, input: UpdatePostInput) {
  const db = createAdminClient();
  const { data: current } = await db
    .from("posts")
    .select(
      "id, status, body, thread_tail, scheduled_at, youtube_privacy, youtube_options, post_targets(channel_id, variant_body, status, platform_post_id, pending_ref, thread_ids), media(storage_url, type)",
    )
    .eq("id", postId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!current) throw new ApiError("Post not found", 404, "not_found");
  const targets = (current.post_targets ?? []) as unknown as TargetRow[];
  if (current.status === "published" || current.status === "publishing" || targets.some(sentOrSending)) {
    throw new ApiError(STARTED, 409, "already_publishing");
  }

  const segments =
    input.thread !== undefined || input.body !== undefined
      ? segmentsOf(input.thread, input.body)
      : [current.body as string, ...((current.thread_tail as string[] | null) ?? [])].filter(Boolean);
  const channelIds = input.channelIds !== undefined ? [...new Set(input.channelIds.filter(Boolean))] : targets.map((t) => t.channel_id);
  const platforms = await ownedChannels(db, orgId, channelIds);
  const variants =
    input.channelBodies !== undefined
      ? cleanChannelBodies(input.channelBodies, channelIds)
      : Object.fromEntries(targets.filter((t) => t.variant_body && channelIds.includes(t.channel_id)).map((t) => [t.channel_id, t.variant_body!]));
  const scheduledAt = input.scheduledAt === undefined ? ((current.scheduled_at as string | null) ?? null) : parseAt(input.scheduledAt);
  const status = scheduledAt ? "scheduled" : "draft";
  if (scheduledAt) {
    const problem = pastTimeProblem(scheduledAt);
    if (problem) throw new Error(problem);
  }
  const media =
    input.mediaIds !== undefined || input.mediaUrls !== undefined
      ? await resolveMedia(db, orgId, input.mediaIds ?? [], input.mediaUrls ?? [])
      : ((current.media ?? []) as { storage_url: string; type: string }[]).map((m) => ({ url: m.storage_url, type: m.type }));
  if (segments.length === 0 && media.length === 0 && Object.keys(variants).length === 0) {
    throw new Error("A post needs text or media");
  }

  const curYt = (current.youtube_options ?? {}) as { title?: string; madeForKids?: boolean };
  const youtube: YoutubeInput = {
    title: input.youtube?.title ?? curYt.title,
    privacy: input.youtube?.privacy ?? (current.youtube_privacy as string | null) ?? undefined,
    madeForKids: input.youtube?.madeForKids ?? curYt.madeForKids,
  };
  await assertSchedulable(orgId, { channelIds, platforms, segments, variants, media, scheduledAt, youtube });

  // The checks above were a separate read: hold the post still (unsendable)
  // before rewriting it, and bail if the publisher got to it meanwhile.
  const hold = await holdPostForEdit(orgId, postId);
  if (!hold.ok) throw new ApiError(STARTED, 409, "already_publishing");

  const { data: updated, error } = await db
    .from("posts")
    .update({
      body: segments[0] ?? "",
      thread_tail: segments.slice(1),
      scheduled_at: scheduledAt,
      ...([...platforms.values()].includes("youtube") ? youtubeFields(youtube) : {}),
    })
    .eq("id", postId)
    .eq("org_id", orgId)
    .eq("status", "draft") // held above
    .select("id");
  if (error || !updated?.length) {
    await hold.release();
    if (error) throw new Error(error.message);
    throw new ApiError(STARTED, 409, "already_publishing");
  }
  try {
    await replaceTargetsAndMedia(
      db,
      postId,
      status,
      channelIds.map((channel_id) => ({ channel_id, variant_body: variants[channel_id] ?? null })),
      media,
    );
  } catch (e) {
    console.error(`[api updatePost] ${postId} left as a draft:`, e);
    throw new Error("Couldn't save every change, so the post was kept as a draft. Update it again.");
  }

  const out = await getPost(orgId, postId);
  const warning = status === "scheduled" ? await xLinkWarningFor(orgId, channelIds, [...segments, ...Object.values(variants)], scheduledAt) : null;
  return warning ? { ...out, warning } : out;
}

/**
 * Send a post's failed channels again, now. Channels that went out are never
 * touched, so nothing is posted twice.
 */
export async function retryPost(orgId: string, postId: string) {
  const db = createAdminClient();
  const { data: post } = await db.from("posts").select("id, status").eq("id", postId).eq("org_id", orgId).maybeSingle();
  if (!post) throw new ApiError("Post not found", 404, "not_found");
  if (post.status === "draft") throw new ApiError("This post is a draft, so there is nothing to retry. Schedule it instead (update_post, or PATCH /v1/posts/{id}).", 409, "is_draft");
  const blocked = await schedulingProblem(orgId);
  if (blocked) throw new ApiError(blocked, 402, "plan_required");

  // Only failed channels that never went out and aren't still processing on
  // the network. Due now with a fresh attempt count, as the queue's Retry does.
  const { data: retried, error } = await db
    .from("post_targets")
    .update({ status: "failed", error: null, attempts: 0, next_attempt_at: new Date().toISOString() })
    .eq("post_id", postId)
    .eq("status", "failed")
    .is("platform_post_id", null)
    .is("pending_ref", null)
    .select("channel_id");
  if (error) throw new Error(error.message);
  if (!retried?.length) throw new ApiError("No failed channels to retry on this post.", 409, "nothing_to_retry");
  await db.from("posts").update({ status: "publishing" }).eq("id", postId).eq("org_id", orgId);
  return { id: postId, retrying: retried.map((t) => t.channel_id as string) };
}

/** Cancel a post back to a draft (see lib/publish/cancel.ts). */
export async function cancelPost(orgId: string, postId: string): Promise<CancelOutcome> {
  return cancelPostForOrg(orgId, postId);
}
