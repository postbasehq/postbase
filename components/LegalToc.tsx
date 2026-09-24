"use client";

import { useEffect, useState } from "react";

/** Sticky "On this page" list for the legal pages, highlighting the section in view. */
export function LegalToc({ headings }: { headings: { id: string; text: string }[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [headings]);

  return (
    <nav aria-label="On this page" className="sticky top-32">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">On this page</p>
      <ul className="flex flex-col gap-0.5">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`block rounded-lg px-3 py-1.5 text-[13px] leading-snug transition-colors ${
                active === h.id ? "bg-surface font-semibold text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
