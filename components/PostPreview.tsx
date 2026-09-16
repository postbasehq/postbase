"use client";

import { BrandTile, BRANDS } from "@/components/BrandTile";

type Family = "x" | "media" | "feed";
const FAMILY: Record<string, Family> = {
  x: "x",
  instagram: "media",
  tiktok: "media",
  youtube: "media",
  linkedin: "feed",
  facebook: "feed",
  bluesky: "feed",
  mastodon: "feed",
};
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

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

type Media = { url: string; type: string };

/**
 * An honest, platform-shaped preview of a published post. No fabricated
 * verified ticks, display names, timestamps, or engagement counts — it shows
 * the real handle, the real publish date, the actual content and media, and
 * (for X) the real action bar with counts only when we actually have them.
 */
export function PostPreview({
  platform,
  handle,
  thread,
  media,
  metrics,
  publishedAt,
}: {
  platform: string;
  handle: string | null;
  thread: string[];
  media: Media[];
  metrics: Record<string, number> | null;
  publishedAt: string | null;
}) {
  const family = FAMILY[platform] ?? "feed";
  const h = (handle ?? "account").replace(/^@/, "");
  const label = PLATFORM_LABEL[platform] ?? platform;
  const date = fmtDate(publishedAt);
  const segments = thread.filter((s, i) => s.trim() || i === 0);
  const text = segments.join("\n\n");

  const header = (
    <div className="flex items-center gap-2.5 px-4 pt-3.5">
      <Monogram platform={platform} letter={h.charAt(0).toUpperCase() || "•"} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[14px] font-semibold text-ink">@{h}</div>
        <div className="truncate text-[12px] text-muted">{date ? `${label} · ${date}` : label}</div>
      </div>
      <BrandTile platform={platform} size={20} radius={5} />
    </div>
  );

  if (family === "media") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {header}
        <MediaBlock media={media} platform={platform} className="mt-3" />
        {text.trim() ? (
          <div className="whitespace-pre-wrap px-4 py-3 text-[14px] leading-relaxed text-ink">
            <span className="font-semibold">@{h}</span> {text}
          </div>
        ) : (
          <div className="h-3" />
        )}
      </div>
    );
  }

  if (family === "x") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        {header}
        <ThreadText segments={segments} />
        <MediaBlock media={media} platform={platform} className="mb-3" />
        <XActions metrics={metrics} />
      </div>
    );
  }

  // feed (linkedin / facebook / bluesky / mastodon)
  const clamp = platform === "linkedin";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      {header}
      <div
        className={`whitespace-pre-wrap px-4 py-3 text-[14px] leading-relaxed text-ink ${
          clamp ? "line-clamp-4" : ""
        }`}
      >
        {text.trim() || <span className="text-muted">(empty)</span>}
      </div>
      {clamp && text.length > 220 ? (
        <div className="-mt-1 px-4 pb-2 text-[13px] font-medium text-muted">…see more</div>
      ) : null}
      <MediaBlock media={media} platform={platform} className="mb-3" />
    </div>
  );
}

function Monogram({ platform, letter }: { platform: string; letter: string }) {
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold text-white"
      style={{ background: BRANDS[platform]?.bg ?? "#5b616e" }}
      aria-hidden
    >
      {letter}
    </span>
  );
}

function ThreadText({ segments }: { segments: string[] }) {
  return (
    <div className="px-4 py-3 text-[15px] leading-relaxed text-ink">
      {segments.map((seg, i) => (
        <div key={i} className={i > 0 ? "mt-3 border-t border-line/50 pt-3" : ""}>
          {segments.length > 1 ? (
            <span className="mb-1 block text-[11px] font-medium text-muted tabular-nums">
              {i + 1}/{segments.length}
            </span>
          ) : null}
          <span className="whitespace-pre-wrap">
            {seg.trim() || <span className="text-muted">(empty)</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function MediaBlock({
  media,
  platform,
  className = "",
}: {
  media: Media[];
  platform: string;
  className?: string;
}) {
  const mediaFirst = FAMILY[platform] === "media";
  if (media.length === 0) {
    if (!mediaFirst) return null;
    return (
      <div
        className={`flex aspect-square items-center justify-center border-y border-line bg-surface-2 text-muted ${className}`}
      >
        <div className="flex flex-col items-center gap-2 text-xs">
          <BrandTile platform={platform} size={28} radius={7} />
          <span>No media attached</span>
        </div>
      </div>
    );
  }
  const single = media.length === 1;
  return (
    <div className={`grid gap-0.5 ${single ? "grid-cols-1" : "grid-cols-2"} ${className}`}>
      {media.slice(0, 4).map((mm, i) =>
        mm.type?.startsWith("video") ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={i}
            src={mm.url}
            controls
            preload="metadata"
            className="max-h-80 w-full border-y border-line bg-black object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={mm.url}
            alt=""
            className="max-h-80 w-full border-y border-line object-cover"
          />
        ),
      )}
    </div>
  );
}

// X's real action bar. Counts render only when we actually have them (>0);
// otherwise just the icons — exactly how a post with no engagement looks.
function XActions({ metrics }: { metrics: Record<string, number> | null }) {
  const m = metrics;
  return (
    <div className="flex items-center gap-9 border-t border-line px-4 py-2.5 text-muted">
      <Act value={m?.comments}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </Act>
      <Act value={m?.shares}>
        <path d="m17 2 4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </Act>
      <Act value={m?.likes}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </Act>
      <span className="ml-auto">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
        </svg>
      </span>
    </div>
  );
}

function Act({ value, children }: { value?: number; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] tabular-nums">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
      {value && value > 0 ? fmt(value) : null}
    </span>
  );
}
