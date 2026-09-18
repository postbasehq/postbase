"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/Modal";

export type MediaItem = {
  id: string;
  url: string;
  name: string;
  type: string;
  size_bytes: number;
  created_at: string;
};

type Upload = { id: string; name: string; size: number; progress: number; error?: string };
type TypeFilter = "all" | "image" | "video";
type SortKey = "new" | "old" | "large" | "name";

// Kept in sync with lib/r2.ts (can't import that server module into the client).
const MAX_BYTES = 1024 * 1024 * 1024; // 1 GB
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
const ACCEPT = ALLOWED.join(",");

// Faint / stronger Postbase brand washes for the dropzone (blue, amber, terracotta).
const WASH_IDLE = [
  "radial-gradient(90% 130% at 0% 0%, #2b59d914, transparent 60%)",
  "radial-gradient(80% 130% at 100% 0%, #e3a72c12, transparent 55%)",
  "radial-gradient(90% 130% at 100% 100%, #d14a3e12, transparent 60%)",
].join(",");
const WASH_ACTIVE = [
  "radial-gradient(90% 130% at 0% 0%, #2b59d930, transparent 62%)",
  "radial-gradient(80% 130% at 100% 0%, #e3a72c26, transparent 58%)",
  "radial-gradient(90% 130% at 100% 100%, #d14a3e26, transparent 62%)",
].join(",");

// Cards rotate through the three brand colours for a lively hover accent.
const ACCENTS = [
  "hover:border-[#2b59d9]/50 hover:shadow-[0_16px_36px_-16px_rgba(43,89,217,0.5)]",
  "hover:border-[#e3a72c]/55 hover:shadow-[0_16px_36px_-16px_rgba(227,167,44,0.5)]",
  "hover:border-[#d14a3e]/50 hover:shadow-[0_16px_36px_-16px_rgba(209,74,62,0.5)]",
];

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** PUT one chunk to its presigned URL, resolving the part's ETag. */
function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (etag) resolve(etag);
        else reject(new Error("Missing ETag — check the R2 bucket’s CORS ExposeHeaders."));
      } else {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(blob);
  });
}

