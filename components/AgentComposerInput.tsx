"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { BRANDS } from "@/components/BrandTile";

/**
 * A contentEditable chat composer that renders inline mention chips — a `/` post
 * or `@` channel becomes a glass pill (red for `/`, blue for `@`) with the
 * platform icon, while text still flows around it. Serializes back to plain
 * text (chips → their stored value) for sending. Uncontrolled: the DOM is the
 * source of truth; it calls back on change / submit / trigger.
 */
export type AgentComposerHandle = {
  insertMention: (m: { kind: "@" | "/"; label: string; value: string; platforms?: string[] }) => void;
  setText: (text: string) => void;
  clear: () => void;
  focus: () => void;
};

function brandIcon(platform: string): HTMLElement {
  const b = BRANDS[platform];
  const ic = document.createElement("span");
  ic.className = "mention-ic";
  ic.style.width = "14px";
  ic.style.height = "14px";
  ic.style.background = b.bg;
  ic.style.borderRadius = "4px";
  ic.innerHTML = `<svg width="9" height="9" viewBox="${b.viewBox ?? "0 0 24 24"}" fill="#fff"><path d="${b.path}"/></svg>`;
  return ic;
}

const DOC_ICON =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>';

function serialize(root: Node): string {
  let out = "";
  root.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += n.textContent ?? "";
    else if (n.nodeName === "BR") out += "\n";
    else if (n instanceof HTMLElement) {
      if (n.dataset.value !== undefined) out += n.dataset.value;
      else if (n.nodeName === "DIV") out += `${out && !out.endsWith("\n") ? "\n" : ""}${serialize(n)}`;
      else out += serialize(n);
    }
  });
  return out.replace(/ /g, " ");
}

export const AgentComposerInput = forwardRef<
  AgentComposerHandle,
  {
    placeholder: string;
    disabled?: boolean;
    className?: string;
    onChange: (text: string) => void;
    onSubmit: (text: string) => void;
    onTrigger: (kind: "@" | "/" | null, query: string) => void;
    onEscape: () => void;
  }
>(function AgentComposerInput({ placeholder, disabled, className, onChange, onSubmit, onTrigger, onEscape }, ref) {
  const elRef = useRef<HTMLDivElement>(null);

  const getText = () => (elRef.current ? serialize(elRef.current) : "");
  const emit = () => onChange(getText());

  const caretToEnd = () => {
    const el = elRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const makeChip = (m: { kind: "@" | "/"; label: string; value: string; platforms?: string[] }) => {
    const chip = document.createElement("span");
    chip.contentEditable = "false";
    chip.className = `mention-chip ${m.kind === "@" ? "mention-at" : "mention-slash"}`;
    chip.dataset.value = m.value;

    const platforms = (m.platforms ?? []).filter((p) => BRANDS[p]).slice(0, 3);
    if (platforms.length > 0) {
      const stack = document.createElement("span");
      stack.className = "mention-ics";
      platforms.forEach((p) => stack.appendChild(brandIcon(p)));
      chip.appendChild(stack);
    } else {
      const ic = document.createElement("span");
      ic.className = "mention-ic";
      ic.innerHTML = DOC_ICON;
      chip.appendChild(ic);
    }
    chip.appendChild(document.createTextNode(m.label));
    return chip;
  };

  const detectTrigger = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return null;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || !elRef.current?.contains(node)) return null;
    const before = (node.textContent ?? "").slice(0, range.startOffset);
    const m = before.match(/(?:^|\s)([@/])([^\s@/]*)$/);
    return m ? { kind: m[1] as "@" | "/", query: m[2] } : null;
  };

  useImperativeHandle(ref, () => ({
    insertMention(m) {
      const el = elRef.current;
      const sel = window.getSelection();
      if (!el) return;
      if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) caretToEnd();
      const range = window.getSelection()!.getRangeAt(0);
      const node = range.startContainer;
      const chip = makeChip(m);
      const space = document.createTextNode(" ");

      if (node.nodeType === Node.TEXT_NODE && el.contains(node)) {
        const offset = range.startOffset;
        const before = (node.textContent ?? "").slice(0, offset);
        const tok = before.match(/(?:^|\s)([@/])([^\s@/]*)$/);
        const tokenLen = tok ? tok[1].length + tok[2].length : 0;
        const start = Math.max(0, offset - tokenLen);
        const del = document.createRange();
        del.setStart(node, start);
        del.setEnd(node, offset);
        del.deleteContents();
        const ins = document.createRange();
        ins.setStart(node, start);
        ins.collapse(true);
        ins.insertNode(chip);
      } else {
        el.appendChild(chip);
      }
      chip.after(space);
      const caret = document.createRange();
      caret.setStartAfter(space);
      caret.collapse(true);
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(caret);
      emit();
    },
    setText(text) {
      const el = elRef.current;
      if (!el) return;
      el.textContent = text;
      caretToEnd();
      emit();
    },
    clear() {
      if (elRef.current) elRef.current.innerHTML = "";
      emit();
    },
    focus() {
      caretToEnd();
    },
  }));

  return (
    <div
      ref={elRef}
      role="textbox"
      aria-multiline="true"
      contentEditable={!disabled}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={`agent-editor ${className ?? ""}`}
      onInput={(e) => {
        const el = e.currentTarget;
        // Keep :empty working so the placeholder shows after deleting everything.
        if (el.childNodes.length === 1 && el.firstChild?.nodeName === "BR") el.innerHTML = "";
        emit();
        const t = detectTrigger();
        onTrigger(t ? t.kind : null, t ? t.query : "");
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onEscape();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (e.shiftKey) {
            document.execCommand("insertLineBreak");
            emit();
          } else {
            onSubmit(getText());
          }
        }
      }}
    />
  );
});
