"use client";

import { useRef, useState } from "react";
import { PostPreview } from "@/components/PostPreview";
import { count } from "@/lib/char-count";
import { applyStyle, hasStyle, toList, toPlain, type TextStyle } from "@/lib/text-styles";

const SAMPLE =
  "We shipped offline mode today.\n\nThree things we learned building it:\nSync conflicts are a product problem, not a database one\nUsers trust a spinner less than a clear \"saved on this device\"\nTest on a train, not on office wifi\n\nThe full write-up is in the first comment.";

const STYLES: { id: TextStyle; label: string; sample: string }[] = [
  { id: "bold", label: "Bold", sample: applyStyle("B", "bold") },
  { id: "italic", label: "Italic", sample: applyStyle("I", "italic") },
  { id: "boldItalic", label: "Bold italic", sample: applyStyle("BI", "boldItalic") },
  { id: "mono", label: "Monospace", sample: applyStyle("M", "mono") },
  { id: "underline", label: "Underline", sample: applyStyle("U", "underline") },
  { id: "strike", label: "Strikethrough", sample: applyStyle("S", "strike") },
];

const btn =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-[14px] font-semibold text-ink ring-1 ring-line transition-colors hover:ring-ink disabled:opacity-40";

/** Select text, click a style: Unicode bold, italic and lists that paste into LinkedIn, with a live preview. */
export function LinkedInFormatter() {
  const [text, setText] = useState(SAMPLE);
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  /** Replace [start, end) with `next`, keeping it selected so styles can be switched. */
  function replace(start: number, end: number, next: string) {
    setText((t) => t.slice(0, start) + next + t.slice(end));
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, start + next.length);
    });
  }

  function style(s: TextStyle) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    if (a === b) {
      setHint("Select some text first, then pick a style.");
      return;
    }
    setHint(null);
    const sel = text.slice(a, b);
    replace(a, b, hasStyle(sel, s) ? toPlain(sel) : applyStyle(sel, s));
  }

  function list(kind: "bullet" | "number") {
    const el = ref.current;
    if (!el) return;
    // Whole lines: from the start of the first selected line to the end of the last.
    const a = text.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const endNl = text.indexOf("\n", el.selectionEnd);
    const b = endNl === -1 ? text.length : endNl;
    setHint(null);
    replace(a, b, toList(text.slice(a, b), kind));
  }

  function plain() {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    if (a === b) replace(0, text.length, toPlain(text));
    else replace(a, b, toPlain(text.slice(a, b)));
  }

  const n = count(text, "codepoints");
  const over = n > 3000;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="rounded-[24px] border border-line bg-surface p-5 md:p-6">
        <label htmlFor="lf-text" className="font-display text-[15px] font-semibold text-ink">
          Your LinkedIn post
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Formatting">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.label}
              aria-label={s.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => style(s.id)}
              className={btn}
            >
              {s.sample}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-line" aria-hidden />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => list("bullet")} className={btn}>
            • List
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => list("number")} className={btn}>
            1. List
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={plain} className={btn}>
            Plain text
          </button>
        </div>
        <textarea
          id="lf-text"
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={13}
          className="mt-3 w-full resize-y rounded-xl border border-line bg-ground p-4 text-[16px] leading-relaxed text-ink outline-none focus:border-blue"
          placeholder="Type or paste your post, then select words to style them…"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
          <span className={`tabular-nums ${over ? "font-semibold text-[#d14a3e]" : "text-muted"}`}>
            {n.toLocaleString()} / 3,000 characters
          </span>
          {hint ? <span className="font-medium text-ink">{hint}</span> : null}
          <button type="button" onClick={() => setText("")} className="ml-auto font-semibold text-blue-ink">
            Clear
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              } catch {
                /* clipboard blocked; the text is selectable */
              }
            }}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              copied ? "bg-[#188038] text-white" : "bg-blue text-on-blue"
            }`}
          >
            {copied ? "Copied" : "Copy post"}
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-line bg-surface p-5 md:p-6">
        <p className="font-display text-[15px] font-semibold text-ink">Preview</p>
        <p className="mt-1 text-[13px] text-muted">Roughly what shows in the feed before &ldquo;…more&rdquo;. Put the hook in the first lines.</p>
        <div className="mt-4">
          <PostPreview platform="linkedin" handle="you" displayName="Your name" thread={[text]} media={[]} metrics={null} publishedAt={null} />
        </div>
      </div>
    </div>
  );
}
