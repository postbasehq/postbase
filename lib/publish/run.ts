import { createAdminClient } from "@/lib/supabase/admin";
import { publish } from "@/lib/publish/adapters";

type TargetRow = {
  id: string;
  status: string;
  platform_post_id: string | null;
  variant_body: string | null;
  channels: {
    id: string;
    platform: string;
    handle: string | null;
    encrypted_tokens: string | null;
    token_expiry: string | null;
  } | null;
};

// A post claimed but not finished within this window is treated as stranded (its
// run crashed or timed out) and re-claimed on the next poll.
const STUCK_AFTER_MS = 5 * 60_000;

/**
 * Publish all posts whose scheduled time has passed. Called by the cron poller.
 *
 * Concurrency-safe: due posts are claimed by atomically flipping scheduled -> publishing
 * (Postgres row locks mean an overlapping run can't claim the same post twice).
 *
 * At-least-once with dedupe: if a run dies mid-publish, the post is stranded in
 * `publishing`; a later poll re-claims it once it's older than STUCK_AFTER_MS, and
 * targets that already have a platform_post_id are skipped so nothing double-posts.
 */
export async function publishDuePosts(): Promise<{ processed: number }> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();
  const stuckBeforeIso = new Date(Date.now() - STUCK_AFTER_MS).toISOString();

  // Claim due scheduled posts in one atomic update. `updated_at` timestamps the claim
  // so a stranded post can be recognised later.
  const { data: claimed } = await db
    .from("posts")
    .update({ status: "publishing", updated_at: nowIso })
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .select("id, body, thread_tail");

  // Re-claim posts stranded in `publishing` past the stuck window (crashed/timed-out runs).
  // Re-stamp updated_at so overlapping polls can't grab the same straggler.
  const { data: reclaimed } = await db
    .from("posts")
    .update({ status: "publishing", updated_at: nowIso })
    .eq("status", "publishing")
    .lt("updated_at", stuckBeforeIso)
    .select("id, body, thread_tail");

  const posts = [...(claimed ?? []), ...(reclaimed ?? [])] as {
    id: string;
    body: string;
    thread_tail: string[] | null;
  }[];

  for (const post of posts) {
    const { data: mediaData } = await db
      .from("media")
      .select("storage_url, type")
      .eq("post_id", post.id);
    const media = (mediaData ?? []).map((m) => ({ url: m.storage_url, type: m.type }));

    const { data: targetsData } = await db
      .from("post_targets")
      .select("id, status, platform_post_id, variant_body, channels(id, platform, handle, encrypted_tokens, token_expiry)")
      .eq("post_id", post.id);
    const targets = (targetsData ?? []) as unknown as TargetRow[];

    const results: boolean[] = [];
    for (const t of targets) {
      // Dedupe: a target that already went out (has a platform post id) is done —
      // never re-publish it, even when the post is being re-claimed after a crash.
      // Normalise its status in case a prior run died before marking it published.
      if (t.platform_post_id) {
        if (t.status !== "published") {
          await db.from("post_targets").update({ status: "published", error: null }).eq("id", t.id);
        }
        results.push(true);
        continue;
      }

      await db.from("post_targets").update({ status: "publishing" }).eq("id", t.id);

      const body = t.variant_body ?? post.body ?? "";
      // A per-channel variant is a single tweet; otherwise post the full thread.
      const threadTail = t.variant_body ? [] : (post.thread_tail ?? []);
      const result = await publish({
        platform: t.channels?.platform ?? "",
        body,
        threadTail,
        media,
        channelId: t.channels?.id ?? "",
        handle: t.channels?.handle ?? null,
        encryptedTokens: t.channels?.encrypted_tokens ?? null,
        tokenExpiry: t.channels?.token_expiry ?? null,
      });
      if (result.ok) {
        await db
          .from("post_targets")
          .update({ status: "published", platform_post_id: result.platformPostId, error: null })
          .eq("id", t.id);
      } else {
        await db.from("post_targets").update({ status: "failed", error: result.error }).eq("id", t.id);
      }
      results.push(result.ok);
    }

    const status = results.some((r) => !r) ? "failed" : "published";
    await db.from("posts").update({ status, updated_at: new Date().toISOString() }).eq("id", post.id);
  }

  return { processed: posts.length };
}
