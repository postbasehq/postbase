/*
 * Bluesky link text, the way the official app writes it (bluesky-social/social-app,
 * `shortenLinks` + `toShortUrl` in src/lib/strings/). The post text shows a short
 * form of each URL ("example.com/blog/2026/how-..."), and a link facet keeps the
 * full URL clickable. The 300-grapheme limit is counted on the short text, so a
 * long link costs ~30 characters, not its full length.
 *
 * Pure (no server imports): used by the publisher, validation and the counter.
 */

export type BlueskyLinkFacet = {
  index: { byteStart: number; byteEnd: number };
  features: { $type: "app.bsky.richtext.facet#link"; uri: string }[];
};

/**
 * social-app's toShortUrl: drop the scheme, keep the host, and cut a path
 * (pathname + search + hash) longer than 15 characters to its first 13 plus "...".
 */
export function toShortUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return url;
    const path = (u.pathname === "/" ? "" : u.pathname) + u.search + u.hash;
    return path.length > 15 ? `${u.host}${path.slice(0, 13)}...` : `${u.host}${path}`;
  } catch {
    return url;
  }
}

const LINK_RE = /https?:\/\/[^\s]+/g;

/** The URL as typed, minus trailing punctuation (a ")" stays if it closes a "("). */
function trimUrl(raw: string): string {
  let url = raw;
  for (;;) {
    const before = url;
    url = url.replace(/[.,;:!?\]]+$/, "");
    if (url.endsWith(")") && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) url = url.slice(0, -1);
    if (url === before) return url;
  }
}

/**
 * The text Bluesky should receive, with each http(s) link shortened, and link
 * facets pointing at the full URLs. Facet offsets are UTF-8 byte offsets into
 * the returned text.
 */
export function shortenLinks(text: string): { text: string; facets: BlueskyLinkFacet[] } {
  const enc = new TextEncoder();
  const facets: BlueskyLinkFacet[] = [];
  let out = "";
  let bytes = 0; // UTF-8 length of `out`
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const uri = trimUrl(m[0]);
    if (!/^https?:\/\/[^/?#]/.test(uri)) continue; // nothing after the scheme
    const start = m.index ?? 0;
    const before = text.slice(last, start);
    const short = toShortUrl(uri);
    out += before;
    bytes += enc.encode(before).length;
    const byteStart = bytes;
    out += short;
    bytes += enc.encode(short).length;
    facets.push({
      index: { byteStart, byteEnd: bytes },
      features: [{ $type: "app.bsky.richtext.facet#link", uri }],
    });
    last = start + uri.length; // trimmed punctuation stays as text
  }
  return { text: out + text.slice(last), facets };
}
