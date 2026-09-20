import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/PostForm";
import { type TikTokInitial } from "@/components/TikTokSettings";
import { higgsfieldConfigured } from "@/lib/higgsfield";
import { getCurrentOrgId } from "@/lib/org";
import { aiUsage } from "@/lib/billing-guard";
import { updatePost } from "../../actions";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, body, thread_tail, scheduled_at, status, tiktok_privacy_level, tiktok_options, repeat_every, post_targets(channel_id, variant_body, status, platform_post_id)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();
  // Can't edit a post that has already published (fully or partially) or is
  // mid-publish — re-saving would republish duplicates to channels that already
  // got it. (Retry a failed channel from the queue instead.)
  const anyDelivered = (post.post_targets ?? []).some(
    (t) => (t as { status?: string; platform_post_id?: string | null }).status === "published" ||
      (t as { platform_post_id?: string | null }).platform_post_id,
  );
  if (post.status === "published" || post.status === "publishing" || anyDelivered) {
    redirect("/queue");
  }

  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle, display_name, avatar_url, verified")
    .order("created_at", { ascending: true });

  const { data: mediaRows } = await supabase
    .from("media")
    .select("storage_url, type")
    .eq("post_id", id);
  const media = (mediaRows ?? []).map((m) => ({ url: m.storage_url, type: m.type }));

  const { data: library } = await supabase
    .from("media_library")
    .select("id, url, name, type, size_bytes")
    .order("created_at", { ascending: false });

  const { data: draftRows } = await supabase
    .from("posts")
    .select("id, body, thread_tail, updated_at, post_targets(channels(platform))")
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(50);
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
      <p className="text-sm text-muted">
        Update the content, channels, or schedule. Rescheduling replaces the queued job.
      </p>
      <PostForm
        channels={channels ?? []}
        action={updatePost}
        submitLabel="Save changes"
        libraryItems={library ?? []}
        drafts={drafts}
        currentDraftId={post.id}
        aiEnabled={aiEnabled}
        aiRemaining={aiRemaining}
        initial={{
          id: post.id,
          thread: [post.body, ...((post.thread_tail as string[] | null) ?? [])],
          scheduledAt: post.scheduled_at,
          channelIds,
          variants,
          media,
          tiktokPrivacy: (post.tiktok_privacy_level as string | null) ?? undefined,
          tiktokOptions: (post.tiktok_options as TikTokInitial | null) ?? null,
          repeatEvery: (post.repeat_every as string | null) ?? null,
        }}
      />
    </div>
  );
}
