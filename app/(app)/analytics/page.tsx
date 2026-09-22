import { createClient } from "@/lib/supabase/server";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { AnalyticsTable, type AnalyticsRow } from "@/components/AnalyticsTable";

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
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
    .limit(100);

  const posts = (data ?? []) as unknown as Post[];

  // Top-line totals + per-platform breakdown across every channel.
  const totals: Record<string, number> = {};
  const byPlatform: Record<string, Record<string, number>> = {};
  for (const p of posts) {
    for (const t of p.post_targets ?? []) {
      const plat = t.channels?.platform;
      const acc = plat ? (byPlatform[plat] ??= {}) : null;
      for (const { key } of METRICS) {
        const v = t.metrics?.[key];
        if (typeof v === "number") {
          totals[key] = (totals[key] ?? 0) + v;
          if (acc) acc[key] = (acc[key] ?? 0) + v;
        }
      }
    }
  }
  const hasAny = posts.some((p) => (p.post_targets ?? []).some((t) => t.metrics));

  // Engagement (likes + comments + shares + saves) per platform, for the bars.
  const platformRows = Object.entries(byPlatform)
    .map(([platform, m]) => ({
      platform,
      engagement: (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0),
    }))
    .filter((r) => r.engagement > 0)
    .sort((a, b) => b.engagement - a.engagement);
  const maxEng = Math.max(1, ...platformRows.map((r) => r.engagement));

  // One row per post × channel for the (paginated) metrics table.
  const rows: AnalyticsRow[] = posts.flatMap((p) =>
    (p.post_targets ?? []).map((t) => ({
      id: t.id,
      body: p.body,
      platform: t.channels?.platform ?? "",
      metrics: t.metrics,
    })),
  );

  const card = "rounded-2xl border border-line bg-surface shadow-sm";

  return (
    <div>
      <header className="flex items-end justify-between gap-4 pb-5 [border-bottom:0.5px_solid_var(--line)]">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">Post performance</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            Engagement on your published posts, refreshed automatically after they go out.
          </p>
        </div>
        {posts.length > 0 ? (
          <div className="hidden shrink-0 text-right sm:block">
            <div className="font-display text-2xl font-semibold leading-none tabular-nums">
              {posts.length}
            </div>
            <div className="mt-1 text-xs text-muted">published</div>
          </div>
        ) : null}
      </header>

      {/* totals — all five metrics */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {METRICS.map((m) => (
          <div key={m.key} className={`${card} px-4 py-3.5`}>
            <div className="text-xs font-medium text-muted">{m.label}</div>
            <div className="mt-0.5 font-display text-2xl font-semibold tabular-nums">
              {fmt(totals[m.key] ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* engagement by platform */}
      {platformRows.length > 0 ? (
        <div className={`mt-6 ${card} p-4`}>
          <h2 className="font-display text-sm font-semibold">Engagement by platform</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {platformRows.map((r) => (
              <div key={r.platform} className="flex items-center gap-3">
                <div className="flex w-28 shrink-0 items-center gap-2">
                  {BRANDS[r.platform] ? <BrandTile platform={r.platform} size={20} radius={5} /> : null}
                  <span className="truncate text-[13px] font-medium">
                    {PLATFORM_LABEL[r.platform] ?? r.platform}
                  </span>
                </div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-blue"
                    style={{ width: `${Math.max(3, (r.engagement / maxEng) * 100)}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-[13px] font-semibold tabular-nums">
                  {fmt(r.engagement)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* per-post breakdown — paginated table */}
      <div className="mt-6">
        <AnalyticsTable rows={rows} />
      </div>

      {!hasAny && posts.length > 0 ? (
        <p className="mt-4 text-center text-xs text-muted">
          Metrics refresh within a few minutes of publishing, then periodically. Coverage varies:
          X is full; LinkedIn shows likes/comments only; Instagram insights unlock once the app’s
          analytics permission is approved; TikTok metrics need public posts (after the app passes
          TikTok’s audit — private/sandbox posts have no readable metrics).
        </p>
      ) : null}
    </div>
  );
}
