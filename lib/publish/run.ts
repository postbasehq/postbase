import { createAdminClient } from "@/lib/supabase/admin";
import { clearReconnect, flagReconnect, needsReconnect } from "@/lib/channel-health";
import { publish, xTexts, type PublishResult } from "@/lib/publish/adapters";
import { countXLinkPosts } from "@/lib/x-link-count";
import { reserveXLinks, settleXLinks } from "@/lib/x-links";
import type { TikTokPostOptions } from "@/lib/platforms/tiktok";
import type { YouTubePostOptions } from "@/lib/platforms/youtube";
import { isRepeatEvery, nextOccurrence } from "@/lib/publish/repeat";
import { NO_PLAN_MESSAGE, accessRowFor, orgHasAccess } from "@/lib/billing-guard";
import { notifyPostsFailed, notifyReconnect } from "@/lib/email/notify";
import { isOwnMediaUrl } from "@/lib/media-urls";

type Db = ReturnType<typeof createAdminClient>;

type ChannelRow = {
  id: string;
  org_id: string;
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
  pending_ref: string | null;
  pending_since: string | null;
  thread_ids: string[] | null;
  channels: ChannelRow | null;
};
type PostRow = {
  id: string;
  org_id: string;
  status: string;
  body: string;
  thread_tail: string[] | null;
  tiktok_privacy_level: string | null;
  youtube_privacy: string | null;
  youtube_options: YouTubePostOptions | null;
  tiktok_options: TikTokPostOptions | null;
};
type MediaItem = { url: string; type: string };

// A target claimed but not finished within this window was interrupted mid-send
// (the function was killed). Must exceed the cron's maxDuration so a live run is
// never mistaken for a dead one.
const STUCK_AFTER_MS = 10 * 60_000;
/** Platforms that post a thread as a chain and can resume it from post_targets.thread_ids. */
const THREADED_PLATFORMS = new Set(["x", "bluesky", "mastodon"]);
// Stop claiming new targets after this long, leaving headroom under the cron's
// maxDuration (300s) for in-flight uploads/polls to finish. The rest wait for
// the next run.
const START_BUDGET_MS = 180_000;
const INTERRUPTED_ERROR =
  "Publishing was interrupted before we could confirm it went out. Check the channel — if the post isn't there, hit Retry.";
const POST_COLUMNS = "id, org_id, status, body, thread_tail, tiktok_privacy_level, tiktok_options, youtube_privacy, youtube_options";
// How many times to try a target before giving up.
const MAX_ATTEMPTS = 4;
// How long a platform may keep processing an upload before we give up on it.
const PENDING_MAX_MS = 30 * 60_000;

// Backoff (minutes) indexed by the attempt number just completed (1-based).
function backoffMs(attempts: number): number {
  const mins = [5, 15, 30, 60];
  return (mins[Math.min(attempts - 1, mins.length - 1)] ?? 60) * 60_000;
}

/**
 * Something failed before anything was sent (a database blip, an allowance
 * check that couldn't run). The claim is released so the next run tries again,
 * rather than the target being failed or left to the interrupted sweep.
 */
class RetryLater extends Error {}

// Loaders throw on query errors: an empty result must mean "none", never "the
// read failed" (a post would otherwise go out without its media).
async function loadMedia(db: Db, postId: string): Promise<MediaItem[]> {
  const { data, error } = await db.from("media").select("storage_url, type").eq("post_id", postId);
  if (error) throw new RetryLater(`media for ${postId}: ${error.message}`);
  return (data ?? []).map((m) => ({ url: m.storage_url, type: m.type }));
}

async function loadTarget(db: Db, targetId: string): Promise<TargetRow | null> {
  const { data, error } = await db
    .from("post_targets")
    .select(
      "id, status, platform_post_id, variant_body, attempts, pending_ref, pending_since, thread_ids, channels(id, org_id, platform, handle, encrypted_tokens, token_expiry)",
    )
    .eq("id", targetId)
    .maybeSingle();
  if (error) throw new RetryLater(`target ${targetId}: ${error.message}`);
  return (data ?? null) as unknown as TargetRow | null;
}

