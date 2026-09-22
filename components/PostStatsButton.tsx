"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { BrandTile } from "@/components/BrandTile";
import { PostPreview } from "@/components/PostPreview";

type Target = {
  id: string;
  platform: string;
  handle: string | null;
  status: string;
  platform_post_id: string | null;
  metrics: Record<string, number> | null;
  metricsUpdatedAt: string | null;
};

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
};

const isDelivered = (t: Target) => t.status === "published" || !!t.platform_post_id;
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function postUrl(platform: string, handle: string | null, id: string | null): string | null {
  if (!id) return null;
  const h = (handle ?? "").replace(/^@/, "");
  switch (platform) {
    case "x":
      return h ? `https://x.com/${h}/status/${id}` : null;
    case "youtube":
      return `https://www.youtube.com/watch?v=${id}`;
    case "bluesky": {
      const rkey = id.split("/").pop();
      return h && rkey ? `https://bsky.app/profile/${h}/post/${rkey}` : null;
    }
    case "mastodon":
      return id.startsWith("http") ? id : null;
    case "linkedin":
      return `https://www.linkedin.com/feed/update/${id}`;
    default:
      return null;
  }
}

const TITLE_ID = "post-stats-title";

export function PostStatsButton({
  thread,
  media,
  publishedAt,
  targets,
  className,
}: {
  thread: string[];
  media: { url: string; type: string }[];
  publishedAt: string | null;
  targets: Target[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const delivered = targets.filter(isDelivered);
  const current = delivered[Math.min(active, Math.max(0, delivered.length - 1))];

  // Combined engagement across every delivered channel that has metrics.
  const withMetrics = delivered.filter((t) => t.metrics);
  const totals = withMetrics.reduce(
    (a, t) => ({
      likes: a.likes + (t.metrics!.likes ?? 0),
      shares: a.shares + (t.metrics!.shares ?? 0),
      comments: a.comments + (t.metrics!.comments ?? 0),
    }),
    { likes: 0, shares: 0, comments: 0 },
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActive(0);
          setOpen(true);
        }}
        className={
          className ??
          "rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-blue hover:bg-surface-2"
        }
      >
        Stats
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy={TITLE_ID} size="xl">
        {current ? (
          <>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 id={TITLE_ID} className="font-display text-xl font-semibold tracking-[-0.015em]">
                  Post analytics
                </h2>
                <p className="mt-0.5 text-[13px] text-muted">
                  How this post landed across {delivered.length} channel
                  {delivered.length === 1 ? "" : "s"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* channel selector */}
            {delivered.length > 1 ? (
              <div className="mb-5 flex flex-wrap items-center gap-1.5">
                {delivered.map((t, i) => {
                  const on = i === active;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActive(i)}
                      className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                        on ? "border-blue bg-blue-soft text-blue-ink" : "border-line text-muted hover:text-ink"
                      }`}
                    >
                      <BrandTile platform={t.platform} size={16} radius={4} />
                      {PLATFORM_LABEL[t.platform] ?? t.platform}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* combined totals across channels */}
            {delivered.length > 1 ? (
              <div className="mb-5 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-2/40 px-5 py-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  All channels
                </span>
                <TotalStat icon={<HeartIcon />} label="Likes" value={fmt(totals.likes)} />
                <TotalStat icon={<RepeatIcon />} label="Shares" value={fmt(totals.shares)} />
                <TotalStat icon={<CommentIcon />} label="Comments" value={fmt(totals.comments)} />
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              {/* preview */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Preview
                </div>
                <PostPreview
                  platform={current.platform}
                  handle={current.handle}
                  thread={thread}
                  media={media}
                  metrics={current.metrics}
                  publishedAt={publishedAt}
                />
              </div>

              {/* analytics */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Performance
                    {timeAgo(current.metricsUpdatedAt) ? (
                      <span className="ml-2 font-normal normal-case text-muted/80">
                        · updated {timeAgo(current.metricsUpdatedAt)}
                      </span>
                    ) : null}
                  </span>
                  {(() => {
                    const url = postUrl(current.platform, current.handle, current.platform_post_id);
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-ink hover:underline"
                      >
                        View on {PLATFORM_LABEL[current.platform] ?? current.platform} ↗
                      </a>
                    ) : null;
                  })()}
                </div>

                {current.metrics ? (
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        {
                          key: "impressions",
                          label:
                            current.platform === "tiktok" || current.platform === "youtube"
                              ? "Views"
                              : "Impressions",
                          icon: <EyeIcon />,
                        },
                        { key: "likes", label: "Likes", icon: <HeartIcon /> },
                        { key: "comments", label: "Comments", icon: <CommentIcon /> },
                        { key: "shares", label: "Shares", icon: <RepeatIcon /> },
                        { key: "saves", label: "Saves", icon: <BookmarkIcon /> },
                      ] as const
                    )
                      .filter((s) => typeof current.metrics?.[s.key] === "number")
                      .map((s) => (
                        <MetricCard
                          key={s.key}
                          label={s.label}
                          value={fmt(current.metrics![s.key])}
                          icon={s.icon}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-line bg-surface-2/40 p-5 text-center">
                    <p className="text-sm text-muted">
                      Metrics are refreshed periodically — check back shortly.
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface-2/50 px-3.5 py-3">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-green/15 text-green">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span className="text-[13px] text-muted">
                    Delivered to{" "}
                    <span className="font-medium text-ink">{current.handle ?? "the account"}</span>. Engagement updates
                    automatically after publishing.
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}

function TotalStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-blue-soft text-blue-ink">
        {icon}
      </span>
      <div className="leading-tight">
        <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
        <div className="text-[11px] text-muted">{label}</div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3.5 shadow-sm">
      <span className="flex size-8 items-center justify-center rounded-lg bg-blue-soft text-blue-ink">
        {icon}
      </span>
      <div className="mt-3 font-display text-2xl font-semibold tabular-nums leading-none">{value}</div>
      <div className="mt-1.5 text-xs text-muted">{label}</div>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}
function RepeatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function BookmarkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
