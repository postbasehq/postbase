import { createAdminClient } from "@/lib/supabase/admin";
import { publish } from "@/lib/publish/adapters";
import type { TikTokPostOptions } from "@/lib/platforms/tiktok";
import { isRepeatEvery, nextOccurrence } from "@/lib/publish/repeat";
import { NO_PLAN_MESSAGE, orgHasAccess, type OrgAccessRow } from "@/lib/billing-guard";

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
  org_id: string;
  body: string;
  thread_tail: string[] | null;
  tiktok_privacy_level: string | null;
  tiktok_options: TikTokPostOptions | null;
};
type MediaItem = { url: string; type: string };

// A target claimed but not finished within this window was interrupted mid-send
// (the function was killed). Must exceed the cron's maxDuration so a live run is
// never mistaken for a dead one.
const STUCK_AFTER_MS = 10 * 60_000;
// Stop claiming new targets after this long, leaving headroom under the cron's
// maxDuration (300s) for in-flight uploads/polls to finish. The rest wait for
// the next run.
const START_BUDGET_MS = 180_000;
const INTERRUPTED_ERROR =
  "Publishing was interrupted before we could confirm it went out. Check the channel — if the post isn't there, hit Retry.";
const POST_COLUMNS = "id, org_id, body, thread_tail, tiktok_privacy_level, tiktok_options";
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

async function loadTarget(db: Db, targetId: string): Promise<TargetRow | null> {
  const { data } = await db
    .from("post_targets")
    .select(
      "id, status, platform_post_id, variant_body, attempts, channels(id, platform, handle, encrypted_tokens, token_expiry)",
    )
    .eq("id", targetId)
    .maybeSingle();
  return (data ?? null) as unknown as TargetRow | null;
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
    tiktokOptions: post.tiktok_options,
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
    .select("org_id, author_id, body, thread_tail, tiktok_privacy_level, tiktok_options, scheduled_at, repeat_every")
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
      tiktok_options: origin.tiktok_options,
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
      .select("id, post_id")
      .eq("status", "failed")
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

    if (!posts.has(item.postId)) {
      const { data: post } = await db.from("posts").select(POST_COLUMNS).eq("id", item.postId).maybeSingle();
      posts.set(item.postId, post ? { post: post as PostRow, media: await loadMedia(db, item.postId) } : null);
    }
    const loaded = posts.get(item.postId);
    const target = await loadTarget(db, item.id);
    if (!loaded || !target) continue;

    const orgId = loaded.post.org_id;
    if (!access.has(orgId)) {
      const { data: org } = await db
        .from("orgs")
        .select("subscription_status, comped")
        .eq("id", orgId)
        .maybeSingle();
      access.set(orgId, orgHasAccess(org as OrgAccessRow | null));
    }
    if (!access.get(orgId)) {
      await db
        .from("post_targets")
        .update({ status: "failed", error: NO_PLAN_MESSAGE, next_attempt_at: null })
        .eq("id", target.id);
      continue;
    }

    try {
      await publishTarget(db, target, loaded.post, loaded.media);
    } catch {
      // Outcome unknown (it may have gone out). Leave it claimed: the interrupted
      // sweep fails it for the user to check, and the rest of the queue carries on.
    }
  }

  // 5. Roll target outcomes up to each touched post, then spawn the next
  //    occurrence for any repeating post that just published.
  for (const postId of touched) {
    await recomputePostStatus(db, postId);
    await spawnRepeatIfDue(db, postId);
  }

  return { processed };
}
