"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
};

const PLATFORM: Record<string, PlatformMeta> = {
  x: { label: "X", dot: "bg-ink", limit: 280, thread: true },
  facebook: { label: "Facebook", dot: "bg-blue", limit: 63206 },
  linkedin: { label: "LinkedIn", dot: "bg-blue", limit: 3000 },
  instagram: { label: "Instagram", dot: "bg-terra", limit: 2200, needsMedia: true },
  tiktok: { label: "TikTok", dot: "bg-ink", limit: 2200, needsMedia: true, prefersVideo: true },
  youtube: { label: "YouTube", dot: "bg-amber-bright", limit: 5000, videoOnly: true },
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
type Note = { level: "error" | "info"; text: string };

type PostFormProps = {
  channels: Channel[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  /** Prefill the schedule field with a local wall-clock time (YYYY-MM-DDTHH:MM). */
  defaultScheduleLocal?: string;
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
  initial,
}: PostFormProps) {
  const [tweets, setTweets] = useState<string[]>(
    initial?.thread?.length ? initial.thread : [""],
  );
  const [media, setMedia] = useState<Media[]>(initial?.media ?? []);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.channelIds ?? []));
  const [variants, setVariants] = useState<Record<string, string>>(initial?.variants ?? {});
  const [openVariants, setOpenVariants] = useState<Set<string>>(
    new Set(Object.keys(initial?.variants ?? {})),
  );
  const [tiktokPrivacy, setTiktokPrivacy] = useState(initial?.tiktokPrivacy ?? "SELF_ONLY");
  const [scheduleLocal, setScheduleLocal] = useState(
    () => utcToLocalInput(initial?.scheduledAt) || defaultScheduleLocal || "",
  );
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* derived */
  const cleanTweets = tweets.map((t) => t.trim()).filter(Boolean);
  const caption = cleanTweets.join("\n\n");
  const isThread = tweets.length > 1;
  const hasMedia = media.length > 0;
  const hasVideo = media.some((m) => m.type.startsWith("video/"));
  const selectedChannels = channels.filter((c) => selected.has(c.id));
  const selectedPlatforms = Array.from(new Set(selectedChannels.map((c) => c.platform)));

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
    if (platform === "x") {
      tweets.forEach((t, i) => {
        const over = t.trim().length - meta.limit;
        if (over > 0) notes.push({ level: "error", text: `Tweet ${i + 1} is ${over} over 280` });
      });
    } else {
      const over = caption.length - meta.limit;
      if (over > 0)
        notes.push({ level: "error", text: `Caption is ${over} over ${meta.limit.toLocaleString()}` });
      if (isThread) notes.push({ level: "info", text: "Only the first block posts here" });
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

  const card = "overflow-hidden rounded-2xl border border-line bg-surface shadow-sm";
  const cardHead = "flex items-center gap-2 border-b border-line px-4 py-3";
  const cardTitle = "font-display text-sm font-semibold";

  return (
    <form action={action} className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      {initial ? <input type="hidden" name="post_id" value={initial.id} /> : null}

      {/* ── Compose ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5">
        <section className={card}>
          <div className={cardHead}>
            <span className={cardTitle}>{isThread ? "Thread" : "Post"}</span>
            {isThread ? (
              <span className="ml-auto text-xs text-muted">{tweets.length} parts</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 p-4">
            {tweets.map((t, i) => {
              const len = t.trim().length;
              const xOver = selectedPlatforms.includes("x") && len > 280;
              return (
                <div key={i}>
                  {isThread ? (
                    <div className="mb-1.5 text-xs font-semibold text-muted">Part {i + 1}</div>
                  ) : null}
                  <textarea
                    value={t}
                    onChange={(e) => updateTweet(i, e.target.value)}
                    rows={i === 0 ? 5 : 3}
                    placeholder={i === 0 ? "What are you posting?" : "Continue the thread…"}
                    className="w-full resize-y rounded-xl border border-line bg-ground px-3.5 py-3 text-sm leading-relaxed outline-none focus-visible:border-blue"
                  />
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span className={xOver ? "font-medium text-terra" : "text-muted"}>
                      {len}
                      {selectedPlatforms.includes("x") ? " / 280" : " characters"}
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

            <button
              type="button"
              onClick={addTweet}
              disabled={tweets.length >= MAX_TWEETS}
              className="self-start rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-blue-ink hover:bg-surface-2 disabled:opacity-50"
            >
              + Add part
            </button>
          </div>
        </section>

        {/* Media */}
        <section className={card}>
          <div className={cardHead}>
            <span className={cardTitle}>Media</span>
            <span className="ml-auto text-xs text-muted">Images or MP4 video</span>
          </div>
          <div className="flex flex-col gap-3 p-4">
            {media.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {media.map((m, i) => (
                  <div
                    key={i}
                    className="relative size-24 overflow-hidden rounded-xl border border-line"
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="self-start rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-blue-ink hover:bg-surface-2 disabled:opacity-50"
              >
                {busy ? "Uploading…" : media.length ? "+ Add more" : "+ Add media"}
              </button>
              {uploadError ? <span className="text-xs text-terra">{uploadError}</span> : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4"
              multiple
              hidden
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
        </section>
      </div>

      {/* ── Destinations · Schedule · Preflight ─────────────────── */}
      <div className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
        {/* Channels */}
        <section className={card}>
          <div className={cardHead}>
            <span className={cardTitle}>Channels</span>
            <Link href="/channels" className="ml-auto text-xs font-medium text-blue-ink hover:underline">
              Manage
            </Link>
          </div>
          <div className="flex flex-col gap-3 p-4">
            {channels.length === 0 ? (
              <p className="text-sm text-muted">
                No channels yet.{" "}
                <Link href="/channels" className="font-medium text-blue-ink underline">
                  Connect one
                </Link>
                .
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {channels.map((c) => {
                    const on = selected.has(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggleChannel(c.id)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                          on ? "border-blue bg-blue-soft text-blue-ink" : "border-line bg-ground"
                        }`}
                      >
                        <span className={`size-2 rounded-full ${PLATFORM[c.platform]?.dot ?? "bg-muted"}`} />
                        <span className="font-medium">{label(c.platform)}</span>
                        {c.handle ? <span className="text-muted">{c.handle}</span> : null}
                      </button>
                    );
                  })}
                </div>

                {/* per-channel variants */}
                {selectedChannels.map((c) =>
                  openVariants.has(c.id) ? (
                    <div key={c.id} className="rounded-xl border border-line bg-ground p-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="text-xs font-medium text-muted">{label(c.platform)} variant</span>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenVariants((s) => {
                              const n = new Set(s);
                              n.delete(c.id);
                              return n;
                            });
                            setVariants((v) => {
                              const n = { ...v };
                              delete n[c.id];
                              return n;
                            });
                          }}
                          className="ml-auto text-xs text-muted hover:text-terra"
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        value={variants[c.id] ?? ""}
                        onChange={(e) => setVariants((v) => ({ ...v, [c.id]: e.target.value }))}
                        rows={2}
                        placeholder={`Custom text for ${label(c.platform)} — overrides the default`}
                        className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus-visible:border-blue"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setOpenVariants((s) => new Set(s).add(c.id))}
                      className="self-start text-xs font-medium text-blue-ink hover:underline"
                    >
                      + Customize for {label(c.platform)}
                    </button>
                  ),
                )}

                {/* TikTok privacy */}
                {selectedPlatforms.includes("tiktok") ? (
                  <label className="flex flex-col gap-1.5 border-t border-line pt-3">
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
              </>
            )}
          </div>
        </section>

        {/* Schedule */}
        <section className={card}>
          <div className={cardHead}>
            <span className={cardTitle}>Schedule</span>
            <span className="ml-auto text-xs text-muted">{isDraft ? "Draft" : tz}</span>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <input
              type="datetime-local"
              value={scheduleLocal}
              onChange={(e) => setScheduleLocal(e.target.value)}
              className="w-full rounded-xl border border-line bg-ground px-3.5 py-2.5 text-sm outline-none focus-visible:border-blue"
            />
            <span className="text-xs text-muted">
              {isDraft
                ? "No time set — saves as a draft you can schedule later."
                : `Publishes at this time (${tz}).`}
            </span>
          </div>
        </section>

        {/* Preflight */}
        <section className={card}>
          <div className={cardHead}>
            <span className={cardTitle}>Preflight</span>
            {selectedPlatforms.length > 0 ? (
              <span
                className={`ml-auto inline-flex items-center gap-1.5 text-xs font-medium ${
                  hasBlocking ? "text-terra" : "text-green"
                }`}
              >
                <span className={`size-2 rounded-full ${hasBlocking ? "bg-terra" : "bg-green"}`} />
                {hasBlocking ? "Needs attention" : "Ready"}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2.5 p-4">
            {selectedPlatforms.length === 0 ? (
              <p className="text-sm text-muted">Select a channel to check readiness.</p>
            ) : (
              checks.map(({ platform, notes }) => {
                const blocking = notes.some((n) => n.level === "error");
                return (
                  <div key={platform} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        blocking ? "bg-terra" : "bg-green"
                      }`}
                    />
                    <div className="min-w-0">
                      <span className="font-medium">{label(platform)}</span>{" "}
                      {notes.length === 0 ? (
                        <span className="text-green">Ready</span>
                      ) : (
                        <span className="flex flex-col">
                          {notes.map((n, i) => (
                            <span
                              key={i}
                              className={n.level === "error" ? "text-terra" : "text-muted"}
                            >
                              {n.text}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-full bg-blue px-6 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDraft ? "Save draft" : submitLabel}
            </button>
            <Link href="/dashboard" className="text-sm font-medium text-muted hover:text-ink">
              Cancel
            </Link>
          </div>
          {bodyEmpty ? (
            <span className="text-xs text-muted">Write something to continue.</span>
          ) : hasBlocking && !isDraft ? (
            <span className="text-xs text-terra">
              Fix the flagged channels above, or clear the schedule to save a draft.
            </span>
          ) : null}
        </div>
      </div>

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
