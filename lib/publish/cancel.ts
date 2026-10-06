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

export type EditHold = { ok: true; release: () => Promise<void> } | { ok: false };

type HeldTarget = {
  id: string;
  status: string;
  next_attempt_at: string | null;
  platform_post_id: string | null;
  pending_ref: string | null;
  thread_ids: string[] | null;
};

const sentOrSending = (t: Omit<HeldTarget, "id" | "next_attempt_at">) =>
  t.status === "publishing" ||
  t.status === "published" ||
  !!t.platform_post_id ||
  !!t.pending_ref ||
  (t.thread_ids?.length ?? 0) > 0;

/**
 * Hold a post still while it's edited, so the publisher can't send it between
 * the edit's checks and its rewrite (which deletes and recreates the targets:
 * a target claimed in that gap would go out now and again at the new time).
 *
 * Uses the same fences as cancelling: the post becomes a draft (the publisher
 * never starts a draft, and drops claims it makes on one), and its unclaimed
 * targets are parked as drafts so none can be claimed. Anything already
 * claimed, sent or still processing on the network means the edit can't go
 * ahead: the hold is released and `ok: false` returned.
 *
 * On `ok: true` the caller rewrites the post (setting its new status) or calls
 * `release()` to put everything back as it was.
 */
export async function holdPostForEdit(orgId: string, postId: string): Promise<EditHold> {
  const db = createAdminClient();

  const { data: post, error: readErr } = await db
    .from("posts")
    .select("status")
    .eq("id", postId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!post || !["draft", "scheduled", "failed"].includes(post.status as string)) return { ok: false };
  const from = post.status as string;

  if (from !== "draft") {
    // Conditional on the status we read: if the publisher started it meanwhile, back off.
    const { data: held, error } = await db
      .from("posts")
      .update({ status: "draft" })
      .eq("id", postId)
      .eq("org_id", orgId)
      .eq("status", from)
      .select("id");
    if (error) throw new Error(error.message);
    if (!held?.length) return { ok: false };
  }

  const { data: before, error: beforeErr } = await db
    .from("post_targets")
    .select("id, status, next_attempt_at, platform_post_id, pending_ref, thread_ids")
    .eq("post_id", postId);
  // The post is already held: put it back before bailing.
  const restorePost = async () => {
    if (from === "draft") return;
    await db.from("posts").update({ status: from }).eq("id", postId).eq("org_id", orgId).eq("status", "draft");
  };
  if (beforeErr) {
    await restorePost();
    throw new Error(beforeErr.message);
  }
  // Targets that were waiting to send; on release they go back to waiting.
  const waiting = ((before ?? []) as HeldTarget[]).filter(
    (t) => (t.status === "scheduled" || t.status === "failed") && !sentOrSending(t),
  );

  const release = async () => {
    const scheduled = waiting.filter((t) => t.status === "scheduled").map((t) => t.id);
    if (scheduled.length > 0) {
      await db.from("post_targets").update({ status: "scheduled" }).in("id", scheduled).eq("status", "draft");
    }
    for (const t of waiting.filter((w) => w.status === "failed")) {
      await db
        .from("post_targets")
        .update({ status: "failed", next_attempt_at: t.next_attempt_at })
        .eq("id", t.id)
        .eq("status", "draft");
    }
    await restorePost();
  };

  const { error: parkErr } = await db
    .from("post_targets")
    .update({ status: "draft", next_attempt_at: null })
    .eq("post_id", postId)
    .in("status", ["scheduled", "failed"])
    .is("platform_post_id", null)
    .is("pending_ref", null);
  if (parkErr) {
    await release();
    throw new Error(parkErr.message);
  }

  // Nothing new can be claimed now. Anything claimed before the hold is
  // mid-send (or already out), and rewriting its target would send it twice.
  const { data: after, error: afterErr } = await db
    .from("post_targets")
    .select("status, platform_post_id, pending_ref, thread_ids")
    .eq("post_id", postId);
  if (afterErr || ((after ?? []) as HeldTarget[]).some(sentOrSending)) {
    await release();
    if (afterErr) throw new Error(afterErr.message);
    return { ok: false };
  }
  return { ok: true, release };
}
