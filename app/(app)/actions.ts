"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { openPick, PICK_COOKIE, saveMetaChannels } from "@/lib/meta-connect";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageOrg, getCurrentOrgId, getOrgRole } from "@/lib/org";
import { encryptJson } from "@/lib/crypto";
import { revokeChannelAccess } from "@/lib/channel-revoke";
import { ownStoragePath } from "@/lib/media-paths";
import { saveChannel } from "@/lib/channel-store";
import { type YouTubePostOptions } from "@/lib/platforms/youtube";
import { hasAccess, NO_PLAN_MESSAGE, releaseAiGeneration, reserveAiGeneration } from "@/lib/billing-guard";
import { connectBluesky } from "@/lib/platforms/bluesky";
import { isRepeatEvery } from "@/lib/publish/repeat";
import { getTimeZone, zonedTimeToUtc } from "@/lib/tz";
import { firstBlockingProblem, pastTimeProblem } from "@/lib/post-validation";
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

/** Parse the YouTube visibility, or null if absent (no YouTube channel) / invalid. */
function parseYoutubePrivacy(formData: FormData): string | null {
  const v = String(formData.get("youtube_privacy") ?? "");
  return ["public", "unlisted", "private"].includes(v) ? v : null;
}

/** Parse the YouTube title / thumbnail / audience, or null if the composer
 *  didn't emit them (no YouTube channel selected). */
