"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { inngest } from "@/lib/inngest/client";

const PLATFORMS = ["x", "linkedin", "instagram", "youtube"] as const;

/** Add a channel (a stub connection for now — real OAuth lands in Phase 3). */
export async function addChannel(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const platform = String(formData.get("platform") ?? "");
  const handle = String(formData.get("handle") ?? "").trim();
  if (!PLATFORMS.includes(platform as (typeof PLATFORMS)[number])) {
    throw new Error("Pick a valid platform.");
  }

  const { error } = await supabase.from("channels").insert({
    org_id: orgId,
    platform,
    handle: handle || null,
    status: "stub",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/channels");
  revalidatePath("/composer");
}

/** Create a post targeting the selected channels, scheduled or draft. */
export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = String(formData.get("body") ?? "").trim();
  const scheduledRaw = String(formData.get("scheduled_at") ?? "").trim();
  const channelIds = formData.getAll("channels").map(String).filter(Boolean);

  if (!body) throw new Error("Write something to post.");

  const scheduledAt = scheduledRaw ? new Date(scheduledRaw).toISOString() : null;
  const status = scheduledAt ? "scheduled" : "draft";

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      org_id: orgId,
      author_id: user?.id ?? null,
      body,
      scheduled_at: scheduledAt,
      status,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (channelIds.length > 0) {
    // Only allow targeting channels in the user's own org. The channels read is
    // RLS-scoped, so this rejects any channel_id from another tenant.
    const { data: owned } = await supabase
      .from("channels")
      .select("id")
      .in("id", channelIds);
    const ownedIds = new Set((owned ?? []).map((c) => c.id));
    if (channelIds.some((id) => !ownedIds.has(id))) {
      throw new Error("Invalid channel selection.");
    }

    const targets = channelIds.map((channel_id) => ({
      post_id: post.id,
      channel_id,
      status,
    }));
    const { error: targetErr } = await supabase.from("post_targets").insert(targets);
    if (targetErr) throw new Error(targetErr.message);
  }

  // Hand the scheduled post to the Inngest publish loop.
  if (status === "scheduled") {
    try {
      await inngest.send({
        name: "post/scheduled",
        data: { postId: post.id, scheduledAt },
      });
    } catch {
      // Inngest not running (e.g. local without the dev server) — the post is still
      // saved as scheduled; publishing just won't fire until Inngest is available.
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/composer");
  redirect("/dashboard");
}

/** Edit a post: update body/channels/schedule, and reschedule the Inngest job. */
export async function updatePost(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const postId = String(formData.get("post_id") ?? "");
  if (!postId) throw new Error("Missing post id.");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Write something to post.");
  const scheduledRaw = String(formData.get("scheduled_at") ?? "").trim();
  const channelIds = formData.getAll("channels").map(String).filter(Boolean);

  const scheduledAt = scheduledRaw ? new Date(scheduledRaw).toISOString() : null;
  const status = scheduledAt ? "scheduled" : "draft";

  // Update the post, scoped to the org, and confirm it was ours.
  const { data: updated, error } = await supabase
    .from("posts")
    .update({ body, scheduled_at: scheduledAt, status })
    .eq("id", postId)
    .eq("org_id", orgId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) return;

  // Validate channels belong to the org, then replace the targets.
  if (channelIds.length > 0) {
    const { data: owned } = await supabase
      .from("channels")
      .select("id")
      .in("id", channelIds);
    const ownedIds = new Set((owned ?? []).map((c) => c.id));
    if (channelIds.some((id) => !ownedIds.has(id))) {
      throw new Error("Invalid channel selection.");
    }
  }
  await supabase.from("post_targets").delete().eq("post_id", postId);
  if (channelIds.length > 0) {
    const { error: tErr } = await supabase
      .from("post_targets")
      .insert(channelIds.map((channel_id) => ({ post_id: postId, channel_id, status })));
    if (tErr) throw new Error(tErr.message);
  }

  // Cancel any in-flight scheduled job, then re-schedule with the new details.
  try {
    await inngest.send({ name: "post/cancelled", data: { postId } });
    if (status === "scheduled") {
      await inngest.send({ name: "post/scheduled", data: { postId, scheduledAt } });
    }
  } catch {
    // Inngest unavailable — the post is saved; publishing fires once it's up.
  }

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  redirect("/dashboard");
}

/** Cancel a scheduled post: stop the Inngest job and return it to draft. */
export async function cancelPost(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const postId = String(formData.get("post_id") ?? "");
  if (!postId) throw new Error("Missing post id.");

  // Scope the update to the caller's org and confirm it actually hit a row before
  // doing anything else — otherwise a known post id from another tenant could be
  // cancelled.
  const { data: updated, error } = await supabase
    .from("posts")
    .update({ status: "draft", scheduled_at: null })
    .eq("id", postId)
    .eq("org_id", orgId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) {
    // Not this user's post (or gone) — do nothing.
    return;
  }

  await supabase.from("post_targets").update({ status: "draft" }).eq("post_id", postId);

  try {
    await inngest.send({ name: "post/cancelled", data: { postId } });
  } catch {
    // Inngest not running — status is already reverted; nothing else to do.
  }

  revalidatePath("/dashboard");
}
