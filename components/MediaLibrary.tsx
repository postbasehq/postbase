"use client";

import { useRef, useState } from "react";
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

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** PUT one chunk to its presigned URL, resolving the part's ETag. */
function putPart(
  url: string,
  blob: Blob,
  onProgress: (loaded: number) => void,
): Promise<string> {
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
}: {
  initialItems: MediaItem[];
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        body: JSON.stringify({
          key,
          uploadId,
          parts,
          name: file.name,
          type: file.type,
          size: file.size,
        }),
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const fd = new FormData();
    fd.set("id", deleteTarget.id);
    try {
      await deleteAction(fd);
      setItems((it) => it.filter((x) => x.id !== deleteTarget.id));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const empty = items.length === 0 && uploads.length === 0;

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
        className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-blue bg-blue-soft/50" : "border-line bg-surface"
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
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted"
          aria-hidden
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
        <div className="mt-3 text-sm font-medium">
          Drag &amp; drop, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-semibold text-blue-ink underline underline-offset-2"
          >
            browse
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Images and video up to 1&nbsp;GB · MP4, MOV, WebM, JPG, PNG, WebP, GIF
        </p>
      </div>

      {/* active uploads */}
      {uploads.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
            >
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
                    <div
                      className="h-full rounded-full bg-blue transition-[width] duration-200"
                      style={{ width: `${Math.round(u.progress * 100)}%` }}
                    />
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

      {/* grid */}
      {empty ? (
        <p className="mt-6 rounded-2xl border border-line bg-surface px-4 py-10 text-center text-sm text-muted">
          No media yet. Upload your first image or video above.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => {
            const isVideo = item.type.startsWith("video/");
            return (
              <div
                key={item.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
                  {isVideo ? (
                    <video
                      src={`${item.url}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                  {isVideo ? (
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Video
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{item.name}</div>
                    <div className="text-xs text-muted">{formatBytes(item.size_bytes)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyUrl(item)}
                    className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted hover:text-ink"
                  >
                    {copiedId === item.id ? "Copied" : "Copy URL"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${item.name}`}
                    onClick={() => setDeleteTarget(item)}
                    className="shrink-0 rounded-full border border-line p-1.5 text-muted hover:border-terra hover:text-terra"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        labelledBy="media-delete-title"
      >
        <h3 id="media-delete-title" className="font-display text-lg font-semibold tracking-[-0.01em]">
          Delete this file?
        </h3>
        <p className="mt-1.5 text-sm text-muted">
          <span className="font-medium text-ink">{deleteTarget?.name}</span> will be removed from
          your library and storage. Posts that already used its URL keep working until you replace
          them.
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
            className="rounded-full bg-terra px-4 py-2 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
    </>
  );
}