function parseYoutubeOptions(formData: FormData): YouTubePostOptions | null {
  if (formData.get("youtube_privacy") == null) return null;
  const title = String(formData.get("youtube_title") ?? "").trim().slice(0, 100);
  const thumb = String(formData.get("youtube_thumbnail_url") ?? "");
  return {
    ...(title ? { title } : {}),
    // Only our own storage: the publisher fetches this URL server-side.
    ...(thumb.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/`) ? { thumbnailUrl: thumb } : {}),
    madeForKids: formData.get("youtube_made_for_kids") === "true",
  };
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
  orgId: string,
): Promise<string[]> {
  // Only this workspace's own files are ever deletable: the caller deletes with
  // the service role, and a post's media URL is caller-supplied, so a URL naming
  // another workspace's folder must never turn into a path here.
  const clean = urls.filter((u) => Boolean(u) && ownStoragePath(u, orgId) !== null);
  if (clean.length === 0) return [];
  const { data } = await supabase
    .from("media")
    .select("storage_url")
    .in("storage_url", clean)
    .neq("post_id", excludePostId);
  const stillUsed = new Set((data ?? []).map((m) => m.storage_url));
  return clean.filter((u) => !stillUsed.has(u)).map((u) => ownStoragePath(u, orgId)!);
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

/**
 * Server-side twin of the composer's checks, for scheduled posts: not in the
 * past, and nothing a selected network would reject (length counted its way,
 * required media, X's media rules). Stops a stale or tampered client from
 * scheduling a post that can only fail when it's due.
 */
async function assertSendable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  channelIds: string[],
  segments: string[],
  scheduledAt: string,
  formData: FormData,
): Promise<void> {
  const past = pastTimeProblem(scheduledAt);
  if (past) throw new Error(past);
  if (channelIds.length === 0) return;
  const { data: chans } = await supabase.from("channels").select("id, platform").eq("org_id", orgId).in("id", channelIds);
  const variants = parseVariants(formData);
  const problem = firstBlockingProblem(
    (chans ?? []).map((c) => ({ platform: c.platform as string, parts: variants[c.id] ? [variants[c.id]] : segments })),
    parseMedia(formData),
  );
  if (problem) throw new Error(problem);
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
  // Disconnecting revokes the account's access and drops its history: owners/admins only.
  if (!canManageOrg(await getOrgRole(orgId))) {
    throw new Error("Only owners and admins can disconnect channels.");
  }

  const channelId = String(formData.get("channel_id") ?? "");
  if (!channelId) throw new Error("Missing channel id.");

  // Best-effort: revoke the grant on the provider's side before we drop the row,
  // so disconnect truly de-authorizes Postbase (not just a local token delete).
  // Tokens are read server-side (members can't select them, migration 0057).
  const { data: channel } = await createAdminClient()
    .from("channels")
    .select("id, org_id, platform, encrypted_tokens, provider_user_id")
    .eq("id", channelId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (channel) await revokeChannelAccess(channel);

  // Posts still waiting to go out to this channel, before its targets go.
  const { data: pending } = await supabase
    .from("post_targets")
    .select("post_id, posts!inner(status, org_id)")
    .eq("channel_id", channelId)
    .eq("posts.org_id", orgId)
    .in("posts.status", ["scheduled", "publishing"]);

  // Scoped to the caller's org (RLS + explicit check). post_targets cascade-delete.
  const { error } = await supabase
    .from("channels")
    .delete()
    .eq("id", channelId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  // A post that only went to this channel now has nowhere to go: without this it
  // sits "scheduled"/"publishing" forever. Return it to Drafts, text and media
  // intact, so it can be pointed at another channel (e.g. after a reconnect).
  const postIds = [...new Set((pending ?? []).map((t) => t.post_id as string))];
  if (postIds.length > 0) {
    const { data: stillTargeted } = await supabase.from("post_targets").select("post_id").in("post_id", postIds);
    const orphaned = postIds.filter((id) => !(stillTargeted ?? []).some((t) => t.post_id === id));
    if (orphaned.length > 0) {
      await supabase
        .from("posts")
        .update({ status: "draft", scheduled_at: null, repeat_every: null })
        .in("id", orphaned)
        .eq("org_id", orgId);
    }
  }
  revalidatePath("/calendar");
  revalidatePath("/drafts");

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
  // Drafts are always allowed; scheduling needs an active plan.
  if (status === "scheduled" && !(await hasAccess(supabase, orgId))) throw new Error(NO_PLAN_MESSAGE);
  if (scheduledAt) await assertSendable(supabase, orgId, channelIds, segments, scheduledAt, formData);

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
      youtube_privacy: parseYoutubePrivacy(formData),
      youtube_options: parseYoutubeOptions(formData),
      tiktok_options: parseTiktokOptions(formData),
      repeat_every: parseRepeatEvery(formData, status === "scheduled"),
      // Repeats step on the author's local calendar (keeps 09:00 at 09:00 across DST).
      timezone: await getTimeZone(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (channelIds.length > 0) {
    // Only allow targeting channels in this workspace. RLS alone would also
    // accept channels from the user's other workspaces.
    const { data: owned } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
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
    .select("status, post_targets(status, platform_post_id, thread_ids)")
    .eq("id", postId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!current) redirect("/queue"); // not ours / gone — bounce with feedback
  const anyDelivered = (
    (current.post_targets ?? []) as { status: string; platform_post_id: string | null; thread_ids: string[] | null }[]
  ).some((t) => t.status === "published" || t.platform_post_id || (t.thread_ids?.length ?? 0) > 0);
  if (current.status === "published" || current.status === "publishing" || anyDelivered) {
    redirect("/queue");
  }

  const segments = parseThread(formData);
  if (segments.length === 0) throw new Error("Write something to post.");
  const scheduledRaw = String(formData.get("scheduled_at") ?? "").trim();
  const channelIds = formData.getAll("channels").map(String).filter(Boolean);

  const scheduledAt = scheduledRaw ? new Date(scheduledRaw).toISOString() : null;
  const status = scheduledAt ? "scheduled" : "draft";
  // Drafts are always allowed; scheduling needs an active plan.
  if (status === "scheduled" && !(await hasAccess(supabase, orgId))) throw new Error(NO_PLAN_MESSAGE);
  if (scheduledAt) await assertSendable(supabase, orgId, channelIds, segments, scheduledAt, formData);

  // Update the post, scoped to the org, and confirm it was ours.
  const { data: updated, error } = await supabase
    .from("posts")
    .update({
      body: segments[0],
      thread_tail: segments.slice(1),
      scheduled_at: scheduledAt,
      status,
      tiktok_privacy_level: parseTiktokPrivacy(formData),
      youtube_privacy: parseYoutubePrivacy(formData),
      youtube_options: parseYoutubeOptions(formData),
      tiktok_options: parseTiktokOptions(formData),
      repeat_every: parseRepeatEvery(formData, status === "scheduled"),
      timezone: await getTimeZone(),
      // Editing re-arms the repeat: a rescheduled post hasn't published yet.
      repeat_next_spawned: false,
    })
    .eq("id", postId)
    .eq("org_id", orgId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!updated || updated.length === 0) redirect("/queue");

  // Validate channels belong to this workspace, then replace the targets.
  if (channelIds.length > 0) {
    const { data: owned } = await supabase
      .from("channels")
      .select("id")
      .eq("org_id", orgId)
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
  const removedPaths = await orphanedStoragePaths(supabase, removedUrls, postId, orgId);
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
  if (!(await hasAccess(supabase, orgId))) throw new Error(NO_PLAN_MESSAGE);

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

/**
 * Move a scheduled post to a new local date and time (calendar drag and drop).
 * Only a still-scheduled post can move, and only to a time in the future; the
 * publisher picks posts up by scheduled_at, so nothing else needs changing.
 */
export async function reschedulePost(
  postId: string,
  dayKey: string,
  hour: number,
  minute: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (
    !postId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dayKey) ||
    !Number.isInteger(hour) || hour < 0 || hour > 23 ||
    !Number.isInteger(minute) || minute < 0 || minute > 59
  ) {
    return { ok: false, error: "That isn't a valid time." };
  }
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return { ok: false, error: "No workspace found for this user." };

  const scheduledAt = zonedTimeToUtc(dayKey, hour, minute, await getTimeZone());
  if (Date.parse(scheduledAt) <= Date.now()) return { ok: false, error: "That time has already passed." };
  if (!(await hasAccess(supabase, orgId))) return { ok: false, error: NO_PLAN_MESSAGE };

  // Scoped to the org and to posts that are still waiting, so a post the
  // publisher has already picked up (or another tenant's post) never moves.
  const { data: updated, error } = await supabase
    .from("posts")
    .update({ scheduled_at: scheduledAt })
    .eq("id", postId)
    .eq("org_id", orgId)
    .eq("status", "scheduled")
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "This post can't be moved any more. It may already be publishing." };
  }

  revalidatePath("/calendar");
  revalidatePath("/queue");
  return { ok: true };
}

/**
 * Re-post an already published post at a new local date and time (calendar drag
 * and drop). Creates a scheduled copy with the same text, thread, channels,
 * per-channel versions, media and network settings; the original is untouched.
 * The copy doesn't repeat, even if the original did.
 */
export async function repostPost(
  postId: string,
  dayKey: string,
  hour: number,
  minute: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (
    !postId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dayKey) ||
    !Number.isInteger(hour) || hour < 0 || hour > 23 ||
    !Number.isInteger(minute) || minute < 0 || minute > 59
  ) {
    return { ok: false, error: "That isn't a valid time." };
  }
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return { ok: false, error: "No workspace found for this user." };

  const scheduledAt = zonedTimeToUtc(dayKey, hour, minute, await getTimeZone());
  if (Date.parse(scheduledAt) <= Date.now()) return { ok: false, error: "That time has already passed." };
  if (!(await hasAccess(supabase, orgId))) return { ok: false, error: NO_PLAN_MESSAGE };

  const { data: src } = await supabase
    .from("posts")
    .select("body, thread_tail, status, tiktok_privacy_level, tiktok_options, youtube_privacy, youtube_options, post_targets(channel_id, variant_body)")
    .eq("id", postId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!src) return { ok: false, error: "That post no longer exists." };
  if (src.status !== "published") return { ok: false, error: "Only posts that have gone out can be re-posted." };
  const targets = (src.post_targets ?? []) as { channel_id: string; variant_body: string | null }[];
  if (targets.length === 0) return { ok: false, error: "This post has no channels to re-post to." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: copy, error } = await supabase
    .from("posts")
    .insert({
      org_id: orgId,
      author_id: user?.id ?? null,
      body: src.body,
      thread_tail: src.thread_tail ?? [],
      scheduled_at: scheduledAt,
      status: "scheduled",
      tiktok_privacy_level: src.tiktok_privacy_level,
      tiktok_options: src.tiktok_options,
      youtube_privacy: src.youtube_privacy,
      youtube_options: src.youtube_options,
    })
    .select("id")
    .single();
  if (error || !copy) return { ok: false, error: error?.message ?? "Couldn't create the copy." };

  const { error: tErr } = await supabase.from("post_targets").insert(
    targets.map((t) => ({
      post_id: copy.id,
      channel_id: t.channel_id,
      variant_body: t.variant_body,
      status: "scheduled",
    })),
  );
  if (tErr) {
    await supabase.from("posts").delete().eq("id", copy.id);
    return { ok: false, error: tErr.message };
  }

  const { data: media } = await supabase.from("media").select("storage_url, type").eq("post_id", postId);
  if (media && media.length > 0) {
    await supabase
      .from("media")
      .insert(media.map((m) => ({ post_id: copy.id, storage_url: m.storage_url, type: m.type })));
  }

  revalidatePath("/calendar");
  revalidatePath("/queue");
  return { ok: true };
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
    orgId,
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
  // Saved with the service role, scoped to this workspace (lib/channel-store.ts).
  const saved = await saveChannel(orgId, "bluesky", chHandle, fields);
  if (saved.limit) {
    return { error: "You've reached your plan's channel limit. Upgrade in Billing to connect more." };
  }
  if (saved.error) return { error: "Couldn't save the channel — please try again." };

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

  if (!(await hasAccess(supabase, orgId))) return { ok: false, error: NO_PLAN_MESSAGE };
  // Take it from the allowance before generating (atomic, so parallel
  // requests can't overrun it); give it back if anything below fails.
  const slot = await reserveAiGeneration(orgId, "image");
  if (!slot.ok) return { ok: false, error: slot.error };

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
    if (error) {
      await releaseAiGeneration(slot.id);
      return { ok: false, error: "Generated the image but couldn't save it." };
    }
    const url = admin.storage.from("post-media").getPublicUrl(path).data.publicUrl;
    return { ok: true, url, type: "image/jpeg" };
  } catch (e) {
    // Higgsfield doesn't charge failed generations, so neither do we.
    await releaseAiGeneration(slot.id);
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

  if (!(await hasAccess(supabase, orgId))) return { ok: false, error: NO_PLAN_MESSAGE };
  // Reserved before starting (atomic, so parallel starts can't overrun the
  // allowance), then tied to the job so a failure can give it back and only
  // this workspace can collect the result.
  const slot = await reserveAiGeneration(orgId, "video");
  if (!slot.ok) return { ok: false, error: slot.error };

  let statusUrl: string;
  try {
    ({ statusUrl } = await startVideo({ prompt: clean, aspectRatio: ratio, imageUrl }));
  } catch (e) {
    // Never started, so never charged: give the slot back.
    await releaseAiGeneration(slot.id);
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't start the video." };
  }
  // Started (and charged) from here on, so the slot stays used even if
  // tracking the job fails.
  const { error } = await createAdminClient().from("ai_generations").update({ ref: statusUrl }).eq("id", slot.id);
  if (error) return { ok: false, error: "The video started but couldn't be tracked. Try again in a moment." };
  return { ok: true, statusUrl };
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
  // Only ever fetch Higgsfield's own status URLs with our auth header, and only
  // for a job this workspace started.
  if (!statusUrl || !isHiggsfieldUrl(statusUrl)) return { status: "error", error: "Invalid status URL." };
  const admin = createAdminClient();
  const { data: job } = await admin
    .from("ai_generations")
    .select("id, result_url")
    .eq("org_id", orgId)
    .eq("kind", "video")
    .eq("ref", statusUrl)
    .maybeSingle();
  if (!job) return { status: "error", error: "Invalid status URL." };
  if (job.result_url) return { status: "done", url: job.result_url, type: "video/mp4" };
  try {
    const r = await pollStatus(statusUrl);
    if (!r.done) return { status: "processing" };
    if (r.error || !r.url) {
      // Higgsfield didn't charge for it, so the user gets the video back.
      if (r.failed) await admin.from("ai_generations").delete().eq("id", job.id);
      return { status: "error", error: r.error || "No video was returned." };
    }
    const bytes = await fetch(r.url).then((res) => {
      if (!res.ok) throw new Error(`Couldn't download the video (${res.status}).`);
      return res.arrayBuffer();
    });
    const path = `ai/${orgId}/${crypto.randomUUID()}.mp4`;
    const { error } = await admin.storage
      .from("post-media")
      .upload(path, Buffer.from(bytes), { contentType: "video/mp4", upsert: false });
    if (error) return { status: "error", error: "Generated the video but couldn't save it." };
    const url = admin.storage.from("post-media").getPublicUrl(path).data.publicUrl;
    await admin.from("ai_generations").update({ result_url: url }).eq("id", job.id);
    return { status: "done", url, type: "video/mp4" };
  } catch (e) {
    return { status: "error", error: e instanceof Error ? e.message : "Video generation failed." };
  }
}

