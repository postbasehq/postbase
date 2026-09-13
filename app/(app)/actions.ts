"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";

const TIKTOK_PRIVACY = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
];

/** Parse the TikTok privacy level, or null if absent/invalid (server default applies). */
function parseTiktokPrivacy(formData: FormData): string | null {
  const v = String(formData.get("tiktok_privacy_level") ?? "");
  return TIKTOK_PRIVACY.includes(v) ? v : null;
}

/** Parse the composer's `thread` JSON field into non-empty, trimmed tweet segments. */
function parseThread(formData: FormData): string[] {
  const raw = formData.get("thread");
  if (raw != null) {
    try {
      const arr = JSON.parse(String(raw));
      if (Array.isArray(arr)) return arr.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      // fall through to body
    }
  }
  const body = String(formData.get("body") ?? "").trim();
  return body ? [body] : [];
}

/** Parse the `media` JSON field into {url, type} items. */
function parseMedia(formData: FormData): { url: string; type: string }[] {
  const raw = formData.get("media");
  if (raw == null) return [];
  try {
    const arr = JSON.parse(String(raw));
    if (Array.isArray(arr)) {
      return arr
        .filter((m) => m && typeof m.url === "string")
        .map((m) => ({ url: String(m.url), type: String(m.type ?? "") }));
    }
  } catch {
    // ignore
  }
  return [];
}

/** Parse the `variants` JSON field into a channelId -> non-empty text map. */
function parseVariants(formData: FormData): Record<string, string> {
  const raw = formData.get("variants");
  if (raw == null) return {};
  try {
    const obj = JSON.parse(String(raw));
    if (obj && typeof obj === "object") {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) {
        const s = String(v).trim();
        if (s) out[k] = s;
      }
      return out;
    }
  } catch {
    // ignore
  }
  return {};
}

/** Disconnect a channel — removes it (and its per-channel history) from the org. */
export async function disconnectChannel(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const channelId = String(formData.get("channel_id") ?? "");
  if (!channelId) throw new Error("Missing channel id.");

  // Scoped to the caller's org (RLS + explicit check). post_targets cascade-delete.
  const { error } = await supabase
    .from("channels")
    .delete()
    .eq("id", channelId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/channels");
  revalidatePath("/composer");
  revalidatePath("/dashboard");
}

/** Create a post targeting the selected channels, scheduled or draft. */
export async function createPost(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const segments = parseThread(formData);
  if (segments.length === 0) throw new Error("Write something to post.");
  const scheduledRaw = String(formData.get("scheduled_at") ?? "").trim();
  const channelIds = formData.getAll("channels").map(String).filter(Boolean);

  const scheduledAt = scheduledRaw ? new Date(scheduledRaw).toISOString() : null;
  const status = scheduledAt ? "scheduled" : "draft";

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      org_id: orgId,
      author_id: user?.id ?? null,
      body: segments[0],
      thread_tail: segments.slice(1),
      scheduled_at: scheduledAt,
      status,
      tiktok_privacy_level: parseTiktokPrivacy(formData),
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

    const variants = parseVariants(formData);
    const targets = channelIds.map((channel_id) => ({
      post_id: post.id,
      channel_id,
      variant_body: variants[channel_id] ?? null,
      status,
    }));
    const { error: targetErr } = await supabase.from("post_targets").insert(targets);
    if (targetErr) throw new Error(targetErr.message);
  }

  const media = parseMedia(formData);
  if (media.length > 0) {
    await supabase
      .from("media")
      .insert(media.map((m) => ({ post_id: post.id, storage_url: m.url, type: m.type })));
  }

  // The cron poller publishes scheduled posts when their time arrives — no event needed.

  revalidatePath("/dashboard");
  revalidatePath("/composer");
  redirect("/dashboard");
}

/** Edit a post: update body/channels/schedule. The poller picks up the new time. */
export async function updatePost(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const postId = String(formData.get("post_id") ?? "");
  if (!postId) throw new Error("Missing post id.");

  const segments = parseThread(formData);
  if (segments.length === 0) throw new Error("Write something to post.");
  const scheduledRaw = String(formData.get("scheduled_at") ?? "").trim();
  const channelIds = formData.getAll("channels").map(String).filter(Boolean);

  const scheduledAt = scheduledRaw ? new Date(scheduledRaw).toISOString() : null;
  const status = scheduledAt ? "scheduled" : "draft";

  // Update the post, scoped to the org, and confirm it was ours.
  const { data: updated, error } = await supabase
    .from("posts")
    .update({
      body: segments[0],
      thread_tail: segments.slice(1),
      scheduled_at: scheduledAt,
      status,
      tiktok_privacy_level: parseTiktokPrivacy(formData),
    })
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
    const variants = parseVariants(formData);
    const { error: tErr } = await supabase.from("post_targets").insert(
      channelIds.map((channel_id) => ({
        post_id: postId,
        channel_id,
        variant_body: variants[channel_id] ?? null,
        status,
      })),
    );
    if (tErr) throw new Error(tErr.message);
  }

  await supabase.from("media").delete().eq("post_id", postId);
  const media = parseMedia(formData);
  if (media.length > 0) {
    await supabase
      .from("media")
      .insert(media.map((m) => ({ post_id: postId, storage_url: m.url, type: m.type })));
  }

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  redirect("/dashboard");
}

/** Re-queue a failed channel target for another delivery attempt. */
export async function retryTarget(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const targetId = String(formData.get("target_id") ?? "");
  if (!targetId) throw new Error("Missing target id.");

  // Reset the attempt counter and make it due now. RLS scopes this to the
  // caller's org, so a target id from another tenant hits nothing.
  const { data: updated } = await supabase
    .from("post_targets")
    .update({ status: "failed", error: null, attempts: 0, next_attempt_at: new Date().toISOString() })
    .eq("id", targetId)
    .eq("status", "failed")
    .select("post_id");

  if (updated?.[0]) {
    // Reflect that the post is being worked on again.
    await supabase.from("posts").update({ status: "publishing" }).eq("id", updated[0].post_id);
  }

  revalidatePath("/dashboard");
}

/** Cancel a scheduled post: return it to draft so the poller skips it. */
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

  revalidatePath("/dashboard");
}
