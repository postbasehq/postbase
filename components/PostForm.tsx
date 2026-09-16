"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/SubmitButton";
import { Modal } from "@/components/Modal";
import { BrandTile } from "@/components/BrandTile";
import { PostPreview } from "@/components/PostPreview";

/* ── Platform rules ─────────────────────────────────────────────────────────
   One source of truth for how each network treats a post: character budget,
   whether it needs media, and whether it supports a thread. The composer reads
   this to validate the selected destinations live. */
type PlatformMeta = {
  label: string;
  dot: string;
  limit: number;
  needsMedia?: boolean;
  prefersVideo?: boolean;
  videoOnly?: boolean;
  thread?: boolean;
  /** Non-thread platforms where extra parts post as a first comment. */
  firstComment?: boolean;
};

const PLATFORM: Record<string, PlatformMeta> = {
  x: { label: "X", dot: "bg-ink", limit: 280, thread: true },
  facebook: { label: "Facebook", dot: "bg-blue", limit: 63206 },
  linkedin: { label: "LinkedIn", dot: "bg-blue", limit: 3000, firstComment: true },
  instagram: { label: "Instagram", dot: "bg-terra", limit: 2200, needsMedia: true },
  tiktok: { label: "TikTok", dot: "bg-ink", limit: 2200, needsMedia: true, prefersVideo: true },
  youtube: { label: "YouTube", dot: "bg-amber-bright", limit: 5000, videoOnly: true },
  bluesky: { label: "Bluesky", dot: "bg-blue", limit: 300, thread: true },
  mastodon: { label: "Mastodon", dot: "bg-blue", limit: 500, thread: true },
};
const label = (p: string) => PLATFORM[p]?.label ?? p;

