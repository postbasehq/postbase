import { createClient } from "@/lib/supabase/server";
import { scopeOrgId } from "@/lib/org";
import { PostForm } from "@/components/PostForm";
import { higgsfieldConfigured } from "@/lib/higgsfield";
import { getCurrentOrgId } from "@/lib/org";
import { aiUsage, hasAccess } from "@/lib/billing-guard";
import { createPost } from "../actions";
import { type TikTokInitial } from "@/components/TikTokSettings";
import { type YouTubePrivacy } from "@/components/YouTubeSettings";
import type { YouTubePostOptions } from "@/lib/platforms/youtube";

type PostFormInitial = NonNullable<React.ComponentProps<typeof PostForm>["initial"]>;

export default async function ComposerPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string; media?: string; from?: string }>;
}) {
  const { at, media: mediaId, from } = await searchParams;
  // Accept a local wall-clock prefill from the calendar (YYYY-MM-DDTHH:MM).
  const defaultScheduleLocal = at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at) ? at : undefined;

  const supabase = await createClient();
  const orgId = await scopeOrgId();

  // "Use in a new post" from the media library pre-attaches one asset.
  let prefillMedia: { url: string; type: string }[] | undefined;
  if (mediaId) {
    const { data: m } = await supabase
      .from("media_library")
      .select("url, type")
      .eq("id", mediaId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (m) prefillMedia = [{ url: m.url, type: m.type }];
  }
  // "Republish" from the queue: copy an existing post (any status) into a new,
  // unsaved one: text, thread, channels, per-channel versions, media and
  // settings. No id, so saving creates a new post and never edits the original.
  // The time is left empty for the user to pick. Only posts in this workspace.
  let republish: PostFormInitial | undefined;
  if (from) {
    const { data: src } = await supabase
      .from("posts")
      .select("body, thread_tail, tiktok_privacy_level, tiktok_options, youtube_privacy, youtube_options, repeat_every, post_targets(channel_id, variant_body)")
      .eq("id", from)
      .eq("org_id", orgId)
      .maybeSingle();
    if (src) {
      const { data: srcMedia } = await supabase.from("media").select("storage_url, type").eq("post_id", from);
      const targets = (src.post_targets ?? []) as { channel_id: string; variant_body: string | null }[];
      const variants: Record<string, string> = {};
      for (const t of targets) if (t.variant_body) variants[t.channel_id] = t.variant_body;
      republish = {
        thread: [src.body ?? "", ...((src.thread_tail as string[] | null) ?? [])],
        scheduledAt: null,
        channelIds: targets.map((t) => t.channel_id),
        variants,
        media: (srcMedia ?? []).map((m) => ({ url: m.storage_url, type: m.type })),
        tiktokPrivacy: (src.tiktok_privacy_level as string | null) ?? undefined,
        tiktokOptions: (src.tiktok_options as TikTokInitial | null) ?? null,
        youtubePrivacy: (src.youtube_privacy as YouTubePrivacy | null) ?? null,
        youtubeOptions: (src.youtube_options as YouTubePostOptions | null) ?? null,
        repeatEvery: (src.repeat_every as string | null) ?? null,
      };
    }
  }

  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle, display_name, avatar_url, verified")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  const { data: library } = await supabase
    .from("media_library")
    .select("id, url, name, type, size_bytes, folder_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  const { data: libraryFolders } = await supabase
    .from("media_folders")
    .select("id, name")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  const { data: draftRows } = await supabase
    .from("posts")
    .select("id, body, thread_tail, updated_at, post_targets(channels(platform))")
    .eq("org_id", orgId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(50);
  const drafts = (draftRows ?? []).map((d) => {
    const targets = (d.post_targets ?? []) as unknown as { channels: { platform: string } | null }[];
    return {
      id: d.id as string,
      body: (d.body as string) ?? "",
      thread_len: Array.isArray(d.thread_tail) ? d.thread_tail.length : 0,
      updated_at: d.updated_at as string | null,
      platforms: Array.from(
        new Set(targets.map((t) => t.channels?.platform).filter(Boolean)),
      ) as string[],
    };
  });

  // Without a plan the composer still works for drafts; scheduling is gated.
  const accessOrgId = await getCurrentOrgId();
  const canSchedule = accessOrgId ? await hasAccess(supabase, accessOrgId) : true;

  const aiEnabled = higgsfieldConfigured();
  let aiRemaining: { image: number; video: number } | undefined;
  if (aiEnabled) {
    const orgId = await getCurrentOrgId();
    if (orgId) {
      const u = await aiUsage(supabase, orgId);
      aiRemaining = { image: u.image.remaining, video: u.video.remaining };
    }
  }

  return (
    <div>
      {republish ? (
        <p className="text-sm text-muted">Republishing a copy. Pick a new time; the original post isn&apos;t changed.</p>
      ) : null}
      <PostForm
        channels={channels ?? []}
        action={createPost}
        submitLabel="Schedule post"
        defaultScheduleLocal={defaultScheduleLocal}
        libraryItems={library ?? []}
        libraryFolders={libraryFolders ?? []}
        drafts={drafts}
        prefillMedia={prefillMedia}
        initial={republish}
        aiEnabled={aiEnabled}
        aiRemaining={aiRemaining}
        canSchedule={canSchedule}
      />
    </div>
  );
}
