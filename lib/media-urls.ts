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
