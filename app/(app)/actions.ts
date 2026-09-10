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

/** Cancel a scheduled post: stop the Inngest job and return it to draft. */
export async function cancelPost(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const postId = String(formData.get("post_id") ?? "");
  if (!postId) throw new Error("Missing post id.");

  const { error } = await supabase
    .from("posts")
    .update({ status: "draft", scheduled_at: null })
    .eq("id", postId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  await supabase.from("post_targets").update({ status: "draft" }).eq("post_id", postId);

  try {
    await inngest.send({ name: "post/cancelled", data: { postId } });
  } catch {
    // Inngest not running — status is already reverted; nothing else to do.
  }

  revalidatePath("/dashboard");
}
