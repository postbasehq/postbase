"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId } from "@/lib/org";
import { encryptJson, decryptJson } from "@/lib/crypto";
import { revokeAccess as revokeTikTokAccess, type TikTokTokens } from "@/lib/platforms/tiktok";
import { revokeAccess as revokeXAccess, type XTokens } from "@/lib/platforms/x";
import { revokeAccess as revokeYouTubeAccess, type YouTubeTokens } from "@/lib/platforms/youtube";
import { revokeAccess as revokeMetaAccess, type MetaTokens } from "@/lib/platforms/meta";
import { atChannelLimit, atAiLimit } from "@/lib/billing-guard";
import { connectBluesky } from "@/lib/platforms/bluesky";
import { isRepeatEvery } from "@/lib/publish/repeat";
import {
  generateSoulImage,
  higgsfieldConfigured,
  isAspectRatio,
  isHiggsfieldUrl,
  pollStatus,
  startVideo,
} from "@/lib/higgsfield";

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

/**
 * TikTok Direct Post options (interaction toggles + commercial disclosure),
 * required by TikTok's Content Sharing Guidelines. Null unless the composer
 * emitted TikTok fields (i.e. a TikTok channel was selected).
 */
function parseTiktokOptions(formData: FormData): Record<string, boolean> | null {
  if (formData.get("tiktok_privacy_level") == null) return null;
  const on = (k: string) => formData.get(k) === "true";
  return {
    disableComment: on("tiktok_disable_comment"),
    disableDuet: on("tiktok_disable_duet"),
    disableStitch: on("tiktok_disable_stitch"),
    brandOrganic: on("tiktok_brand_organic"),
    brandedContent: on("tiktok_branded_content"),
  };
}

/** Parse the repeat cadence, or null if absent/invalid or the post isn't scheduled. */
function parseRepeatEvery(formData: FormData, scheduled: boolean): string | null {
  if (!scheduled) return null; // drafts don't repeat
  const v = String(formData.get("repeat_every") ?? "");
  return isRepeatEvery(v) ? v : null;
}

/**
 * Given a set of media URLs about to be freed by a post, return only the
 * storage paths that no *other* post still references — so deleting one
 * occurrence of a repeating post never removes a file a pending occurrence
 * (which shares the same storage_url) still needs.
 */
