"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder, motion, useDragControls } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/SubmitButton";
import { Modal } from "@/components/Modal";
import { BrandTile } from "@/components/BrandTile";
import { DateTimePicker } from "@/components/DateTimePicker";
import { REPEAT_OPTIONS } from "@/lib/publish/repeat";
import { ASPECT_RATIOS, type AspectRatio } from "@/lib/higgsfield";
import { generateAiImage, startAiVideo, pollAiVideo } from "@/app/(app)/actions";
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
  /** Non-thread platforms where extra posts publish as a first comment. */
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

// Each post in a thread carries a stable id so drag/reorder animations can
// track it across position changes. Ids must be collision-proof even across a
// dev HMR reload (which would otherwise reset a plain counter).
type Tweet = { id: string; text: string };
// Per-platform theme palettes for the preview pane — overriding the design-token
// CSS variables inside the wrapper flips the whole preview (which uses those
// tokens) to that platform's real light/dark surface, independent of the app.
const PREVIEW_PALETTES: Record<string, { light: Record<string, string>; dark: Record<string, string> }> = {
  // X (and the default for platforms not yet given a bespoke palette).
  default: {
    light: { "--ground": "#ffffff", "--surface": "#ffffff", "--surface-2": "#f0f3f4", "--ink": "#0f1419", "--muted": "#536471", "--line": "#e1e8ed" },
    dark: { "--ground": "#000000", "--surface": "#000000", "--surface-2": "#16181c", "--ink": "#e7e9ea", "--muted": "#71767b", "--line": "#2f3336" },
  },
  linkedin: {
    light: { "--ground": "#f4f2ee", "--surface": "#ffffff", "--surface-2": "#edece8", "--ink": "#1b1f23", "--muted": "#5e5e5e", "--line": "#e8e6e1" },
    dark: { "--ground": "#000000", "--surface": "#1b1f23", "--surface-2": "#2c333a", "--ink": "#f5f2ef", "--muted": "#a6abb0", "--line": "#2f363d" },
  },
  instagram: {
    light: { "--ground": "#ffffff", "--surface": "#ffffff", "--surface-2": "#fafafa", "--ink": "#262626", "--muted": "#8e8e8e", "--line": "#dbdbdb", "--ig-link": "#00376b" },
    dark: { "--ground": "#000000", "--surface": "#000000", "--surface-2": "#121212", "--ink": "#f5f5f5", "--muted": "#a8a8a8", "--line": "#262626", "--ig-link": "#e0f1ff" },
  },
  tiktok: {
    light: { "--ground": "#f1f1f2", "--surface": "#ffffff", "--surface-2": "#e8e8e9", "--ink": "#161823", "--muted": "#8a8b91", "--line": "#e3e3e4" },
    dark: { "--ground": "#000000", "--surface": "#121212", "--surface-2": "#1f1f1f", "--ink": "#f1f1f2", "--muted": "#a1a2a7", "--line": "#2a2a2a" },
  },
  youtube: {
    light: { "--ground": "#ffffff", "--surface": "#ffffff", "--surface-2": "#f2f2f2", "--ink": "#0f0f0f", "--muted": "#606060", "--line": "#e5e5e5" },
    dark: { "--ground": "#0f0f0f", "--surface": "#0f0f0f", "--surface-2": "#272727", "--ink": "#f1f1f1", "--muted": "#aaaaaa", "--line": "#303030" },
  },
  bluesky: {
    light: { "--ground": "#ffffff", "--surface": "#ffffff", "--surface-2": "#f0f3f5", "--ink": "#0b0f14", "--muted": "#566a7e", "--line": "#e2e8ed" },
    dark: { "--ground": "#000000", "--surface": "#161e27", "--surface-2": "#1e2a38", "--ink": "#f1f3f5", "--muted": "#8b98a5", "--line": "#2b3b4e" },
  },
  mastodon: {
    light: { "--ground": "#ffffff", "--surface": "#ffffff", "--surface-2": "#f2f3f8", "--ink": "#191b22", "--muted": "#606984", "--line": "#e6e7f0" },
    dark: { "--ground": "#191b22", "--surface": "#282c37", "--surface-2": "#313543", "--ink": "#ffffff", "--muted": "#9baec8", "--line": "#393f4f" },
  },
  facebook: {
    light: { "--ground": "#f0f2f5", "--surface": "#ffffff", "--surface-2": "#f0f2f5", "--ink": "#050505", "--muted": "#65676b", "--line": "#ced0d4" },
    dark: { "--ground": "#18191a", "--surface": "#242526", "--surface-2": "#3a3b3c", "--ink": "#e4e6eb", "--muted": "#b0b3b8", "--line": "#3e4042" },
  },
};
function previewVars(platform: string, mode: "light" | "dark"): React.CSSProperties {
  return (PREVIEW_PALETTES[platform] ?? PREVIEW_PALETTES.default)[mode] as React.CSSProperties;
}

