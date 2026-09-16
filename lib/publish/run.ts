import { createAdminClient } from "@/lib/supabase/admin";
import { publish } from "@/lib/publish/adapters";
import { isRepeatEvery, nextOccurrence } from "@/lib/publish/repeat";

type Db = ReturnType<typeof createAdminClient>;

type ChannelRow = {
  id: string;
  platform: string;
  handle: string | null;
  encrypted_tokens: string | null;
  token_expiry: string | null;
};
type TargetRow = {
  id: string;
  status: string;
  platform_post_id: string | null;
  variant_body: string | null;
  attempts: number;
  channels: ChannelRow | null;
};
type PostRow = {
  id: string;
  body: string;
  thread_tail: string[] | null;
  tiktok_privacy_level: string | null;
};
type MediaItem = { url: string; type: string };

// A post claimed but not finished within this window is treated as stranded.
const STUCK_AFTER_MS = 5 * 60_000;
// How many times to try a target before giving up.
const MAX_ATTEMPTS = 4;

// Backoff (minutes) indexed by the attempt number just completed (1-based).
function backoffMs(attempts: number): number {
  const mins = [5, 15, 30, 60];
  return (mins[Math.min(attempts - 1, mins.length - 1)] ?? 60) * 60_000;
}

async function loadMedia(db: Db, postId: string): Promise<MediaItem[]> {
  const { data } = await db.from("media").select("storage_url, type").eq("post_id", postId);
  return (data ?? []).map((m) => ({ url: m.storage_url, type: m.type }));
}

async function loadTargets(db: Db, postId: string): Promise<TargetRow[]> {
  const { data } = await db
    .from("post_targets")
    .select(
      "id, status, platform_post_id, variant_body, attempts, channels(id, platform, handle, encrypted_tokens, token_expiry)",
    )
    .eq("post_id", postId);
  return (data ?? []) as unknown as TargetRow[];
}

/** Publish one target and record the outcome (with retry scheduling on failure). */
async function publishTarget(
  db: Db,
  target: TargetRow,
  post: PostRow,
  media: MediaItem[],
): Promise<boolean> {
  // Dedupe: a target that already went out is done — never re-publish it.
  if (target.platform_post_id) {
    if (target.status !== "published") {
      await db
        .from("post_targets")
        .update({ status: "published", error: null, next_attempt_at: null })
        .eq("id", target.id);
    }
    return true;
  }

  const body = target.variant_body ?? post.body ?? "";
  const threadTail = target.variant_body ? [] : (post.thread_tail ?? []);
  const result = await publish({
    platform: target.channels?.platform ?? "",
    body,
    threadTail,
    media,
    channelId: target.channels?.id ?? "",
    handle: target.channels?.handle ?? null,
    encryptedTokens: target.channels?.encrypted_tokens ?? null,
    tokenExpiry: target.channels?.token_expiry ?? null,
    tiktokPrivacyLevel: post.tiktok_privacy_level,
  });

  if (result.ok) {
    await db
      .from("post_targets")
      .update({ status: "published", platform_post_id: result.platformPostId, error: null, next_attempt_at: null })
      .eq("id", target.id);
    return true;
  }

  // Failure: schedule a retry with backoff, or give up after MAX_ATTEMPTS.
  const attempts = (target.attempts ?? 0) + 1;
  const canRetry = attempts < MAX_ATTEMPTS;
  await db
    .from("post_targets")
    .update({
      status: "failed",
      error: result.error,
      attempts,
      next_attempt_at: canRetry ? new Date(Date.now() + backoffMs(attempts)).toISOString() : null,
    })
    .eq("id", target.id);
  return false;
}

/** Roll the per-target outcomes up into the post's status. */
async function recomputePostStatus(db: Db, postId: string): Promise<void> {
  const { data } = await db
    .from("post_targets")
    .select("status, next_attempt_at, platform_post_id")
    .eq("post_id", postId);
  const targets = data ?? [];

  // No targets → nothing to deliver; consider it published.
  const allDone = targets.every((t) => t.status === "published" || t.platform_post_id);
  const anyRetrying = targets.some((t) => t.status === "failed" && t.next_attempt_at != null);
  const anyFailed = targets.some((t) => t.status === "failed");

  const status = allDone ? "published" : anyRetrying ? "publishing" : anyFailed ? "failed" : "publishing";
  await db.from("posts").update({ status, updated_at: new Date().toISOString() }).eq("id", postId);
}

/**
 * If a just-published post repeats, spawn the next occurrence one cadence
 * step ahead (same body, channels and media). The claim flips
 * `repeat_next_spawned` atomically so a repeating post is never cloned twice,
 * even if the status is recomputed on a later run.
 */