async function orphanedStoragePaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  urls: string[],
  excludePostId: string,
): Promise<string[]> {
  const clean = urls.filter(Boolean);
  if (clean.length === 0) return [];
  const { data } = await supabase
    .from("media")
    .select("storage_url")
    .in("storage_url", clean)
    .neq("post_id", excludePostId);
  const stillUsed = new Set((data ?? []).map((m) => m.storage_url));
  return clean
    .filter((u) => !stillUsed.has(u))
    .map((u) => u.split("/post-media/")[1])
    .filter(Boolean) as string[];
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

  // Best-effort: revoke the grant on the provider's side before we drop the row,
  // so disconnect truly de-authorizes Postbase (not just a local token delete).
  const { data: channel } = await supabase
    .from("channels")
    .select("platform, encrypted_tokens")
    .eq("id", channelId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (channel?.encrypted_tokens) {
    const enc = channel.encrypted_tokens;
    try {
      if (channel.platform === "tiktok") {
        await revokeTikTokAccess(decryptJson<TikTokTokens>(enc).access_token);
      } else if (channel.platform === "x") {
        await revokeXAccess(decryptJson<XTokens>(enc).access_token);
      } else if (channel.platform === "youtube") {
        const t = decryptJson<YouTubeTokens>(enc);
        await revokeYouTubeAccess(t.refresh_token ?? t.access_token);
      } else if (channel.platform === "instagram") {
        // Meta revoke needs the user token (Instagram channels store it).
        const t = decryptJson<MetaTokens>(enc);
        if (t.user_access_token) await revokeMetaAccess(t.user_access_token);
      }
    } catch {
      // Revoke is best-effort — never block disconnect on it.
    }
  }

  // Scoped to the caller's org (RLS + explicit check). post_targets cascade-delete.
  const { error } = await supabase
    .from("channels")
    .delete()
    .eq("id", channelId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/channels");
  revalidatePath("/composer");
  revalidatePath("/queue");
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

  // Backstop against double-submits: if an identical post was created in this
  // workspace in the last 15s, treat this as a duplicate click and don't insert
  // another. (The client also disables the button while submitting.)
  const { data: recent } = await supabase
    .from("posts")
    .select("id")
    .eq("org_id", orgId)
    .eq("body", segments[0])
    .gte("created_at", new Date(Date.now() - 15_000).toISOString())
    .limit(1);
  if (recent && recent.length > 0) {
    revalidatePath("/queue");
    redirect("/queue");
  }

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
      tiktok_options: parseTiktokOptions(formData),
      repeat_every: parseRepeatEvery(formData, status === "scheduled"),
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

  revalidatePath("/queue");
  revalidatePath("/composer");
  redirect("/queue");
}

/** Edit a post: update body/channels/schedule. The poller picks up the new time. */
export async function updatePost(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const postId = String(formData.get("post_id") ?? "");
  if (!postId) throw new Error("Missing post id.");

  // Guard: never edit a post that has already published to any channel (or is
  // mid-publish) — re-saving deletes/recreates targets and would republish
  // duplicates. Retrying a failed channel is handled by the queue Retry.
  const { data: current } = await supabase
    .from("posts")
    .select("status, post_targets(status, platform_post_id)")
    .eq("id", postId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!current) redirect("/queue"); // not ours / gone — bounce with feedback
  const anyDelivered = (
    (current.post_targets ?? []) as { status: string; platform_post_id: string | null }[]
  ).some((t) => t.status === "published" || t.platform_post_id);
  if (current.status === "published" || current.status === "publishing" || anyDelivered) {
    redirect("/queue");
  }

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
      tiktok_options: parseTiktokOptions(formData),
      repeat_every: parseRepeatEvery(formData, status === "scheduled"),
      // Editing re-arms the repeat: a rescheduled post hasn't published yet.
      repeat_next_spawned: false,
    })
    .eq("id", postId)
    .eq("org_id", orgId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) redirect("/queue");

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

  // Replace media rows, and delete any now-removed files from the bucket so they
  // don't orphan. Storage deletion needs the admin client (the bucket only allows
  // authenticated uploads, not deletes — see the security-hardening migration).
  const media = parseMedia(formData);
  const { data: oldMedia } = await supabase
    .from("media")
    .select("storage_url")
    .eq("post_id", postId);
  const keptUrls = new Set(media.map((m) => m.url));
  const removedUrls = (oldMedia ?? [])
    .map((m) => m.storage_url)
    .filter((u) => u && !keptUrls.has(u)) as string[];
  // Only delete files no other post (e.g. a repeat occurrence) still references.
  const removedPaths = await orphanedStoragePaths(supabase, removedUrls, postId);
  if (removedPaths.length > 0) {
    await createAdminClient().storage.from("post-media").remove(removedPaths);
  }

  await supabase.from("media").delete().eq("post_id", postId);
  if (media.length > 0) {
    await supabase
      .from("media")
      .insert(media.map((m) => ({ post_id: postId, storage_url: m.url, type: m.type })));
  }

  revalidatePath("/queue");
  revalidatePath("/calendar");
  redirect("/queue");
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

  revalidatePath("/queue");
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

  revalidatePath("/queue");
}

