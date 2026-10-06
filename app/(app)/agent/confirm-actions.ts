"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertPostWhole } from "@/lib/publish/save-post";
import { firstBlockingProblem, pastTimeProblem } from "@/lib/post-validation";
import { isOwnMediaUrl } from "@/lib/media-urls";
import { getCurrentOrgId } from "@/lib/org";
import { schedulingProblem } from "@/lib/billing-guard";

/**
 * Commits a post the agent proposed. This is the ONLY path that actually writes
 * a scheduled/draft post from the agent surface — it runs when the human clicks
 * "Schedule" on a proposal card, never automatically. Mirrors the composer's
 * createPost (post + targets + media), scoped to the caller's workspace.
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
  if (status === "scheduled") {
    const blocked = await schedulingProblem(orgId);
    if (blocked) return { ok: false, error: blocked };
  }

  // Only allow targeting channels in this workspace; RLS alone would also accept
  // channels from the user's other workspaces.
  const { data: owned } = await supabase.from("channels").select("id, platform").eq("org_id", orgId).in("id", channelIds);
  const ownedIds = new Set((owned ?? []).map((c) => c.id));
  if (channelIds.some((id) => !ownedIds.has(id))) {
    return { ok: false, error: "One of those channels isn't in this workspace." };
  }
  // Same checks as the composer, so the agent can't schedule something a
  // network would reject or a time that has already passed.
  if (scheduledIso) {
    const variants = proposal.variants ?? {};
    const problem =
      pastTimeProblem(scheduledIso) ??
      firstBlockingProblem(
        (owned ?? []).map((c) => ({ platform: c.platform as string, parts: variants[c.id]?.trim() ? [variants[c.id].trim()] : segments })),
        (proposal.media ?? []).filter((m) => m?.url && isOwnMediaUrl(m.url, orgId)),
      );
    if (problem) return { ok: false, error: problem };
    // TikTok needs the user to pick who sees each post (and the disclosure
    // options), which only the composer asks for.
    if ((owned ?? []).some((c) => c.platform === "tiktok")) {
      return { ok: false, error: "Schedule TikTok posts from the composer, so you can choose who sees them." };
    }
  }

  // Written with the service role (members can only read posts, 0061),
  // scoped to the caller's workspace.
  const db = createAdminClient();
  const variants = proposal.variants ?? {};
  let post: { id: string };
  try {
    // Written as a draft and given its status last, so it's never left
    // scheduled with missing channels or media (lib/publish/save-post.ts).
    post = await insertPostWhole(
      db,
      {
        org_id: orgId,
        author_id: user?.id ?? null,
        body: segments[0],
        thread_tail: segments.slice(1),
        scheduled_at: scheduledIso,
      },
      status,
      channelIds.map((channel_id) => ({
        channel_id,
        variant_body: variants[channel_id]?.trim() ? variants[channel_id] : null,
      })),
      (proposal.media ?? []).filter((m) => m?.url && isOwnMediaUrl(m.url, orgId)),
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save the post." };
  }

  revalidatePath("/queue");
  revalidatePath("/drafts");
  return { ok: true, postId: post.id, status };
}
