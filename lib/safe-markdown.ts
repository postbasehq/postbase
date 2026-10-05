import { Marked } from "marked";

/**
 * Markdown → HTML for untrusted text (AI agent replies, which can echo post
 * bodies, error strings or prompt-injected content). marked does not sanitise,
 * so: raw HTML is shown as text, and links/images only keep http(s), mailto or
 * relative URLs — javascript:, data: and friends render as plain text.
 */

const SAFE_SCHEMES = new Set(["http", "https", "mailto"]);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isSafeHref(href: string | null | undefined): boolean {
  if (!href) return false;
  // Browsers ignore control chars and whitespace inside a scheme ("java\tscript:").
  const compact = href.replace(/[\u0000- \u007f-\u009f]/g, "");
  const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
  return !scheme || SAFE_SCHEMES.has(scheme.toLowerCase());
}

const safeMarked = new Marked({
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    link({ href, tokens }) {
      // false → marked's default renderer (which escapes href/title).
      return isSafeHref(href) ? false : this.parser.parseInline(tokens);
    },
    image({ href, text }) {
      return isSafeHref(href) ? false : escapeHtml(text);
    },
  },
});

export function renderSafeMarkdown(markdown: string): string {
  return safeMarked.parse(markdown, { async: false }) as string;
}
