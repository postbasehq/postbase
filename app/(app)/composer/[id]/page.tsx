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
    .select("id, body, scheduled_at, status, post_targets(channel_id)")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();
  // Published posts can't be edited (they've already gone out).
  if (post.status === "published") redirect("/dashboard");

  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle")
    .order("created_at", { ascending: true });

  const channelIds = (post.post_targets ?? []).map(
    (t: { channel_id: string }) => t.channel_id,
  );

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">Edit post</h1>
      <p className="mt-1 text-sm text-muted">
        Update the content, channels, or schedule. Rescheduling replaces the queued job.
      </p>
      <PostForm
        channels={channels ?? []}
        action={updatePost}
        submitLabel="Save changes"
        initial={{
          id: post.id,
          body: post.body,
          scheduledAt: post.scheduled_at,
          channelIds,
        }}
      />
    </div>
  );
}
