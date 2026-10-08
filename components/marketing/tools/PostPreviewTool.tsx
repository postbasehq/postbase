"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { PostPreview } from "@/components/PostPreview";
import { LIMITS, count } from "@/lib/char-count";

const SAMPLE =
  "New on the shelf: Kochere, Ethiopia ☕️\n\nWashed process, light roast. In the cup it's apricot, black tea and a little bergamot.\n\nRoasted Monday, shipped Tuesday.";

const NETWORKS = [
  { id: "x", name: "X" },
  { id: "linkedin", name: "LinkedIn" },
  { id: "bluesky", name: "Bluesky" },
  { id: "mastodon", name: "Mastodon" },
  { id: "facebook", name: "Facebook" },
  { id: "instagram", name: "Instagram" },
  { id: "tiktok", name: "TikTok" },
  { id: "youtube", name: "YouTube" },
];

/** Networks that won't take a post without media, and what they need. */
const NEEDS: Record<string, string> = {
  instagram: "Instagram needs an image or video.",
  tiktok: "TikTok needs a video or photos.",
  youtube: "YouTube needs a video.",
};

type Media = { url: string; type: string };

/** One post, previewed the way each network lays it out. Files stay in the browser (object URLs). */
export function PostPreviewTool() {
  const [text, setText] = useState(SAMPLE);
  const [handle, setHandle] = useState("haldencoffee");
  const [media, setMedia] = useState<Media[]>([]);
  const [on, setOn] = useState<string[]>(["x", "linkedin", "bluesky", "instagram"]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Free the object URLs when files change or the page goes.
  useEffect(() => () => media.forEach((m) => URL.revokeObjectURL(m.url)), [media]);

  // YouTube's 100 in LIMITS is the title; the post text here is the description.
  const limits = useMemo(
    () => new Map(LIMITS.map((l) => [l.id, l.id === "youtube" ? { ...l, limit: 5000 } : l])),
    [],
  );

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .slice(0, 4)
      .map((f) => ({ url: URL.createObjectURL(f), type: f.type }));
    setMedia(next);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[24px] border border-line bg-surface p-5 md:p-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <label htmlFor="pp-text" className="font-display text-[15px] font-semibold text-ink">
              Your post
            </label>
            <textarea
              id="pp-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              className="mt-3 w-full resize-y rounded-xl border border-line bg-ground p-4 text-[16px] leading-relaxed text-ink outline-none focus:border-blue"
              placeholder="Type or paste your post…"
            />
          </div>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-display text-[15px] font-semibold text-ink">Handle</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/^@/, "").slice(0, 40))}
                className="rounded-xl border border-line bg-ground px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-blue"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="font-display text-[15px] font-semibold text-ink">Images or video</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl px-3.5 py-2.5 text-[14px] font-semibold text-ink ring-1 ring-line hover:ring-ink"
                >
                  {media.length ? `${media.length} file${media.length > 1 ? "s" : ""}` : "Add files"}
                </button>
                {media.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMedia([]);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="text-[13px] font-semibold text-blue-ink"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <span className="text-[12px] text-muted">Up to 4. They stay on your device.</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {NETWORKS.map((n) => {
            const active = on.includes(n.id);
            return (
              <button
                key={n.id}
                type="button"
                aria-pressed={active}
                onClick={() => setOn((o) => (active ? o.filter((x) => x !== n.id) : [...o, n.id]))}
                className={`inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold transition-colors ${
                  active ? "bg-ink text-ground" : "text-muted ring-1 ring-line hover:text-ink"
                }`}
              >
                <BrandTile platform={n.id} size={20} radius={10} />
                {n.name}
              </button>
            );
          })}
        </div>
      </div>

      {on.length === 0 ? (
        <p className="text-center text-[14px] text-muted">Pick a network to preview.</p>
      ) : (
        <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
          {NETWORKS.filter((n) => on.includes(n.id)).map((n) => {
            const l = limits.get(n.id);
            const used = l ? count(text, l.rule) : 0;
            const over = l ? used > l.limit : false;
            const missing = NEEDS[n.id] && !media.length;
            return (
              <div key={n.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1 text-[13px]">
                  <span className="font-semibold text-ink">{n.name}</span>
                  {l ? (
                    <span className={`ml-auto tabular-nums ${over ? "font-semibold text-[#d14a3e]" : "text-muted"}`}>
                      {used.toLocaleString()} / {l.limit.toLocaleString()}
                    </span>
                  ) : null}
                </div>
                {missing ? <p className="px-1 text-[13px] font-medium text-[#d14a3e]">{NEEDS[n.id]}</p> : null}
                <PostPreview platform={n.id} handle={handle || "you"} thread={[text]} media={media} metrics={null} publishedAt={null} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
