/*
 * Unicode "fonts" for networks without formatting (LinkedIn, X, Bluesky):
 * letters swapped for the Mathematical Alphanumeric Symbols, which every
 * platform shows as bold, italic or monospace. Used by the free LinkedIn text
 * formatter (/tools/linkedin-text-formatter). Runs in the browser only.
 */

export type TextStyle = "bold" | "italic" | "boldItalic" | "mono" | "strike" | "underline";

/** First code point of A–Z, a–z and 0–9 in each style (sans-serif, as LinkedIn users expect). */
const BLOCKS: Record<"bold" | "italic" | "boldItalic" | "mono", { upper: number; lower: number; digit?: number }> = {
  bold: { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  italic: { upper: 0x1d608, lower: 0x1d622 },
  boldItalic: { upper: 0x1d63c, lower: 0x1d656 },
  mono: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
};

const STRIKE = "̶";
const UNDERLINE = "̲";

/** Styled character -> plain character, for every style above. */
const PLAIN = new Map<string, string>();
for (const b of Object.values(BLOCKS)) {
  for (let i = 0; i < 26; i++) {
    PLAIN.set(String.fromCodePoint(b.upper + i), String.fromCharCode(65 + i));
    PLAIN.set(String.fromCodePoint(b.lower + i), String.fromCharCode(97 + i));
  }
  if (b.digit) for (let i = 0; i < 10; i++) PLAIN.set(String.fromCodePoint(b.digit + i), String.fromCharCode(48 + i));
}

/** Back to ordinary letters: undoes every style, including strikethrough and underline. */
export function toPlain(text: string): string {
  return Array.from(text.replaceAll(STRIKE, "").replaceAll(UNDERLINE, ""))
    .map((c) => PLAIN.get(c) ?? c)
    .join("");
}

/** Apply one style. Letters already styled are reset first, so styles replace rather than stack. */
export function applyStyle(text: string, style: TextStyle): string {
  const plain = toPlain(text);
  if (style === "strike" || style === "underline") {
    const mark = style === "strike" ? STRIKE : UNDERLINE;
    // Combining marks on visible characters only; spaces and line breaks stay clean.
    return Array.from(plain)
      .map((c) => (/\s/.test(c) ? c : c + mark))
      .join("");
  }
  const b = BLOCKS[style];
  return Array.from(plain)
    .map((c) => {
      const code = c.charCodeAt(0);
      if (c.length === 1 && code >= 65 && code <= 90) return String.fromCodePoint(b.upper + code - 65);
      if (c.length === 1 && code >= 97 && code <= 122) return String.fromCodePoint(b.lower + code - 97);
      if (b.digit && c.length === 1 && code >= 48 && code <= 57) return String.fromCodePoint(b.digit + code - 48);
      return c;
    })
    .join("");
}

/** Whether every letter in `text` already has `style` (the toolbar then removes it). */
export function hasStyle(text: string, style: TextStyle): boolean {
  if (!/\S/.test(text)) return false;
  return applyStyle(text, style) === text && toPlain(text) !== text;
}

const BULLET = /^(\s*)(?:[•▪◦‣-]|\d+[.)])\s+/;

/** Turn lines into a bulleted or numbered list, or back into plain lines if they already are one. */
export function toList(text: string, kind: "bullet" | "number"): string {
  const lines = text.split("\n");
  const filled = lines.filter((l) => l.trim());
  const already = filled.length > 0 && filled.every((l) => (kind === "bullet" ? /^\s*•\s/.test(l) : /^\s*\d+\.\s/.test(l)));
  let n = 0;
  return lines
    .map((l) => {
      if (!l.trim()) return l;
      const bare = l.replace(BULLET, "$1");
      if (already) return bare;
      n++;
      return kind === "bullet" ? `• ${bare.trimStart()}` : `${n}. ${bare.trimStart()}`;
    })
    .join("\n");
}
