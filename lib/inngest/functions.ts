import { inngest } from "./client";
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
 * Publishes a post at its scheduled time.
 * Flow: sleep until scheduled_at → mark publishing → publish each target via its
 * platform adapter → record per-target result → finalize the post status.
 * Cancellable: a "post/cancelled" event with the same postId aborts the run.
 */
export const publishPost = inngest.createFunction(
  {
    id: "publish-post",
    triggers: [{ event: "post/scheduled" }],
    cancelOn: [{ event: "post/cancelled", if: "event.data.postId == async.data.postId" }],
  },
  async ({ event, step }) => {
    const postId = event.data.postId as string;
    const scheduledAt = event.data.scheduledAt as string | null;

    // 1. wait until the scheduled time (fires immediately if already due)
    if (scheduledAt) {
      await step.sleepUntil("wait-for-scheduled-time", new Date(scheduledAt));
    }

    // 2. mark publishing + load targets
    const { post, targets } = await step.run("mark-publishing", async () => {
      const db = createAdminClient();
      await db.from("posts").update({ status: "publishing" }).eq("id", postId);
      await db.from("post_targets").update({ status: "publishing" }).eq("post_id", postId);
      const { data: post } = await db.from("posts").select("body, thread_tail").eq("id", postId).single();
      const { data: targets } = await db
        .from("post_targets")
        .select("id, variant_body, channels(id, platform, handle, encrypted_tokens, token_expiry)")
        .eq("post_id", postId);
      return { post, targets: (targets ?? []) as unknown as TargetRow[] };
    });

    // 3. publish each target (its own retryable step)
    const results: boolean[] = [];
    for (const t of targets) {
      const ok = await step.run(`publish-${t.id}`, async () => {
        const db = createAdminClient();
        const p = post as { body?: string; thread_tail?: string[] } | null;
        const body = t.variant_body ?? p?.body ?? "";
        // A per-channel variant is a single tweet; otherwise post the full thread.
        const threadTail = t.variant_body ? [] : (p?.thread_tail ?? []);
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
          await db
            .from("post_targets")
            .update({ status: "failed", error: result.error })
            .eq("id", t.id);
        }
        return result.ok;
      });
      results.push(ok);
    }

    // 4. finalize post status
    await step.run("finalize", async () => {
      const db = createAdminClient();
      const anyFailed = results.some((r) => !r);
      const status = anyFailed ? "failed" : "published";
      await db.from("posts").update({ status }).eq("id", postId);
    });

    return {
      postId,
      published: results.filter(Boolean).length,
      failed: results.filter((r) => !r).length,
    };
  },
);
