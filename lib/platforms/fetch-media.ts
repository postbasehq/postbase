/**
 * Download a post's media for upload to a network, bounded: a timeout, and a
 * hard size cap enforced while streaming (a Content-Length header can lie or
 * be missing), so one oversized file can't exhaust the publisher's memory or
 * time and stall everyone's queue. URLs are already limited to the
 * workspace's own storage (lib/media-urls.ts).
 */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // the media library's own upload cap

export async function fetchMedia(
  url: string,
  opts: { maxBytes: number; timeoutMs?: number; what?: string },
): Promise<{ bytes: ArrayBuffer; type: string | null }> {
  const what = opts.what ?? "media";
  const res = await fetch(url, { signal: AbortSignal.timeout(opts.timeoutMs ?? 150_000) });
  if (!res.ok) throw new Error(`Couldn't fetch ${what} (${res.status})`);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > opts.maxBytes) throw new Error(`The ${what} is too large to publish (${Math.round(declared / 1048576)} MB).`);
  if (!res.body) return { bytes: await res.arrayBuffer(), type: res.headers.get("content-type") };

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > opts.maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`The ${what} is too large to publish (over ${Math.round(opts.maxBytes / 1048576)} MB).`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return { bytes: out.buffer, type: res.headers.get("content-type") };
}
