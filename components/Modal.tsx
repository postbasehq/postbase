"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Lightweight modal shell: backdrop, Escape-to-close, focus on open (kept inside
 * while open, given back on close), and a body-scroll lock. Mirrors the inline dialog in DisconnectButton so connect
 * and disconnect flows feel identical.
 */
const SIZES = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" } as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  labelledBy,
  size = "md",
  panelClassName,
  panelStyle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  size?: keyof typeof SIZES;
  /** Override the panel's surface classes (border/bg/padding/shadow). */
  panelClassName?: string;
  panelStyle?: CSSProperties;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Keep onClose in a ref so the open effect doesn't re-run on every parent
  // render (an inline onClose would otherwise re-focus the panel each keystroke,
  // blurring inputs inside the modal).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCloseRef.current();
      // Tab cycles within the dialog instead of reaching the page behind it.
      const panel = panelRef.current;
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panel.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Back to whatever opened it, if it's still on the page.
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        style={panelStyle}
        className={`relative z-10 max-h-[88vh] w-full ${SIZES[size]} overflow-y-auto rounded-2xl outline-none ${
          panelClassName ?? "border border-line bg-surface p-5 shadow-lg"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