export async function deletePost(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const postId = String(formData.get("post_id") ?? "");
  if (!postId) throw new Error("Missing post id.");

  // Match Postiz: a post in any state can be deleted — this removes Postbase's
  // record (and media) only; it does NOT un-publish from the channel. Guard
  // `publishing` so we never delete a post mid-send and race the live poller.
  const { data: post } = await supabase
    .from("posts")
    .select("id, status")
    .eq("id", postId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!post || post.status === "publishing") return;

  // Remove any media files from the bucket (rows cascade with the post). Storage
  // deletes need the admin client — the bucket only allows authenticated uploads.
  const { data: media } = await supabase
    .from("media")
    .select("storage_url")
    .eq("post_id", postId);
  // Only delete files no other post (e.g. a repeat occurrence) still references.
  const paths = await orphanedStoragePaths(
    supabase,
    (media ?? []).map((m) => m.storage_url).filter(Boolean) as string[],
    postId,
  );
  if (paths.length > 0) {
    await createAdminClient().storage.from("post-media").remove(paths);
  }

  // post_targets + media rows cascade on delete (see 0001_init).
  await supabase.from("posts").delete().eq("id", postId).eq("org_id", orgId);

  revalidatePath("/drafts");
  revalidatePath("/queue");
  revalidatePath("/calendar");
}

export type ConnectBlueskyState = { ok?: boolean; error?: string };

/**
 * Connect a Bluesky account from a handle + app password (no OAuth redirect).
 * We validate by logging in, then store the credentials encrypted.
 */
export async function connectBlueskyChannel(
  _prev: ConnectBlueskyState,
  formData: FormData,
): Promise<ConnectBlueskyState> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return { error: "No workspace found for your account." };

  const handle = String(formData.get("handle") ?? "").trim();
  const appPassword = String(formData.get("app_password") ?? "").trim();
  if (!handle || !appPassword) return { error: "Enter your handle and an app password." };

  let connected;
  try {
    connected = await connectBluesky(handle, appPassword);
  } catch (e) {
    return {
      error: `Couldn't connect: ${e instanceof Error ? e.message : "check your handle and app password"}`,
    };
  }

  const { profile, ...tokens } = connected;
  const chHandle = `@${tokens.handle}`;
  const fields = {
    encrypted_tokens: encryptJson(tokens),
    status: "active",
    display_name: profile?.displayName ?? null,
    avatar_url: profile?.avatarUrl ?? null,
  };
  const { data: existing } = await supabase
    .from("channels")
    .select("id")
    .eq("org_id", orgId)
    .eq("platform", "bluesky")
    .eq("handle", chHandle)
    .maybeSingle();

  if (!existing && (await atChannelLimit(supabase, orgId))) {
    return { error: "You've reached your plan's channel limit. Upgrade in Billing to connect more." };
  }

  const { error } = existing
    ? await supabase.from("channels").update(fields).eq("id", existing.id)
    : await supabase.from("channels").insert({ org_id: orgId, platform: "bluesky", handle: chHandle, ...fields });
  if (error) return { error: "Couldn't save the channel — please try again." };

  revalidatePath("/channels");
  return { ok: true };
}

/**
 * Generate an image with Higgsfield (Soul) and persist it to durable storage,
 * returning a media item the composer can attach. Off until HIGGSFIELD_* keys
 * are set. Best-effort — a failure returns an error string, never throws.
 */
