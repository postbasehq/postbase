import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";

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
  if (channelIds.length > 0) {
    const { data: owned } = await db
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
      .in("id", channelIds);
    const ownedIds = new Set((owned ?? []).map((c) => c.id));
    if (channelIds.some((id) => !ownedIds.has(id))) {
      throw new Error("one or more channel_ids are invalid for this workspace");
    }
  }

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt).toISOString() : null;
  const status = scheduledAt ? "scheduled" : "draft";

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

  if (status === "scheduled") {
    try {
      await inngest.send({ name: "post/scheduled", data: { postId: post.id, scheduledAt } });
    } catch {
      // Inngest unavailable — post is saved; publishing fires once Inngest is up.
    }
  }

  return post;
}

/** Returns true if a post was cancelled, false if it didn't exist in this org. */
export async function cancelPost(orgId: string, postId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data: updated, error } = await db
    .from("posts")
    .update({ status: "draft", scheduled_at: null })
    .eq("id", postId)
    .eq("org_id", orgId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) return false;

  await db.from("post_targets").update({ status: "draft" }).eq("post_id", postId);
  try {
    await inngest.send({ name: "post/cancelled", data: { postId } });
  } catch {
    // Inngest unavailable — status already reverted.
  }
  return true;
}
