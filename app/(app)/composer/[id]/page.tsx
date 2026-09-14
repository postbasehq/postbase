import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/PostForm";
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
      "id, body, thread_tail, scheduled_at, status, tiktok_privacy_level, post_targets(channel_id, variant_body)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();
  // Published posts can't be edited (they've already gone out).
  if (post.status === "published") redirect("/dashboard");

  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle")
    .order("created_at", { ascending: true });

  const { data: mediaRows } = await supabase
    .from("media")
    .select("storage_url, type")
    .eq("post_id", id);
  const media = (mediaRows ?? []).map((m) => ({ url: m.storage_url, type: m.type }));

  const targets = (post.post_targets ?? []) as {
    channel_id: string;
    variant_body: string | null;
  }[];
  const channelIds = targets.map((t) => t.channel_id);
  const variants: Record<string, string> = {};
  for (const t of targets) if (t.variant_body) variants[t.channel_id] = t.variant_body;

  return (
    <div className="mx-auto max-w-[980px]">
      <p className="text-sm text-muted">
        Update the content, channels, or schedule. Rescheduling replaces the queued job.
      </p>
      <PostForm
        channels={channels ?? []}
        action={updatePost}
        submitLabel="Save changes"
        initial={{
          id: post.id,
          thread: [post.body, ...((post.thread_tail as string[] | null) ?? [])],
          scheduledAt: post.scheduled_at,
          channelIds,
          variants,
          media,
          tiktokPrivacy: (post.tiktok_privacy_level as string | null) ?? "SELF_ONLY",
        }}
      />
    </div>
  );
}
