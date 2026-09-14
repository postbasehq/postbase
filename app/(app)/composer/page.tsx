import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/PostForm";
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
    .select("id, platform, handle")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-[980px]">
      <p className="text-sm text-muted">
        Write your post, pick channels, and schedule it.
      </p>
      <PostForm
        channels={channels ?? []}
        action={createPost}
        submitLabel="Schedule post"
        defaultScheduleLocal={defaultScheduleLocal}
      />
    </div>
  );
}
