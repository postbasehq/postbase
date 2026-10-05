import twttr from "twitter-text";

/*
 * Which X posts carry a link — the ones X bills at $0.20 instead of $0.015.
 * Uses twitter-text, X's own linkifier, so bare domains ("postbase.so",
 * "bit.ly/x") count just as X counts them, and "Node.js" or an email doesn't.
 * Anything with an explicit http(s):// always counts. Client-safe (no server
 * imports) so the composer can show the same count.
 */

const EXPLICIT = /https?:\/\/\S/i;

export function hasXLink(text: string): boolean {
  if (EXPLICIT.test(text)) return true;
  return twttr.extractUrls(text).length > 0;
}

/** How many of these posts (a single post, or each post of a thread) carry a link. */
export function countXLinkPosts(texts: string[]): number {
  return texts.map((t) => t.trim()).filter(Boolean).filter(hasXLink).length;
}
