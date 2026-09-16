"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Lightweight modal shell: backdrop, Escape-to-close, focus on open, and a
 * body-scroll lock. Mirrors the inline dialog in DisconnectButton so connect
 * and disconnect flows feel identical.
 */
const SIZES = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" } as const;

export function Modal({
  open,
  onClose,
  labelledBy,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  size?: keyof typeof SIZES;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

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
        className={`relative z-10 max-h-[88vh] w-full ${SIZES[size]} overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-lg outline-none`}
      >
        {children}
      </div>
    </div>
  );
}
