"use client";

import { useState } from "react";

export type YouTubePrivacy = "public" | "unlisted" | "private";

const OPTIONS: { value: YouTubePrivacy; label: string; hint: string }[] = [
  { value: "public", label: "Public", hint: "Anyone can find and watch it." },
  { value: "unlisted", label: "Unlisted", hint: "Only people with the link can watch it." },
  { value: "private", label: "Private", hint: "Only you can watch it." },
];

/**
 * YouTube options in the composer: the video's visibility. Emits a hidden
 * `youtube_privacy` field; defaults to Public. Same card style as TikTokSettings.
 */
export function YouTubeSettings({ channelHandle, initial }: { channelHandle?: string | null; initial?: YouTubePrivacy | null }) {
  const [privacy, setPrivacy] = useState<YouTubePrivacy>(initial ?? "public");
  const current = OPTIONS.find((o) => o.value === privacy)!;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-3.5">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF0000" className="shrink-0" aria-hidden>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        <span className="text-[13px] font-semibold">YouTube settings</span>
        {channelHandle ? <span className="text-xs text-muted">{channelHandle}</span> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Visibility</span>
        <div role="radiogroup" aria-label="YouTube visibility" className="inline-flex w-fit items-center gap-1 rounded-xl border border-line bg-ground p-1">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={privacy === o.value}
              onClick={() => setPrivacy(o.value)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                privacy === o.value ? "bg-blue text-on-blue shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">{current.hint}</span>
      </div>

      <input type="hidden" name="youtube_privacy" value={privacy} />
    </div>
  );
}
