"use client";

import { useState } from "react";

type Point = { label: string; impressions: number; engagement: number };

const W = 1100;
const H = 300;
const PAD = { top: 16, right: 12, bottom: 32, left: 48 };

const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** "Nice" axis maximum and ticks: 1, 2 or 5 times a power of ten. */
function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = [1, 2, 2.5, 5, 10].find((x) => x * p >= v) ?? 10;
  return m * p;
}

/**
 * Views as bars, engagement as a line over them, each on its own scale so both
 * read clearly. Hovering a bar shows that day's (or week's) numbers.
 */
export function EngagementChart({ points, unit }: { points: Point[]; unit: "day" | "week" }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, n);
  const barW = Math.max(4, Math.min(36, slot * 0.6));
  const hasViews = points.some((p) => p.impressions > 0);
  const maxV = niceMax(Math.max(0, ...points.map((p) => p.impressions)));
  const maxE = niceMax(Math.max(0, ...points.map((p) => p.engagement)));
  const x = (i: number) => PAD.left + slot * i + slot / 2;
  const yV = (v: number) => PAD.top + innerH - (v / maxV) * innerH;
  const yE = (v: number) => PAD.top + innerH - (v / maxE) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yE(p.engagement).toFixed(1)}`).join(" ");
  // Label roughly every sixth point so dates never collide.
  const every = Math.max(1, Math.ceil(n / 7));
  // The latest bar stays highlighted; the tooltip only shows on hover (or tap).
  const h = hover ?? n - 1;
  const cur = hover == null ? null : points[hover];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" onMouseLeave={() => setHover(null)} role="img" aria-label={`Views and engagement per ${unit}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)} stroke="var(--line)" strokeWidth={t === 0 ? 1 : 0.6} strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={PAD.left - 8} y={PAD.top + innerH * (1 - t) + 4} textAnchor="end" fontSize="14" fill="var(--muted)">
              {compact((hasViews ? maxV : maxE) * t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onClick={() => setHover((v) => (v === i ? null : i))}>
            {/* full-height hit area */}
            <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill="transparent" />
            {hasViews ? (
              <rect
                x={x(i) - barW / 2}
                y={yV(p.impressions)}
                width={barW}
                height={Math.max(0, PAD.top + innerH - yV(p.impressions))}
                rx={Math.min(6, barW / 2)}
                fill={i === h ? "#2b59d9" : "var(--line)"}
              />
            ) : null}
            {i % every === (n - 1) % every ? (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="14" fill="var(--muted)">
                {p.label}
              </text>
            ) : null}
          </g>
        ))}
        <path d={line} fill="none" stroke="#e3a72c" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={yE(p.engagement)} r={i === h ? 5 : n > 20 ? 0 : 3} fill={i === h ? "#e3a72c" : "var(--surface)"} stroke="#e3a72c" strokeWidth={2} pointerEvents="none" />
        ))}
      </svg>

      {cur ? (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl border border-line bg-surface px-3 py-2 text-[12px] shadow-md"
          style={{ left: `${Math.min(88, Math.max(12, (x(hover!) / W) * 100))}%` }}
        >
          <div className="font-semibold text-ink">{unit === "week" ? `Week of ${cur.label}` : cur.label}</div>
          {hasViews ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-muted">
              <span className="size-2 rounded-full bg-[#2b59d9]" /> {cur.impressions.toLocaleString("en-US")} views
            </div>
          ) : null}
          <div className="flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-full bg-[#e3a72c]" /> {cur.engagement.toLocaleString("en-US")} engagements
          </div>
        </div>
      ) : null}
    </div>
  );
}
