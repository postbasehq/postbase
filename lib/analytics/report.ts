import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Everything the Analytics page shows, for one workspace and one date range.
 *
 * Two sources:
 * - post_metric_snapshots (the reading history) gives what was *earned* in a
 *   period: each reading's increase over the one before it, counted on the day
 *   it was read. That drives the totals, their change vs the previous period,
 *   the chart and the network split, so a post from last month that is still
 *   picking up likes counts this month too.
 * - post_targets.metrics (the latest reading) ranks posts and fills the table.
 *
 * Always filtered to the workspace by id; never relies on RLS alone.
 */

import { RANGES, type RangeKey } from "@/lib/analytics/ranges";
export { RANGES, type RangeKey };

export const METRIC_KEYS = ["impressions", "likes", "comments", "shares", "saves"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
type Metrics = Partial<Record<MetricKey, number>>;

const ENGAGE: MetricKey[] = ["likes", "comments", "shares", "saves"];
const engagementOf = (m: Metrics | null | undefined) => ENGAGE.reduce((n, k) => n + (m?.[k] ?? 0), 0);

export type PostRow = {
  id: string;
  body: string;
  publishedAt: string;
  platforms: string[];
  impressions: number | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement: number;
  /** Engagement ÷ views, only over networks that report views. */
  rate: number | null;
  byPlatform: { platform: string; engagement: number; impressions: number | null }[];
};

export type Report = Awaited<ReturnType<typeof loadReport>>;

const DAY = 86_400_000;
const SETTLED_DAYS = 3;
const PAGE = 1000; // Supabase returns at most 1,000 rows per request

type Snapshot = { target_id: string; platform: string; captured_at: string; metrics: Metrics; is_baseline: boolean };
type RawPost = {
  id: string;
  body: string;
  scheduled_at: string;
  post_targets: { id: string; metrics: Metrics | null; channels: { platform: string } | null }[] | null;
};

/**
 * Every row of a query, a page at a time. A single request is capped at 1,000
 * rows however high the limit, which silently dropped the newest readings.
 * Stops at 50 pages as a guard.
 */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < 50; i++) {
    const { data, error } = await page(i * PAGE, i * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** Calendar day (YYYY-MM-DD) of an instant in a timezone. */
function dayKey(iso: string | number, tz: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
}

export async function loadReport(orgId: string, range: RangeKey, tz: string) {
  const db = createAdminClient();
  const days = RANGES[range];
  const now = Date.now();
  const start = now - days * DAY;
  const prevStart = start - days * DAY;

  const [snaps, posts, { count: postCount }] = await Promise.all([
    // Readings from before the previous period too, so the first increase inside
    // it is measured against a real earlier reading. Readings stop 14 days after
    // publishing, so 15 days before the previous period is always far enough.
    fetchAll<Snapshot>((from, to) =>
      db
        .from("post_metric_snapshots")
        .select("target_id, platform, captured_at, metrics, is_baseline")
        .eq("org_id", orgId)
        .gte("captured_at", new Date(prevStart - 15 * DAY).toISOString())
        .order("captured_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAll<RawPost>((from, to) =>
      db
        .from("posts")
        .select("id, body, scheduled_at, post_targets(id, metrics, channels(platform))")
        .eq("org_id", orgId)
        .eq("status", "published")
        .gte("scheduled_at", new Date(Math.min(start, now - 90 * DAY)).toISOString())
        .order("scheduled_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    db.from("posts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "published"),
  ]);

  // ── earned per day, from reading-to-reading increases ────────────────
  type Bucket = Record<MetricKey, number>;
  const empty = (): Bucket => ({ impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0 });
  const cur = empty();
  const prev = empty();
  const perDay = new Map<string, Bucket>();
  const perPlatform = new Map<string, { engagement: number; impressions: number }>();
  const last = new Map<string, Metrics>();

  let sawViews = false;
  for (const s of snaps) {
    const before = last.get(s.target_id) ?? {};
    last.set(s.target_id, s.metrics);
    if (typeof s.metrics.impressions === "number") sawViews = true;
    // A baseline is a post's lifetime total when history began: a starting
    // point for later increases, not something earned on that day.
    if (s.is_baseline) continue;
    const t = Date.parse(s.captured_at);
    if (t < prevStart) continue;
    const inCur = t >= start;
    const day = inCur ? dayKey(t, tz) : null;
    let bucket = day ? perDay.get(day) : undefined;
    if (day && !bucket) perDay.set(day, (bucket = empty()));
    for (const k of METRIC_KEYS) {
      // Counts can dip (an unlike); a dip isn't negative earnings.
      const gain = Math.max(0, (s.metrics[k] ?? 0) - (before[k] ?? 0));
      if (!gain) continue;
      (inCur ? cur : prev)[k] += gain;
      if (bucket) bucket[k] += gain;
      if (inCur) {
        const p = perPlatform.get(s.platform) ?? { engagement: 0, impressions: 0 };
        if (k === "impressions") p.impressions += gain;
        else p.engagement += gain;
        perPlatform.set(s.platform, p);
      }
    }
  }

  const change = (k: MetricKey | "engagement") => {
    const a = k === "engagement" ? engagementOf(cur) : cur[k];
    const b = k === "engagement" ? engagementOf(prev) : prev[k];
    // "new": something now, nothing before. null: nothing either way.
    if (!b) return a ? ("new" as const) : null;
    return (a - b) / b;
  };

  // Chart: one point per day (7d, 30d) or per week (90d), oldest first.
  const step = range === "90d" ? 7 : 1;
  const series: { label: string; from: string; impressions: number; engagement: number }[] = [];
  for (let i = days - step; i >= 0; i -= step) {
    const b = empty();
    for (let d = 0; d < step; d++) {
      const key = dayKey(now - (i + d) * DAY, tz);
      const v = perDay.get(key);
      if (v) for (const k of METRIC_KEYS) b[k] += v[k];
    }
    const from = new Date(now - (i + step - 1) * DAY);
    series.push({
      label: from.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tz }),
      from: from.toISOString(),
      impressions: b.impressions,
      engagement: engagementOf(b),
    });
  }

  // ── posts: latest readings ───────────────────────────────────────────
  const rows: PostRow[] = posts.map((p) => {
    const targets = p.post_targets ?? [];
    const sum = empty();
    let seenImp = false;
    let impForRate = 0;
    let engForRate = 0;
    const byPlatform = targets.map((t) => {
      const m = t.metrics ?? {};
      for (const k of METRIC_KEYS) sum[k] += m[k] ?? 0;
      if (typeof m.impressions === "number") {
        seenImp = true;
        impForRate += m.impressions;
        engForRate += engagementOf(m);
      }
      return {
        platform: t.channels?.platform ?? "",
        engagement: engagementOf(m),
        impressions: typeof m.impressions === "number" ? m.impressions : null,
      };
    });
    return {
      id: p.id,
      body: p.body,
      publishedAt: p.scheduled_at,
      platforms: [...new Set(byPlatform.map((b) => b.platform).filter(Boolean))],
      impressions: seenImp ? sum.impressions : null,
      likes: sum.likes,
      comments: sum.comments,
      shares: sum.shares,
      saves: sum.saves,
      engagement: engagementOf(sum),
      rate: impForRate > 0 ? engForRate / impForRate : null,
      byPlatform,
    };
  });
  const inRange = rows.filter((r) => Date.parse(r.publishedAt) >= start);

  // ── best time to post: average engagement by weekday × time band ─────
  // Last 90 days whatever the range, so there are enough posts to mean something.
  const BANDS = [
    { label: "Morning", from: 5, to: 11 },
    { label: "Midday", from: 11, to: 14 },
    { label: "Afternoon", from: 14, to: 18 },
    { label: "Evening", from: 18, to: 29 }, // runs past midnight
  ];
  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cells = DOW.map(() => BANDS.map(() => ({ posts: 0, engagement: 0 })));
  // Only posts at least 3 days old: newer ones are still collecting, and would
  // make the slots they were posted in look worse than they are.
  const recent = rows.filter((r) => {
    const t = Date.parse(r.publishedAt);
    return t >= now - 90 * DAY && t <= now - SETTLED_DAYS * DAY;
  });
  for (const r of recent) {
    const d = new Date(r.publishedAt);
    const hour = Number(d.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: tz })) % 24;
    const dow = DOW.indexOf(d.toLocaleDateString("en-GB", { weekday: "short", timeZone: tz }));
    const h = hour < 5 ? hour + 24 : hour;
    const band = BANDS.findIndex((b) => h >= b.from && h < b.to);
    if (dow < 0 || band < 0) continue;
    cells[dow][band].posts++;
    cells[dow][band].engagement += r.engagement;
  }
  const avg = cells.map((row) => row.map((c) => (c.posts ? c.engagement / c.posts : null)));

  // Posts out for under a few hours, or with no reading yet: their numbers are still on the way.
  const pending = inRange.filter(
    (r) => Date.parse(r.publishedAt) >= now - 3 * 3600_000 || r.byPlatform.every((b) => b.engagement === 0 && b.impressions == null),
  ).length;

  return {
    range,
    days,
    totalPublished: postCount ?? 0,
    /** Whether any of the workspace's networks report views. Bluesky, Mastodon and LinkedIn don't. */
    hasViews: sawViews || rows.some((r) => r.impressions != null),
    pending,
    totals: {
      impressions: cur.impressions,
      engagement: engagementOf(cur),
      likes: cur.likes,
      comments: cur.comments,
      shares: cur.shares,
      saves: cur.saves,
    },
    change: {
      impressions: change("impressions"),
      engagement: change("engagement"),
      likes: change("likes"),
      comments: change("comments"),
      shares: change("shares"),
      saves: change("saves"),
    },
    series,
    networks: [...perPlatform.entries()]
      .map(([platform, v]) => ({ platform, ...v }))
      .filter((n) => n.engagement > 0 || n.impressions > 0)
      .sort((a, b) => b.engagement - a.engagement),
    topPosts: [...inRange].sort((a, b) => b.engagement - a.engagement).slice(0, 5),
    posts: inRange,
    bestTimes: {
      days: DOW,
      bands: BANDS.map((b) => b.label),
      avg,
      counts: cells.map((row) => row.map((c) => c.posts)),
      sample: recent.length,
      settledDays: SETTLED_DAYS,
    },
  };
}
