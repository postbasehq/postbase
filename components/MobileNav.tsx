"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

/**
 * The app sidebar on phones. Below `md` the sidebar is hidden, so this puts a
 * menu button in the header that opens the same sidebar (search, workspace
 * switcher, nav, account menu) as a drawer from the left.
 *
 * The drawer's contents only mount while it's open, so the sidebar's global
 * shortcuts (⌘K search) aren't registered twice. It closes on navigation,
 * Escape, a tap outside, or tapping a link (also when it's the current page).
 */
export function MobileNav({ header, children, footer }: { header: React.ReactNode; children: React.ReactNode; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false); // drives the slide-in after mount
  const pathname = usePathname();
  const trigger = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // Navigating anywhere closes it.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const frame = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // Keep the page behind from scrolling while the drawer is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const opener = trigger.current;
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-surface-2 md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu" id="mobile-nav">
              <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`}
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div
                className={`absolute inset-y-0 left-0 flex w-[86vw] max-w-[300px] flex-col bg-ground shadow-2xl transition-transform duration-200 ease-out ${shown ? "translate-x-0" : "-translate-x-full"}`}
                // Tapping a link closes the drawer even when it's the page you're on.
                onClickCapture={(e) => {
                  if ((e.target as HTMLElement).closest("a[href]")) setOpen(false);
                }}
              >
                <div className="flex h-16 shrink-0 items-center justify-between pl-5 pr-3">
                  {header}
                  <button
                    ref={closeBtn}
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
                <div className="shrink-0">{footer}</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
