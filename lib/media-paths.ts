/**
 * The post-media storage path of a URL if it's one of this workspace's own
 * files (uploads|agent|ai/<orgId>/<file>), else null.
 *
 * Used before anything is deleted with the service role: a post's media URL is
 * caller-supplied, so a URL naming another workspace's folder (or reaching it
 * with "../" or percent-encoding) must never become a deletable path. Parsed
 * with URL, which resolves dot segments, then decoded and matched exactly.
 */
export function ownStoragePath(url: string, orgId: string): string | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(url).pathname);
  } catch {
    return null;
  }
  const at = pathname.indexOf("/post-media/");
  if (at === -1) return null;
  const path = pathname.slice(at + "/post-media/".length);
  const m = path.match(/^(uploads|agent|ai)\/([0-9a-f-]{36})\/([^/\\]+)$/);
  if (!m || m[2] !== orgId || m[3] === "." || m[3] === "..") return null;
  return path;
}
