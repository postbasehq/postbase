import { createClient } from "@/lib/supabase/server";

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};

// Metrics we display, in order, with labels. Missing keys are simply omitted.
const METRICS: { key: string; label: string }[] = [
  { key: "impressions", label: "Impressions" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "saves", label: "Saves" },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

type Metrics = Record<string, number> | null;
type Target = {
  id: string;
  metrics: Metrics;
  channels: { platform: string; handle: string | null } | null;
};
type Post = {
  id: string;
  body: string;
  scheduled_at: string | null;
  post_targets: Target[];
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, body, scheduled_at, post_targets(id, metrics, channels(platform, handle))")
    .eq("status", "published")
    .order("scheduled_at", { ascending: false })
    .limit(50);

  const posts = (data ?? []) as unknown as Post[];

  // Top-line totals across every channel.
  const totals: Record<string, number> = {};
  for (const p of posts) {
    for (const t of p.post_targets ?? []) {
      for (const { key } of METRICS) {
        const v = t.metrics?.[key];
        if (typeof v === "number") totals[key] = (totals[key] ?? 0) + v;
      }
    }
  }
  const hasAny = posts.some((p) => (p.post_targets ?? []).some((t) => t.metrics));

  const card = "rounded-2xl border border-line bg-surface shadow-sm";

  return (
    <div className="mx-auto max-w-[960px]">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.01em]">Analytics</h1>
      <p className="mt-1 text-sm text-muted">Engagement on your published posts.</p>

      {/* totals */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METRICS.slice(0, 4).map((m) => (
          <div key={m.key} className={`${card} px-4 py-3.5`}>
            <div className="text-xs font-medium text-muted">{m.label}</div>
            <div className="mt-0.5 font-display text-2xl font-semibold tabular-nums">
              {fmt(totals[m.key] ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* per-post breakdown */}
      <div className={`mt-6 overflow-hidden ${card}`}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h2 className="font-display text-sm font-semibold">Published posts</h2>
          <span className="ml-auto text-xs text-muted">{posts.length}</span>
        </div>

        {posts.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">No published posts yet.</p>
        ) : (
          posts.map((p, i) => (
            <div
              key={p.id}
              className={`px-4 py-3.5 ${i < posts.length - 1 ? "border-b border-line" : ""}`}
            >
              <div className="truncate text-sm">{p.body || "(no text)"}</div>
              <div className="mt-2 flex flex-col gap-1.5">
                {(p.post_targets ?? []).map((t) => {
                  const label = PLATFORM_LABEL[t.channels?.platform ?? ""] ?? t.channels?.platform;
                  const entries = METRICS.filter(
                    (m) => typeof t.metrics?.[m.key] === "number",
                  );
                  return (
                    <div key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="w-20 shrink-0 font-medium">{label}</span>
                      {!t.metrics ? (
                        <span className="text-muted">Metrics pending…</span>
                      ) : entries.length === 0 ? (
                        <span className="text-muted">No metrics available</span>
                      ) : (
                        entries.map((m) => (
                          <span key={m.key} className="text-muted">
                            <span className="font-semibold text-ink tabular-nums">
                              {fmt(t.metrics![m.key])}
                            </span>{" "}
                            {m.label.toLowerCase()}
                          </span>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {!hasAny && posts.length > 0 ? (
        <p className="mt-4 text-center text-xs text-muted">
          Metrics refresh within a few minutes of publishing, then periodically. Coverage varies:
          X is full; TikTok needs a reconnect to grant its analytics scope; LinkedIn shows
          likes/comments only; Instagram insights unlock after the app’s analytics permission is
          approved.
        </p>
      ) : null}
    </div>
  );
}
