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

  if (platform === "tiktok") {
    return (
      <div className="rounded-2xl border border-line bg-ground p-3 shadow-sm">
        <TikTokPost handle={h} text={text} media={media} metrics={metrics} />
      </div>
    );
  }

  if (platform === "youtube") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <YouTubePost handle={h} text={text} media={media} metrics={metrics} />
      </div>
    );
  }

  if (platform === "instagram") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <InstagramPost
          handle={h}
          avatarUrl={avatarUrl ?? null}
          verified={!!verified}
          text={text}
          media={media}
          metrics={metrics}
          date={date}
        />
      </div>
    );
  }

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

  if (platform === "linkedin") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <LinkedInPost
          handle={h}
          displayName={displayName?.trim() || h}
          avatarUrl={avatarUrl ?? null}
          verified={!!verified}
          text={text}
          media={media}
          date={date}
        />
      </div>
    );
  }

  if (platform === "bluesky" || platform === "mastodon") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <AvatarPost
          platform={platform}
          handle={h}
          displayName={displayName?.trim() || h}
          avatarUrl={avatarUrl ?? null}
          text={text}
          media={media}
          metrics={metrics}
          date={date}
        />
      </div>
    );
  }

  if (platform === "facebook") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <FacebookPost
          handle={h}
          displayName={displayName?.trim() || h}
          avatarUrl={avatarUrl ?? null}
          text={text}
          media={media}
          date={date}
        />
      </div>
    );
  }

  // feed fallback (any platform without a bespoke card)
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

// LinkedIn feed card: 48px avatar, name · connection degree, headline/handle,
// "time · 🌐", body with a "…more" fold, edge-to-edge media, and the
// Like / Comment / Repost / Send action bar.
function LinkedInPost({
  handle,
  displayName,
  avatarUrl,
  verified,
  text,
  media,
  date,
}: {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
  text: string;
  media: Media[];
  date: string | null;
}) {
  const long = text.length > 200;
  return (
    <div className="bg-surface pt-3 text-[14px]">
      {/* header */}
      <div className="flex gap-2 px-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold text-white"
            style={{ background: BRANDS.linkedin?.bg ?? "#0A66C2" }}
            aria-hidden
          >
            {handle.charAt(0).toUpperCase() || "•"}
          </span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1">
            <span className="truncate text-[14px] font-semibold text-ink">{displayName}</span>
            {verified ? <LiVerified /> : null}
            <span className="shrink-0 text-[13px] text-muted">· 1st</span>
          </div>
          <div className="truncate text-[12px] text-muted">@{handle}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
            <span>{date ?? "now"}</span>
            <span aria-hidden>·</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.5a12.7 12.7 0 0 0-1-2.6A8 8 0 0 1 18.9 8zM12 4c.6.9 1.2 2.1 1.5 4h-3c.3-1.9.9-3.1 1.5-4zM4.3 14a7.9 7.9 0 0 1 0-4h2.9a16.7 16.7 0 0 0 0 4H4.3zm.8 2h2.5c.3 1 .6 1.8 1 2.6A8 8 0 0 1 5.1 16zm2.5-8H5.1a8 8 0 0 1 3.5-2.6c-.4.8-.7 1.6-1 2.6zM12 20c-.6-.9-1.2-2.1-1.5-4h3c-.3 1.9-.9 3.1-1.5 4zm1.8-6h-3.6a14.3 14.3 0 0 1 0-4h3.6a14.3 14.3 0 0 1 0 4zm.3 4.6c.4-.8.7-1.6 1-2.6h2.5a8 8 0 0 1-3.5 2.6zm2.4-4.6a16.7 16.7 0 0 0 0-4h2.9a7.9 7.9 0 0 1 0 4h-2.9z" />
            </svg>
          </div>
        </div>
        <span className="-mr-1 shrink-0 text-muted" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
          </svg>
        </span>
      </div>

      {/* body */}
      <div className="px-4 pt-2.5 text-[14px] leading-[1.45] text-ink">
        <span className={long ? "line-clamp-3 whitespace-pre-wrap" : "whitespace-pre-wrap"}>
          {text.trim() || <span className="text-muted">(empty)</span>}
        </span>
        {long ? <span className="text-[13px] text-muted">…more</span> : null}
      </div>

      {/* media — edge to edge */}
      {media.length > 0 ? (
        <div className="mt-3">
          {media[0].type?.startsWith("video") ? (
            <VideoPreview src={media[0].url} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media[0].url} alt="" className="max-h-[320px] w-full object-cover" />
          )}
        </div>
      ) : (
        <div className="h-3" />
      )}

      {/* actions */}
      <div className="mt-1 grid grid-cols-4 border-t border-line px-1 py-1 text-muted">
        <LiAction label="Like">
          <path d="M7 10v11M2 14v5a2 2 0 0 0 2 2h13.5a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 18 11h-5l1-4.5a2.5 2.5 0 0 0-4.7-1.4L7 10" />
        </LiAction>
        <LiAction label="Comment">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </LiAction>
        <LiAction label="Repost">
          <path d="m17 2 4 4-4 4" />
          <path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
          <path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </LiAction>
        <LiAction label="Send">
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </LiAction>
      </div>
    </div>
  );
}

