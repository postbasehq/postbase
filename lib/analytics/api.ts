import { createAdminClient } from "@/lib/supabase/admin";
import { METRIC_KEYS, type MetricKey } from "@/lib/analytics/report";
import { postUrl } from "@/lib/post-urls";

/*
 * Post analytics for the REST API and MCP (GET /v1/analytics, get_analytics):
 * published posts in a date range with each channel's latest metrics, as the
 * Analytics page's table reads them (post_targets.metrics, refreshed by the
 * publish cron). Totals cover every post in the range, not just the page.
 * Always scoped by org_id.
 */

const DAY = 86_400_000;
export const MAX_RANGE_DAYS = 366;
export const SORTS = ["date", ...METRIC_KEYS, "engagement"] as const;
type Sort = (typeof SORTS)[number];
type Metrics = Partial<Record<MetricKey, number>>;
const ENGAGE: MetricKey[] = ["likes", "comments", "shares", "saves"];

export type AnalyticsQuery = {
  from?: string;
  to?: string;
  postId?: string;
  channelId?: string;
  platform?: string;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
};

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

function sum(list: Metrics[]) {
  const out: { impressions: number | null } & Record<Exclude<MetricKey, "impressions"> | "engagement", number> = {
    impressions: null,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    engagement: 0,
  };
  for (const m of list) {
    // Impressions only where a network reports them; null when none did.
    if (typeof m.impressions === "number") out.impressions = (out.impressions ?? 0) + m.impressions;
    for (const k of ENGAGE) out[k as Exclude<MetricKey, "impressions">] += m[k] ?? 0;
  }
  out.engagement = ENGAGE.reduce((n, k) => n + out[k as Exclude<MetricKey, "impressions">], 0);
  return out;
}

type Row = {
  id: string;
  body: string;
  scheduled_at: string;
  post_targets: {
    channel_id: string;
    status: string;
    platform_post_id: string | null;
    metrics: Metrics | null;
    metrics_updated_at: string | null;
    channels: { platform: string; handle: string | null } | null;
  }[];
};

export async function getAnalytics(orgId: string, q: AnalyticsQuery) {
  const to = q.to ?? new Date().toISOString().slice(0, 10);
  const from = q.from ?? new Date(Date.parse(`${to}T00:00:00Z`) - 29 * DAY).toISOString().slice(0, 10);
  if (!isDay(from) || !isDay(to)) throw new Error("from and to must be dates as YYYY-MM-DD");
  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY;
  if (span < 0) throw new Error("from must be on or before to");
  if (span >= MAX_RANGE_DAYS) throw new Error(`The range can be up to ${MAX_RANGE_DAYS} days`);
  const sort = (q.sort ?? "date") as Sort;
  if (!(SORTS as readonly string[]).includes(sort)) throw new Error(`sort must be one of ${SORTS.join(", ")}`);
  const desc = (q.order ?? "desc") !== "asc";
  const limit = Math.min(Math.max(Math.floor(q.limit ?? 50), 1), 100);
  const offset = Math.max(Math.floor(q.offset ?? 0), 0);

  const db = createAdminClient();
  let query = db
    .from("posts")
    .select(
      "id, body, scheduled_at, post_targets!inner(channel_id, status, platform_post_id, metrics, metrics_updated_at, channels(platform, handle))",
    )
    .eq("org_id", orgId)
    .not("post_targets.platform_post_id", "is", null)
    .order("scheduled_at", { ascending: false })
    .limit(2000);
  if (q.postId) {
    query = query.eq("id", q.postId);
  } else {
    query = query.gte("scheduled_at", `${from}T00:00:00Z`).lt("scheduled_at", new Date(Date.parse(`${to}T00:00:00Z`) + DAY).toISOString());
  }
  if (q.channelId) query = query.eq("post_targets.channel_id", q.channelId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const posts = ((data ?? []) as unknown as Row[])
    .map((p) => {
      const channels = p.post_targets
        .filter((t) => !q.platform || t.channels?.platform === q.platform)
        .map((t) => ({
          channel_id: t.channel_id,
          platform: t.channels?.platform ?? null,
          handle: t.channels?.handle ?? null,
          url: t.channels ? postUrl(t.channels.platform, t.channels.handle, t.platform_post_id) : null,
          metrics: t.metrics ?? {},
          metrics_updated_at: t.metrics_updated_at,
        }));
      return { post_id: p.id, body: p.body, published_at: p.scheduled_at, channels, totals: sum(channels.map((c) => c.metrics)) };
    })
    .filter((p) => p.channels.length > 0);

  const value = (p: (typeof posts)[number]) =>
    sort === "date" ? Date.parse(p.published_at) : sort === "impressions" ? (p.totals.impressions ?? -1) : p.totals[sort as Exclude<Sort, "date" | "impressions">];
  posts.sort((a, b) => (desc ? value(b) - value(a) : value(a) - value(b)));

  return {
    from: q.postId ? null : from,
    to: q.postId ? null : to,
    totals: { posts: posts.length, ...sum(posts.flatMap((p) => p.channels.map((c) => c.metrics))) },
    posts: posts.slice(offset, offset + limit),
    has_more: offset + limit < posts.length,
  };
}