async function putPartWithRetry(
  url: string,
  blob: Blob,
  onProgress: (loaded: number) => void,
  attempts = 3,
): Promise<string> {
  let lastErr: unknown;
  for (let a = 0; a < attempts; a++) {
    try {
      return await putPart(url, blob, onProgress);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Upload failed.");
}

export function MediaLibrary({
  initialItems,
  deleteAction,
  renameAction,
}: {
  initialItems: MediaItem[];
  deleteAction: (formData: FormData) => Promise<void>;
  renameAction: (formData: FormData) => Promise<void>;
}) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Browse controls
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortKey>("new");

  // Selection
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Preview + rename
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Delete confirmations
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function patchUpload(id: string, patch: Partial<Upload>) {
    setUploads((u) => u.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function uploadFile(file: File) {
    const upId = crypto.randomUUID();
    setUploads((u) => [...u, { id: upId, name: file.name, size: file.size, progress: 0 }]);

    if (!ALLOWED.includes(file.type)) {
      patchUpload(upId, { error: "Unsupported file type." });
      return;
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      patchUpload(upId, { error: "File is over the 1 GB limit." });
      return;
    }

    let started: { key: string; uploadId: string } | null = null;
    try {
      const createRes = await fetch("/api/media/upload/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
      });
      if (!createRes.ok) {
        const code = (await createRes.json().catch(() => ({}))).error;
        throw new Error(
          code === "too_large"
            ? "File is over the 1 GB limit."
            : code === "unsupported_type"
              ? "Unsupported file type."
              : code === "no_workspace"
                ? "No workspace found."
                : "Couldn’t start the upload (is R2 configured?).",
        );
      }
      const { key, uploadId, partSize, urls } = (await createRes.json()) as {
        key: string;
        uploadId: string;
        partSize: number;
        urls: string[];
      };
      started = { key, uploadId };

      const parts: { PartNumber: number; ETag: string }[] = [];
      let uploadedBytes = 0;
      for (let i = 0; i < urls.length; i++) {
        const start = i * partSize;
        const blob = file.slice(start, Math.min(start + partSize, file.size));
        const etag = await putPartWithRetry(urls[i], blob, (loaded) => {
          const overall = (uploadedBytes + loaded) / file.size;
          patchUpload(upId, { progress: Math.min(0.99, overall) });
        });
        uploadedBytes += blob.size;
        parts.push({ PartNumber: i + 1, ETag: etag });
      }

      const doneRes = await fetch("/api/media/upload/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, uploadId, parts, name: file.name, type: file.type, size: file.size }),
      });
      if (!doneRes.ok) throw new Error("Couldn’t finalize the upload.");
      const { item } = (await doneRes.json()) as { item: MediaItem };

      setItems((it) => [item, ...it]);
      setUploads((u) => u.filter((x) => x.id !== upId));
    } catch (e) {
      if (started) {
        void fetch("/api/media/upload/abort", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(started),
        });
      }
      patchUpload(upId, { error: e instanceof Error ? e.message : "Upload failed." });
    }
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    for (const file of Array.from(list)) void uploadFile(file);
  }

  async function copyUrl(item: MediaItem) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((c) => (c === item.id ? null : c)), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const fd = new FormData();
    fd.set("id", deleteTarget.id);
    try {
      await deleteAction(fd);
      setItems((it) => it.filter((x) => x.id !== deleteTarget.id));
      if (preview?.id === deleteTarget.id) setPreview(null);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function confirmBulkDelete() {
    setDeleting(true);
    const ids = [...selected];
    try {
      await Promise.all(
        ids.map((id) => {
          const fd = new FormData();
          fd.set("id", id);
          return deleteAction(fd);
        }),
      );
      setItems((it) => it.filter((x) => !selected.has(x.id)));
    } finally {
      setDeleting(false);
      setBulkDeleteOpen(false);
      exitSelect();
    }
  }

  async function saveRename() {
    if (!preview) return;
    const name = renameValue.trim();
    if (!name || name === preview.name) {
      setRenaming(false);
      return;
    }
    const fd = new FormData();
    fd.set("id", preview.id);
    fd.set("name", name);
    await renameAction(fd);
    setItems((it) => it.map((x) => (x.id === preview.id ? { ...x, name } : x)));
    setPreview((p) => (p ? { ...p, name } : p));
    setRenaming(false);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((it) => {
      if (typeFilter === "image" && !it.type.startsWith("image/")) return false;
      if (typeFilter === "video" && !it.type.startsWith("video/")) return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "large") return b.size_bytes - a.size_bytes;
      if (sort === "name") return a.name.localeCompare(b.name);
      const at = Date.parse(a.created_at);
      const bt = Date.parse(b.created_at);
      return sort === "old" ? at - bt : bt - at;
    });
    return list;
  }, [items, query, typeFilter, sort]);

  const empty = items.length === 0 && uploads.length === 0;
  const selectCls =
    "rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink outline-none focus-visible:border-blue";

  return (
    <>
      {/* dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        style={{ backgroundImage: dragOver ? WASH_ACTIVE : WASH_IDLE }}
        className={`relative flex flex-col items-center overflow-hidden rounded-2xl border-2 border-dashed bg-surface px-6 py-12 text-center transition-all duration-200 ${
          dragOver ? "scale-[1.01] border-blue" : "border-line hover:border-blue/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-all duration-200 ${dragOver ? "-translate-y-0.5 text-blue" : "text-blue-ink"}`}
          aria-hidden
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
        <div className="mt-4 font-display text-[15px] font-semibold tracking-[-0.01em]">
          {dragOver ? "Drop to upload" : "Drag & drop your media"}
        </div>
        <p className="mt-1 text-sm text-muted">
          or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-semibold text-blue-ink underline underline-offset-2 hover:no-underline"
          >
            browse files
          </button>
        </p>
        <p className="mt-3 text-xs text-muted">
          Images &amp; video up to 1&nbsp;GB · MP4, MOV, WebM, JPG, PNG, WebP, GIF
        </p>
      </div>

      {/* active uploads */}
      {uploads.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{u.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {u.error ? "Failed" : `${Math.round(u.progress * 100)}%`}
                  </span>
                </div>
                {u.error ? (
                  <p className="mt-1 text-xs text-terra">{u.error}</p>
                ) : (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-blue transition-[width] duration-200" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                  </div>
                )}
              </div>
              {u.error ? (
                <button
                  type="button"
                  onClick={() => setUploads((list) => list.filter((x) => x.id !== u.id))}
                  className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:text-ink"
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* toolbar */}
      {items.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <div className="flex min-w-0 max-w-xs flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 focus-within:border-blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              aria-label="Search files"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted"
            />
          </div>

          <div role="group" aria-label="Filter by type" className="flex items-center gap-1 rounded-full border border-line p-1">
            {(["all", "image", "video"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                aria-pressed={typeFilter === t}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  typeFilter === t ? "bg-blue text-on-blue shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {t === "all" ? "All" : t === "image" ? "Images" : "Videos"}
              </button>
            ))}
          </div>

          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort" className={selectCls}>
            <option value="new">Newest</option>
            <option value="old">Oldest</option>
            <option value="large">Largest</option>
            <option value="name">Name</option>
          </select>

          <button
            type="button"
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            className={`ml-auto rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
              selectMode ? "border-blue bg-blue-soft text-blue-ink" : "border-line text-ink hover:bg-surface-2"
            }`}
          >
            {selectMode ? "Done" : "Select"}
          </button>
        </div>
      ) : null}

      {/* grid */}
      {empty ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center shadow-sm">
          <span className="text-muted" aria-hidden>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.6" />
              <path d="m21 15-4-4a2 2 0 0 0-2.8 0L4 21" />
            </svg>
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold tracking-[-0.01em]">No media yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            Upload your first image or video above — reuse it across any post.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-surface px-4 py-10 text-center text-sm text-muted">
          No files match your search.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item, i) => {
            const isVideo = item.type.startsWith("video/");
            const isSelected = selected.has(item.id);
            return (
              <div
                key={item.id}
                className={`group flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm transition-all duration-200 ${
                  isSelected
                    ? "border-blue ring-2 ring-blue/40"
                    : `border-line hover:-translate-y-0.5 ${ACCENTS[i % ACCENTS.length]}`
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (selectMode) toggleSelect(item.id);
                    else {
                      setRenameValue(item.name);
                      setRenaming(false);
                      setPreview(item);
                    }
                  }}
                  className="relative block aspect-video w-full overflow-hidden bg-surface-2"
                  aria-label={selectMode ? `Select ${item.name}` : `Preview ${item.name}`}
                >
                  {isVideo ? (
                    <video src={`${item.url}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  )}
                  {isVideo ? (
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Video
                    </span>
                  ) : null}

                  {selectMode ? (
                    <span
                      className={`absolute right-2 top-2 grid size-6 place-items-center rounded-full border-2 transition ${
                        isSelected ? "border-blue bg-blue text-on-blue" : "border-white/80 bg-black/30 text-transparent"
                      }`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                  ) : (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                      <span className="rounded-full bg-white/90 p-2 text-ink shadow">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                      </span>
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{item.name}</div>
                    <div className="text-xs text-muted">{formatBytes(item.size_bytes)}</div>
                  </div>
                  {!selectMode ? (
                    <button
                      type="button"
                      onClick={() => copyUrl(item)}
                      className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:text-ink"
                    >
                      {copiedId === item.id ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* bulk selection bar */}
      {selectMode && selected.size > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5 shadow-lg">
            <span className="text-[13px] font-semibold">{selected.size} selected</span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted hover:text-ink"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-full bg-[#d14a3e] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#b83f34]"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {/* preview lightbox */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} labelledBy="media-preview-title" size="xl">
        {preview ? (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl bg-surface-2">
              {preview.type.startsWith("video/") ? (
                <video src={preview.url} controls playsInline className="max-h-[60vh] w-full bg-black object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.name} className="max-h-[60vh] w-full object-contain" />
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                {renaming ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveRename();
                        if (e.key === "Escape") setRenaming(false);
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-line bg-ground px-3 py-1.5 text-sm outline-none focus-visible:border-blue"
                    />
                    <button type="button" onClick={() => void saveRename()} className="rounded-lg bg-blue px-3 py-1.5 text-xs font-semibold text-on-blue">
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 id="media-preview-title" className="truncate font-display text-lg font-semibold tracking-[-0.01em]">
                      {preview.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setRenameValue(preview.name);
                        setRenaming(true);
                      }}
                      aria-label="Rename"
                      className="shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                      </svg>
                    </button>
                  </div>
                )}
                <p className="mt-0.5 text-xs text-muted">
                  {formatBytes(preview.size_bytes)} · {preview.type.split("/")[1]?.toUpperCase()} · added {formatDate(preview.created_at)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyUrl(preview)}
                  className="rounded-full border border-line px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:bg-surface-2"
                >
                  {copiedId === preview.id ? "Copied" : "Copy URL"}
                </button>
                <Link
                  href={`/composer?media=${preview.id}`}
                  className="rounded-full bg-blue px-4 py-2 font-display text-[13px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md"
                >
                  Use in a new post →
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(preview)}
                  aria-label="Delete"
                  className="rounded-full border border-line p-2 text-muted transition hover:border-terra hover:text-terra"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* single delete confirm */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        labelledBy="media-delete-title"
      >
        <h3 id="media-delete-title" className="font-display text-lg font-semibold tracking-[-0.01em]">
          Delete this file?
        </h3>
        <p className="mt-1.5 text-sm text-muted">
          <span className="font-medium text-ink">{deleteTarget?.name}</span> will be removed from your
          library and storage. Posts that already used its URL keep working until you replace them.
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleting}
            className="rounded-full bg-[#d14a3e] px-4 py-2 font-display text-sm font-semibold text-white shadow-sm transition hover:bg-[#b83f34] disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>

      {/* bulk delete confirm */}
      <Modal
        open={bulkDeleteOpen}
        onClose={() => (deleting ? null : setBulkDeleteOpen(false))}
        labelledBy="media-bulk-delete-title"
      >
        <h3 id="media-bulk-delete-title" className="font-display text-lg font-semibold tracking-[-0.01em]">
          Delete {selected.size} file{selected.size === 1 ? "" : "s"}?
        </h3>
        <p className="mt-1.5 text-sm text-muted">
          They’ll be removed from your library and storage. Posts that already used their URLs keep
          working until you replace them.
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setBulkDeleteOpen(false)}
            disabled={deleting}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmBulkDelete}
            disabled={deleting}
            className="rounded-full bg-[#d14a3e] px-4 py-2 font-display text-sm font-semibold text-white shadow-sm transition hover:bg-[#b83f34] disabled:opacity-60"
          >
            {deleting ? "Deleting…" : `Delete ${selected.size}`}
          </button>
        </div>
      </Modal>
    </>
  );
}
