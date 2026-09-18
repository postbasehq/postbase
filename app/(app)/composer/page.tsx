import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/PostForm";
import { higgsfieldConfigured } from "@/lib/higgsfield";
import { getCurrentOrgId } from "@/lib/org";
import { aiUsage } from "@/lib/billing-guard";
import { createPost } from "../actions";

export default async function ComposerPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const { at } = await searchParams;
  // Accept a local wall-clock prefill from the calendar (YYYY-MM-DDTHH:MM).
  const defaultScheduleLocal = at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at) ? at : undefined;

  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle, display_name, avatar_url, verified")
    .order("created_at", { ascending: true });

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
      <PostForm
        channels={channels ?? []}
        action={createPost}
        submitLabel="Schedule post"
        defaultScheduleLocal={defaultScheduleLocal}
        libraryItems={library ?? []}
        drafts={drafts}
        aiEnabled={aiEnabled}
        aiRemaining={aiRemaining}
      />
    </div>
  );
}
