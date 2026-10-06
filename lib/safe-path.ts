/**
 * A same-site path that's safe to redirect to: starts with one "/", and has
 * no backslashes or control characters. Browsers treat "/\evil.com" (and
 * "/\t/evil.com", tabs and newlines being stripped) like "//evil.com", a link
 * to another site, so a plain startsWith("/") check isn't enough.
 */
export function isSafePath(path: string | null | undefined): path is string {
  return typeof path === "string" && /^\/(?![/\\])/.test(path) && !/[\\\u0000-\u001f\u007f]/.test(path);
}