const TIKTOK_PRIVACY = [
  { value: "PUBLIC_TO_EVERYONE", label: "Public" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends" },
  { value: "FOLLOWER_OF_CREATOR", label: "Followers" },
  { value: "SELF_ONLY", label: "Only me" },
];

const MAX_TWEETS = 25;

type Channel = { id: string; platform: string; handle: string | null };
type Media = { url: string; type: string };
type LibraryItem = { id: string; url: string; name: string; type: string; size_bytes: number };
type Note = { level: "error" | "info"; text: string };

type PostFormProps = {
  channels: Channel[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  /** Prefill the schedule field with a local wall-clock time (YYYY-MM-DDTHH:MM). */
  defaultScheduleLocal?: string;
  /** Reusable assets from the media library, for the "Pick from library" picker. */
  libraryItems?: LibraryItem[];
  initial?: {
    id: string;
    thread: string[];
    scheduledAt: string | null;
    channelIds: string[];
    variants: Record<string, string>;
    media: Media[];
    tiktokPrivacy?: string;
  };
};

function utcToLocalInput(utc?: string | null): string {
  if (!utc) return "";
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function PostForm({
  channels,
  action,
  submitLabel,
  defaultScheduleLocal,
  libraryItems = [],
  initial,
}: PostFormProps) {
  const [tweets, setTweets] = useState<string[]>(
    initial?.thread?.length ? initial.thread : [""],
  );
  const [media, setMedia] = useState<Media[]>(initial?.media ?? []);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.channelIds ?? []));

  // When arriving via a "+"/manage-channels link (?focus=channels), scroll to
  // the Channels card and flash a highlight so it's obvious where to act.
  const channelsRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [flashChannels, setFlashChannels] = useState(false);
  useEffect(() => {
    if (searchParams.get("focus") !== "channels") return;
    channelsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashChannels(true);
    const t = setTimeout(() => setFlashChannels(false), 2600);
    return () => clearTimeout(t);
  }, [searchParams]);
  const [variants] = useState<Record<string, string>>(initial?.variants ?? {});
  const [tiktokPrivacy, setTiktokPrivacy] = useState(initial?.tiktokPrivacy ?? "SELF_ONLY");
  const [scheduleLocal, setScheduleLocal] = useState(
    () => utcToLocalInput(initial?.scheduledAt) || defaultScheduleLocal || "",
  );
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  /* derived */
  const cleanTweets = tweets.map((t) => t.trim()).filter(Boolean);
  const caption = cleanTweets.join("\n\n");
  const isThread = tweets.length > 1;
  const hasMedia = media.length > 0;
  const hasVideo = media.some((m) => m.type.startsWith("video/"));
  const selectedChannels = channels.filter((c) => selected.has(c.id));
  const selectedPlatforms = Array.from(new Set(selectedChannels.map((c) => c.platform)));

  // Live preview: which selected channel is being previewed.
  const [previewIdx, setPreviewIdx] = useState(0);
  const previewClamped = Math.min(previewIdx, Math.max(0, selectedChannels.length - 1));
  const previewChannel = selectedChannels[previewClamped];

  // Strictest character budget across the selected platforms (null when none).
  const charLimit = (() => {
    if (selectedPlatforms.length === 0) return null;
    const min = Math.min(...selectedPlatforms.map((p) => PLATFORM[p]?.limit ?? Infinity));
    return Number.isFinite(min) ? min : null;
  })();

  let tz = "your timezone";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {}
  let utc = "";
  if (scheduleLocal) {
    const d = new Date(scheduleLocal);
    if (!Number.isNaN(d.getTime())) utc = d.toISOString();
  }
  const isDraft = !utc;

  function checkPlatform(platform: string): Note[] {
    const meta = PLATFORM[platform];
    if (!meta) return [];
    const notes: Note[] = [];
    if (meta.thread) {
      // Thread-native (X, Bluesky, Mastodon): each block is its own post/reply.
      tweets.forEach((t, i) => {
        const over = t.trim().length - meta.limit;
        if (over > 0)
          notes.push({ level: "error", text: `Post ${i + 1} is ${over} over ${meta.limit}` });
      });
    } else {
      const over = caption.length - meta.limit;
      if (over > 0)
        notes.push({ level: "error", text: `Caption is ${over} over ${meta.limit.toLocaleString()}` });
      if (isThread)
        notes.push({
          level: "info",
          text: meta.firstComment
            ? "Extra parts post as a first comment"
            : "Extra parts are added to the post text",
        });
    }
    if (meta.videoOnly && !hasVideo) {
      notes.push({ level: "error", text: "Needs a video" });
    } else if (meta.needsMedia && !hasMedia) {
      notes.push({
        level: "error",
        text: meta.prefersVideo ? "Needs a video or images" : "Needs an image or video",
      });
    }
    if (meta.prefersVideo && hasMedia && !hasVideo)
      notes.push({ level: "info", text: "Posts as a photo carousel" });
    return notes;
  }

  const checks = selectedPlatforms.map((p) => ({ platform: p, notes: checkPlatform(p) }));
  const hasBlocking = checks.some((c) => c.notes.some((n) => n.level === "error"));
  const bodyEmpty = cleanTweets.length === 0;
  const canSubmit = !bodyEmpty && (isDraft || !hasBlocking);

  /* actions */
  const updateTweet = (i: number, v: string) =>
    setTweets((t) => t.map((x, idx) => (idx === i ? v : x)));
  const addTweet = () => setTweets((t) => (t.length < MAX_TWEETS ? [...t, ""] : t));
  const removeTweet = (i: number) =>
    setTweets((t) => (t.length > 1 ? t.filter((_, idx) => idx !== i) : t));

  const toggleChannel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  async function handleFiles(files: FileList) {
    setBusy(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const added: Media[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
        const path = `uploads/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("post-media")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          setUploadError(error.message);
          continue;
        }
        added.push({
          url: supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl,
          type: file.type,
        });
      }
      setMedia((m) => [...m, ...added]);
    } catch {
      setUploadError("Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const togglePick = (url: string) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(url) ? n.delete(url) : n.add(url);
      return n;
    });

  function addPicked() {
    const have = new Set(media.map((m) => m.url));
    const add = libraryItems
      .filter((it) => picked.has(it.url) && !have.has(it.url))
      .map((it) => ({ url: it.url, type: it.type }));
    setMedia((m) => [...m, ...add]);
    closeLibrary();
  }
  function closeLibrary() {
    setPicked(new Set());
    setLibraryOpen(false);
  }

  const card = "overflow-hidden rounded-2xl border border-line bg-surface shadow-sm";
  const cardHead = "flex items-center gap-2 border-b border-line px-4 py-3";
  const cardTitle = "font-display text-sm font-semibold";

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      {initial ? <input type="hidden" name="post_id" value={initial.id} /> : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Compose ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* channels */}
          <div
            ref={channelsRef}
            className={`flex flex-wrap items-center gap-2 rounded-xl transition-all duration-300 ${
              flashChannels ? "p-1 ring-2 ring-blue" : ""
            }`}
          >
            {channels.length === 0 ? (
              <span className="text-sm text-muted">
                No channels yet.{" "}
                <Link href="/channels" className="font-medium text-blue-ink underline">
                  Connect one
                </Link>
                .
              </span>
            ) : (
              <>
                {channels.map((c) => {
                  const on = selected.has(c.id);
                  const blocking =
                    on && checkPlatform(c.platform).some((n) => n.level === "error");
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleChannel(c.id)}
                      title={`${label(c.platform)}${c.handle ? ` ${c.handle}` : ""}`}
                      className={`relative flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm transition ${
                        on
                          ? "border-blue bg-blue-soft text-blue-ink"
                          : "border-line text-muted hover:text-ink"
                      }`}
                    >
                      <BrandTile platform={c.platform} size={18} radius={5} />
                      <span className="font-medium">{label(c.platform)}</span>
                      {blocking ? (
                        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-terra ring-2 ring-surface" />
                      ) : null}
                    </button>
                  );
                })}
                <Link
                  href="/channels"
                  className="ml-auto text-xs font-medium text-blue-ink hover:underline"
                >
                  Manage
                </Link>
              </>
            )}
          </div>

          {/* editor */}
          <div className="flex flex-col gap-4">
            {tweets.map((t, i) => {
              const len = t.length;
              const nearLimit = charLimit != null && len >= charLimit * 0.9;
              const atLimit = charLimit != null && len >= charLimit;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-line p-3.5 transition-colors focus-within:border-blue"
                >
                  {isThread ? (
                    <div className="mb-1.5 text-xs font-semibold text-muted">
                      {i === 0 ? "Post" : `Comment / post ${i}`}
                    </div>
                  ) : null}
                  <textarea
                    value={t}
                    onChange={(e) => updateTweet(i, e.target.value)}
                    rows={i === 0 ? 6 : 3}
                    maxLength={charLimit ?? undefined}
                    placeholder={i === 0 ? "What do you want to say?" : "Add a comment or next post…"}
                    className="w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted/70"
                  />
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span
                      className={
                        atLimit ? "font-medium text-terra" : nearLimit ? "font-medium text-amber" : "text-muted"
                      }
                    >
                      {len.toLocaleString()}
                      {charLimit != null ? ` / ${charLimit.toLocaleString()}` : " characters"}
                    </span>
                    {tweets.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeTweet(i)}
                        className="text-muted hover:text-terra"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {/* media thumbnails */}
            {media.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {media.map((m, i) => (
                  <div
                    key={i}
                    className="relative size-20 overflow-hidden rounded-xl border border-line"
                  >
                    {m.type.startsWith("video/") ? (
                      <video src={m.url} className="size-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" className="size-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setMedia((x) => x.filter((_, idx) => idx !== i))}
                      aria-label="Remove media"
                      className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-ink/70 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {uploadError ? <span className="text-xs text-terra">{uploadError}</span> : null}

            {/* inline toolbar */}
            <div className="flex flex-wrap items-center gap-0.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-4.5-4.5L5 21" />
                </svg>
                {busy ? "Uploading…" : "Media"}
              </button>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                Library
              </button>
              <button
                type="button"
                onClick={addTweet}
                disabled={tweets.length >= MAX_TWEETS}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add comment / post
              </button>
            </div>

            {/* TikTok privacy */}
            {selectedPlatforms.includes("tiktok") ? (
              <label className="flex flex-col gap-1.5 pt-1">
                <span className="text-xs font-medium text-muted">TikTok privacy</span>
                <select
                  value={tiktokPrivacy}
                  onChange={(e) => setTiktokPrivacy(e.target.value)}
                  className="rounded-lg border border-line bg-ground px-3 py-2 text-sm outline-none focus-visible:border-blue"
                >
                  {TIKTOK_PRIVACY.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted">
                  Until TikTok approves the app, posts publish as “Only me”.
                </span>
              </label>
            ) : null}

            {/* preflight — inline warnings */}
            {selectedPlatforms.length > 0 && checks.some((c) => c.notes.length > 0) ? (
              <div className="flex flex-col gap-1.5 pt-1">
                {checks
                  .filter((c) => c.notes.length > 0)
                  .map(({ platform, notes }) => (
                    <div key={platform} className="flex items-start gap-2 text-xs">
                      <span className="shrink-0 font-medium">{label(platform)}</span>
                      <span className="flex flex-col">
                        {notes.map((n, i) => (
                          <span key={i} className={n.level === "error" ? "text-terra" : "text-muted"}>
                            {n.text}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
              </div>
            ) : null}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4"
              multiple
              hidden
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
        </div>

        {/* ── Preview ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Preview</span>
            {selectedChannels.length > 1 ? (
              <div className="ml-auto flex items-center gap-1">
                {selectedChannels.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPreviewIdx(i)}
                    aria-label={`Preview ${label(c.platform)}`}
                    title={label(c.platform)}
                    className={`flex size-7 items-center justify-center rounded-lg transition ${
                      i === previewClamped ? "bg-blue-soft" : "opacity-50 hover:bg-surface-2 hover:opacity-100"
                    }`}
                  >
                    <BrandTile platform={c.platform} size={16} radius={4} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {previewChannel ? (
            <PostPreview
              platform={previewChannel.platform}
              handle={previewChannel.handle}
              thread={
                variants[previewChannel.id]?.trim() ? [variants[previewChannel.id]] : tweets
              }
              media={media.map((m) => ({ url: m.url, type: m.type }))}
              metrics={null}
              publishedAt={utc || null}
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-line py-16 text-center">
              <p className="text-sm font-medium text-ink">Nothing to preview yet</p>
              <p className="text-xs text-muted">Pick a channel to see how your post will look.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Action bar (sticky footer) ────────────────────────── */}
      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line bg-surface px-6 py-3.5 shadow-[0_-8px_24px_-16px_rgba(16,24,40,0.35)]">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-ground px-2.5 focus-within:border-blue">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <input
            type="datetime-local"
            value={scheduleLocal}
            onChange={(e) => setScheduleLocal(e.target.value)}
            className="bg-transparent py-2 text-sm outline-none"
          />
        </label>
        <span className="text-xs text-muted">
          {isDraft ? "No time — saves as a draft" : `Publishes · ${tz}`}
        </span>

        {selectedPlatforms.length > 0 ? (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              hasBlocking ? "text-terra" : "text-green"
            }`}
          >
            <span className={`size-2 rounded-full ${hasBlocking ? "bg-terra" : "bg-green"}`} />
            {hasBlocking ? "Needs attention" : "Ready to publish"}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-3">
          {bodyEmpty ? (
            <span className="hidden text-xs text-muted sm:inline">Write something to continue.</span>
          ) : hasBlocking && !isDraft ? (
            <span className="hidden text-xs text-terra sm:inline">
              Fix the flagged channels, or clear the time to save a draft.
            </span>
          ) : null}
          <Link href="/queue" className="text-sm font-medium text-muted hover:text-ink">
            Cancel
          </Link>
          <SubmitButton
            disabled={!canSubmit}
            pendingLabel={isDraft ? "Saving…" : "Scheduling…"}
            className="rounded-full bg-blue px-6 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDraft ? "Save draft" : submitLabel}
          </SubmitButton>
        </div>
      </div>

      {/* Pick from library */}
      <Modal open={libraryOpen} onClose={closeLibrary} labelledBy="lib-picker-title">
        <div className="flex items-center gap-2">
          <h3
            id="lib-picker-title"
            className="font-display text-lg font-semibold tracking-[-0.01em]"
          >
            Pick from library
          </h3>
          <Link href="/media" className="ml-auto text-xs font-medium text-blue-ink hover:underline">
            Manage media
          </Link>
        </div>

        {libraryItems.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Your library is empty.{" "}
            <Link href="/media" className="font-medium text-blue-ink underline">
              Upload media
            </Link>{" "}
            to reuse it here.
          </p>
        ) : (
          <div className="mt-4 grid max-h-[52vh] grid-cols-3 gap-2.5 overflow-y-auto sm:grid-cols-4">
            {libraryItems.map((item) => {
              const already = media.some((m) => m.url === item.url);
              const on = already || picked.has(item.url);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => !already && togglePick(item.url)}
                  disabled={already}
                  title={item.name}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-surface-2 transition-colors ${
                    on ? "border-blue" : "border-line"
                  } ${already ? "opacity-60" : ""}`}
                >
                  {item.type.startsWith("video/") ? (
                    <video
                      src={`${item.url}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="size-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.name} className="size-full object-cover" />
                  )}
                  {on ? (
                    <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-blue text-xs font-bold text-on-blue">
                      ✓
                    </span>
                  ) : null}
                  {already ? (
                    <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center text-[10px] font-semibold text-white">
                      Added
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={closeLibrary}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={addPicked}
            disabled={picked.size === 0}
            className="rounded-full bg-blue px-5 py-2 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:opacity-50"
          >
            {picked.size > 0 ? `Add ${picked.size}` : "Add"}
          </button>
        </div>
      </Modal>

      {/* hidden fields for the server action */}
      <input type="hidden" name="thread" value={JSON.stringify(cleanTweets)} />
      <input type="hidden" name="media" value={JSON.stringify(media)} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="channels" value={id} />
      ))}
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(
          Object.fromEntries(
            Object.entries(variants).filter(([k, v]) => selected.has(k) && v.trim()),
          ),
        )}
      />
      {selectedPlatforms.includes("tiktok") ? (
        <input type="hidden" name="tiktok_privacy_level" value={tiktokPrivacy} />
      ) : null}
      <input type="hidden" name="scheduled_at" value={utc} />
    </form>
  );
}