/** Undo a claim we made: back to the state it was claimed from, unsent. */
async function releaseClaim(db: Db, targetId: string, from: "scheduled" | "failed"): Promise<void> {
  await db
    .from("post_targets")
    .update({ status: from, claimed_at: null })
    .eq("id", targetId)
    .eq("status", "publishing")
    .is("platform_post_id", null);
}

/**
 * Atomically claim one target for sending: flips it to `publishing` only if it's
 * still in the state we found it in. Postgres re-checks the WHERE under the row
 * lock, so of two overlapping cron runs exactly one wins; the other skips it.
 */
async function claimTarget(db: Db, targetId: string, from: "scheduled" | "failed", nowIso: string): Promise<boolean> {
  let q = db
    .from("post_targets")
    .update({ status: "publishing", claimed_at: new Date().toISOString() })
    .eq("id", targetId)
    .eq("status", from)
    .is("platform_post_id", null);
  if (from === "failed") {
    q = q.lt("attempts", MAX_ATTEMPTS).not("next_attempt_at", "is", null).lte("next_attempt_at", nowIso);
  }
  const { data } = await q.select("id");
  return (data?.length ?? 0) > 0;
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
  // A media row without a real URL (e.g. an invented one from an old agent
  // draft) can never publish; fail clearly instead of with fetch's parse error.
  const brokenMedia = media.some((m) => !/^https?:\/\//i.test(m.url ?? ""));

  // X: posts with links come out of the plan's monthly allowance. Reserve them
  // before sending (all or nothing, so a thread never stops half-way for it);
  // only the posts that actually go out are kept.
  const platform = target.channels?.platform ?? "";
  const isX = platform === "x";
  // Threads remember which parts went out, so a retry continues after them
  // rather than posting the lead again.
  const threaded = THREADED_PLATFORMS.has(platform);
  const resumeIds = threaded ? (target.thread_ids ?? []) : [];
  const unsent = isX ? xTexts(body, threadTail).slice(resumeIds.length) : [];
  let sentIds = resumeIds;
  let reservationId: string | null = null;
  if (isX && !brokenMedia) {
    const reservation = await reserveXLinks(post.org_id, target.id, countXLinkPosts(unsent));
    if (!reservation.ok && reservation.transient) throw new RetryLater(reservation.error);
    if (!reservation.ok) {
      // Over the allowance: retrying won't help until the link is removed or
      // the month resets, so it waits for the user (Retry re-checks).
      await db
        .from("post_targets")
        .update({ status: "failed", error: reservation.error, next_attempt_at: null })
        .eq("id", target.id);
      return false;
    }
    reservationId = reservation.id;
  }

  const result: PublishResult = brokenMedia
    ? { ok: false as const, error: "An attached image is missing. Open the post, remove the broken image and add it again." }
    : await publish({
    platform,
    body,
    threadTail,
    media,
    channelId: target.channels?.id ?? "",
    handle: target.channels?.handle ?? null,
    encryptedTokens: target.channels?.encrypted_tokens ?? null,
    tokenExpiry: target.channels?.token_expiry ?? null,
    tiktokPrivacyLevel: post.tiktok_privacy_level,
    youtubePrivacy: post.youtube_privacy,
    youtubeOptions: post.youtube_options,
    tiktokOptions: post.tiktok_options,
    pendingRef: target.pending_ref,
    threadIds: resumeIds,
    idempotencyKey: target.id,
    onThreadProgress: threaded
      ? async (ids) => {
          sentIds = ids;
          // Best effort: a failed write must not stop the thread mid-way.
          await db.from("post_targets").update({ thread_ids: ids }).eq("id", target.id).then(undefined, () => {});
        }
      : undefined,
  });

  // Keep only the link posts that went out; a failed send gives the rest back.
  if (isX) await settleXLinks(reservationId, countXLinkPosts(unsent.slice(0, sentIds.length - resumeIds.length)));

  if (result.ok) {
    // A warning (e.g. a thumbnail YouTube refused) is kept on the target for support.
    await db
      .from("post_targets")
      .update({ status: "published", platform_post_id: result.platformPostId, error: result.warning ?? null, next_attempt_at: null, pending_ref: null, pending_since: null, thread_ids: null })
      .eq("id", target.id);
    if (target.channels?.id) await clearReconnect(db, target.channels.id);
    return true;
  }

  // Still processing on the platform's side: check again next minute. Not a
  // failed attempt, but give up if it never finishes.
  if (!result.ok && result.pendingRef) {
    const since = target.pending_ref === result.pendingRef && target.pending_since ? target.pending_since : new Date().toISOString();
    const stale = Date.now() - Date.parse(since) > PENDING_MAX_MS;
    await db
      .from("post_targets")
      .update(
        stale
          ? {
              status: "failed",
              // TikTok publishes on its own once processing ends, so it may yet go out;
              // Instagram only publishes when we tell it to, so a retry is safe there.
              error: platform === "tiktok"
                ? "TikTok didn't confirm the post within 30 minutes. Check your TikTok account before using Retry: it may still have gone out."
                : "The platform took too long to process the media. Retry to upload it again.",
              next_attempt_at: null,
              pending_ref: null,
              pending_since: null,
            }
          : { status: "failed", error: result.error, next_attempt_at: new Date(Date.now() + 60_000).toISOString(), pending_ref: result.pendingRef, pending_since: since },
      )
      .eq("id", target.id);
    return false;
  }

  // The platform may already have it: never send again automatically. The
  // user checks their account and uses Retry only if it isn't there.
  if (!result.ok && result.uncertain) {
    await db
      .from("post_targets")
      .update({ status: "failed", error: result.error, attempts: (target.attempts ?? 0) + 1, pending_ref: null, pending_since: null, next_attempt_at: null })
      .eq("id", target.id);
    return false;
  }

  // Failure: schedule a retry with backoff, or give up after MAX_ATTEMPTS.
  const attempts = (target.attempts ?? 0) + 1;
  // Lost access: flag the channel so the user is told to reconnect it.
  const authLost = needsReconnect(result.error);
  if (authLost && target.channels?.id && (await flagReconnect(db, target.channels.id, result.error))) {
    await notifyReconnect(target.channels.id);
  }
  // Retrying can't fix a broken attachment or lost access, so don't.
  const canRetry = attempts < MAX_ATTEMPTS && !brokenMedia && !authLost;
  await db
    .from("post_targets")
    .update({
      status: "failed",
      error: result.error,
      attempts,
      // A dead upload is dropped so a retry starts afresh.
      pending_ref: null,
      pending_since: null,
      next_attempt_at: canRetry ? new Date(Date.now() + backoffMs(attempts)).toISOString() : null,
    })
    .eq("id", target.id);
  return false;
}

/** Roll the per-target outcomes up into the post's status. */
async function recomputePostStatus(db: Db, postId: string): Promise<string | null> {
  const { data, error } = await db
    .from("post_targets")
    .select("status, next_attempt_at, platform_post_id")
    .eq("post_id", postId);
  // A failed read would look like "no targets" (= published, and a repeat
  // spawned): leave the post as it is; the next run recomputes it.
  if (error) {
    console.error(`[publish] status of ${postId} left for next run: ${error.message}`);
    return null;
  }
  const targets = data ?? [];

  // No targets → nothing to deliver; consider it published.
  const allDone = targets.every((t) => t.status === "published" || t.platform_post_id);
  const anyPending = targets.some((t) => t.status === "scheduled" || t.status === "publishing");
  const anyRetrying = targets.some((t) => t.status === "failed" && t.next_attempt_at != null);
  const anyFailed = targets.some((t) => t.status === "failed");

  const status = allDone ? "published" : anyPending || anyRetrying ? "publishing" : anyFailed ? "failed" : "publishing";
  // A post cancelled back to draft mid-run stays a draft.
  await db
    .from("posts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .neq("status", "draft");
  return status;
}

/**
 * If a post that repeats has finished (published, or failed on some or all
 * channels: one bad occurrence mustn't end the series), spawn the next
 * occurrence one cadence step ahead (same body, channels and media). Not for a
 * workspace without an active plan, which would only queue more failures. The claim flips
 * `repeat_next_spawned` atomically so a repeating post is never cloned twice,
 * even if the status is recomputed on a later run.
 */
async function spawnRepeatIfDue(db: Db, postId: string): Promise<void> {
  const { data: origin } = await db
    .from("posts")
    .update({ repeat_next_spawned: true })
    .eq("id", postId)
    .in("status", ["published", "failed"])
    .eq("repeat_next_spawned", false)
    .not("repeat_every", "is", null)
    .select("org_id, author_id, body, thread_tail, tiktok_privacy_level, tiktok_options, youtube_privacy, youtube_options, scheduled_at, repeat_every, timezone")
    .maybeSingle();
  if (!origin || !isRepeatEvery(origin.repeat_every)) return;
  // A failed billing read spawns anyway (nothing would retry this later); the
  // occurrence is checked against the plan again when it's due.
  const access = await accessRowFor(origin.org_id as string).catch(() => null);
  if (access && !orgHasAccess(access)) return;

  // Stepped in the author's timezone so the local time survives DST changes.
  const nextAt = nextOccurrence(
    origin.scheduled_at ?? new Date().toISOString(),
    origin.repeat_every,
    new Date(),
    origin.timezone as string | null,
  );

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
      tiktok_options: origin.tiktok_options,
      youtube_privacy: origin.youtube_privacy,
      youtube_options: origin.youtube_options,
      repeat_every: origin.repeat_every,
      timezone: origin.timezone,
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
 * Work is claimed per target, never per post, so overlapping runs can't both
 * send the same target and a killed run can't cause a resend:
 * - Targets stuck in `publishing` past STUCK_AFTER_MS were interrupted mid-send.
 *   They may have gone out, so they're failed for the user to check + Retry —
 *   never republished automatically.
 * - Due `scheduled` posts flip to `publishing`; their targets join the queue.
 * - Failed targets due for another attempt (backoff, up to MAX_ATTEMPTS) join too.
 * - Each queued target is claimed atomically right before it's sent, until the
 *   START_BUDGET_MS runs out; the remainder is picked up on the next run.
 * - Orgs without an active plan (when billing is enforced) don't publish.
 */
export async function publishDuePosts(): Promise<{ processed: number }> {
  const db = createAdminClient();
  const startedAt = Date.now();
  const nowIso = new Date(startedAt).toISOString();
  const stuckBeforeIso = new Date(startedAt - STUCK_AFTER_MS).toISOString();
  const touched = new Set<string>();

  // 1. Fail targets whose send was interrupted (no automatic retry).
  const { data: interrupted } = await db
    .from("post_targets")
    .update({ status: "failed", error: INTERRUPTED_ERROR, next_attempt_at: null })
    .eq("status", "publishing")
    .lt("claimed_at", stuckBeforeIso)
    .select("post_id");
  for (const r of interrupted ?? []) touched.add(r.post_id as string);

  // 1b. Posts left "publishing" for a while get their status recomputed, in
  //     case an earlier run couldn't (a failed read leaves the post as it was).
  const { data: lingering } = await db
    .from("posts")
    .select("id")
    .eq("status", "publishing")
    .lt("updated_at", stuckBeforeIso)
    .limit(50);
  for (const r of lingering ?? []) touched.add(r.id as string);

  // 2. Due scheduled posts start publishing.
  const { data: due } = await db
    .from("posts")
    .update({ status: "publishing", updated_at: nowIso })
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .select("id");
  for (const r of due ?? []) touched.add(r.id as string);

  // 3. Queue: first attempts (targets of publishing posts), then due retries.
  const [{ data: firstAttempts }, { data: retries }] = await Promise.all([
    db
      .from("post_targets")
      .select("id, post_id, posts!inner(status)")
      .eq("status", "scheduled")
      .eq("posts.status", "publishing")
      .limit(200),
    db
      .from("post_targets")
      .select("id, post_id, posts!inner(status)")
      .eq("status", "failed")
      // A cancelled (draft) post's retries never run (also re-checked on claim).
      .neq("posts.status", "draft")
      .lt("attempts", MAX_ATTEMPTS)
      .not("next_attempt_at", "is", null)
      .lte("next_attempt_at", nowIso)
      .limit(200),
  ]);
  const queue = [
    ...(firstAttempts ?? []).map((t) => ({ id: t.id as string, postId: t.post_id as string, from: "scheduled" as const })),
    ...(retries ?? []).map((t) => ({ id: t.id as string, postId: t.post_id as string, from: "failed" as const })),
  ];

  // 4. Claim + send one target at a time, within the time budget.
  const posts = new Map<string, { post: PostRow; media: MediaItem[] } | null>();
  const access = new Map<string, boolean>();
  let processed = 0;
  for (const item of queue) {
    if (Date.now() - startedAt > START_BUDGET_MS) break;
    if (!(await claimTarget(db, item.id, item.from, nowIso))) continue;
    touched.add(item.postId);
    processed++;

    // Everything up to the send is safe to retry: if a read fails, put the
    // target back for the next run (results are only cached on success).
    let loaded: { post: PostRow; media: MediaItem[] } | null;
    let target: TargetRow | null;
    let allowed: boolean;
    try {
      if (!posts.has(item.postId)) {
        const { data: post, error } = await db.from("posts").select(POST_COLUMNS).eq("id", item.postId).maybeSingle();
        if (error) throw new RetryLater(`post ${item.postId}: ${error.message}`);
        posts.set(item.postId, post ? { post: post as PostRow, media: await loadMedia(db, item.postId) } : null);
      }
      loaded = posts.get(item.postId) ?? null;
      target = await loadTarget(db, item.id);
      if (!loaded || !target) {
        // Deleted between queueing and claiming: nothing to send.
        await releaseClaim(db, item.id, item.from);
        continue;
      }
      if (loaded.post.status === "draft") {
        // Cancelled between queueing and claiming: park the target with it.
        await db.from("post_targets").update({ status: "draft", next_attempt_at: null }).eq("id", item.id).eq("status", "publishing");
        continue;
      }
      const orgId = loaded.post.org_id;
      if (!access.has(orgId)) {
        // The plan may belong to the workspace this one is billed through.
        // accessRowFor throws on a database error, which lands in the catch.
        access.set(orgId, orgHasAccess(await accessRowFor(orgId)));
      }
      allowed = access.get(orgId)!;
    } catch (e) {
      console.error(`[publish] retrying ${item.id} next run:`, e instanceof Error ? e.message : e);
      await releaseClaim(db, item.id, item.from);
      continue;
    }

    // Only ever download the workspace's own stored files (lib/media-urls.ts):
    // a stored media URL is member-supplied, and the adapters fetch it
    // server-side. Checked at save time too; this covers anything older.
    const foreignMedia = [
      ...loaded.media.map((m) => m.url),
      ...(loaded.post.youtube_options?.thumbnailUrl ? [loaded.post.youtube_options.thumbnailUrl] : []),
    ].some((url) => !isOwnMediaUrl(url, loaded.post.org_id));
    if (foreignMedia) {
      await db
        .from("post_targets")
        .update({
          status: "failed",
          error: "An attached file isn't stored in this workspace. Open the post, remove it and attach it again.",
          next_attempt_at: null,
        })
        .eq("id", target.id);
      continue;
    }

    // Defence in depth with the post_targets trigger (0056): never send through
    // a channel that isn't in the post's own workspace.
    if (target.channels && target.channels.org_id !== loaded.post.org_id) {
      console.error(`[publish] refusing ${target.id}: channel ${target.channels.id} is not in post ${loaded.post.id}'s workspace`);
      await db
        .from("post_targets")
        .update({ status: "failed", error: "This channel doesn't belong to the post's workspace.", next_attempt_at: null })
        .eq("id", target.id);
      continue;
    }

    if (!allowed) {
      await db
        .from("post_targets")
        .update({ status: "failed", error: NO_PLAN_MESSAGE, next_attempt_at: null })
        .eq("id", target.id);
      continue;
    }

    try {
      await publishTarget(db, target, loaded.post, loaded.media);
    } catch (e) {
      if (e instanceof RetryLater) {
        // Raised before anything was sent (e.g. the X link check couldn't run).
        console.error(`[publish] retrying ${item.id} next run:`, e.message);
        await releaseClaim(db, item.id, item.from);
        continue;
      }
      // Outcome unknown (it may have gone out). Leave it claimed: the interrupted
      // sweep fails it for the user to check, and the rest of the queue carries on.
    }
  }

  // 5. Roll target outcomes up to each touched post, then spawn the next
  //    occurrence for any repeating post that just published.
  const failedPosts: string[] = [];
  for (const postId of touched) {
    const status = await recomputePostStatus(db, postId);
    if (status) await spawnRepeatIfDue(db, postId);
    if (status === "failed") failedPosts.push(postId);
  }
  // One email per person per run; each post once per failure (keyed by claim).
  await notifyPostsFailed(failedPosts);

  return { processed };
}
