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

// For alt/title text, which marked has already escaped: escape what's left
// without double-encoding existing entities. Entities can't change meaning here.
function escapeAttrText(s: string): string {
  return s
    .replace(/&(?!#?[a-z0-9]+;)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isSafeHref(href: string | null | undefined): boolean {
  if (!href) return false;
  // Browsers ignore control chars and whitespace inside a scheme ("java\tscript:").
  const compact = href.replace(/[\u0000-\u0020\u007f-\u009f]/g, "");
  const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
  return !scheme || SAFE_SCHEMES.has(scheme.toLowerCase());
}

// Links and images are rendered here rather than by marked's defaults: those
// leave HTML entities in href untouched, so "&#106;avascript:" passes a scheme
// check and is then decoded by the browser into "javascript:". Escaping "&"
// too means the URL the browser sees is exactly the string we checked.
const safeMarked = new Marked({
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      if (!isSafeHref(href)) return inner;
      const t = title ? ` title="${escapeAttrText(title)}"` : "";
      return `<a href="${escapeHtml(href)}"${t}>${inner}</a>`;
    },
    image({ href, title, text }) {
      if (!isSafeHref(href)) return escapeAttrText(text);
      const t = title ? ` title="${escapeAttrText(title)}"` : "";
      return `<img src="${escapeHtml(href)}" alt="${escapeAttrText(text)}"${t}>`;
    },
  },
});

export function renderSafeMarkdown(markdown: string): string {
  return safeMarked.parse(markdown, { async: false }) as string;
}