function LiAction({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-semibold">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
      {label}
    </span>
  );
}

function LiVerified() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0" aria-label="Verified">
      <circle cx="12" cy="12" r="10" fill="#0A66C2" />
      <path d="M9.5 12.5l1.8 1.8 3.5-3.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Instagram feed post: compact header, dominant square media, the
// heart/comment/share + save action row, likes, `username caption`, timestamp.
function InstagramPost({
  handle,
  avatarUrl,
  verified,
  text,
  media,
  metrics,
  date,
}: {
  handle: string;
  avatarUrl: string | null;
  verified: boolean;
  text: string;
  media: Media[];
  metrics: Record<string, number> | null;
  date: string | null;
}) {
  const likes = metrics?.likes ?? 0;
  const first = media[0];
  return (
    <div className="bg-surface">
      {/* header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
            style={{ background: BRANDS.instagram?.bg ?? "#c13584" }}
            aria-hidden
          >
            {handle.charAt(0).toUpperCase() || "•"}
          </span>
        )}
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span className="truncate text-[13px] font-semibold text-ink">{handle}</span>
          {verified ? <IgVerified /> : null}
        </span>
        <span className="shrink-0 text-ink" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </span>
      </div>

      {/* media */}
      {first ? (
        <div className="relative aspect-square w-full bg-surface-2">
          {first.type?.startsWith("video") ? (
            <VideoPreview src={first.url} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={first.url} alt="" className="size-full object-cover" />
          )}
          {media.length > 1 ? (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
              1/{media.length}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-surface-2 text-muted">
          <BrandTile platform="instagram" size={30} radius={8} />
          <span className="text-xs">Add a photo or video</span>
        </div>
      )}

      {/* action row */}
      <div className="flex items-center gap-4 px-3 pt-2.5 text-ink">
        <IgIcon>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
        </IgIcon>
        <IgIcon>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </IgIcon>
        <IgIcon>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </IgIcon>
        <span className="ml-auto">
          <IgIcon>
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </IgIcon>
        </span>
      </div>

      {/* likes */}
      {likes > 0 ? (
        <div className="px-3 pt-2 text-[13px] font-semibold text-ink">{fmt(likes)} likes</div>
      ) : (
        <div className="px-3 pt-2 text-[13px] font-semibold text-ink">Be the first to like this</div>
      )}

      {/* caption */}
      {text.trim() ? (
        <div className="px-3 pt-1 text-[13px] leading-snug text-ink">
          <span className="line-clamp-2 whitespace-pre-wrap">
            <span className="font-semibold">{handle}</span> <IgText text={text} />
          </span>
        </div>
      ) : null}

      {/* timestamp */}
      <div className="px-3 pb-3 pt-1.5 text-[10px] uppercase tracking-wide text-muted">
        {date ?? "just now"}
      </div>
    </div>
  );
}

// YouTube watch card: 16:9 player, title, views · time, channel row with a
// Subscribe button, and the Like/Dislike · Share · Save action bar.
function YouTubePost({
  handle,
  text,
  media,
  metrics,
}: {
  handle: string;
  text: string;
  media: Media[];
  metrics: Record<string, number> | null;
}) {
  const first = media[0];
  const views = metrics?.comments ?? 0; // no dedicated views metric; keep honest
  return (
    <div className="bg-surface">
      {/* player */}
      <div className="relative aspect-video w-full bg-black">
        {first ? (
          first.type?.startsWith("video") ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={first.url} muted autoPlay loop playsInline className="size-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={first.url} alt="" className="size-full object-cover" />
          )
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-[#0f0f0f] text-white/70">
            <span className="flex h-9 w-12 items-center justify-center rounded-lg bg-[#ff0000]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="text-xs">Add a video</span>
          </div>
        )}
      </div>

      {/* title */}
      <div className="px-3 pt-3 text-[15px] font-semibold leading-snug text-ink">
        <span className="line-clamp-2">{text.trim() || <span className="text-muted">Video title</span>}</span>
      </div>
      <div className="px-3 pt-1 text-[12px] text-muted">
        {views > 0 ? `${fmt(views)} views · ` : "No views · "}just now
      </div>

      {/* channel row */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white"
          style={{ background: "#ff0000" }}
          aria-hidden
        >
          {handle.charAt(0).toUpperCase() || "•"}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-semibold text-ink">{handle}</div>
          <div className="text-[11px] text-muted">0 subscribers</div>
        </div>
        <span className="shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-surface">
          Subscribe
        </span>
      </div>

      {/* action bar */}
      <div className="flex items-center gap-2 overflow-x-auto px-3 pb-3">
        <span className="flex shrink-0 items-center rounded-full bg-surface-2 text-[13px] font-semibold text-ink">
          <span className="flex items-center gap-1.5 border-r border-line py-1.5 pl-3 pr-2.5">
            <YtIcon>
              <path d="M7 10v11M2 12v7a2 2 0 0 0 2 2h13a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 17.5 11H13l.7-3.4a2.3 2.3 0 0 0-4.4-1.3L7 10" />
            </YtIcon>
            {metrics?.likes && metrics.likes > 0 ? fmt(metrics.likes) : "Like"}
          </span>
          <span className="py-1.5 pl-2.5 pr-3">
            <YtIcon>
              <path d="M17 14V3M22 12v-7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 1.6L3.6 12A2 2 0 0 0 5.5 14H11l-.7 3.4a2.3 2.3 0 0 0 4.4 1.3L17 14" />
            </YtIcon>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-ink">
          <YtIcon>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M16 6l-4-4-4 4M12 2v13" />
          </YtIcon>
          Share
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-ink">
          <YtIcon>
            <path d="M4 21V8a2 2 0 0 1 2-2h9M11 3H6a2 2 0 0 0-2 2M18 8v6M15 11h6" />
          </YtIcon>
          Save
        </span>
      </div>
    </div>
  );
}

function YtIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

// Bluesky / Mastodon: X-shaped (avatar left, content right) with each platform's
// own action bar and accent colour.
const ACCENT: Record<string, string> = { bluesky: "#0085ff", mastodon: "#6364ff" };
function AvatarPost({
  platform,
  handle,
  displayName,
  avatarUrl,
  text,
  media,
  metrics,
  date,
}: {
  platform: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  text: string;
  media: Media[];
  metrics: Record<string, number> | null;
  date: string | null;
}) {
  const masto = platform === "mastodon";
  const shape = masto ? "rounded-lg" : "rounded-full";
  const accent = ACCENT[platform] ?? "#0085ff";
  return (
    <div className="bg-surface px-4 py-3">
      <div className="flex gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className={`size-10 shrink-0 object-cover ${shape}`} />
        ) : (
          <span
            className={`flex size-10 shrink-0 items-center justify-center text-[15px] font-semibold text-white ${shape}`}
            style={{ background: BRANDS[platform]?.bg ?? accent }}
            aria-hidden
          >
            {handle.charAt(0).toUpperCase() || "•"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px] leading-tight">
            <span className="truncate font-bold text-ink">{displayName}</span>
            <span className="truncate text-muted">@{handle}</span>
            {date ? (
              <>
                <span className="text-muted">·</span>
                <span className="whitespace-nowrap text-muted">{date}</span>
              </>
            ) : null}
            <span className="ml-auto shrink-0 text-muted" aria-hidden>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="19" cy="12" r="1.6" />
              </svg>
            </span>
          </div>

          <div className="mt-0.5 whitespace-pre-wrap text-[15px] leading-[1.35] text-ink">
            {text.trim() ? <RichText text={text} color={accent} /> : <span className="text-muted">(empty)</span>}
          </div>

          <XMedia media={media} />

          <div className="mt-2.5 flex max-w-[380px] items-center justify-between text-muted">
            <AvAct value={metrics?.comments}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </AvAct>
            {masto ? (
              <AvAct value={metrics?.shares}>
                <path d="m17 2 4 4-4 4" />
                <path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
                <path d="M21 13v1a4 4 0 0 1-4 4H3" />
              </AvAct>
            ) : (
              <AvAct value={metrics?.shares}>
                <path d="m17 1 4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </AvAct>
            )}
            {masto ? (
              <AvAct value={metrics?.likes}>
                <path d="m12 3 2.5 5.6 6.1.6-4.6 4 1.4 6-5.4-3.2L6.6 19l1.4-6-4.6-4 6.1-.6z" />
              </AvAct>
            ) : (
              <AvAct value={metrics?.likes}>
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
              </AvAct>
            )}
            {masto ? (
              <AvAct value={undefined}>
                <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z" />
              </AvAct>
            ) : null}
            <AvAct value={undefined}>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
            </AvAct>
          </div>
        </div>
      </div>
    </div>
  );
}

function AvAct({ value, children }: { value?: number; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] tabular-nums">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
      {value && value > 0 ? fmt(value) : null}
    </span>
  );
}

// Facebook feed post: avatar + name + time · globe, body, edge-to-edge media,
// and the Like / Comment / Share bar.
function FacebookPost({
  handle,
  displayName,
  avatarUrl,
  text,
  media,
  date,
}: {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  text: string;
  media: Media[];
  date: string | null;
}) {
  return (
    <div className="bg-surface pt-3 text-[14px]">
      <div className="flex items-center gap-2 px-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white"
            style={{ background: BRANDS.facebook?.bg ?? "#1877f2" }}
            aria-hidden
          >
            {handle.charAt(0).toUpperCase() || "•"}
          </span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[14px] font-semibold text-ink">{displayName}</div>
          <div className="flex items-center gap-1 text-[12px] text-muted">
            <span>{date ?? "Just now"}</span>
            <span aria-hidden>·</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.5a12.7 12.7 0 0 0-1-2.6A8 8 0 0 1 18.9 8zM12 4c.6.9 1.2 2.1 1.5 4h-3c.3-1.9.9-3.1 1.5-4zM4.3 14a7.9 7.9 0 0 1 0-4h2.9a16.7 16.7 0 0 0 0 4H4.3zm.8 2h2.5c.3 1 .6 1.8 1 2.6A8 8 0 0 1 5.1 16zm2.5-8H5.1a8 8 0 0 1 3.5-2.6c-.4.8-.7 1.6-1 2.6zM12 20c-.6-.9-1.2-2.1-1.5-4h3c-.3 1.9-.9 3.1-1.5 4zm1.8-6h-3.6a14.3 14.3 0 0 1 0-4h3.6a14.3 14.3 0 0 1 0 4zm.3 4.6c.4-.8.7-1.6 1-2.6h2.5a8 8 0 0 1-3.5 2.6zm2.4-4.6a16.7 16.7 0 0 0 0-4h2.9a7.9 7.9 0 0 1 0 4h-2.9z" />
            </svg>
          </div>
        </div>
        <span className="-mr-1 shrink-0 text-muted" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
          </svg>
        </span>
      </div>

      <div className="px-3 pt-2.5 text-[14px] leading-[1.4] text-ink">
        <span className="whitespace-pre-wrap">
          {text.trim() ? <RichText text={text} color="#216fdb" /> : <span className="text-muted">(empty)</span>}
        </span>
      </div>

      {media.length > 0 ? (
        <div className="mt-3">
          {media[0].type?.startsWith("video") ? (
            <VideoPreview src={media[0].url} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media[0].url} alt="" className="max-h-[320px] w-full object-cover" />
          )}
        </div>
      ) : (
        <div className="h-3" />
      )}

      <div className="mx-3 grid grid-cols-3 border-t border-line py-1 text-muted">
        <FbAction label="Like">
          <path d="M7 10v11M2 14v5a2 2 0 0 0 2 2h13.5a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 18 11h-5l1-4.5a2.5 2.5 0 0 0-4.7-1.4L7 10" />
        </FbAction>
        <FbAction label="Comment">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </FbAction>
        <FbAction label="Share">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M16 6l-4-4-4 4M12 2v13" />
        </FbAction>
      </div>
    </div>
  );
}

function FbAction({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center gap-2 rounded-md py-2 text-[13px] font-semibold">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
      {label}
    </span>
  );
}

// Colour @mentions, #hashtags and links in a given accent.
function RichText({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) =>
        /^[@#][\w.]/.test(part) || /^https?:\/\//.test(part) ? (
          <span key={i} style={{ color }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// TikTok: a vertical video with the action rail on the right and the
// @username + caption + sound overlaid bottom-left. Always dark (it's a video).
function TikTokPost({
  handle,
  text,
  media,
  metrics,
}: {
  handle: string;
  text: string;
  media: Media[];
  metrics: Record<string, number> | null;
}) {
  const first = media[0];
  const m = metrics;
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-xl bg-black">
      {first ? (
        first.type?.startsWith("video") ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={first.url} muted autoPlay loop playsInline className="size-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first.url} alt="" className="size-full object-cover" />
        )
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-[#161823] text-white/70">
          <BrandTile platform="tiktok" size={30} radius={8} />
          <span className="text-xs">Add a video</span>
        </div>
      )}

      {/* scrim for legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />

      {/* right action rail */}
      <div className="absolute bottom-3 right-1.5 flex flex-col items-center gap-3.5 text-white">
        <span className="relative mb-1">
          <span
            className="flex size-9 items-center justify-center rounded-full text-[13px] font-semibold text-white ring-2 ring-white/90"
            style={{ background: "#161823" }}
            aria-hidden
          >
            {handle.charAt(0).toUpperCase() || "•"}
          </span>
          <span className="absolute -bottom-1.5 left-1/2 flex size-4 -translate-x-1/2 items-center justify-center rounded-full bg-[#fe2c55] text-[10px] font-bold leading-none text-white">
            +
          </span>
        </span>
        <TkRail value={m?.likes}>
          <path d="M12 21s-7.5-4.6-10-9.3C.6 8.9 1.8 5.6 4.8 5c2-.4 3.6.7 4.4 2 .8-1.3 2.4-2.4 4.4-2 3 .6 4.2 3.9 2.8 6.7C19.5 16.4 12 21 12 21z" />
        </TkRail>
        <TkRail value={m?.comments}>
          <path d="M12 4C6.9 4 3 7.3 3 11.2c0 2.1 1.1 4 3 5.3l-1 3.5 3.9-1.9c1 .3 2 .4 3.1.4 5.1 0 9-3.3 9-7.3S17.1 4 12 4z" />
        </TkRail>
        <TkRail value={undefined}>
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
        </TkRail>
        <TkRail value={m?.shares}>
          <path d="M13 5v3C7 8.5 3.5 12 2 18c2.5-3.4 6-5 11-5v3l7-5.5L13 5z" />
        </TkRail>
      </div>

      {/* bottom-left caption */}
      <div className="absolute inset-x-3 bottom-3 right-12 text-white">
        <div className="text-[14px] font-semibold drop-shadow">@{handle}</div>
        {text.trim() ? (
          <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-[13px] leading-snug drop-shadow">
            <TkText text={text} />
          </div>
        ) : null}
        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] drop-shadow">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span className="truncate">original sound - {handle}</span>
        </div>
      </div>
    </div>
  );
}

function TkRail({ value, children }: { value?: number; children: React.ReactNode }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="drop-shadow">
        {children}
      </svg>
      <span className="text-[11px] font-semibold tabular-nums drop-shadow">{value && value > 0 ? fmt(value) : ""}</span>
    </span>
  );
}

// TikTok highlights #hashtags and @mentions in white-bold (they read as links).
function TkText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) =>
        /^[@#][\w.]/.test(part) ? (
          <span key={i} className="font-semibold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

// Instagram colours #hashtags and @mentions in its link blue (theme-aware via
// the --ig-link palette variable).
function IgText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) =>
        /^[@#][\w.]/.test(part) ? (
          <span key={i} style={{ color: "var(--ig-link)" }}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function IgIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

function IgVerified() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0" aria-label="Verified">
      <path
        fill="#3897f0"
        d="M12 1l2.6 2 3.3-.3 1 3.1 2.8 1.7-1 3.1 1 3.1-2.8 1.7-1 3.1-3.3-.3L12 23l-2.6-2-3.3.3-1-3.1L2.3 14.7l1-3.1-1-3.1 2.8-1.7 1-3.1 3.3.3z"
      />
      <path d="M9.3 12.3l1.8 1.8 3.6-3.9" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