// Shared glassy panel with the three Postbase brand colours washing across it,
// reused by the composer's modals for a consistent, on-brand look.
const BRAND_GLASS_PANEL: { panelClassName: string; panelStyle: React.CSSProperties } = {
  panelClassName:
    "border border-white/15 bg-surface/75 p-6 shadow-[0_28px_80px_-24px_rgba(16,24,40,0.7)] backdrop-blur-2xl",
  panelStyle: {
    backgroundImage: [
      "radial-gradient(120% 90% at 0% 0%, #2b59d93d, transparent 55%)", // brand blue
      "radial-gradient(110% 80% at 100% 4%, #e3a72c2e, transparent 52%)", // amber
      "radial-gradient(120% 85% at 100% 100%, #d14a3e29, transparent 55%)", // terracotta
    ].join(","),
  },
};

// Compact relative time for the "Load draft" list (mirrors the drafts page).
function draftTimeAgo(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

let tweetSeq = 0;
const freshTweet = (text = ""): Tweet => {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `tw_${Date.now().toString(36)}_${tweetSeq++}`;
  return { id, text };
};

type Channel = {
  id: string;
  platform: string;
  handle: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  verified?: boolean | null;
};
type Media = { url: string; type: string };
type LibraryItem = { id: string; url: string; name: string; type: string; size_bytes: number };
type DraftItem = {
  id: string;
  body: string;
  thread_len: number;
  updated_at: string | null;
  platforms: string[];
};
type Note = { level: "error" | "info"; text: string };

type PostFormProps = {
  channels: Channel[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  /** Prefill the schedule field with a local wall-clock time (YYYY-MM-DDTHH:MM). */
  defaultScheduleLocal?: string;
  /** Reusable assets from the media library, for the "Pick from library" picker. */
  libraryItems?: LibraryItem[];
  /** Existing drafts, for the "Load draft" picker (omit to hide the control). */
  drafts?: DraftItem[];
  /** Draft currently open in the editor, hidden from the "Load draft" list. */
  currentDraftId?: string;
  /** Media to pre-attach on a fresh post (e.g. "Use in a new post" from /media). */
  prefillMedia?: Media[];
  /** Show the AI "Generate" control (Higgsfield keys configured server-side). */
  aiEnabled?: boolean;
  /** Remaining AI generations this month (per plan quota). */
  aiRemaining?: { image: number; video: number };
  initial?: {
    id: string;
    thread: string[];
    scheduledAt: string | null;
    channelIds: string[];
    variants: Record<string, string>;
    media: Media[];
    tiktokPrivacy?: string;
    repeatEvery?: string | null;
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
  drafts = [],
  currentDraftId,
  prefillMedia,
  initial,
  aiEnabled = false,
  aiRemaining,
}: PostFormProps) {
  const [tweets, setTweets] = useState<Tweet[]>(() =>
    (initial?.thread?.length ? initial.thread : [""]).map((text, i) => ({
      id: `init_${i}`,
      text,
    })),
  );
  // While any post is being dragged, the thread connectors are hidden — they'd
  // otherwise point at stale positions until the drop settles.
  const [reordering, setReordering] = useState(false);
  const [media, setMedia] = useState<Media[]>(prefillMedia ?? initial?.media ?? []);
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
  const [repeatEvery, setRepeatEvery] = useState(initial?.repeatEvery ?? "");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState("");
  const otherDrafts = drafts.filter((d) => d.id !== currentDraftId);
  const filteredDrafts = draftQuery.trim()
    ? otherDrafts.filter((d) => d.body.toLowerCase().includes(draftQuery.trim().toLowerCase()))
    : otherDrafts;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  // AI image generation (Higgsfield).
  const [genOpen, setGenOpen] = useState(false);
  const [genMode, setGenMode] = useState<"image" | "video">("image");
  const [genPrompt, setGenPrompt] = useState("");
  const [genAspect, setGenAspect] = useState<AspectRatio>("1:1");
  const [genUseImage, setGenUseImage] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [genStage, setGenStage] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [aiLeft, setAiLeft] = useState(aiRemaining);
  const genCancelled = useRef(false);

  /* derived */
  const cleanTweets = tweets.map((t) => t.text.trim()).filter(Boolean);
  const caption = cleanTweets.join("\n\n");
  const isThread = tweets.length > 1;
  const hasMedia = media.length > 0;
  const hasVideo = media.some((m) => m.type.startsWith("video/"));
  const selectedChannels = channels.filter((c) => selected.has(c.id));
  const selectedPlatforms = Array.from(new Set(selectedChannels.map((c) => c.platform)));

  // Live preview: which selected channel is being previewed.
  const [previewIdx, setPreviewIdx] = useState(0);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("dark");
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
        const over = t.text.trim().length - meta.limit;
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
            ? "Extra posts publish as a first comment"
            : "Extra posts are added to the post text",
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
    setTweets((t) => t.map((x, idx) => (idx === i ? { ...x, text: v } : x)));
  const addTweet = () => {
    // Build the new post outside the updater so the id is stable even if React
    // (StrictMode) invokes the updater twice.
    const nt = freshTweet();
    setTweets((t) => (t.length < MAX_TWEETS ? [...t, nt] : t));
  };
  const removeTweet = (i: number) =>
    setTweets((t) => (t.length > 1 ? t.filter((_, idx) => idx !== i) : t));
  // Swap a post one place earlier/later in the thread (position sets the order).
  const moveTweet = (i: number, dir: -1 | 1) =>
    setTweets((t) => {
      const j = i + dir;
      if (j < 0 || j >= t.length) return t;
      const next = [...t];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

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

  const firstImage = media.find((m) => m.type.startsWith("image/"));

  function closeGen() {
    genCancelled.current = true;
    setGenOpen(false);
    setGenPrompt("");
    setGenBusy(false);
    setGenStage(null);
  }

  async function runGenerate() {
    if (genBusy) return;
    if (genMode === "image") {
      if (!genPrompt.trim()) return;
      setGenBusy(true);
      setGenError(null);
      setGenStage("Generating…");
      try {
        const res = await generateAiImage(genPrompt, genAspect);
        if (res.ok) {
          setMedia((m) => [...m, { url: res.url, type: res.type }]);
          setAiLeft((l) => (l ? { ...l, image: Math.max(0, l.image - 1) } : l));
          closeGen();
        } else setGenError(res.error);
      } catch {
        setGenError("Something went wrong generating the image.");
      } finally {
        setGenBusy(false);
        setGenStage(null);
      }
      return;
    }

    // Video: submit, then poll (it's slow — up to a few minutes).
    const useImg = genUseImage && firstImage ? firstImage.url : undefined;
    if (!genPrompt.trim() && !useImg) return;
    setGenBusy(true);
    setGenError(null);
    setGenStage("Starting…");
    genCancelled.current = false;
    try {
      const started = await startAiVideo(genPrompt, genAspect, useImg);
      if (!started.ok) {
        setGenError(started.error);
        return;
      }
      setAiLeft((l) => (l ? { ...l, video: Math.max(0, l.video - 1) } : l));
      setGenStage("Generating video… this can take a minute");
      const deadline = Date.now() + 5 * 60 * 1000;
      while (Date.now() < deadline) {
        if (genCancelled.current) return;
        await new Promise((r) => setTimeout(r, 3000));
        if (genCancelled.current) return;
        const p = await pollAiVideo(started.statusUrl);
        if (p.status === "done") {
          setMedia((m) => [...m, { url: p.url, type: p.type }]);
          closeGen();
          return;
        }
        if (p.status === "error") {
          setGenError(p.error);
          return;
        }
      }
      setGenError("Video timed out — please try again.");
    } catch {
      setGenError("Something went wrong generating the video.");
    } finally {
      setGenBusy(false);
      setGenStage(null);
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
    <form action={action} className="mt-6 flex flex-col gap-4 pb-24">
      {initial ? <input type="hidden" name="post_id" value={initial.id} /> : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Compose ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* channels */}
          <div className="flex flex-col gap-3.5">
          <p className="font-display text-base font-semibold text-ink">Available channels</p>
          <div
            ref={channelsRef}
            className={`flex flex-wrap items-center gap-3 rounded-xl transition-all duration-300 ${
              flashChannels ? "p-1 ring-2 ring-blue" : ""
            }`}
          >
            {channels.length === 0 ? (
              <Link
                href="/channels"
                className="group flex items-center gap-3 rounded-full border border-dashed border-line bg-surface-2/40 py-1.5 pl-2 pr-4 transition hover:border-blue/60 hover:bg-surface-2"
              >
                <span className="flex -space-x-2">
                  {["x", "linkedin", "instagram", "tiktok"].map((p) => (
                    <span
                      key={p}
                      className="rounded-full opacity-40 grayscale ring-2 ring-surface transition group-hover:opacity-80 group-hover:grayscale-0"
                    >
                      <BrandTile platform={p} size={30} radius={15} />
                    </span>
                  ))}
                  <span className="flex size-[30px] items-center justify-center rounded-full border border-dashed border-line bg-surface text-muted ring-2 ring-surface transition group-hover:border-blue group-hover:text-blue">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </span>
                <span className="text-sm">
                  <span className="font-medium text-ink">Connect a channel</span>
                  <span className="text-muted"> to start posting</span>
                </span>
              </Link>
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
                      aria-pressed={on}
                      title={`${label(c.platform)}${c.handle ? ` ${c.handle}` : ""}`}
                      className={`relative rounded-full transition ${
                        on
                          ? "ring-2 ring-blue ring-offset-2 ring-offset-surface"
                          : "opacity-45 hover:opacity-100"
                      }`}
                    >
                      <BrandTile platform={c.platform} size={34} radius={17} />
                      {blocking ? (
                        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-terra ring-2 ring-surface" />
                      ) : null}
                    </button>
                  );
                })}
              </>
            )}
          </div>
          </div>

          {/* editor */}
          <div className="flex flex-col gap-4">
            <Reorder.Group
              as="div"
              axis="y"
              values={tweets}
              onReorder={setTweets}
              className="flex flex-col gap-4 select-none"
            >
              {tweets.map((tw, i) => (
                <ThreadItem
                  key={tw.id}
                  tweet={tw}
                  index={i}
                  total={tweets.length}
                  isThread={isThread}
                  charLimit={charLimit}
                  emptyWarning={i === 0 && bodyEmpty && !hasMedia}
                  reordering={reordering}
                  onDragChange={setReordering}
                  onChange={(v) => updateTweet(i, v)}
                  onRemove={() => removeTweet(i)}
                  onMove={(dir) => moveTweet(i, dir)}
                />
              ))}
            </Reorder.Group>

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
              {aiEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setGenError(null);
                    // Suggest an aspect ratio that suits the selected channels.
                    setGenAspect(
                      selectedPlatforms.some((p) => p === "tiktok" || p === "youtube")
                        ? "9:16"
                        : selectedPlatforms.includes("instagram")
                          ? "4:5"
                          : "1:1",
                    );
                    setGenOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-blue/40 bg-blue-soft px-3 py-1.5 text-xs font-semibold text-blue-ink shadow-sm transition hover:border-blue/70 hover:shadow-md"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
                  </svg>
                  Generate
                </button>
              ) : null}
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
              {otherDrafts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraftQuery("");
                    setDraftsOpen(true);
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/70 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:border-blue/50 hover:bg-surface-2 hover:shadow-md"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M9 13h6M9 17h4" />
                  </svg>
                  Load draft
                </button>
              ) : null}
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
                  .map(({ platform, notes }) => {
                    const hasError = notes.some((n) => n.level === "error");
                    return (
                      <div
                        key={platform}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ${
                          hasError ? "bg-terra/10" : "bg-surface-2/60"
                        }`}
                      >
                        {hasError ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-terra" aria-hidden>
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                            <path d="M12 9v4M12 17h.01" />
                          </svg>
                        ) : null}
                        <span className="shrink-0">
                          <BrandTile platform={platform} size={18} radius={5} />
                        </span>
                        <span className="font-medium text-ink">{label(platform)}</span>
                        <span className="h-3 w-px shrink-0 bg-line" aria-hidden />
                        <span className="flex flex-col">
                          {notes.map((n, i) => (
                            <span key={i} className={n.level === "error" ? "text-terra" : "text-muted"}>
                              {n.text}
                            </span>
                          ))}
                        </span>
                      </div>
                    );
                  })}
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
          {previewChannel ? (
            <div className="flex items-center justify-end gap-1.5 px-1">
              {selectedChannels.length > 1
                ? selectedChannels.map((c, i) => (
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
                  ))
                : null}
              {previewChannel ? (
                <div className="flex items-center rounded-lg border border-line p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewTheme("light")}
                    aria-label="Light preview"
                    aria-pressed={previewTheme === "light"}
                    className={`flex size-6 items-center justify-center rounded-md transition ${
                      previewTheme === "light" ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTheme("dark")}
                    aria-label="Dark preview"
                    aria-pressed={previewTheme === "dark"}
                    className={`flex size-6 items-center justify-center rounded-md transition ${
                      previewTheme === "dark" ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                    </svg>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {previewChannel ? (
            <div
              style={previewVars(previewChannel.platform, previewTheme)}
              className="rounded-2xl border border-line bg-ground p-3"
            >
              <PostPreview
                platform={previewChannel.platform}
                handle={previewChannel.handle}
                displayName={previewChannel.display_name}
                avatarUrl={previewChannel.avatar_url}
                verified={!!previewChannel.verified}
                thread={
                  variants[previewChannel.id]?.trim()
                    ? [variants[previewChannel.id]]
                    : tweets.map((t) => t.text)
                }
                media={media.map((m) => ({ url: m.url, type: m.type }))}
                metrics={null}
                publishedAt={utc || null}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-line py-16 text-center">
              <p className="text-sm font-medium text-ink">Nothing to preview yet</p>
              <p className="text-xs text-muted">Pick a channel to see how your post will look.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Action bar (fixed footer, spans the whole panel) ──── */}
      <div className="fixed bottom-3 left-0 right-3 z-30 rounded-b-2xl border border-line bg-surface shadow-[0_-4px_14px_-10px_rgba(16,24,40,0.22)] md:left-60">
        <div className="mx-auto flex w-full max-w-[1248px] flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3.5">
        <DateTimePicker value={scheduleLocal} onChange={setScheduleLocal} timeZone={tz} />

        {!isDraft ? (
          <label
            title="Automatically re-post on a fixed cadence"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-ground pl-2.5 pr-1 text-sm focus-within:border-blue"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden>
              <path d="m17 2 4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="m7 22-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
            <select
              value={repeatEvery}
              onChange={(e) => setRepeatEvery(e.target.value)}
              aria-label="Repeat"
              className={`bg-transparent py-2 text-sm outline-none ${repeatEvery ? "text-ink" : "text-muted"}`}
            >
              <option value="">Don’t repeat</option>
              {REPEAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isDraft ? (
          <span className="text-xs text-muted">No time — saves as a draft</span>
        ) : null}

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
      </div>

      {/* Generate media with AI */}
      <Modal
        open={genOpen}
        onClose={closeGen}
        labelledBy="gen-title"
        size="lg"
        {...BRAND_GLASS_PANEL}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center text-blue-ink" aria-hidden>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
            </svg>
          </span>
          <h3 id="gen-title" className="font-display text-xl font-semibold tracking-[-0.01em]">
            Generate {genMode === "video" ? "a video" : "an image"}
          </h3>
        </div>

        {genBusy ? (
          <div className="mt-2">
            {genPrompt.trim() ? (
              <p className="line-clamp-2 text-sm italic text-muted">“{genPrompt.trim()}”</p>
            ) : (
              <p className="text-sm text-muted">Animating your uploaded image…</p>
            )}
            <p className="mt-1 text-xs text-muted">
              {genMode === "video"
                ? "This usually takes a minute or two — hang tight."
                : "This usually takes a few seconds — hang tight."}
            </p>
          </div>
        ) : (
          <>
            {/* image / video mode */}
            <div className="mt-3 inline-flex rounded-lg border border-line p-0.5 text-xs font-semibold">
              {(["image", "video"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setGenMode(m);
                    setGenError(null);
                    if (m === "video") setGenAspect("9:16");
                  }}
                  className={`rounded-md px-3 py-1.5 capitalize transition ${
                    genMode === m ? "bg-blue-soft text-blue-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <p className="mt-2 text-sm text-muted">
              {genMode === "video"
                ? "Describe the clip — we’ll generate a short video and add it to your post."
                : "Describe what you want — we’ll create it and add it to your post."}
            </p>

            {aiLeft ? (
              <p className={`mt-1 text-xs ${aiLeft[genMode] <= 0 ? "font-medium text-terra" : "text-muted"}`}>
                {aiLeft[genMode] <= 0
                  ? `No AI ${genMode}s left this month — upgrade your plan for more.`
                  : `${aiLeft[genMode]} ${genMode}${aiLeft[genMode] === 1 ? "" : "s"} left this month`}
              </p>
            ) : null}

            {genMode === "video" && firstImage ? (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={genUseImage}
                  onChange={(e) => setGenUseImage(e.target.checked)}
                  style={{ accentColor: "var(--blue)" }}
                  className="size-4"
                />
                <span className="text-ink">Animate my uploaded image</span>
              </label>
            ) : null}
          </>
        )}

        {genBusy ? (
          <div className="mt-4 flex justify-center">
            {/* A "developing" frame in the chosen aspect ratio: a slow rotating
                Postbase-colour aurora behind a pulsing sparkle. */}
            <div
              className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f16]"
              style={{ height: 240, aspectRatio: genAspect.replace(":", " / "), maxWidth: "100%" }}
            >
              <div
                className="absolute -inset-1/2 animate-[spin_7s_linear_infinite] opacity-80 blur-2xl"
                style={{ backgroundImage: "conic-gradient(from 0deg, #2b59d9, #e3a72c, #d14a3e, #2b59d9)" }}
                aria-hidden
              />
              <div className="absolute inset-0 bg-[#0d0f16]/55" aria-hidden />
              <div className="relative flex flex-col items-center gap-3 px-5 text-center text-white">
                <svg className="animate-pulse" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
                </svg>
                <p className="text-xs font-medium text-white/90">{genStage ?? "Generating…"}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <textarea
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              rows={3}
              placeholder={
                genMode === "video"
                  ? "e.g. slow push-in on a coffee cup, steam rising, warm morning light"
                  : "e.g. a minimalist product shot of a phone on a pastel gradient, soft studio light"
              }
              className="mt-4 w-full resize-none rounded-xl border border-line bg-ground p-3 text-sm outline-none focus:border-blue"
            />

            <div className="mt-3">
              <span className="text-xs font-medium text-muted">Aspect ratio</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ASPECT_RATIOS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setGenAspect(a.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      genAspect === a.value
                        ? "border-blue bg-blue-soft text-blue-ink"
                        : "border-line text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {genError ? <p className="mt-3 text-xs text-terra">{genError}</p> : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={closeGen} className="text-sm font-medium text-muted hover:text-ink">
            {genBusy ? "Stop" : "Cancel"}
          </button>
          {aiLeft && aiLeft[genMode] <= 0 ? (
            <Link
              href="/billing"
              onClick={closeGen}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
            >
              Upgrade plan
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          ) : (
            <button
              type="button"
              onClick={runGenerate}
              disabled={
                genBusy ||
                (genMode === "image"
                  ? !genPrompt.trim()
                  : !genPrompt.trim() && !(genUseImage && firstImage))
              }
              className="inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2.5 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {genBusy ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden>
                    <path d="M21 12a9 9 0 1 1-6.2-8.5" />
                  </svg>
                  Generating…
                </>
              ) : genMode === "video" ? (
                "Generate video"
              ) : (
                "Generate image"
              )}
            </button>
          )}
        </div>
      </Modal>

      <Modal open={libraryOpen} onClose={closeLibrary} labelledBy="lib-picker-title" size="lg" {...BRAND_GLASS_PANEL}>
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
          <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface-2/40 px-6 py-10 text-center">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.6" />
              <path d="m21 15-4-4a2 2 0 0 0-2.8 0L4 21" />
            </svg>
            <h4 className="mt-4 font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
              Nothing saved yet
            </h4>
            <p className="mt-1 max-w-[17rem] text-[13px] leading-relaxed text-muted">
              Upload a photo or video once and it’ll live here — ready to reuse across any post.
            </p>
            <Link
              href="/media"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-blue px-4 py-2 font-display text-sm font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              Upload media
            </Link>
          </div>
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

      <Modal open={draftsOpen} onClose={() => setDraftsOpen(false)} labelledBy="drafts-picker-title" size="lg" {...BRAND_GLASS_PANEL}>
        <div className="flex items-center gap-2">
          <h3 id="drafts-picker-title" className="font-display text-lg font-semibold tracking-[-0.01em]">
            Load a draft
          </h3>
          <Link href="/drafts" className="ml-auto text-xs font-medium text-blue-ink hover:underline">
            Manage drafts
          </Link>
        </div>

        {otherDrafts.length > 6 ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-surface/60 px-3 focus-within:border-blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="Search drafts…"
              aria-label="Search drafts"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted"
            />
          </div>
        ) : null}

        {filteredDrafts.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-line bg-surface/40 px-4 py-10 text-center text-sm text-muted">
            {draftQuery.trim() ? `No drafts match “${draftQuery.trim()}”.` : "No other drafts to load."}
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface/60">
            <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-line bg-surface-2/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span>Draft</span>
              <span>Updated</span>
            </div>
            <div className="max-h-[52vh] divide-y divide-line/70 overflow-y-auto">
              {filteredDrafts.map((d) => (
                <Link
                  key={d.id}
                  href={`/composer/${d.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {d.platforms.length > 0 ? (
                      <span className="flex shrink-0 -space-x-1.5">
                        {d.platforms.slice(0, 3).map((pl) => (
                          <span key={pl} className="rounded-[6px] bg-surface p-[1.5px] shadow-sm ring-1 ring-line">
                            <BrandTile platform={pl} size={18} radius={5} />
                          </span>
                        ))}
                      </span>
                    ) : null}
                    <span className="min-w-0 truncate text-sm text-ink">
                      {d.thread_len > 0 ? (
                        <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                          🧵 {d.thread_len + 1}
                        </span>
                      ) : null}
                      {d.body || <span className="text-muted">(empty draft)</span>}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-xs font-medium text-muted tabular-nums">
                    {draftTimeAgo(d.updated_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
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
      <input type="hidden" name="repeat_every" value={isDraft ? "" : repeatEvery} />
    </form>
  );
}

// One post in the composer thread — a Reorder.Item that lifts and tilts while
// dragging (from the grip handle only), with its siblings springing out of the
// way. Up/down controls remain as the keyboard-accessible path.
function ThreadItem({
  tweet,
  index,
  total,
  isThread,
  charLimit,
  emptyWarning,
  reordering,
  onDragChange,
  onChange,
  onRemove,
  onMove,
}: {
  tweet: Tweet;
  index: number;
  total: number;
  isThread: boolean;
  charLimit: number | null;
  emptyWarning: boolean;
  reordering: boolean;
  onDragChange: (v: boolean) => void;
  onChange: (v: string) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const t = tweet.text;
  const len = t.length;
  const nearLimit = charLimit != null && len >= charLimit * 0.9;
  const atLimit = charLimit != null && len >= charLimit;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <Reorder.Item
      as="div"
      value={tweet}
      layout="position"
      dragListener={false}
      dragControls={controls}
      onDragStart={() => {
        setDragging(true);
        onDragChange(true);
      }}
      onDragEnd={() => {
        setDragging(false);
        onDragChange(false);
      }}
      transition={{ type: "spring", stiffness: 600, damping: 40 }}
      style={{ position: "relative", zIndex: dragging ? 30 : 1 }}
    >
      {/* The lift/tilt lives on an inner element so it's independent of the
          Reorder.Item's drag/layout transform — it always animates back to 0. */}
      <motion.div
        animate={{ scale: dragging ? 1.03 : 1, rotate: dragging ? -1.5 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{ transformOrigin: "center" }}
        className={`relative ${isFirst ? "" : "pl-6"}`}
      >
      {!isFirst && !reordering ? (
        <>
          {/* Vertical rail up to the box above. The last reply stops at its own
              elbow (h-10) so the line doesn't dangle past it; middle replies run
              full height to reach the next reply. */}
          <span
            aria-hidden
            className={`pointer-events-none absolute -top-4 left-2 w-px bg-line ${
              isLast ? "h-10" : "bottom-0"
            }`}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-2 top-6 h-px w-4 bg-line"
          />
        </>
      ) : null}
      <div
        className={`rounded-xl border border-line bg-ground p-3.5 transition-shadow focus-within:border-blue ${
          dragging ? "shadow-[0_22px_45px_-14px_rgba(0,0,0,0.55)]" : ""
        }`}
      >
        {isThread ? (
          <div className="mb-1.5 flex items-center gap-2">
            <span
              role="button"
              aria-label="Drag to reorder"
              title="Drag to reorder"
              onPointerDown={(e) => controls.start(e)}
              className="-ml-1 cursor-grab touch-none text-muted/50 transition hover:text-muted active:cursor-grabbing"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="9" cy="5" r="1.7" />
                <circle cx="15" cy="5" r="1.7" />
                <circle cx="9" cy="12" r="1.7" />
                <circle cx="15" cy="12" r="1.7" />
                <circle cx="9" cy="19" r="1.7" />
                <circle cx="15" cy="19" r="1.7" />
              </svg>
            </span>
            <span className="text-xs font-semibold text-muted">
              {isFirst ? "Post" : `Comment / post ${index}`}
            </span>
            <div className="ml-auto flex items-center rounded-lg border border-line bg-surface/60">
              <button
                type="button"
                onClick={() => onMove(-1)}
                disabled={isFirst}
                aria-label="Move earlier"
                title="Move earlier"
                className="flex size-6 items-center justify-center rounded-l-lg text-muted transition hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
              <span className="h-4 w-px bg-line" aria-hidden />
              <button
                type="button"
                onClick={() => onMove(1)}
                disabled={isLast}
                aria-label="Move later"
                title="Move later"
                className="flex size-6 items-center justify-center rounded-r-lg text-muted transition hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}
        <textarea
          value={t}
          onChange={(e) => onChange(e.target.value)}
          rows={isFirst ? 6 : 3}
          maxLength={charLimit ?? undefined}
          placeholder={isFirst ? "What do you want to say?" : "Add a comment or next post…"}
          className="w-full resize-none select-text bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted/70"
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
          {emptyWarning ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              Please enter a character or upload media to post
            </span>
          ) : null}
          {total > 1 ? (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1 text-muted hover:text-terra"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
              Remove
            </button>
          ) : null}
        </div>
      </div>
      </motion.div>
    </Reorder.Item>
  );
}
