import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/PostForm";
import { higgsfieldConfigured } from "@/lib/higgsfield";
import { getCurrentOrgId, scopeOrgId } from "@/lib/org";
import { aiUsage, hasAccess, schedulingProblem } from "@/lib/billing-guard";
import { xLinkUsage } from "@/lib/x-links";
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
  const accessOrgId = await getCurrentOrgId(); // cached: same lookup as scopeOrgId

  // "Use in a new post" from the media library pre-attaches one asset.
  const loadPrefill = async (): Promise<{ url: string; type: string }[] | undefined> => {
    if (!mediaId) return undefined;
    const { data: m } = await supabase
      .from("media_library")
      .select("url, type")
      .eq("id", mediaId)
      .eq("org_id", orgId)
      .maybeSingle();
    return m ? [{ url: m.url, type: m.type }] : undefined;
  };
  // "Republish" from the queue: copy an existing post (any status) into a new,
  // unsaved one: text, thread, channels, per-channel versions, media and
  // settings. No id, so saving creates a new post and never edits the original.
  // The time is left empty for the user to pick. Only posts in this workspace.
  const loadRepublish = async (): Promise<PostFormInitial | undefined> => {
    if (!from) return undefined;
    const [{ data: src }, { data: srcMedia }] = await Promise.all([
      supabase
        .from("posts")
        .select("body, thread_tail, tiktok_privacy_level, tiktok_options, youtube_privacy, youtube_options, repeat_every, post_targets(channel_id, variant_body)")
        .eq("id", from)
        .eq("org_id", orgId)
        .maybeSingle(),
      // Read alongside; only used if the post above is in this workspace.
      supabase.from("media").select("storage_url, type").eq("post_id", from),
    ]);
    if (!src) return undefined;
    const targets = (src.post_targets ?? []) as { channel_id: string; variant_body: string | null }[];
    const variants: Record<string, string> = {};
    for (const t of targets) if (t.variant_body) variants[t.channel_id] = t.variant_body;
    return {
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
  };
  // Without a plan the composer still works for drafts; scheduling is gated.
  // Over the plan's workspaces/channels/people (e.g. after a downgrade): say so
  // up front, the same rule the server applies when scheduling and sending.
  const loadAccess = async () => {
    if (!accessOrgId) return { canSchedule: true, overPlan: null };
    const canSchedule = await hasAccess(supabase, accessOrgId);
    return { canSchedule, overPlan: canSchedule ? await schedulingProblem(accessOrgId) : null };
  };
  const aiEnabled = higgsfieldConfigured();
  const loadAi = async () => {
    if (!aiEnabled || !accessOrgId) return undefined;
    const u = await aiUsage(supabase, accessOrgId);
    return { image: u.image.remaining, video: u.video.remaining };
  };
  // The X posts-with-links allowance, for the composer's live note.
  const loadXLinks = async () => {
    if (!accessOrgId) return undefined;
    const u = await xLinkUsage(accessOrgId);
    return u.enforced ? { remaining: u.remaining, limit: u.limit, resetsAt: u.resetsAt } : undefined;
  };

  // Everything at once: each is a round trip to the database.
  const [
    prefillMedia,
    republish,
    { data: channels },
    { data: library },
    { data: libraryFolders },
    { data: draftRows },
    { canSchedule, overPlan },
    aiRemaining,
    xLinks,
  ] = await Promise.all([
    loadPrefill(),
    loadRepublish(),
    supabase
      .from("channels")
      .select("id, platform, handle, display_name, avatar_url, verified, status, reconnect_by")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("media_library")
      .select("id, url, name, type, size_bytes, folder_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase.from("media_folders").select("id, name").eq("org_id", orgId).order("name", { ascending: true }),
    supabase
      .from("posts")
      .select("id, body, thread_tail, updated_at, post_targets(channels(platform))")
      .eq("org_id", orgId)
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(50),
    loadAccess(),
    loadAi(),
    loadXLinks(),
  ]);
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

  return (
    <div>
      {republish ? (
        <p className="text-sm text-muted">Republishing a copy. Pick a new time; the original post isn&apos;t changed.</p>
      ) : null}
      <PostForm
        channels={channels ?? []}
        overPlan={overPlan}
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
        xLinks={xLinks}
        canSchedule={canSchedule}
      />
    </div>
  );
}
