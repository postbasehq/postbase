"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";

/**
 * Commits a post the agent proposed. This is the ONLY path that actually writes
 * a scheduled/draft post from the agent surface — it runs when the human clicks
 * "Schedule" on a proposal card, never automatically. Mirrors the composer's
 * createPost (post + targets + media), session-scoped so RLS enforces the org.
 */
export type ConfirmProposal = {
  body: string;
  thread: string[];
  channelIds: string[];
  scheduledAt: string | null;
  media: { url: string; type: string }[];
  variants?: Record<string, string>;
};

export async function scheduleProposedPost(
  proposal: ConfirmProposal,
): Promise<{ ok: true; postId: string; status: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return { ok: false, error: "No workspace found." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const segments = [proposal.body, ...(proposal.thread ?? [])]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);
  if (segments.length === 0) return { ok: false, error: "Nothing to post." };

  const channelIds = (proposal.channelIds ?? []).filter(Boolean);
  if (channelIds.length === 0) return { ok: false, error: "Pick at least one channel." };

  const scheduledAt = proposal.scheduledAt ? new Date(proposal.scheduledAt) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    return { ok: false, error: "That schedule time isn't valid." };
  }
  const scheduledIso = scheduledAt ? scheduledAt.toISOString() : null;
  const status = scheduledIso ? "scheduled" : "draft";

  // Only allow targeting channels in the user's own org (RLS-scoped read).
  const { data: owned } = await supabase.from("channels").select("id").in("id", channelIds);
  const ownedIds = new Set((owned ?? []).map((c) => c.id));
  if (channelIds.some((id) => !ownedIds.has(id))) {
    return { ok: false, error: "One of those channels isn't in this workspace." };
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      org_id: orgId,
      author_id: user?.id ?? null,
      body: segments[0],
      thread_tail: segments.slice(1),
      scheduled_at: scheduledIso,
      status,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const variants = proposal.variants ?? {};
  const { error: targetErr } = await supabase.from("post_targets").insert(
    channelIds.map((channel_id) => ({
      post_id: post.id,
      channel_id,
      status,
      variant_body: variants[channel_id]?.trim() ? variants[channel_id] : null,
    })),
  );
  if (targetErr) return { ok: false, error: targetErr.message };

  const media = (proposal.media ?? []).filter((m) => m?.url);
  if (media.length > 0) {
    await supabase
      .from("media")
      .insert(media.map((m) => ({ post_id: post.id, storage_url: m.url, type: m.type })));
  }

  revalidatePath("/queue");
  revalidatePath("/drafts");
  return { ok: true, postId: post.id, status };
}
