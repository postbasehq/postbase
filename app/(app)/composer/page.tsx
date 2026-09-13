import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/PostForm";
import { createPost } from "../actions";

export default async function ComposerPage() {
  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-[980px]">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">New post</h1>
      <p className="mt-1 text-sm text-muted">
        Write your post, pick channels, and schedule it.
      </p>
      <PostForm channels={channels ?? []} action={createPost} submitLabel="Schedule post" />
    </div>
  );
}
