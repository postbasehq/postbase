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
      <div className="absolute inset-y-0 left-1/2 hidden w-full max-w-[1440px] -translate-x-1/2 lg:block">
        {HERO_TILES.map((t) => (
          <FloatingTile key={t.p} t={t} />
        ))}
        <Sparkle className="absolute left-[71%] top-[36px] size-9 text-blue" />
        <Sparkle className="absolute left-[24%] top-[420px] size-5 text-blue" />
        <Loop className="absolute left-[20%] top-[120px] w-28 -rotate-6 text-blue" />
      </div>
      {/* Postbase marks flush with the page edges, in the gaps between the tiles */}
      <div className="absolute inset-0 hidden xl:block">
        <LogoMark color="#d14a3e" edge="top" className="absolute left-[17%] top-0 w-[96px] -scale-x-100" />
        <LogoMark color="#2b59d9" edge="left" className="absolute left-0 top-[135px] w-[110px]" />
        <LogoMark color="#e3a72c" edge="top" className="absolute right-[15%] top-0 w-[108px]" />
        <LogoMark color="#2b59d9" edge="right" className="absolute right-0 top-[150px] w-[130px] -scale-y-100" />
      </div>
    </div>
  );
}

/**
 * The Postbase mark on its own: a tall bar rounded at the bottom, with a half
 * disc hanging beside it (traced from the logo). Its flat side is a cut edge, so
 * `edge` turns the mark to sit flush against the top, left or right of the page.
 */
export function LogoMark({
  color,
  edge = "top",
  className = "",
}: {
  color: string;
  edge?: "top" | "left" | "right";
  className?: string;
}) {
  // Native shape: 301 x 227 with the flat edge along the top (y = 0).
  const t =
    edge === "left"
      ? { box: "0 0 227 301", m: "matrix(0 -1 1 0 0 301)" } // flat edge on x = 0
      : edge === "right"
        ? { box: "0 0 227 301", m: "matrix(0 1 -1 0 227 0)" } // flat edge on x = 227
        : { box: "0 0 301 227", m: undefined };
  return (
    <svg viewBox={t.box} className={className} aria-hidden>
      <g transform={t.m}>
        <path d="M0 0H150V152A75 75 0 0 1 0 152Z" fill={color} />
        <path d="M150 0H301A75 75 0 0 1 151 0Z" fill={color} />
      </g>
    </svg>
  );
}

/**
 * Pricing hero backdrop: Postbase marks cut off by the page edges (hanging from
 * the header, or flush with the sides), in blue, red and amber. Some are mirrored
 * along their edge (the flat side stays on the page edge).
 */
export function PricingDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden">
      <div className="absolute inset-y-0 left-0 right-0 hidden xl:block">
        {/* left: a big mark off the header, a tiny one further in, a small one on the edge */}
        <LogoMark color="#2b59d9" edge="top" className="absolute left-[3%] top-0 w-[200px]" />
        <LogoMark color="#d14a3e" edge="left" className="absolute left-0 top-[225px] w-[115px]" />
        <LogoMark color="#d14a3e" edge="top" className="absolute left-[22%] top-0 w-[84px] -scale-x-100" />
        {/* right: a big mark high on the edge, a small one off the header further in */}
        <LogoMark color="#e3a72c" edge="right" className="absolute right-0 top-[40px] w-[150px] -scale-y-100" />
        <LogoMark color="#2b59d9" edge="top" className="absolute right-[20%] top-0 w-[100px] -scale-x-100" />
      </div>
    </div>
  );
}
