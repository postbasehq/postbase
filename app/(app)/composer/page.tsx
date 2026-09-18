import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/PostForm";
import { higgsfieldConfigured } from "@/lib/higgsfield";
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

  return (
    <div>
      <p className="text-sm text-muted">
        Write your post, pick channels, and schedule it.
      </p>
      <PostForm
        channels={channels ?? []}
        action={createPost}
        submitLabel="Schedule post"
        defaultScheduleLocal={defaultScheduleLocal}
        libraryItems={library ?? []}
        aiEnabled={higgsfieldConfigured()}
      />
    </div>
  );
}
