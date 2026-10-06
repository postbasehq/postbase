"use client";

import { useEffect, useRef, useState } from "react";
import { BrandTile } from "@/components/BrandTile";
import { ClientLogo } from "@/components/ClientLogo";

/*
 * The developers hero backdrop: where posts come from (your app and the AI
 * clients, left edge) running through Postbase (above the headline) out to
 * the networks (right edge). Lines run edge to edge, left to right, and are
 * routed in lanes around the headline block (measured from the elements marked
 * data-hero-avoid), so they never cross the copy or each other. Light streaks
 * run along them: in to Postbase, then out to the networks.
 *
 * Wide screens only; phones keep a plain hero.
 */

const SOURCES: { id: string; label: string }[] = [
  { id: "app", label: "Your app" },
  { id: "claude", label: "Claude" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "gemini", label: "Gemini" },
  { id: "cursor", label: "Cursor" },
];
const NETWORKS = ["x", "linkedin", "instagram", "tiktok", "youtube", "bluesky", "mastodon"];

const NODE = 44; // node tile size
const HUB = 56; // Postbase tile size
const PAD = 26; // clearance around the headline block
const CYCLE = 4.8; // seconds per light loop

type Pt = { x: number; y: number };
type Layout = {
  w: number;
  h: number;
  hub: Pt;
  sources: (Pt & { d: string })[];
  networks: (Pt & { d: string })[];
};

function rect(el: Element, origin: DOMRect) {
  const r = el.getBoundingClientRect();
  return { left: r.left - origin.left, right: r.right - origin.left, top: r.top - origin.top, bottom: r.bottom - origin.top };
}

/** Evenly spaced values from a to b (inclusive), n of them. */
const spread = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => (n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1)));

function compute(section: HTMLElement): Layout | null {
  const origin = section.getBoundingClientRect();
  const w = origin.width;
  const avoid = [...section.querySelectorAll("[data-hero-avoid]")].map((el) => rect(el, origin));
  const toggle = section.querySelector("#hero-toggle");
  if (w < 1024 || avoid.length === 0 || !toggle) return null;
  const box = {
    left: Math.min(...avoid.map((r) => r.left)) - PAD,
    right: Math.max(...avoid.map((r) => r.right)) + PAD,
    top: Math.min(...avoid.map((r) => r.top)) - PAD / 2,
  };
  // Nodes use the full height down to the audience switch (it's centred, so the
  // edges are free beside it).
  const bottom = rect(toggle, origin).top;
  const h = bottom + NODE / 2 + 30; // room for the lowest label, above the demo card

  // Postbase sits in the band above the headline.
  const hub = { x: w / 2, y: Math.max(HUB / 2 + 6, box.top / 2 + 4) };
  const merge = 110; // where the lanes curve into the hub
  const bandGap = (n: number) => Math.max(4, Math.min(9, (box.top - 10) / (n + 1)));

  const nodeTop = box.top + 24;
  const nodeBottom = bottom - 12;
  const corner = (dy: number) => Math.max(4, Math.min(26, Math.abs(dy) / 2));

  // Left: lines enter at x=0, pass the node, rise in their own lane outside the
  // headline, run along the top band and curve into the hub. Higher nodes take
  // the outer lane and the higher band, so no two lines cross.
  const sx = Math.max(56, box.left * 0.3);
  const sGapX = Math.max(8, Math.min(18, (box.left - (sx + NODE / 2 + 28)) / SOURCES.length));
  const sGapY = bandGap(SOURCES.length);
  const sourceYs = spread(nodeTop, nodeBottom, SOURCES.length);
  const sources = sourceYs.map((sy, i) => {
    const lane = box.left - (SOURCES.length - 1 - i) * sGapX;
    const ty = hub.y + (i - (SOURCES.length - 1) / 2) * sGapY;
    const r = corner(sy - ty);
    const d = [
      `M 0 ${sy}`,
      `H ${lane - r}`,
      `Q ${lane} ${sy} ${lane} ${sy - r}`,
      `V ${ty + r}`,
      `Q ${lane} ${ty} ${lane + r} ${ty}`,
      `H ${hub.x - merge}`,
      `C ${hub.x - merge / 2} ${ty} ${hub.x - merge / 2} ${hub.y} ${hub.x - HUB / 2} ${hub.y}`,
    ].join(" ");
    return { x: sx, y: sy, d };
  });

  // Right: the mirror, from the hub out to x=w.
  const nx = w - sx;
  const nGapX = Math.max(8, Math.min(18, (w - box.right - (w - nx + NODE / 2 + 28)) / NETWORKS.length));
  const nGapY = bandGap(NETWORKS.length);
  const networkYs = spread(nodeTop - 20, nodeBottom, NETWORKS.length);
  const networks = networkYs.map((ny, j) => {
    const lane = box.right + (NETWORKS.length - 1 - j) * nGapX;
    const ty = hub.y + (j - (NETWORKS.length - 1) / 2) * nGapY;
    const r = corner(ny - ty);
    const d = [
      `M ${hub.x + HUB / 2} ${hub.y}`,
      `C ${hub.x + merge / 2} ${hub.y} ${hub.x + merge / 2} ${ty} ${hub.x + merge} ${ty}`,
      `H ${lane - r}`,
      `Q ${lane} ${ty} ${lane} ${ty + r}`,
      `V ${ny - r}`,
      `Q ${lane} ${ny} ${lane + r} ${ny}`,
      `H ${w}`,
    ].join(" ");
    return { x: nx, y: ny, d };
  });

  return { w, h, hub, sources, networks };
}

