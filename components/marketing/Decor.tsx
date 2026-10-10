import Link from "next/link";
import { BrandTile } from "@/components/BrandTile";
import { Postbot } from "@/components/postbots/Postbot";

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

/** Background layer for the hero: floating network tiles and Postbase marks. */
export function HeroDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] overflow-hidden">
      <div className="absolute inset-y-0 left-1/2 hidden w-full max-w-[1440px] -translate-x-1/2 lg:block">
        {HERO_TILES.map((t) => (
          <FloatingTile key={t.p} t={t} />
        ))}
      </div>
    </div>
  );
}

/**
 * Two of the hero's top marks come alive as Postbots, one thinking and one
 * working, hanging from the top of the page where the plain marks were. They
 * sit in their own layer above the hero content (the decor layer behind it
 * can't take clicks) and link to Postbots.
 */
export function HeroPostbots() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-0 xl:block">
      <HeroPostbot edge="top" color="#d14a3e" state="thinking" width={104} className="left-[17%] top-0 -scale-x-100" />
      <HeroPostbot edge="top" color="#e3a72c" state="working" width={116} className="right-[15%] top-0" />
      <HeroPostbot edge="left" color="#2b59d9" state="resting" width={110} className="left-0 top-[135px]" />
      <HeroPostbot edge="right" color="var(--postbot-contrast)" state="thinking" width={130} className="right-0 top-[150px] -scale-y-100" />
    </div>
  );
}

// The upright Postbot cropped to its body, so the flat top sits flush with an edge.
const BOT_BOX = { w: 302, h: 205, viewBox: "-12 0 302 205" };

/**
 * One hero Postbot, flush with the top, left or right edge of the page (turned
 * so its flat side meets the edge, like the plain marks). `width` is how wide
 * it is on the page once turned. Links to Postbots.
 */
function HeroPostbot({
  edge,
  color,
  state,
  width,
  className,
}: {
  edge: "top" | "left" | "right";
  color: string;
  state: "resting" | "thinking" | "working";
  width: number;
  className: string;
}) {
  const turned = edge !== "top";
  // Size of the bot before turning: across the page for "top", along it otherwise.
  const along = turned ? (width * BOT_BOX.w) / BOT_BOX.h : width;
  const across = (along * BOT_BOX.h) / BOT_BOX.w;
  return (
    <Link
      href="/bots"
      aria-label="Meet Postbots"
      title="Meet Postbots"
      className={`pointer-events-auto absolute block ${className}`}
      style={{ width: turned ? across : along, height: turned ? along : across }}
    >
      <span
        className="absolute left-1/2 top-1/2 block transition-transform"
        style={{
          width: along,
          height: across,
          transform: `translate(-50%, -50%) rotate(${edge === "left" ? -90 : edge === "right" ? 90 : 0}deg)`,
        }}
      >
        <Postbot color={color} state={state} viewBox={BOT_BOX.viewBox} className="block size-full" />
      </span>
    </Link>
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
  style,
}: {
  color: string;
  edge?: "top" | "left" | "right";
  className?: string;
  style?: React.CSSProperties;
}) {
  // Native shape: 301 x 227 with the flat edge along the top (y = 0).
  const t =
    edge === "left"
      ? { box: "0 0 227 301", m: "matrix(0 -1 1 0 0 301)" } // flat edge on x = 0
      : edge === "right"
        ? { box: "0 0 227 301", m: "matrix(0 1 -1 0 227 0)" } // flat edge on x = 227
        : { box: "0 0 301 227", m: undefined };
  return (
    <svg viewBox={t.box} className={className} style={style} aria-hidden>
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
