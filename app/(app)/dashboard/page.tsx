import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const pill =
  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold font-display whitespace-nowrap";

const STATUS: Record<string, { cls: string; dot: string; label: string }> = {
  draft: { cls: "bg-surface-2 text-muted", dot: "bg-muted", label: "Draft" },
  scheduled: { cls: "bg-blue-soft text-blue-ink", dot: "bg-blue", label: "Scheduled" },
  publishing: { cls: "bg-amber-bright/15 text-amber", dot: "bg-amber-bright", label: "Publishing" },
  published: { cls: "bg-green/15 text-green", dot: "bg-green", label: "Published" },
  failed: { cls: "bg-terra/12 text-terra", dot: "bg-terra", label: "Failed" },
};

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube",
};

function whenLabel(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type TargetRow = { channels: { platform: string } | null };
type PostRow = {
  id: string;
  body: string;
  scheduled_at: string | null;
  status: string;
  post_targets: TargetRow[];
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, body, scheduled_at, status, post_targets(channels(platform))")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(25);

  const { data: channels } = await supabase
    .from("channels")
    .select("id, platform, handle, status")
    .order("created_at", { ascending: true });

  const rows = (posts ?? []) as unknown as PostRow[];

  return (
    <div className="mx-auto max-w-[960px]">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Your scheduled posts and channels.</p>
        </div>
        <Link
          href="/composer"
          className="ml-auto rounded-full bg-blue px-4 py-2 font-display text-sm font-semibold text-on-blue shadow-sm"
        >
          New post
        </Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* queue */}
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <h2 className="font-display text-sm font-semibold">Queue</h2>
            <span className="ml-auto text-xs text-muted">{rows.length} post{rows.length === 1 ? "" : "s"}</span>
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted">No posts yet.</p>
              <Link
                href="/composer"
                className="mt-3 inline-block rounded-full border border-line px-4 py-2 text-sm font-medium text-blue-ink hover:bg-surface-2"
              >
                Write your first post
              </Link>
            </div>
          ) : (
            rows.map((p, i) => {
              const s = STATUS[p.status] ?? STATUS.draft;
              const platforms = Array.from(
                new Set((p.post_targets ?? []).map((t) => t.channels?.platform).filter(Boolean)),
              ).map((pl) => PLATFORM_LABEL[pl as string] ?? pl);
              return (
                <div
                  key={p.id}
                  className={`grid grid-cols-[auto_1fr_auto] items-center gap-3.5 px-4 py-3.5 ${
                    i < rows.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  <span className="font-display text-[13px] font-semibold tabular-nums text-muted">
                    {whenLabel(p.scheduled_at)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm">{p.body || "(empty)"}</div>
                    <div className="text-xs text-muted">
                      {platforms.length ? platforms.join(", ") : "No channels"}
                    </div>
                  </div>
                  <span className={`${pill} ${s.cls}`}>
                    <span className={`size-2 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>
              );
            })
          )}
        </section>

        {/* channels */}
        <section className="h-fit overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <h2 className="font-display text-sm font-semibold">Channels</h2>
            <Link href="/channels" className="ml-auto text-xs font-medium text-blue-ink hover:underline">
              Manage
            </Link>
          </div>
          {!channels || channels.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              No channels.{" "}
              <Link href="/channels" className="font-medium text-blue-ink underline">
                Add one
              </Link>
            </p>
          ) : (
            channels.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  i < channels.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="size-2.5 rounded-full bg-green" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {PLATFORM_LABEL[c.platform] ?? c.platform}
                  </div>
                  <div className="truncate text-xs text-muted">{c.handle ?? "—"}</div>
                </div>
                <span className="ml-auto text-xs text-muted">
                  {c.status === "stub" ? "Stub" : c.status}
                </span>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
