import { createAdminClient } from "@/lib/supabase/admin";

export type CancelOutcome =
  | { ok: true; /** Channels already mid-send: those can't be stopped and will finish. */ stillSending: number }
  | { ok: false; reason: "not_found" | "published" };

/**
 * Cancel a post back to a draft, scoped to the caller's workspace (the one
 * path for the app, the REST API, MCP and the agent).
 *
 * Race-safe with the publisher (lib/publish/run.ts), which claims a target by
 * flipping it from scheduled/failed to publishing:
 *  - Only unsent targets that aren't claimed are moved to draft, so after this
 *    no target of the post can be claimed again.
 *  - A target already claimed (mid-send) is left alone: the send can't be
 *    recalled, and overwriting it to draft used to let its outcome revive the
 *    post (a failure re-queued a retry). The publisher now also drops retries
 *    of draft posts, and editing is blocked while anything is still sending.
 *  - Targets that already went out stay published.
 */
export async function cancelPostForOrg(orgId: string, postId: string): Promise<CancelOutcome> {
  if (!postId) return { ok: false, reason: "not_found" };
  const db = createAdminClient();

  const { data: post, error: readErr } = await db
    .from("posts")
    .select("status")
    .eq("id", postId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!post) return { ok: false, reason: "not_found" };
  if (post.status === "published") return { ok: false, reason: "published" };

  if (post.status !== "draft") {
    const { error } = await db
      .from("posts")
      .update({ status: "draft", scheduled_at: null })
      .eq("id", postId)
      .eq("org_id", orgId)
      .in("status", ["scheduled", "publishing", "failed"]);
    if (error) throw new Error(error.message);
  }

  const { error: targetErr } = await db
    .from("post_targets")
    .update({ status: "draft", next_attempt_at: null })
    .eq("post_id", postId)
    .in("status", ["scheduled", "failed"])
    .is("platform_post_id", null);
  if (targetErr) throw new Error(targetErr.message);

  const { data: sending } = await db
    .from("post_targets")
    .select("id")
    .eq("post_id", postId)
    .eq("status", "publishing");
  return { ok: true, stillSending: sending?.length ?? 0 };
}

export function cancelMessage(outcome: CancelOutcome): string {
  if (!outcome.ok) {
    return outcome.reason === "published" ? "This post has already been published." : "Post not found.";
  }
  return outcome.stillSending
    ? `Cancelled. ${outcome.stillSending === 1 ? "One channel was" : `${outcome.stillSending} channels were`} already being sent and will finish.`
    : "Cancelled.";
}
