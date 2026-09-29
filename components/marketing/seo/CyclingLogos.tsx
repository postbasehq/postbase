"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through pre-rendered logos inside a hero title tile: the current one
 * slides up and out as the next slides in. Reduced motion shows the first.
 */
export function CyclingLogos({ items, interval = 1400 }: { items: React.ReactNode[]; interval?: number }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [items.length, interval]);

  return (
    <span className="relative block size-full overflow-hidden">
      {items.map((node, n) => {
        const offset = n === i ? 0 : n === (i - 1 + items.length) % items.length ? -1 : 1;
        return (
          <span
            key={n}
            className="absolute inset-0 flex items-center justify-center transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            style={{
              transform: `translateY(${offset * 100}%)`,
              opacity: offset === 0 ? 1 : 0,
              // Only the outgoing and incoming logos animate; the rest jump into place unseen.
              transitionDuration: offset === 1 && n !== (i + 1) % items.length ? "0ms" : undefined,
            }}
          >
            {node}
          </span>
        );
      })}
    </span>
  );
}