export function DevFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    const section = ref.current?.closest("section");
    if (!section) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setLayout(compute(section)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    section.querySelectorAll("[data-hero-avoid]").forEach((el) => ro.observe(el));
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden overflow-hidden lg:block" style={{ height: layout?.h ?? 0 }}>
      {layout ? (
        <>
          <svg width={layout.w} height={layout.h} className="absolute inset-0" fill="none">
            {layout.sources.map((s, i) => (
              <g key={`s${i}`}>
                <path d={s.d} stroke="var(--line)" strokeWidth={1.5} />
                <path
                  d={s.d}
                  pathLength={100}
                  stroke="#2b59d9"
                  color="#2b59d9"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  className="flow-light"
                  style={{ animationDelay: `${(i * 0.93) % CYCLE}s` }}
                />
              </g>
            ))}
            {layout.networks.map((n, j) => (
              <g key={`n${j}`}>
                <path d={n.d} stroke="var(--line)" strokeWidth={1.5} />
                <path
                  d={n.d}
                  pathLength={100}
                  stroke="#e3a72c"
                  color="#e3a72c"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  className="flow-light"
                  style={{ animationDelay: `${(1.4 + j * 0.67) % CYCLE}s` }}
                />
              </g>
            ))}
          </svg>

          {layout.sources.map((s, i) => {
            const src = SOURCES[i];
            return (
              <div key={src.id} className="absolute flex flex-col items-center" style={{ left: s.x - NODE / 2, top: s.y - NODE / 2, width: NODE }}>
                <span className="grid place-items-center rounded-xl border border-line bg-surface shadow-sm" style={{ width: NODE, height: NODE }}>
                  {src.id === "app" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
                      <path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />
                    </svg>
                  ) : (
                    <ClientLogo id={src.id} size={22} bare />
                  )}
                </span>
                <span className="mt-1.5 whitespace-nowrap text-[12px] font-medium text-muted">{src.label}</span>
              </div>
            );
          })}

          <div className="absolute" style={{ left: layout.hub.x - HUB / 2, top: layout.hub.y - HUB / 2 }}>
            <span className="grid place-items-center rounded-2xl border-2 border-[#2b59d9] bg-surface shadow-md" style={{ width: HUB, height: HUB }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/postbase-icon.png" alt="" className="size-8 rounded-lg" />
            </span>
          </div>

          {layout.networks.map((n, j) => (
            <div key={NETWORKS[j]} className="absolute" style={{ left: n.x - NODE / 2, top: n.y - NODE / 2 }}>
              <span className="grid place-items-center rounded-xl border border-line bg-surface shadow-sm" style={{ width: NODE, height: NODE }}>
                <BrandTile platform={NETWORKS[j]} size={26} radius={7} />
              </span>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
