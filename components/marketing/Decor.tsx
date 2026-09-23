import { BrandTile } from "@/components/BrandTile";

type Tile = { p: string; x: string; y: number; tilt: number; size: number; dur: number; delay: number };

// Network tiles scattered around the hero headline (wide screens only).
const HERO_TILES: Tile[] = [
  { p: "x", x: "7%", y: 70, tilt: -10, size: 46, dur: 7, delay: 0 },
  { p: "instagram", x: "15%", y: 270, tilt: 8, size: 52, dur: 8, delay: 1.2 },
  { p: "youtube", x: "5%", y: 470, tilt: -6, size: 42, dur: 6.5, delay: 0.6 },
  { p: "linkedin", x: "89%", y: 60, tilt: 9, size: 48, dur: 7.5, delay: 0.4 },
  { p: "tiktok", x: "82%", y: 280, tilt: -8, size: 52, dur: 6.8, delay: 1.6 },
  { p: "bluesky", x: "93%", y: 450, tilt: 6, size: 42, dur: 8.2, delay: 0.9 },
  { p: "mastodon", x: "76%", y: 520, tilt: 12, size: 36, dur: 7.2, delay: 2 },
];

function FloatingTile({ t }: { t: Tile }) {
  return (
    <span
      className="float-y absolute rounded-[16px] bg-surface p-1.5 shadow-[0_18px_40px_-16px_rgba(16,24,40,0.35)] ring-1 ring-line"
      style={
        {
          left: t.x,
          top: t.y,
          "--tilt": `${t.tilt}deg`,
          "--dur": `${t.dur}s`,
          "--delay": `${-t.delay}s`,
        } as React.CSSProperties
      }
    >
      <BrandTile platform={t.p} size={t.size} radius={12} />
    </span>
  );
}

/** Hand-drawn four-point sparkle. */
function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
      <path d="M24 3c1.5 10 6 16.5 20 21-14 4.5-18.5 11-20 21-1.5-10-6-16.5-20-21 14-4.5 18.5-11 20-21Z" />
    </svg>
  );
}

/** Hand-drawn loop squiggle. */
function Loop({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M4 44c18 2 34-6 40-18 5-10-2-20-11-16-10 4-6 22 8 26 18 5 38-6 50-18 6-6 12-10 25-9" />
    </svg>
  );
}

/** Background layer for the hero: dot grid, floating tiles and doodles. */
export function HeroDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] overflow-hidden">
      <div className="dot-grid absolute inset-0" />
      <div className="absolute inset-y-0 left-1/2 hidden w-full max-w-[1440px] -translate-x-1/2 lg:block">
        {HERO_TILES.map((t) => (
          <FloatingTile key={t.p} t={t} />
        ))}
        <Sparkle className="absolute left-[71%] top-[36px] size-9 text-blue" />
        <Sparkle className="absolute left-[24%] top-[420px] size-5 text-blue" />
        <Loop className="absolute left-[20%] top-[120px] w-28 -rotate-6 text-blue" />
      </div>
    </div>
  );
}

/** Lighter version for the closing call-to-action card. */
export function CtaDecor() {
  const tiles: Tile[] = [
    { p: "x", x: "6%", y: 40, tilt: -10, size: 38, dur: 7, delay: 0 },
    { p: "linkedin", x: "12%", y: 170, tilt: 8, size: 34, dur: 8, delay: 1 },
    { p: "bluesky", x: "86%", y: 50, tilt: 9, size: 38, dur: 7.5, delay: 0.5 },
    { p: "mastodon", x: "90%", y: 180, tilt: -7, size: 32, dur: 6.8, delay: 1.5 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[24px]">
      <div className="dot-grid absolute inset-0" />
      <div className="absolute inset-0 hidden md:block">
        {tiles.map((t) => (
          <FloatingTile key={t.p} t={t} />
        ))}
        <Sparkle className="absolute left-[76%] top-[28px] size-6 text-blue" />
      </div>
    </div>
  );
}
