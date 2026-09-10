import { createClient } from "@/lib/supabase/server";
import { addChannel } from "../actions";

const PLATFORM_META: Record<string, { label: string; dot: string }> = {
  x: { label: "X", dot: "bg-ink" },
  linkedin: { label: "LinkedIn", dot: "bg-blue" },
  instagram: { label: "Instagram", dot: "bg-terra" },
  youtube: { label: "YouTube", dot: "bg-amber-bright" },
};

export default async function ChannelsPage() {
  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle, status")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">Channels</h1>
      <p className="mt-1 text-sm text-muted">
        Add a channel to post to. Real OAuth connections land in Phase 3 — for now these are
        stub channels so you can build and schedule posts.
      </p>

      {/* add channel */}
      <form
        action={addChannel}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Platform</span>
          <select
            name="platform"
            defaultValue="x"
            className="rounded-xl border border-line bg-ground px-3 py-2.5 text-sm outline-none focus-visible:border-blue"
          >
            {Object.entries(PLATFORM_META).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Handle</span>
          <input
            name="handle"
            placeholder="@yourhandle"
            className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
        >
          Add channel
        </button>
      </form>

      {/* list */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {!channels || channels.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            No channels yet. Add one above.
          </p>
        ) : (
          channels.map((c, i) => {
            const meta = PLATFORM_META[c.platform] ?? { label: c.platform, dot: "bg-muted" };
            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  i < channels.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className={`size-2.5 rounded-full ${meta.dot}`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{meta.label}</div>
                  <div className="truncate text-xs text-muted">{c.handle ?? "—"}</div>
                </div>
                <span className="ml-auto rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted">
                  {c.status === "stub" ? "Stub" : c.status}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