export async function generateAiImage(
  prompt: string,
  aspectRatio: string,
): Promise<{ ok: true; url: string; type: string } | { ok: false; error: string }> {
  if (!higgsfieldConfigured()) {
    return { ok: false, error: "Image generation isn't set up yet — add HIGGSFIELD_API_KEY." };
  }
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return { ok: false, error: "No workspace found." };
  const clean = (prompt ?? "").trim();
  if (!clean) return { ok: false, error: "Enter a prompt to generate an image." };
  const ratio = isAspectRatio(aspectRatio) ? aspectRatio : "1:1";

  if (await atAiLimit(supabase, orgId, "image")) {
    return { ok: false, error: "You've used all your AI images for this month. Upgrade your plan for more." };
  }

  try {
    const sourceUrl = await generateSoulImage(clean, ratio);
    const bytes = await fetch(sourceUrl).then((r) => {
      if (!r.ok) throw new Error(`Couldn't download the generated image (${r.status}).`);
      return r.arrayBuffer();
    });
    // Persist to our post-media bucket so the URL outlives Higgsfield's ~7-day expiry.
    const path = `ai/${orgId}/${crypto.randomUUID()}.jpg`;
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from("post-media")
      .upload(path, Buffer.from(bytes), { contentType: "image/jpeg", upsert: false });
    if (error) return { ok: false, error: "Generated the image but couldn't save it." };
    // Record usage (service role — can't be tampered with client-side).
    await admin.from("ai_generations").insert({ org_id: orgId, kind: "image" });
    const url = admin.storage.from("post-media").getPublicUrl(path).data.publicUrl;
    return { ok: true, url, type: "image/jpeg" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Image generation failed." };
  }
}

/**
 * Kick off an AI video generation (text-to-video, or image-to-video when an
 * image URL is given). Returns a status URL the client polls via pollAiVideo.
 * Video is slow, so we don't hold the request open — this just submits.
 */
export async function startAiVideo(
  prompt: string,
  aspectRatio: string,
  imageUrl?: string,
): Promise<{ ok: true; statusUrl: string } | { ok: false; error: string }> {
  if (!higgsfieldConfigured()) {
    return { ok: false, error: "Video generation isn't set up yet — add HIGGSFIELD_API_KEY." };
  }
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return { ok: false, error: "No workspace found." };
  const clean = (prompt ?? "").trim();
  if (!clean && !imageUrl) return { ok: false, error: "Enter a prompt (or pick an image to animate)." };
  const ratio = isAspectRatio(aspectRatio) ? aspectRatio : "9:16";

  if (await atAiLimit(supabase, orgId, "video")) {
    return { ok: false, error: "You've used all your AI videos for this month. Upgrade your plan for more." };
  }

  try {
    const { statusUrl } = await startVideo({ prompt: clean, aspectRatio: ratio, imageUrl });
    // Video is billed on submission, so record usage now (service role).
    await createAdminClient().from("ai_generations").insert({ org_id: orgId, kind: "video" });
    return { ok: true, statusUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't start the video." };
  }
}

/**
 * Poll a video job. While running, returns {status:"processing"}. On completion
 * it downloads the video and persists it to our bucket (so the URL outlives
 * Higgsfield's ~7-day expiry), returning a media item to attach.
 */
export async function pollAiVideo(
  statusUrl: string,
): Promise<{ status: "processing" } | { status: "done"; url: string; type: string } | { status: "error"; error: string }> {
  if (!higgsfieldConfigured()) return { status: "error", error: "Not configured." };
  const orgId = await getCurrentOrgId();
  if (!orgId) return { status: "error", error: "No workspace found." };
  // Only ever fetch Higgsfield's own status URLs with our auth header.
  if (!statusUrl || !isHiggsfieldUrl(statusUrl)) return { status: "error", error: "Invalid status URL." };
  try {
    const r = await pollStatus(statusUrl);
    if (!r.done) return { status: "processing" };
    if (r.error || !r.url) return { status: "error", error: r.error || "No video was returned." };
    const bytes = await fetch(r.url).then((res) => {
      if (!res.ok) throw new Error(`Couldn't download the video (${res.status}).`);
      return res.arrayBuffer();
    });
    const path = `ai/${orgId}/${crypto.randomUUID()}.mp4`;
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from("post-media")
      .upload(path, Buffer.from(bytes), { contentType: "video/mp4", upsert: false });
    if (error) return { status: "error", error: "Generated the video but couldn't save it." };
    const url = admin.storage.from("post-media").getPublicUrl(path).data.publicUrl;
    return { status: "done", url, type: "video/mp4" };
  } catch (e) {
    return { status: "error", error: e instanceof Error ? e.message : "Video generation failed." };
  }
}
