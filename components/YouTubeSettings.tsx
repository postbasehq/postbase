"use client";

import { useState } from "react";

export type YouTubePrivacy = "public" | "unlisted" | "private";

// Postbase brand colours: blue = public, amber = unlisted, red = private.
const OPTIONS: { value: YouTubePrivacy; label: string; hint: string; color: string; onColor: string; icon: React.ReactNode }[] = [
  {
    value: "public",
    label: "Public",
    hint: "Anyone can find and watch it",
    color: "#2b59d9",
    onColor: "#fff",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>
    ),
  },
  {
    value: "unlisted",
    label: "Unlisted",
    hint: "Only people with the link",
    color: "#e3a72c",
    onColor: "#202124",
    icon: (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    ),
  },
  {
    value: "private",
    label: "Private",
    hint: "Only you can watch it",
    color: "#d14a3e",
    onColor: "#fff",
    icon: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
  },
];

/**
 * YouTube options in the composer: the video's visibility. Emits a hidden
 * `youtube_privacy` field; defaults to Public. Same card style as TikTokSettings.
 */
export function YouTubeSettings({ channelHandle, initial }: { channelHandle?: string | null; initial?: YouTubePrivacy | null }) {
  const [privacy, setPrivacy] = useState<YouTubePrivacy>(initial ?? "public");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-3.5">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF0000" className="shrink-0" aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        <span className="text-[13px] font-semibold">YouTube settings</span>
        {channelHandle ? <span className="text-xs text-muted">{channelHandle}</span> : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted">Visibility</span>
        <div role="radiogroup" aria-label="YouTube visibility" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {OPTIONS.map((o) => {
            const on = privacy === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPrivacy(o.value)}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
                  on ? "border-transparent shadow-sm" : "border-line bg-ground hover:border-muted/60"
                }`}
                style={on ? { backgroundColor: o.color, color: o.onColor } : undefined}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0"
                  style={on ? undefined : { color: o.color }}
                  aria-hidden
                >
                  {o.icon}
                </svg>
                <span className="min-w-0">
                  <span className={`block text-[13px] font-semibold ${on ? "" : "text-ink"}`}>{o.label}</span>
                  <span className={`mt-0.5 block text-xs leading-snug ${on ? "opacity-85" : "text-muted"}`}>{o.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <input type="hidden" name="youtube_privacy" value={privacy} />
    </div>
  );
}
