"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createMediaUpload } from "@/app/(app)/media-upload-actions";
import type { YouTubePostOptions } from "@/lib/platforms/youtube";

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

const TITLE_MAX = 100;
const THUMB_MAX_BYTES = 2 * 1024 * 1024; // YouTube's limit for custom thumbnails
const THUMB_TYPES = ["image/jpeg", "image/png"];

/**
 * YouTube options in the composer: title, custom thumbnail, visibility and the
 * "made for kids" audience declaration. The post text becomes the description.
 * Emits hidden `youtube_*` fields. Same card style as TikTokSettings.
 */
export function YouTubeSettings({
  channelHandle,
  initial,
  initialOptions,
  fallbackTitle = "",
  onBusyChange,
  onValidChange,
}: {
  channelHandle?: string | null;
  initial?: YouTubePrivacy | null;
  initialOptions?: YouTubePostOptions | null;
  /** The post's first line, used as the title when none is typed. */
  fallbackTitle?: string;
  /** A thumbnail is uploading: the post can't be saved until it lands. */
  onBusyChange?: (busy: boolean) => void;
  /** The audience has been chosen (required before scheduling). */
  onValidChange?: (valid: boolean) => void;
}) {
  const [privacy, setPrivacy] = useState<YouTubePrivacy>(initial ?? "public");
  const [title, setTitle] = useState(initialOptions?.title ?? "");
  const [thumb, setThumb] = useState<string | null>(initialOptions?.thumbnailUrl ?? null);
  // No default: YouTube requires the uploader to declare the audience (a saved
  // post keeps its answer).
  const [madeForKids, setMadeForKids] = useState<boolean | null>(
    typeof initialOptions?.madeForKids === "boolean" ? initialOptions.madeForKids : null,
  );
  const [thumbBusy, setThumbBusy] = useState(false);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const busyRef = useRef(onBusyChange);
  busyRef.current = onBusyChange;
  useEffect(() => busyRef.current?.(thumbBusy), [thumbBusy]);
  // Removed mid-upload (YouTube deselected): don't leave the composer blocked.
  useEffect(() => () => busyRef.current?.(false), []);
  const validRef = useRef(onValidChange);
  validRef.current = onValidChange;
  useEffect(() => validRef.current?.(madeForKids !== null), [madeForKids]);

  async function uploadThumb(file: File) {
    setThumbError(null);
    if (!THUMB_TYPES.includes(file.type)) return setThumbError("Use a JPG or PNG image.");
    if (file.size > THUMB_MAX_BYTES) return setThumbError("Thumbnails can be up to 2 MB.");
    setThumbBusy(true);
    try {
      const slot = await createMediaUpload({ type: file.type, size: file.size, purpose: "thumbnail" });
      if (!slot.ok) throw new Error(slot.error);
      const { error } = await createClient()
        .storage.from("post-media")
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      setThumb(slot.publicUrl);
    } catch (e) {
      setThumbError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setThumbBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
        <div className="flex items-center justify-between">
          <label htmlFor="youtube-title" className="text-xs font-medium text-muted">
            Title
          </label>
          <span className={`text-xs tabular-nums ${title.length >= TITLE_MAX ? "text-[#d14a3e]" : "text-muted"}`}>
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <input
          id="youtube-title"
          type="text"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value.replace(/[<>]/g, ""))}
          placeholder={fallbackTitle ? fallbackTitle.slice(0, TITLE_MAX) : "Your video title"}
          className="rounded-xl border border-line bg-ground px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-blue focus:outline-none"
        />
        {!title.trim() && !fallbackTitle ? (
          // A media-only post: there's no first line to fall back to.
          <span className="text-xs text-[#d14a3e]">Add a title. Your post has no text to take it from.</span>
        ) : (
          <span className="text-xs text-muted">
            Leave it empty to use the first line of your post. The post text becomes the video description.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Thumbnail</span>
        <div className="flex items-center gap-3">
          {thumb ? (
            <span className="relative block aspect-video w-36 shrink-0 overflow-hidden rounded-lg border border-line bg-ground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="Video thumbnail" className="size-full object-cover" />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={thumbBusy}
              className="flex aspect-video w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-ground text-xs font-semibold text-muted transition-colors hover:border-muted/60 hover:text-ink disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
              </svg>
              {thumbBusy ? "Uploading…" : "Add thumbnail"}
            </button>
          )}
          <div className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
            <span>JPG or PNG, up to 2 MB. 1280×720 works best.</span>
            <span>Custom thumbnails need a verified YouTube channel. Without one, YouTube picks a frame.</span>
            {thumb ? (
              <span className="flex gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-ink hover:underline">
                  Replace
                </button>
                <button type="button" onClick={() => setThumb(null)} className="font-semibold text-[#d14a3e] hover:underline">
                  Remove
                </button>
              </span>
            ) : null}
            {thumbError ? <span className="text-[#d14a3e]">{thumbError}</span> : null}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadThumb(f);
          }}
        />
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

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted">Audience: is this video made for kids?</span>
        <div role="radiogroup" aria-label="Made for kids" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { value: false, label: "No, it's not made for kids" },
            { value: true, label: "Yes, it's made for kids" },
          ].map((o) => {
            const on = madeForKids === o.value;
            return (
              <button
                key={String(o.value)}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMadeForKids(o.value)}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
                  on ? "border-transparent bg-[#2b59d9] text-white shadow-sm" : "border-line bg-ground text-ink hover:border-muted/60"
                }`}
              >
                <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-white" : "border-line"}`}>
                  {on ? <span className="size-1.5 rounded-full bg-white" /> : null}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
        <span className={`text-xs ${madeForKids === null ? "text-[#d14a3e]" : "text-muted"}`}>
          {madeForKids === null ? "Choose one. " : ""}YouTube requires this on every video. Made-for-kids videos have comments and some features turned off.
        </span>
      </div>

      <input type="hidden" name="youtube_privacy" value={privacy} />
      <input type="hidden" name="youtube_title" value={title} />
      <input type="hidden" name="youtube_thumbnail_url" value={thumb ?? ""} />
      <input type="hidden" name="youtube_made_for_kids" value={madeForKids === null ? "" : String(madeForKids)} />
    </div>
  );
}
