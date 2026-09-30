import Link from "next/link";
import type { Report } from "@/lib/analytics/report";
import { BrandTile, BRANDS } from "@/components/BrandTile";
import { LogoMark } from "@/components/marketing/Decor";
import { EngagementChart } from "@/components/analytics/EngagementChart";
import { PostsTable } from "@/components/analytics/PostsTable";
import { dayHref } from "@/lib/analytics/links";

/*
 * The Analytics page layout: headline numbers and trend, where engagement came
 * from, best times to post, then every post. Data comes from loadReport.
 */

const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const card = "rounded-[22px] border border-line bg-surface shadow-sm";

export function Dashboard({ report, tz }: { report: Report; tz: string }) {
  const { totals, change } = report;
  return (
    <div className="flex flex-col gap-5">
      {/* Row 1: the headline numbers */}
      {/* One row of five only when there's room beside the sidebar; otherwise Views on its own line. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
        <div className="sm:col-span-2 lg:col-span-4 xl:col-span-1">
          {/* Lead with views, unless none of this workspace's networks report them. */}
          {report.hasViews ? (
            <Hero label="Views" value={totals.impressions} change={change.impressions} days={report.days} />
          ) : (
            <Hero label="Engagement" value={totals.engagement} change={change.engagement} days={report.days} />
          )}
        </div>
        {report.hasViews ? <Stat label="Engagement" value={totals.engagement} change={change.engagement} /> : null}
        <Stat label="Likes" value={totals.likes} change={change.likes} />
        <Stat label="Comments" value={totals.comments} change={change.comments} />
        <Stat label="Shares" value={totals.shares} change={change.shares} />
        {report.hasViews ? null : <Stat label="Saves" value={totals.saves} change={change.saves} />}
      </div>

      {report.pending > 0 ? (
        <p className="-mt-1 flex items-center gap-2 text-[13px] text-muted">
          <span className="size-2 shrink-0 rounded-full bg-[#e3a72c]" />
          {report.pending === 1 ? "1 recent post is" : `${report.pending} recent posts are`} still collecting. Numbers for
          new posts arrive within about an hour of publishing.
        </p>
      ) : null}

      {/* Row 2: the trend */}
      <section className={`${card} p-5 md:p-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.01em] text-ink">Views and engagement</h2>
          <span className="flex items-center gap-4 text-[12px] text-muted">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#2b59d9]" /> Views</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-[#e3a72c]" /> Engagement</span>
          </span>
        </div>
        <div className="mt-4">
          <EngagementChart points={report.series} unit={report.range === "90d" ? "week" : "day"} />
        </div>
      </section>

      {/* Row 3: where it came from, and when to post */}
      <div className="grid gap-5 lg:grid-cols-2">
        <TopNetworks networks={report.networks} />
        <BestTimes data={report.bestTimes} />
      </div>

      {/* Row 4: the posts that did best */}
      <TopPosts posts={report.topPosts} tz={tz} />

      <PostsTable posts={report.posts} tz={tz} />
    </div>
  );
}

/** Up/down against the previous period, in solid colours. "New" when there was nothing before. */
function Change({ value, onDark }: { value: number | "new" | null; onDark?: boolean }) {
  if (value == null || value === "new")
    return (
      <span
        title="No earlier data to compare with yet"
        className={`cursor-help text-[12px] underline decoration-dotted underline-offset-2 ${onDark ? "text-white/80" : "text-muted"}`}
      >
        {value === "new" ? "New" : "—"}
        <span className="sr-only"> (no earlier data to compare with yet)</span>
      </span>
    );
  const up = value >= 0;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold"
      style={onDark ? { background: "#ffffff", color: up ? "#188038" : "#d14a3e" } : { background: up ? "#188038" : "#d14a3e", color: "#ffffff" }}
    >
      {up ? "↑" : "↓"} {pct(Math.abs(value))}
    </span>
  );
}

function Hero({ label, value, change, days }: { label: string; value: number; change: number | "new" | null; days: number }) {
  return (
    <div className="relative isolate flex h-full min-h-[180px] flex-col justify-between overflow-hidden rounded-[22px] bg-[#2b59d9] p-6 text-white shadow-sm">
      {/* The icon's red p, hanging from the top edge in the corner, as in the logo. */}
      <LogoMark color="#d14a3e" className="pointer-events-none absolute right-5 top-0 -z-10 w-[34%] max-w-[120px]" />
      <div>
        <div className="text-[14px] font-medium">{label}</div>
        <div className="mt-0.5 text-[12px] text-white/75">Last {days} days, all posts</div>
      </div>
      <div>
        <div className="font-display text-[clamp(38px,3.6vw,52px)] font-semibold leading-none tracking-[-0.04em]">{compact(value)}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Change value={change} onDark />
          {typeof change === "number" ? <span className="text-[12px] text-white/75">vs previous {days} days</span> : null}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, change }: { label: string; value: number; change: number | "new" | null }) {
  return (
    <div className={`${card} flex min-h-[150px] flex-col justify-between gap-4 p-5`}>
      <div className="text-[14px] text-muted">{label}</div>
      <div>
        <div className="font-display text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">{compact(value)}</div>
        <div className="mt-3">
          <Change value={change} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className={`${card} flex flex-col p-5`}>
      <h2 className="font-display text-[18px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {sub ? <p className="mt-0.5 text-[12px] text-muted">{sub}</p> : null}
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}

function TopNetworks({ networks }: { networks: Report["networks"] }) {
  const total = networks.reduce((n, x) => n + x.engagement, 0) || 1;
  return (
    <Panel title="Top networks" sub="Share of engagement">
      {networks.length === 0 ? (
        <Quiet>No engagement in this period yet.</Quiet>
      ) : (
        <ul className="flex flex-col gap-4">
          {networks.slice(0, 6).map((n) => (
            <li key={n.platform}>
              <div className="flex items-center gap-3">
                <BrandTile platform={n.platform} size={28} radius={8} />
                <span className="flex-1 text-[14px] font-medium text-ink">{BRANDS[n.platform]?.label ?? n.platform}</span>
                <span className="text-[12px] tabular-nums text-muted">
                  {n.engagement.toLocaleString("en-US")} · <span className="font-semibold text-ink">{pct(n.engagement / total)}</span>
                </span>
              </div>
              <div className="ml-10 mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-[#2b59d9]" style={{ width: `${Math.max(2, (n.engagement / total) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TopPosts({ posts, tz }: { posts: Report["topPosts"]; tz: string }) {
  const max = Math.max(1, ...posts.map((p) => p.engagement));
  return (
    <Panel title="Top posts" sub="Most engagement, published in this period">
      {posts.length === 0 ? (
        <Quiet>Nothing published in this period.</Quiet>
      ) : (
        <ol className="flex flex-col">
          {posts.map((p, i) => (
            <li
              key={p.id}
              className={`grid grid-cols-[36px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 py-4 md:grid-cols-[36px_minmax(0,1fr)_repeat(3,96px)_minmax(120px,180px)] ${
                i ? "border-t border-line" : "pt-1"
              }`}
            >
              <span
                className="grid size-9 place-items-center rounded-full font-display text-[14px] font-semibold"
                style={i === 0 ? { background: "#e3a72c", color: "#202124" } : { background: "var(--surface-2)", color: "var(--ink)" }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <Link href={dayHref(p.publishedAt, tz)} className="line-clamp-2 text-[14px] leading-snug text-ink hover:underline">
                  {p.body || "Untitled post"}
                </Link>
                <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
                  {p.platforms.map((pl) => (
                    <BrandTile key={pl} platform={pl} size={18} radius={5} />
                  ))}
                  <span className="ml-1">
                    {new Date(p.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tz })}
                  </span>
                </span>
              </div>
              <Figure label="Views" value={p.impressions == null ? "—" : compact(p.impressions)} />
              <Figure label="Engagements" value={compact(p.engagement)} strong />
              <Figure label="Rate" value={p.rate == null ? "—" : `${(p.rate * 100).toFixed(1)}%`} />
              <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-line md:col-span-1">
                <div className="h-full rounded-full bg-[#2b59d9]" style={{ width: `${Math.max(3, (p.engagement / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="hidden text-right md:block">
      <div className={`font-display text-[16px] tabular-nums ${strong ? "font-semibold text-ink" : "text-ink"}`}>{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

// Four solid steps, lowest to highest; cells with no posts are a dashed outline.
const HEAT = ["var(--line)", "#2b59d9", "#e3a72c", "#d14a3e"];

function BestTimes({ data }: { data: Report["bestTimes"] }) {
  const values = data.avg.flat().filter((v): v is number => v != null).sort((a, b) => a - b);
  const q = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))] ?? 0;
  const cuts = [q(0.25), q(0.5), q(0.8)];
  const level = (v: number) => (v >= cuts[2] ? 3 : v >= cuts[1] ? 2 : v >= cuts[0] ? 1 : 0);
  const enough = data.sample >= 20;
  // The three best slots in words, for phones and screen readers. Needs 2+ posts.
  const top = data.avg
    .flatMap((row, di) => row.map((v, bi) => ({ day: data.days[di], band: data.bands[bi], avg: v ?? 0, posts: data.counts[di][bi] })))
    .filter((c) => c.posts >= 2)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  return (
    <Panel title="Best time to post" sub="Average engagement per post by when it went out, last 90 days">
      <div className="relative">
        <div className={enough ? "" : "opacity-30"}>
          <div className="grid grid-cols-[36px_repeat(4,minmax(0,1fr))] gap-2 text-[11px] text-muted">
            <span />
            {data.bands.map((b) => (
              <span key={b} className="truncate text-center">{b}</span>
            ))}
            {data.days.map((d, di) => (
              <Row key={d} day={d}>
                {data.avg[di].map((v, bi) => (
                  <span
                    key={bi}
                    role="img"
                    aria-label={v == null ? `${d} ${data.bands[bi]}: no posts` : `${d} ${data.bands[bi]}: ${Math.round(v)} engagements per post, from ${data.counts[di][bi]} ${data.counts[di][bi] === 1 ? "post" : "posts"}`}
                    title={v == null ? `${d} ${data.bands[bi]}: no posts` : `${d} ${data.bands[bi]}: ${Math.round(v)} engagements per post (${data.counts[di][bi]} ${data.counts[di][bi] === 1 ? "post" : "posts"})`}
                    className={`h-9 rounded-lg ${v == null ? "border border-dashed border-line" : ""}`}
                    style={v == null ? undefined : { background: HEAT[level(v)] }}
                  />
                ))}
              </Row>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-muted">
            <span>Posts at least {data.settledDays} days old</span>
            <span className="flex items-center gap-1">
              Less
              {HEAT.map((c) => (
                <span key={c} className="size-3 rounded-[3px]" style={{ background: c }} />
              ))}
              More
            </span>
          </div>
          {enough && top.length ? (
            <ol className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-[13px]">
              {top.map((t, i) => (
                <li key={`${t.day}-${t.band}`} className="flex items-center justify-between gap-3">
                  <span className="text-ink">
                    <span className="mr-2 font-semibold tabular-nums text-muted">{i + 1}</span>
                    {t.day} {t.band.toLowerCase()}
                  </span>
                  <span className="tabular-nums text-muted">
                    <span className="font-semibold text-ink">{Math.round(t.avg).toLocaleString("en-US")}</span> per post · {t.posts}{" "}
                    {t.posts === 1 ? "post" : "posts"}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
        {!enough ? (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <p className="text-[13px] font-medium text-ink">
              Your best times show once 20 posts are at least {data.settledDays} days old ({data.sample} so far).
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function Row({ day, children }: { day: string; children: React.ReactNode }) {
  return (
    <>
      <span className="self-center">{day}</span>
      {children}
    </>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-muted">{children}</p>;
}

export function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-start justify-center pt-24">
      <div className="relative isolate w-full max-w-md overflow-hidden rounded-[22px] border border-line bg-surface p-2 shadow-lg">
        <div className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface-2 p-6">
          <LogoMark color="currentColor" className="pointer-events-none absolute -z-10 right-5 top-0 w-[120px] text-ink opacity-[0.06]" />
          <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">Your numbers show up here</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Once a post goes out, Postbase reads its views, likes, comments and shares from each network, first within
            the hour, then regularly for two weeks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 pb-4 pt-4">
          <Link href="/composer" className="rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm hover:shadow-md">
            Schedule a post
          </Link>
          <Link href="/channels" className="text-[13px] font-semibold text-blue-ink hover:underline">
            Connect a channel →
          </Link>
        </div>
      </div>
    </div>
  );
}
