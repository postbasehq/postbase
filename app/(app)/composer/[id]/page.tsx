import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/PostForm";
import { type TikTokInitial } from "@/components/TikTokSettings";
import { type YouTubePrivacy } from "@/components/YouTubeSettings";
import type { YouTubePostOptions } from "@/lib/platforms/youtube";
import { higgsfieldConfigured } from "@/lib/higgsfield";
import { getCurrentOrgId, scopeOrgId } from "@/lib/org";
import { aiUsage, hasAccess, schedulingProblem } from "@/lib/billing-guard";
import { xLinkUsage } from "@/lib/x-links";
import { updatePost } from "../../actions";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await scopeOrgId();
  const accessOrgId = await getCurrentOrgId(); // cached: same lookup as scopeOrgId

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

  // Everything at once (each is a round trip); the post is checked once it's in.
  const [
    { data: post },
    { data: channels },
    { data: mediaRows },
    { data: library },
    { data: libraryFolders },
    { data: draftRows },
    { canSchedule, overPlan },
    aiRemaining,
    xLinks,
  ] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "id, body, thread_tail, scheduled_at, status, tiktok_privacy_level, tiktok_options, youtube_privacy, youtube_options, repeat_every, post_targets(channel_id, variant_body, status, platform_post_id, thread_ids)",
      )
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("channels")
      .select("id, platform, handle, display_name, avatar_url, verified, status, reconnect_by")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
    supabase.from("media").select("storage_url, type").eq("post_id", id),
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

  if (!post) notFound();
  // Can't edit a post that has already published (fully or partially) or is
  // mid-publish — re-saving would republish duplicates to channels that already
  // got it. (Retry a failed channel from the queue instead.)
  // A thread that failed part-way (thread_ids set) is partly live too.
  const anyDelivered = (post.post_targets ?? []).some((t) => {
    const r = t as { status?: string; platform_post_id?: string | null; thread_ids?: string[] | null };
    return r.status === "published" || r.platform_post_id || (r.thread_ids?.length ?? 0) > 0;
  });
  if (post.status === "published" || post.status === "publishing" || anyDelivered) {
    redirect("/queue");
  }
  const media = (mediaRows ?? []).map((m) => ({ url: m.storage_url, type: m.type }));

  const drafts = (draftRows ?? []).map((d) => {
    const dt = (d.post_targets ?? []) as unknown as { channels: { platform: string } | null }[];
    return {
      id: d.id as string,
      body: (d.body as string) ?? "",
      thread_len: Array.isArray(d.thread_tail) ? d.thread_tail.length : 0,
      updated_at: d.updated_at as string | null,
      platforms: Array.from(
        new Set(dt.map((t) => t.channels?.platform).filter(Boolean)),
      ) as string[],
    };
  });

  const targets = (post.post_targets ?? []) as {
    channel_id: string;
    variant_body: string | null;
  }[];
  const channelIds = targets.map((t) => t.channel_id);
  const variants: Record<string, string> = {};
  for (const t of targets) if (t.variant_body) variants[t.channel_id] = t.variant_body;

  return (
    <div>
      <p className="text-sm text-muted">
        Update the content, channels, or schedule. Rescheduling replaces the queued job.
      </p>
      <PostForm
        channels={channels ?? []}
        overPlan={overPlan}
        action={updatePost}
        submitLabel="Save changes"
        libraryItems={library ?? []}
        libraryFolders={libraryFolders ?? []}
        drafts={drafts}
        currentDraftId={post.id}
        aiEnabled={aiEnabled}
        aiRemaining={aiRemaining}
        xLinks={xLinks}
        canSchedule={canSchedule}
        initial={{
          id: post.id,
          thread: [post.body, ...((post.thread_tail as string[] | null) ?? [])],
          scheduledAt: post.scheduled_at,
          channelIds,
          variants,
          media,
          tiktokPrivacy: (post.tiktok_privacy_level as string | null) ?? undefined,
          tiktokOptions: (post.tiktok_options as TikTokInitial | null) ?? null,
          youtubePrivacy: (post.youtube_privacy as YouTubePrivacy | null) ?? null,
          youtubeOptions: (post.youtube_options as YouTubePostOptions | null) ?? null,
          repeatEvery: (post.repeat_every as string | null) ?? null,
        }}
      />
    </div>
  );
}
