import { ownStoragePath } from "@/lib/media-paths";

/**
 * Whether a media URL is one of this workspace's own stored files, the only
 * kind a post may carry: the post-media bucket under uploads|agent|ai/<orgId>/,
 * or the R2 media library under <orgId>/. Checked when a post is saved and
 * again before the publisher downloads anything, so a member can't make the
 * server fetch arbitrary or internal URLs (or another workspace's files).
 */
export function isOwnMediaUrl(url: string, orgId: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;

  const supabase = hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (supabase && u.host === supabase) {
    return u.pathname.startsWith("/storage/v1/object/public/post-media/") && ownStoragePath(url, orgId) !== null;
  }

  const r2 = hostOf(process.env.R2_PUBLIC_URL);
  if (r2 && u.host === r2) {
    let key: string;
    try {
      key = decodeURIComponent(u.pathname);
    } catch {
      return false;
    }
    const m = key.match(/^\/([0-9a-f-]{36})\/([^/\\]+)$/);
    return Boolean(m && m[1] === orgId && m[2] !== "." && m[2] !== "..");
  }
  return false;
}

function hostOf(base: string | undefined): string | null {
  if (!base) return null;
  try {
    return new URL(base).host;
  } catch {
    return null;
  }
}

/* The media proxy (app/api/media/proxy) streams only files in our own storage. */
function allowedPrefixes(): string[] {
  const prefixes = [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/`];
  const r2 = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (r2) prefixes.push(`${r2}/`);
  return prefixes;
}

/**
 * The storage URL to fetch, or null. Checked after URL parsing and decoding, so
 * "post-media/../other-bucket/…" or "%2e%2e" can't step outside our storage.
 */
export function ownStorageUrl(src: string | null): string | null {
  if (!src) return null;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  let path: string;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (path.split("/").some((seg) => seg === ".." || seg === ".") || path.includes("\\")) return null;
  return allowedPrefixes().some((p) => url.href.startsWith(p)) ? url.href : null;
}
