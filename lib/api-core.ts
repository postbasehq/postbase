import { createAdminClient } from "@/lib/supabase/admin";
import { cancelPostForOrg, type CancelOutcome } from "@/lib/publish/cancel";
import { firstBlockingProblem, pastTimeProblem } from "@/lib/post-validation";
import { hasAccess, NO_PLAN_MESSAGE } from "@/lib/billing-guard";
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

export type CreatePostInput = {
  body?: string;
  thread?: string[];
  channelIds: string[];
  scheduledAt: string | null;
};

export async function createPost(orgId: string, input: CreatePostInput) {
  const db = createAdminClient();
  // A thread (array) takes precedence; otherwise the single body.
  const segments = (
    input.thread && input.thread.length ? input.thread : [input.body ?? ""]
  )
    .map((s) => String(s).trim())
    .filter(Boolean);
  if (segments.length === 0) throw new Error("body (or thread) is required");
  const body = segments[0];
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

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null;
  const status = scheduledAt ? "scheduled" : "draft";
  if (status === "scheduled" && !(await hasAccess(db, orgId))) throw new Error(NO_PLAN_MESSAGE);
  if (scheduledAt) {
    // Same checks as the composer: fail now, not when it's due. API posts
    // carry no media, so networks that need it (Instagram, TikTok, YouTube)
    // are refused here with a clear reason.
    const problem = pastTimeProblem(scheduledAt) ?? firstBlockingProblem(platforms.map((platform) => ({ platform, parts: segments })), []);
    if (problem) throw new Error(problem);
  }

  const { data: post, error } = await db
    .from("posts")
    .insert({ org_id: orgId, body, thread_tail: threadTail, scheduled_at: scheduledAt, status })
    .select("id, body, scheduled_at, status")
    .single();
  if (error) throw new Error(error.message);

  if (channelIds.length > 0) {
    const { error: tErr } = await db
      .from("post_targets")
      .insert(channelIds.map((channel_id) => ({ post_id: post.id, channel_id, status })));
    if (tErr) throw new Error(tErr.message);
  }

  // The cron poller publishes scheduled posts when due — no event needed.
  // Over the X link allowance? Say so now; the publisher enforces it when due.
  const warning = status === "scheduled" ? await xLinkWarningFor(orgId, channelIds, segments, scheduledAt) : null;
  return warning ? { ...post, warning } : post;
}

/** Cancel a post back to a draft (see lib/publish/cancel.ts). */
export async function cancelPost(orgId: string, postId: string): Promise<CancelOutcome> {
  return cancelPostForOrg(orgId, postId);
}
