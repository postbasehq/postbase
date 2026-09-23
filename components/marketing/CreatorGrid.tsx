"use client";

import { useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { AgentMock, useLoop } from "@/components/marketing/Mocks";
import { ComposerShot } from "@/components/marketing/ComposerShot";

/*
 * The creators feature grid: big brand-colour cards, each showing a real
 * Postbase screen cropped off the card's edge (Postiz-style), animated while
 * on screen. Screens mirror: CalendarView (month), /agent, PostForm variants,
 * Media library, Queue, Analytics.
 */

const TONES = {
  blue: { bg: "#2b59d9", fg: "text-white", sub: "text-white/85", pill: "text-[#2b59d9]" },
  amber: { bg: "#e3a72c", fg: "text-[#202124]", sub: "text-[#202124]/80", pill: "text-[#8a5a00]" },
  red: { bg: "#d14a3e", fg: "text-white", sub: "text-white/85", pill: "text-[#d14a3e]" },
} as const;
type Tone = keyof typeof TONES;

export const shot = "rounded-2xl bg-surface shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)] ring-1 ring-black/5";

function Copy({ tone, label, title, body }: { tone: Tone; label: string; title: string; body: string }) {
  const t = TONES[tone];
  return (
    <div>
      <span className={`inline-block rounded-full bg-white px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] ${t.pill}`}>
        {label}
      </span>
      <h3 className={`mt-4 font-display text-[clamp(26px,2.6vw,34px)] font-semibold leading-[1.1] tracking-[-0.02em] ${t.fg}`}>
        {title}
      </h3>
      <p className={`mt-3 max-w-[42ch] text-[16px] leading-relaxed ${t.sub}`}>{body}</p>
    </div>
  );
}

/**
 * A feature card. `layout`: "top" = copy above a screen that bleeds off the
 * bottom-right; "bottom" = screen bleeding off the top-right above the copy;
 * "side" = copy left, screen bleeding off the right and bottom.
 */
export function Tile({
  tone,
  label,
  title,
  body,
  layout,
  className = "",
  children,
}: {
  tone: Tone;
  label: string;
  title: string;
  body: string;
  layout: "top" | "bottom" | "side";
  className?: string;
  children: React.ReactNode;
}) {
  const copy = <Copy tone={tone} label={label} title={title} body={body} />;
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] p-8 md:p-10 ${className}`}
      style={{ backgroundColor: TONES[tone].bg }}
    >
      {layout === "top" ? (
        <>
          {copy}
          <div className="-mb-20 -mr-24 mt-9">{children}</div>
        </>
      ) : layout === "bottom" ? (
        <>
          <div className="-mr-24 -mt-16 mb-9">{children}</div>
          {copy}
        </>
      ) : (
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          {copy}
          <div className="-mb-24 -mr-28 md:mt-6">{children}</div>
        </div>
      )}
    </div>
  );
}

export function CreatorGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-5">
      <Tile
        className="md:col-span-3"
        tone="blue"
        layout="top"
        label="Planning"
        title="See the whole month at a glance"
        body="Every post you've drafted, scheduled and published, in a month, week or day view. Click an open slot to write a post for that time."
      >
        <MonthShot />
      </Tile>
      <Tile
        className="md:col-span-2"
        tone="amber"
        layout="bottom"
        label="AI agent"
        title="Ask for a post, get a draft"
        body="Tell the built-in agent what you want in plain words. It drafts for your channels and waits for you to hit Schedule."
      >
        <div className="w-[480px] pt-16">
          <AgentMock />
        </div>
      </Tile>
      <Tile
        className="md:col-span-5"
        tone="red"
        layout="side"
        label="Writing"
        title="One post, tailored for every network"
        body="Write it once, then adjust the wording for each network. Every version keeps to that network's character limit."
      >
        <div className="h-[470px] w-[820px] overflow-hidden rounded-2xl shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]">
          <ComposerShot />
        </div>
      </Tile>
      <Tile
        className="md:col-span-2"
        tone="amber"
        layout="top"
        label="Media"
        title="Upload once, use anywhere"
        body="Images and video up to 1 GB, uploaded in resumable chunks, so a dropped connection doesn't cost you the file."
      >
        <MediaShot />
      </Tile>
      <Tile
        className="md:col-span-3"
        tone="blue"
        layout="bottom"
        label="Publishing"
        title="Know exactly what went out"
        body="The queue shows every post's delivery on every channel. Failures retry on their own, and anything that needs you is flagged."
      >
        <div className="pt-16">
          <QueueShot />
        </div>
      </Tile>
      <Tile
        className="md:col-span-5"
        tone="red"
        layout="side"
        label="Analytics"
        title="See what's working"
        body="Impressions, likes, comments, shares and saves for every published post, and which network is pulling its weight."
      >
        <AnalyticsShot />
      </Tile>
    </div>
  );
}

// ── Planning: calendar month view ────────────────────────────────────────

const HATCH: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(130,130,130,0.14) 5px, rgba(130,130,130,0.14) 6px)",
};
const PILL = {
  published: "bg-green/10 border-l-green",
  scheduled: "bg-blue-soft border-l-blue",
  draft: "bg-surface-2 border-l-muted",
} as const;
type PillStatus = keyof typeof PILL;
type MonthPost = { day: number; time: string; text: string; chans: string[]; status: PillStatus };

const MONTH_POSTS: MonthPost[] = [
  { day: 15, time: "09:00", text: "This week's roasts", chans: ["x", "bluesky"], status: "published" },
  { day: 17, time: "12:30", text: "Glaze test #14", chans: ["bluesky", "mastodon"], status: "published" },
  { day: 18, time: "10:30", text: "Easy runs are too fast", chans: ["x", "linkedin"], status: "published" },
  { day: 21, time: "09:00", text: "Fieldnote 2.4 is out", chans: ["x", "linkedin"], status: "published" },
  { day: 22, time: "14:00", text: "Studio tour", chans: ["linkedin"], status: "published" },
  { day: 23, time: "12:00", text: "New on the shelf: Kochere", chans: ["x", "linkedin", "bluesky"], status: "scheduled" },
  { day: 24, time: "10:00", text: "Tempo run basics", chans: ["x"], status: "scheduled" },
  { day: 26, time: "13:30", text: "Parkrun recap", chans: ["x"], status: "draft" },
  { day: 27, time: "18:00", text: "Shop opens: 24 cups", chans: ["bluesky", "mastodon"], status: "scheduled" },
  { day: 29, time: "09:00", text: "Pour-over in 60s", chans: ["x", "linkedin"], status: "scheduled" },
];
const NEW_MONTH_POST: MonthPost = { day: 25, time: "16:00", text: "Launch week recap", chans: ["x", "linkedin", "bluesky"], status: "scheduled" };

function MonthShot() {
  const [added, setAdded] = useState(true);
  const [out, setOut] = useState(true);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setAdded(false);
    setOut(false);
    await step(1400);
    setAdded(true);
    await step(1600);
    setOut(true);
    await step(3400);
  });
  const posts = added ? [...MONTH_POSTS, NEW_MONTH_POST] : MONTH_POSTS;
  // Weeks of 14 Sep – 4 Oct 2026 (Mon-first).
  const weeks = [
    [14, 15, 16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25, 26, 27],
    [28, 29, 30, 1, 2, 3, 4],
  ];
  return (
    <div ref={ref} className={`${shot} w-[760px] p-4`}>
      {/* header bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-2/40 px-3.5 py-2 shadow-sm">
        <span className="flex text-muted">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </span>
        <span className="font-display text-[16px] font-semibold text-ink">September 2026</span>
        <span className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink">Today</span>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-surface-2 p-1 text-xs font-semibold">
          <span className="px-3 py-1 text-muted">Day</span>
          <span className="px-3 py-1 text-muted">Week</span>
          <span className="rounded-full bg-blue px-3 py-1 text-on-blue shadow-sm">Month</span>
        </span>
      </div>
      {/* month grid */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        <div className="grid grid-cols-7 border-b border-line bg-surface-2/60">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {w.map((d) => {
              const nextMonth = wi === 2 && d < 14;
              const past = !nextMonth && d < 23;
              const dayPosts = nextMonth ? [] : posts.filter((p) => p.day === d);
              return (
                <div key={d} className="min-h-[104px] border-b border-r border-line p-1.5" style={past ? HATCH : undefined}>
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                      d === 23 && !nextMonth ? "bg-blue text-on-blue" : "text-muted"
                    }`}
                  >
                    {d}
                  </span>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayPosts.map((p) => {
                      const status: PillStatus = p.day === 23 && out ? "published" : p.status;
                      return (
                        <div
                          key={p.text}
                          className={`flex items-center gap-1 rounded border border-l-[3px] border-line px-1 py-0.5 text-[10.5px] text-ink transition-colors duration-500 ${PILL[status]} ${
                            p === NEW_MONTH_POST ? "swap-in" : ""
                          }`}
                        >
                          <span className="flex shrink-0 -space-x-1">
                            {p.chans.slice(0, 2).map((c) => (
                              <span key={c} className="rounded-[3px] ring-1 ring-surface">
                                <BrandTile platform={c} size={11} radius={3} />
                              </span>
                            ))}
                          </span>
                          <span className="tabular-nums text-muted">{p.time}</span>
                          <span className="truncate">{p.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Media library ────────────────────────────────────────────────────────

function MediaShot() {
  const [progress, setProgress] = useState(72);
  const [done, setDone] = useState(false);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setDone(false);
    setProgress(0);
    await step(600);
    for (let p = 3; p <= 100; p += 3) {
      setProgress(p);
      await step(60);
    }
    setDone(true);
    await step(2600);
  });
  const mb = Math.round((212 * progress) / 100);
  return (
    <div ref={ref} className={`${shot} w-[560px] p-5`}>
      <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="font-display text-[20px] font-semibold tracking-[-0.02em] text-ink">Media library</div>
          <p className="mt-1 max-w-[36ch] text-[12.5px] text-muted">Upload images and video up to 1 GB. Reuse them across posts.</p>
        </div>
        <div className="text-right">
          <div className="font-display text-[20px] font-semibold leading-none tabular-nums text-ink">{done ? 13 : 12}</div>
          <div className="mt-1 text-[11px] text-muted">files</div>
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed border-line bg-surface px-6 py-7 text-center">
        <span className="text-blue-ink">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 16V4M7 9l5-5 5 5M20 16.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.5" />
          </svg>
        </span>
        <div className="mt-2.5 font-display text-[14px] font-semibold text-ink">Drop files to upload</div>
        <p className="mt-0.5 text-[12px] text-muted">
          or <span className="font-semibold text-blue-ink underline underline-offset-2">browse</span> · images and video up to 1 GB
        </p>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">studio-tour.mov</span>
            <span className="shrink-0 text-xs tabular-nums text-muted">{done ? "212 MB · done" : `${mb} / 212 MB`}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full rounded-full ${done ? "bg-green" : "bg-blue"}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2.5">
        <span className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          Search media
        </span>
        <span className="flex items-center gap-1 rounded-full border border-line p-1 text-[11.5px] font-semibold">
          <span className="rounded-full bg-blue px-3 py-1 text-on-blue">All</span>
          <span className="px-3 py-1 text-muted">Images</span>
          <span className="px-3 py-1 text-muted">Video</span>
        </span>
      </div>
    </div>
  );
}

// ── Publishing: the queue ────────────────────────────────────────────────

type QStatus = "scheduled" | "publishing" | "published" | "draft" | "failed";
const Q_STATUS: Record<QStatus, { cls: string; dot: string; label: string }> = {
  draft: { cls: "bg-surface-2 text-muted", dot: "bg-muted", label: "Draft" },
  scheduled: { cls: "bg-blue-soft text-blue-ink", dot: "bg-blue", label: "Scheduled" },
  publishing: { cls: "bg-amber-bright/15 text-amber", dot: "bg-amber-bright", label: "Publishing" },
  published: { cls: "bg-green/15 text-green", dot: "bg-green", label: "Published" },
  failed: { cls: "bg-[#d14a3e] text-white", dot: "bg-white", label: "Failed" },
};
const Q_COLS = "grid grid-cols-[130px_minmax(0,1fr)_90px_90px_110px]";

function QueueShot() {
  const [first, setFirst] = useState<QStatus>("published");
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setFirst("scheduled");
    await step(1500);
    setFirst("publishing");
    await step(1500);
    setFirst("published");
    await step(3200);
  });
  const rows: { when: string; text: string; chip?: string; chans: string[]; delivery: [string, string]; status: QStatus }[] = [
    {
      when: "Wed 23 Sep, 12:00",
      text: "New on the shelf: Kochere, Ethiopia",
      chans: ["x", "linkedin", "bluesky"],
      delivery: first === "published" ? ["Delivered", "text-green"] : ["Queued", "text-[#e3a72c]"],
      status: first,
    },
    { when: "Wed 23 Sep, 09:00", text: "This week's roasts", chip: "Weekly", chans: ["x", "bluesky"], delivery: ["Delivered", "text-green"], status: "published" },
    { when: "Tue 22 Sep, 14:00", text: "Studio tour", chans: ["linkedin", "tiktok"], delivery: ["Retrying", "text-amber"], status: "publishing" },
    { when: "Thu 24 Sep, 10:00", text: "Tempo runs, simply", chip: "🧵 3", chans: ["x"], delivery: ["Queued", "text-[#e3a72c]"], status: "scheduled" },
    { when: "Mon 21 Sep, 18:00", text: "Pour-over in 60s", chans: ["instagram"], delivery: ["1 failed", "text-terra"], status: "failed" },
  ];
  return (
    <div ref={ref} className={`${shot} w-[780px] p-4`}>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          Search posts
        </span>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-surface-2 p-1 text-xs font-semibold">
          <span className="rounded-full bg-blue px-3 py-1.5 text-on-blue shadow-sm">All</span>
          <span className="px-3 py-1.5 text-muted">Scheduled</span>
          <span className="px-3 py-1.5 text-muted">Published</span>
          <span className="px-3 py-1.5 text-muted">Drafts</span>
          <span className="px-3 py-1.5 text-muted">Failed</span>
        </span>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        <div className={`${Q_COLS} border-b border-line bg-surface-2/60 text-xs font-semibold text-muted`}>
          {["Date", "Content", "Channels", "Delivery", "Status"].map((h) => (
            <div key={h} className="px-3 py-2.5">
              {h}
            </div>
          ))}
        </div>
        {rows.map((r, i) => {
          const s = Q_STATUS[r.status];
          return (
            <div key={i} className={`${Q_COLS} items-center border-b border-line text-sm last:border-b-0`}>
              <div className="whitespace-nowrap px-3 py-3 font-display text-[12.5px] font-semibold tabular-nums text-ink">{r.when}</div>
              <div className="min-w-0 truncate px-3 py-3 text-[13px] text-ink">
                {r.chip ? (
                  <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 align-middle text-[11px] font-medium text-muted">{r.chip}</span>
                ) : null}
                {r.text}
              </div>
              <div className="px-3 py-3">
                <span className="flex -space-x-1.5">
                  {r.chans.map((c) => (
                    <span key={c} className="rounded-[6px] bg-surface p-[1.5px] shadow-sm ring-1 ring-line">
                      <BrandTile platform={c} size={18} radius={5} />
                    </span>
                  ))}
                </span>
              </div>
              <div className={`px-3 py-3 text-xs font-medium ${r.delivery[1]}`}>{r.delivery[0]}</div>
              <div className="px-3 py-3">
                <span
                  key={r.status}
                  className={`swap-in inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-display text-[11px] font-semibold ${s.cls}`}
                >
                  <span className={`size-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Analytics: post performance ──────────────────────────────────────────

const TOTALS: [string, number][] = [
  ["Impressions", 48210],
  ["Likes", 3184],
  ["Comments", 412],
  ["Shares", 276],
  ["Saves", 158],
];
const BY_PLATFORM: [string, string, number][] = [
  ["x", "X", 1840],
  ["linkedin", "LinkedIn", 1260],
  ["bluesky", "Bluesky", 540],
  ["mastodon", "Mastodon", 230],
];
const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));

function AnalyticsShot() {
  const [t, setT] = useState(1);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    setT(0);
    await step(400);
    const frames = 40;
    for (let i = 1; i <= frames; i++) {
      setT(1 - Math.pow(1 - i / frames, 3));
      await step(30);
    }
    await step(4200);
  });
  const max = BY_PLATFORM[0][2];
  return (
    <div ref={ref} className={`${shot} w-[800px] p-6`}>
      <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">Post performance</div>
          <p className="mt-1 text-[13px] text-muted">Engagement on your published posts, refreshed automatically after they go out.</p>
        </div>
        <div className="text-right">
          <div className="font-display text-[22px] font-semibold leading-none tabular-nums text-ink">48</div>
          <div className="mt-1 text-[11px] text-muted">published</div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-5 gap-3">
        {TOTALS.map(([label, v]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-sm">
            <div className="text-[11.5px] font-medium text-muted">{label}</div>
            <div className="mt-0.5 font-display text-[22px] font-semibold tabular-nums text-ink">{fmtNum(v * t)}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="font-display text-[13.5px] font-semibold text-ink">Engagement by platform</div>
        <div className="mt-3 flex flex-col gap-2.5">
          {BY_PLATFORM.map(([p, label, v]) => (
            <div key={p} className="flex items-center gap-3">
              <div className="flex w-28 shrink-0 items-center gap-2">
                <BrandTile platform={p} size={20} radius={5} />
                <span className="text-[13px] font-medium text-ink">{label}</span>
              </div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-blue" style={{ width: `${Math.max(3, (v / max) * 100 * t)}%` }} />
              </div>
              <span className="w-12 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">{fmtNum(v * t)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
