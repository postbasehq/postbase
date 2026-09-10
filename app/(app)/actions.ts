"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";

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

  revalidatePath("/dashboard");
  revalidatePath("/composer");
  redirect("/dashboard");
}