async function spawnRepeatIfDue(db: Db, postId: string): Promise<void> {
  const { data: origin } = await db
    .from("posts")
    .update({ repeat_next_spawned: true })
    .eq("id", postId)
    .eq("status", "published")
    .eq("repeat_next_spawned", false)
    .not("repeat_every", "is", null)
    .select("org_id, author_id, body, thread_tail, tiktok_privacy_level, scheduled_at, repeat_every")
    .maybeSingle();
  if (!origin || !isRepeatEvery(origin.repeat_every)) return;

  const nextAt = nextOccurrence(origin.scheduled_at ?? new Date().toISOString(), origin.repeat_every);

  const { data: clone } = await db
    .from("posts")
    .insert({
      org_id: origin.org_id,
      author_id: origin.author_id,
      body: origin.body,
      thread_tail: origin.thread_tail ?? [],
      scheduled_at: nextAt,
      status: "scheduled",
      tiktok_privacy_level: origin.tiktok_privacy_level,
      repeat_every: origin.repeat_every,
    })
    .select("id")
    .single();
  if (!clone) return;

  const { data: targets } = await db
    .from("post_targets")
    .select("channel_id, variant_body")
    .eq("post_id", postId);
  if (targets && targets.length > 0) {
    await db.from("post_targets").insert(
      targets.map((t) => ({
        post_id: clone.id,
        channel_id: t.channel_id,
        variant_body: t.variant_body,
        status: "scheduled",
      })),
    );
  }

  const { data: media } = await db
    .from("media")
    .select("storage_url, type")
    .eq("post_id", postId);
  if (media && media.length > 0) {
    await db.from("media").insert(
      media.map((m) => ({ post_id: clone.id, storage_url: m.storage_url, type: m.type })),
    );
  }
}

/**
 * Publish all posts whose scheduled time has passed, and retry failed targets.
 * Called by the cron poller.
 *
 * - Claims due `scheduled` posts (atomic scheduled -> publishing).
 * - Reclaims posts stranded in `publishing` past STUCK_AFTER_MS (crashed runs).
 * - Sweeps failed targets due for another attempt (backoff, up to MAX_ATTEMPTS).
 * - Targets that already have a platform_post_id are skipped (no double-post).
 */
export async function publishDuePosts(): Promise<{ processed: number }> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();
  const stuckBeforeIso = new Date(Date.now() - STUCK_AFTER_MS).toISOString();
  const touched = new Set<string>();

  // 1. Claim due scheduled posts.
  const { data: claimed } = await db
    .from("posts")
    .update({ status: "publishing", updated_at: nowIso })
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .select("id, body, thread_tail, tiktok_privacy_level");

  // 2. Reclaim posts stranded in `publishing` past the stuck window.
  const { data: reclaimed } = await db
    .from("posts")
    .update({ status: "publishing", updated_at: nowIso })
    .eq("status", "publishing")
    .lt("updated_at", stuckBeforeIso)
    .select("id, body, thread_tail, tiktok_privacy_level");

  const posts = [...(claimed ?? []), ...(reclaimed ?? [])] as PostRow[];
  for (const post of posts) {
    touched.add(post.id);
    const media = await loadMedia(db, post.id);
    const targets = await loadTargets(db, post.id);
    for (const t of targets) {
      if (!t.platform_post_id) {
        await db.from("post_targets").update({ status: "publishing" }).eq("id", t.id);
      }
      await publishTarget(db, t, post, media);
    }
  }

  // 3. Retry sweep: atomically claim failed targets that are due for another try.
  const { data: retryClaimed } = await db
    .from("post_targets")
    .update({ status: "publishing" })
    .eq("status", "failed")
    .lt("attempts", MAX_ATTEMPTS)
    .not("next_attempt_at", "is", null)
    .lte("next_attempt_at", nowIso)
    .select("post_id");

  const retryPostIds = Array.from(new Set((retryClaimed ?? []).map((r) => r.post_id as string)));
  for (const postId of retryPostIds) {
    touched.add(postId);
    const { data: postData } = await db
      .from("posts")
      .select("id, body, thread_tail, tiktok_privacy_level")
      .eq("id", postId)
      .single();
    if (!postData) continue;
    const media = await loadMedia(db, postId);
    const targets = await loadTargets(db, postId);
    // Only the targets we just claimed (now `publishing`, not yet sent).
    for (const t of targets) {
      if (t.status === "publishing" && !t.platform_post_id) {
        await publishTarget(db, t, postData as PostRow, media);
      }
    }
  }

  // 4. Roll target outcomes up to each touched post, then spawn the next
  //    occurrence for any repeating post that just published.
  for (const postId of touched) {
    await recomputePostStatus(db, postId);
    await spawnRepeatIfDue(db, postId);
  }

  return { processed: posts.length + retryPostIds.length };
}
