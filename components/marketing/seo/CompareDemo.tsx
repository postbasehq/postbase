"use client";

import { useState } from "react";
import { useLoop } from "@/components/marketing/Mocks";

/*
 * The /alternatives hero: competitor logos floating around the headline, and a
 * comparison card that steps through "Postbase vs …" using each comparison
 * page's own table rows. Pick a logo to stop the cycle on that one.
 */

export type CompareItem = {
  slug: string;
  name: string;
  logo: string;
  rows: { label: string; us: string; them: string }[];
};

/** A competitor's logo on a white tile (dark marks stay visible in dark mode). */
function LogoTile({ src, size, className = "" }: { src: string; size: number; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[22%] bg-white ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: size * 0.62, height: size * 0.62 }} className="object-contain" />
    </span>
  );
}

// Positions either side of the headline, as on the homepage hero (xl and up, where they clear the text).
const SPOTS = [
  { x: "4%", y: 40, tilt: -10, size: 56 },
  { x: "13%", y: 190, tilt: 8, size: 64 },
  { x: "3%", y: 340, tilt: -6, size: 50 },
  { x: "91%", y: 40, tilt: 9, size: 56 },
  { x: "82%", y: 190, tilt: -8, size: 64 },
  { x: "93%", y: 340, tilt: 6, size: 50 },
];

/** Competitor logos floating behind the hero. */
export function CompareDecor({ logos }: { logos: string[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
      <div className="absolute inset-y-0 left-1/2 hidden w-full max-w-[1440px] -translate-x-1/2 xl:block">
        {SPOTS.map((s, i) => (
          <span
            key={i}
            className="float-y absolute rounded-[18px] bg-surface p-1.5 shadow-[0_18px_40px_-16px_rgba(16,24,40,0.35)] ring-1 ring-line"
            style={
              { left: s.x, top: s.y, "--tilt": `${s.tilt}deg`, "--dur": `${6.5 + (i % 4) * 0.6}s`, "--delay": `${-i * 0.7}s` } as React.CSSProperties
            }
          >
            <LogoTile src={logos[i % logos.length]} size={s.size} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** "Postbase vs …", cycling through the comparisons. */
export function CompareDemo({ items }: { items: CompareItem[] }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(false);
  const [ref] = useLoop<HTMLDivElement>(async (step) => {
    await step(3600);
    if (!picked) setI((n) => (n + 1) % items.length);
  });
  const c = items[i];
  return (
    <div ref={ref} className="flex flex-col gap-4">
      {/* The competitor picker */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {items.map((o, n) => (
          <button
            key={o.slug}
            type="button"
            onClick={() => {
              setI(n);
              setPicked(true);
            }}
            aria-label={`Postbase vs ${o.name}`}
            aria-pressed={n === i}
            className={`rounded-[12px] p-1 transition ${n === i ? "bg-[#2b59d9]" : "hover:bg-surface-2"}`}
          >
            <LogoTile src={o.logo} size={30} />
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
        {/* Column heads */}
        <div className="grid grid-cols-2 border-b border-line md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
          <div className="hidden p-5 md:block" />
          <div className="flex items-center gap-2.5 bg-[#2b59d9] p-4 md:p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/postbase-icon.png" alt="" className="size-8 rounded-[8px]" />
            <span className="font-display text-[17px] font-semibold text-white">Postbase</span>
          </div>
          <div key={c.slug} className="swap-in flex items-center gap-2.5 bg-surface-2 p-4 md:p-5">
            <LogoTile src={c.logo} size={32} />
            <span className="truncate font-display text-[17px] font-semibold text-ink">{c.name}</span>
          </div>
        </div>
        {c.rows.map((r) => (
          <div key={r.label} className="grid grid-cols-2 border-b border-line last:border-b-0 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
            {/* On phones the label is a heading row above the two values. */}
            <div className="col-span-2 px-4 pb-1 pt-3.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted md:col-span-1 md:p-5 md:text-[13px]">{r.label}</div>
            <div className="p-4 text-[14px] leading-snug text-ink md:p-5">{r.us}</div>
            <div key={c.slug} className="swap-in bg-surface-2 p-4 text-[14px] leading-snug text-ink md:p-5">
              {r.them}
            </div>
          </div>
        ))}
        <a href={`/alternatives/${c.slug}`} className="flex items-center justify-center gap-1.5 bg-surface-2 py-3.5 text-[14px] font-semibold text-blue-ink hover:underline">
          Read Postbase vs {c.name}
          <span aria-hidden>→</span>
        </a>
      </div>
    </div>
  );
}
