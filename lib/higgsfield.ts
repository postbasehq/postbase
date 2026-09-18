/**
 * Higgsfield AI — image generation (Soul text-to-image) client.
 *
 * Async job model: POST a generation, then poll the returned status_url until
 * it completes and yields a result URL. Auth is a single header built from
 * HIGGSFIELD_API_KEY_ID + HIGGSFIELD_API_KEY_SECRET. The feature stays off until
 * those are set.
 *
 * Docs: https://higgsfield.ai/higgsfield-api
 */

const API = "https://api.higgsfield.ai";

export const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16 · vertical" },
  { value: "4:5", label: "4:5 · portrait" },
  { value: "1:1", label: "1:1 · square" },
  { value: "16:9", label: "16:9 · landscape" },
] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number]["value"];
export const isAspectRatio = (v: unknown): v is AspectRatio =>
  ASPECT_RATIOS.some((a) => a.value === v);

export function higgsfieldConfigured(): boolean {
  return Boolean(process.env.HIGGSFIELD_API_KEY_ID && process.env.HIGGSFIELD_API_KEY_SECRET);
}

function authHeader(): string {
  return `Key ${process.env.HIGGSFIELD_API_KEY_ID}:${process.env.HIGGSFIELD_API_KEY_SECRET}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The completed-status payload shape isn't fully documented; pull a URL from the
// most common places. (Confirm/trim once tested against a live key.)
function extractUrl(j: Record<string, unknown>): string | undefined {
  const anyJ = j as Record<string, any>;
  return (
    anyJ.result?.url ||
    anyJ.result?.raw?.url ||
    anyJ.result?.images?.[0]?.url ||
    anyJ.images?.[0]?.url ||
    (Array.isArray(anyJ.output) ? (typeof anyJ.output[0] === "string" ? anyJ.output[0] : anyJ.output[0]?.url) : undefined) ||
    anyJ.url
  );
}

/**
 * Generate one Soul image and return its (temporary) result URL. Callers should
 * persist the bytes to durable storage — Higgsfield outputs expire after ~7 days.
 */
export async function generateSoulImage(prompt: string, aspectRatio: AspectRatio): Promise<string> {
  const res = await fetch(`${API}/higgsfield-ai/soul/v2/standard`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    // NOTE: `aspect_ratio` is the assumed field name — confirm against the Soul
    // model docs when a real key is available (may be width/height instead).
    body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(json?.detail || json?.error || `Higgsfield error ${res.status}`);

  const statusUrl: string | undefined = json.status_url;
  if (!statusUrl) {
    // Some models return the result inline; otherwise we can't poll.
    const inline = extractUrl(json);
    if (inline) return inline;
    throw new Error("Higgsfield returned no status_url to poll.");
  }

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const s = await fetch(statusUrl, { headers: { Authorization: authHeader() } });
    const sj = (await s.json().catch(() => ({}))) as Record<string, any>;
    const status = String(sj.status ?? "").toLowerCase();
    if (status === "completed" || status === "succeeded" || status === "success") {
      const url = extractUrl(sj);
      if (url) return url;
      throw new Error("Generation finished but no image URL was found.");
    }
    if (status === "failed" || status === "canceled" || status === "cancelled" || status === "error") {
      throw new Error(sj.error || `Generation ${status}.`);
    }
  }
  throw new Error("Image generation timed out.");
}
