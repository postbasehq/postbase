"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Media = { url: string; type: string };

/**
 * Uploads images to Supabase Storage (post-media bucket) from the browser and submits
 * a JSON `media` field (array of {url, type}). The publish job attaches them per platform.
 */
export function MediaUpload({ initial = [] }: { initial?: Media[] }) {
  const [items, setItems] = useState<Media[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const added: Media[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
        const path = `uploads/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("post-media")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          setError(upErr.message);
          continue;
        }
        const { data } = supabase.storage.from("post-media").getPublicUrl(path);
        added.push({ url: data.publicUrl, type: file.type });
      }
      setItems((x) => [...x, ...added]);
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const remove = (i: number) => setItems((x) => x.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted">Media (optional)</span>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((m, i) => (
            <div key={i} className="relative size-20 overflow-hidden rounded-lg border border-line">
              {m.type.startsWith("video/") ? (
                <video src={m.url} className="size-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="size-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => remove(i)}
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
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="self-start rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-blue-ink hover:bg-surface-2 disabled:opacity-50"
        >
          {busy ? "Uploading…" : "+ Add image"}
        </button>
        {error ? <span className="text-xs text-terra">{error}</span> : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4"
        multiple
        hidden
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      <input type="hidden" name="media" value={JSON.stringify(items)} />
    </div>
  );
}