/**
 * Connect the Instagram accounts or Facebook Pages ticked in the picker. The
 * login comes from the short-lived cookie set by the Meta callback; the
 * accounts are re-read from Meta, so only ids the login can reach are saved.
 */
export async function connectMetaAccounts(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  const jar = await cookies();
  const pick = openPick(jar.get(PICK_COOKIE)?.value, orgId);
  jar.delete(PICK_COOKIE);
  if (!pick || !orgId) redirect("/channels?error=pick_expired");

  const ids = formData.getAll("account").map(String).filter(Boolean);
  if (ids.length === 0) redirect("/channels");

  let result: { saved: number; limitHit: boolean; failed: boolean };
  try {
    result = await saveMetaChannels(supabase, orgId, pick, ids);
  } catch {
    redirect(`/channels?error=${pick.platform === "instagram" ? "ig_connect_failed" : "fb_connect_failed"}`);
  }
  revalidatePath("/channels");
  if (result.limitHit && result.saved === 0) redirect("/channels?error=channel_limit");
  if (result.failed && result.saved === 0) redirect("/channels?error=save_failed");
  redirect(`/channels?connected=${pick.platform}${result.limitHit ? "&error=channel_limit" : ""}`);
}

/** Close the picker without connecting anything. */
export async function cancelMetaPick() {
  (await cookies()).delete(PICK_COOKIE);
  redirect("/channels");
}
