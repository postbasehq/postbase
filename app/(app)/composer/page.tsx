import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createPost } from "../actions";

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube",
};

export default async function ComposerPage() {
  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle")
    .order("created_at", { ascending: true });

  const hasChannels = channels && channels.length > 0;

  return (
    <div className="mx-auto max-w-[680px]">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">New post</h1>
      <p className="mt-1 text-sm text-muted">
        Write your post, pick channels, and schedule it. Publishing runs in Phase 1’s
        Inngest loop (stubbed until the X API is live).
      </p>

      <form
        action={createPost}
        className="mt-6 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-sm"
      >
        {/* body */}
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-muted">Post</span>
          <textarea
            name="body"
            rows={5}
            required
            placeholder="What are you posting?"
            className="resize-y rounded-xl border border-line bg-ground px-3.5 py-3 text-sm leading-relaxed outline-none focus-visible:border-blue"
          />
        </label>

        {/* channels */}
        <fieldset className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-muted">Channels</span>
          {hasChannels ? (
            <div className="flex flex-wrap gap-2">
              {channels.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-ground px-3.5 py-2 text-sm has-[:checked]:border-blue has-[:checked]:bg-blue-soft has-[:checked]:text-blue-ink"
                >
                  <input type="checkbox" name="channels" value={c.id} className="accent-blue" />
                  <span className="font-medium">{PLATFORM_LABEL[c.platform] ?? c.platform}</span>
                  {c.handle ? <span className="text-muted">{c.handle}</span> : null}
                </label>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-sm text-muted">
              No channels yet.{" "}
              <Link href="/channels" className="font-medium text-blue-ink underline">
                Add one first
              </Link>{" "}
              to choose where this posts.
            </p>
          )}
        </fieldset>

        {/* schedule */}
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-muted">
            Schedule for <span className="font-normal">(leave empty to save as draft)</span>
          </span>
          <input
            type="datetime-local"
            name="scheduled_at"
            className="w-fit rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-blue px-6 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
          >
            Schedule post
          </button>
          <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
