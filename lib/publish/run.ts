import { createAdminClient } from "@/lib/supabase/admin";
import { publish } from "@/lib/publish/adapters";

type TargetRow = {
  id: string;
  variant_body: string | null;
  channels: {
    id: string;
    platform: string;
    handle: string | null;
    encrypted_tokens: string | null;
    token_expiry: string | null;
  } | null;
};

/**
 * Publish all posts whose scheduled time has passed. Called by the cron poller.
 *
 * Concurrency-safe: due posts are claimed by atomically flipping scheduled -> publishing
 * (Postgres row locks mean an overlapping run can't claim the same post twice).
 */
export async function publishDuePosts(): Promise<{ processed: number }> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  // Claim due scheduled posts in one atomic update.
  const { data: claimed } = await db
    .from("posts")
    .update({ status: "publishing" })
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .select("id, body, thread_tail");

  const posts = (claimed ?? []) as { id: string; body: string; thread_tail: string[] | null }[];

  for (const post of posts) {
    await db.from("post_targets").update({ status: "publishing" }).eq("post_id", post.id);

    const { data: targetsData } = await db
      .from("post_targets")
      .select("id, variant_body, channels(id, platform, handle, encrypted_tokens, token_expiry)")
      .eq("post_id", post.id);
    const targets = (targetsData ?? []) as unknown as TargetRow[];

    const results: boolean[] = [];
    for (const t of targets) {
      const body = t.variant_body ?? post.body ?? "";
      // A per-channel variant is a single tweet; otherwise post the full thread.
      const threadTail = t.variant_body ? [] : (post.thread_tail ?? []);
      const result = await publish({
        platform: t.channels?.platform ?? "",
        body,
        threadTail,
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
    await db.from("posts").update({ status }).eq("id", post.id);
  }

  return { processed: posts.length };
}
