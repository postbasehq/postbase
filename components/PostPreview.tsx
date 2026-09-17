"use client";

import { useRef, useState } from "react";
import { BrandTile, BRANDS } from "@/components/BrandTile";

/**
 * Minimal video preview: no native browser chrome (or its dark gradient). It
 * plays once (muted) when it appears, then exposes a small play/pause +
 * fullscreen cluster on a floating pill.
 */
function VideoPreview({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  const fullscreen = () => {
    ref.current?.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="relative border-y border-line bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={ref}
        src={src}
        muted
        autoPlay
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="max-h-80 w-full object-contain"
      />
      <div className="absolute bottom-2 left-2 flex items-center gap-0.5 rounded-full bg-black/55 p-1 backdrop-blur-sm">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="flex size-7 items-center justify-center rounded-full text-white transition hover:bg-white/20"
        >
          {playing ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={fullscreen}
          aria-label="Fullscreen"
          className="flex size-7 items-center justify-center rounded-full text-white transition hover:bg-white/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

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
  displayName,
  avatarUrl,
  verified,
}: {
  platform: string;
  handle: string | null;
  thread: string[];
  media: Media[];
  metrics: Record<string, number> | null;
  publishedAt: string | null;
  /** Real profile data, when we have it — otherwise sensible fallbacks. */
  displayName?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
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
        <XPost
          handle={h}
          displayName={displayName?.trim() || h}
          avatarUrl={avatarUrl ?? null}
          verified={!!verified}
          segments={segments}
          media={media}
          metrics={metrics}
          date={date}
        />
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

// X (Twitter) timeline card: avatar in a left column, everything else indented
// in a right column, with a vertical connector for a self-thread.
function XPost({
  handle,
  displayName,
  avatarUrl,
  verified,
  segments,
  media,
  metrics,
  date,
}: {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
  segments: string[];
  media: Media[];
  metrics: Record<string, number> | null;
  date: string | null;
}) {
  return (
    <div className="bg-surface px-4 py-3">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <div key={i} className="flex gap-3">
            {/* avatar + thread connector */}
            <div className="flex flex-col items-center">
              <XAvatar handle={handle} url={avatarUrl} />
              {!isLast ? <span className="mt-1 w-0.5 flex-1 rounded-full bg-line" /> : null}
            </div>

            {/* content column */}
            <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-3"}`}>
              <div className="flex items-center gap-1 text-[15px] leading-tight">
                <span className="truncate font-bold text-ink">{displayName}</span>
                {verified ? <VerifiedTick /> : null}
                <span className="truncate text-muted">@{handle}</span>
                {date ? (
                  <>
                    <span className="text-muted">·</span>
                    <span className="whitespace-nowrap text-muted">{date}</span>
                  </>
                ) : null}
                <span className="ml-auto -mr-1 shrink-0 text-muted" aria-hidden>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="19" cy="12" r="1.6" />
                  </svg>
                </span>
              </div>

              <div className="mt-0.5 whitespace-pre-wrap text-[15px] leading-[1.35] text-ink">
                {seg.trim() ? <XText text={seg} /> : <span className="text-muted">(empty)</span>}
              </div>

              {i === 0 ? <XMedia media={media} /> : null}

              <XActionBar metrics={isLast ? metrics : null} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// X colours @mentions, #hashtags and links in its blue.
function XText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) =>
        /^[@#]\w/.test(part) || /^https?:\/\//.test(part) ? (
          <span key={i} className="text-[#1d9bf0]">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function XAvatar({ handle, url }: { handle: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="size-10 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-semibold text-white"
      style={{ background: BRANDS.x?.bg ?? "#536471" }}
      aria-hidden
    >
      {handle.charAt(0).toUpperCase() || "•"}
    </span>
  );
}

function VerifiedTick() {
  return (
    <svg width="18" height="18" viewBox="0 0 22 22" className="shrink-0" aria-label="Verified">
      <path
        fill="#1d9bf0"
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.246-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.5-4.501 1.313 1.293-5.749 5.766z"
      />
    </svg>
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
          <VideoPreview key={i} src={mm.url} />
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

// X media: rounded, bordered container; single image keeps its aspect, 2–4
// images use X's grid. Sits in the content column.
function XMedia({ media }: { media: Media[] }) {
  if (media.length === 0) return null;
  const n = Math.min(media.length, 4);
  const items = media.slice(0, 4);
  const cls = "size-full object-cover";
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-line">
      {n === 1 ? (
        items[0].type?.startsWith("video") ? (
          <VideoPreview src={items[0].url} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={items[0].url} alt="" className="max-h-[280px] w-full object-cover" />
        )
      ) : (
        <div
          className={`grid gap-0.5 ${
            n === 2 ? "aspect-[16/9] grid-cols-2" : n === 3 ? "aspect-[16/9] grid-cols-2" : "aspect-square grid-cols-2"
          }`}
        >
          {items.map((mm, i) => (
            <div
              key={i}
              className={`relative overflow-hidden bg-surface-2 ${n === 3 && i === 0 ? "row-span-2" : ""}`}
            >
              {mm.type?.startsWith("video") ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={mm.url} className={cls} muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mm.url} alt="" className={cls} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// X's real action bar: reply · repost · like · views, then bookmark + share on
// the right. Counts show only when we actually have them.
function XActionBar({ metrics }: { metrics: Record<string, number> | null }) {
  const m = metrics;
  return (
    <div className="mt-3 flex max-w-[440px] items-center justify-between text-muted">
      <XAct value={m?.comments}>
        <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z" />
      </XAct>
      <XAct value={m?.shares}>
        <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
      </XAct>
      <XAct value={m?.likes}>
        <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.030-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z" />
      </XAct>
      <XAct value={undefined}>
        <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l-.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z" />
      </XAct>
      <div className="flex items-center gap-4">
        <span aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z" />
          </svg>
        </span>
        <span aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function XAct({ value, children }: { value?: number; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] tabular-nums">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        {children}
      </svg>
      {value && value > 0 ? fmt(value) : null}
    </span>
  );
}
