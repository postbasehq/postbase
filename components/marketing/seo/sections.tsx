import Link from "next/link";
import { BRANDS } from "@/components/BrandTile";
import { ClientLogo, LOGOS } from "@/components/ClientLogo";
import { FactUI } from "@/components/marketing/seo/FactUI";
import type { FactUi } from "@/lib/seo/networks";
import { Breadcrumbs, PrimaryButton, SecondaryButton, Underlined, card, wrap } from "@/components/marketing/ui";
import { LogoMark } from "@/components/marketing/Decor";
import { CyclingLogos } from "@/components/marketing/seo/CyclingLogos";

/*
 * Sections for the SEO landing pages (/integrations, /ai, /alternatives). One
 * template per family, so every page shares the homepage's look: big display
 * headings, a product shot in a card, brand-colour tiles, the FAQ list and the
 * blue closing band.
 */

export const section = `${wrap} pt-24 md:pt-32`;

/** The brand logo in a small tilted white tile, sized to sit inside a heading. */
function TitleTile({ brand, client, brands, tilt }: { brand?: string; client?: string; brands?: string[]; tilt: number }) {
  return (
    <span
      aria-hidden
      style={{ transform: `rotate(${tilt}deg)` }}
      className="mx-[0.08em] inline-flex size-[0.92em] -translate-y-[0.06em] items-center justify-center overflow-hidden rounded-[0.2em] border border-line bg-surface align-middle shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]"
    >
      {brands ? (
        <CyclingLogos items={brands.map((b) => <BigLogo key={b} brand={b} size="0.5em" />)} />
      ) : (
        <BigLogo brand={brand} client={client} size="0.5em" />
      )}
    </span>
  );
}

/** `brands` instead of `brand`/`client` makes the tile cycle through those logos. */
type HeroIcon = { before: string; brand?: string; client?: string; brands?: string[] };

/** Puts a logo tile before the first word of `text` that matches an icon. */
function withIcons(text: string, icons: HeroIcon[], used: Set<HeroIcon>) {
  return text.split(" ").flatMap((w, i) => {
    const icon = icons.find((ic) => !used.has(ic) && ic.before === w);
    const word = <span key={i}>{i ? " " : ""}{w}</span>;
    if (!icon) return [word];
    used.add(icon);
    // Tile and word never split across lines.
    return [
      <span key={i}>
        {i ? " " : ""}
        <span className="whitespace-nowrap">
          <TitleTile brand={icon.brand} client={icon.client} brands={icon.brands} tilt={used.size % 2 ? 6 : -6} /> {w}
        </span>
      </span>,
    ];
  });
}

export function SeoHero({
  trail,
  h1,
  icons = [],
  sub,
  cta = { label: "Start your 7-day free trial", href: "/login" },
  secondary,
  note = "Cancel anytime · or self-host for free",
  frame,
  children,
}: {
  trail: { label: string; href?: string }[];
  h1: [string, string];
  /** Logo tiles inline in the h1, each before its word (first word of the underlined part at most). */
  icons?: HeroIcon[];
  sub: string;
  cta?: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Small line under the buttons; null hides it. */
  note?: string | null;
  /** Caption above the product shot. */
  frame?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={`${wrap} pt-10 text-center md:pt-14`}>
      <Breadcrumbs trail={trail} />
      <h1 className="mx-auto mt-8 max-w-[17ch] font-display text-[clamp(40px,6.2vw,76px)] font-semibold leading-[1.04] tracking-[-0.04em] text-ink text-balance">
        {(() => {
          const used = new Set<HeroIcon>();
          const first = withIcons(h1[0], icons, used);
          const lead = h1[1].split(" ")[0];
          const tail = icons.find((ic) => !used.has(ic) && ic.before === lead);
          return (
            <>
              {first}{" "}
              {tail ? (
                <span className="whitespace-nowrap">
                  <TitleTile brand={tail.brand} client={tail.client} brands={tail.brands} tilt={used.size % 2 ? -6 : 6} />{" "}
                  <Underlined>{h1[1]}</Underlined>
                </span>
              ) : (
                <Underlined>{h1[1]}</Underlined>
              )}
            </>
          );
        })()}
      </h1>
      <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-relaxed text-muted text-balance md:text-[19px]">{sub}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <PrimaryButton href={cta.href}>{cta.label}</PrimaryButton>
        {secondary ? <SecondaryButton href={secondary.href}>{secondary.label}</SecondaryButton> : null}
      </div>
      {note ? <p className="mt-3 text-[13px] text-muted">{note}</p> : null}

      {children ? (
        <div className={`${card} mt-12 p-3 text-left md:p-5`}>
          {frame ? (
            <p className="mb-4 mt-1 text-center font-display text-[18px] font-semibold text-ink md:mb-5 md:text-[22px]">{frame}</p>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** A heading + intro for a section, left-aligned on wide screens beside its content. */
export function SectionHead({ title, sub }: { title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mx-auto mb-10 max-w-[760px] text-center md:mb-12">
      <h2 className="font-display text-[clamp(30px,4vw,46px)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink text-balance">
        {title}
      </h2>
      {sub ? <p className="mx-auto mt-4 max-w-[56ch] text-[17px] leading-relaxed text-muted text-balance">{sub}</p> : null}
    </div>
  );
}

/** "What Postbase supports on X": label/value cards. */
export function Facts({ items }: { items: { label: string; value: string; stat?: string }[] }) {
  return (
    <dl className={`grid gap-4 sm:grid-cols-2 ${items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
      {items.map((f) => (
        <FactCard key={f.label} fact={f} />
      ))}
    </dl>
  );
}

/** One fact: small label, the key number or phrase big, the detail underneath. */
function FactCard({ fact: f }: { fact: { label: string; value: string; stat?: string } }) {
  return (
    <div className={`${card} flex flex-col p-6`}>
      <dt className="font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{f.label}</dt>
      {f.stat ? (
        <>
          <dd className="mt-3 font-display text-[clamp(28px,3vw,38px)] font-semibold leading-none tracking-[-0.03em] text-ink">
            {f.stat}
          </dd>
          <dd className="mt-2.5 text-[14px] leading-snug text-muted">{f.value}</dd>
        </>
      ) : (
        <dd className="mt-2.5 text-[16px] leading-snug text-ink">{f.value}</dd>
      )}
    </div>
  );
}

/**
 * "What Postbase does on {network}": the network's standout feature on a tile in
 * its brand colour (logo drawn large, cropped by the corner), beside its facts.
 */
export function NetworkFacts({
  network,
  facts,
  special,
}: {
  network: string;
  facts: { label: string; value: string; stat?: string; ui?: FactUi }[];
  special: { label: string; title: string; body: string };
}) {
  const b = BRANDS[network];
  const bg = b?.bg ?? "#2b59d9";
  return (
    <div className="flex flex-col gap-4">
      <div className="relative isolate flex min-h-[240px] flex-col overflow-hidden rounded-[24px] p-8 md:p-10" style={{ background: bg }}>
        {b ? (
          <svg
            viewBox={b.viewBox ?? "0 0 24 24"}
            aria-hidden
            className="pointer-events-none absolute -bottom-14 -right-10 -z-10 w-[240px] -rotate-12 md:w-[320px]"
            // A darker solid shade of the brand colour (lighter on black tiles),
            // so the mark reads as texture and the white text stays legible.
            style={{ fill: DARK.has(bg.toLowerCase()) ? "#2e3035" : `color-mix(in oklab, ${bg} 72%, #000)` }}
          >
            <path d={b.path} />
          </svg>
        ) : null}
        <span className="self-start rounded-full bg-white px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-[#14161a]">
          {special.label}
        </span>
        <h3 className="mt-5 max-w-[20ch] font-display text-[clamp(28px,3vw,40px)] font-semibold leading-[1.08] tracking-[-0.02em] text-white">
          {special.title}
        </h3>
        <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-white/90">{special.body}</p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className={`${card} flex flex-col overflow-hidden`}>
            <div className="flex min-h-[170px] items-center border-b border-line bg-surface-2 p-5">
              <FactUI ui={f.ui} network={network} />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <dt className="font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{f.label}</dt>
              {f.stat ? (
                <dd className="mt-3 font-display text-[clamp(26px,2.4vw,34px)] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {f.stat}
                </dd>
              ) : null}
              <dd className="mt-2.5 text-[14px] leading-snug text-muted">{f.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Numbered how-to steps. */
// Solid tiles per step, as on the MCP page's glance tiles: fill, text and a darker mark.
const STEP_TILES = [
  { bg: "#2b59d9", ink: "#ffffff", mark: "#2148b3" },
  { bg: "#e3a72c", ink: "#14161a", mark: "#c98e17" },
  { bg: "#d14a3e", ink: "#ffffff", mark: "#b23a2f" },
];

/** Numbered how-to steps, each on a solid brand tile. */
export function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-5 md:grid-cols-3">
      {items.map((s, i) => {
        const t = STEP_TILES[i % 3];
        return (
          <li key={s.title} className="relative isolate flex min-h-[240px] flex-col overflow-hidden rounded-[24px] p-8" style={{ background: t.bg }}>
            <LogoMark color={t.mark} edge="top" className="pointer-events-none absolute right-6 top-0 -z-10 w-[104px]" />
            <span className="self-start rounded-full bg-white px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-[#14161a]">
              Step {i + 1}
            </span>
            <h3 className="mt-5 font-display text-[clamp(22px,2vw,26px)] font-semibold leading-[1.15] tracking-[-0.02em]" style={{ color: t.ink }}>
              {s.title}
            </h3>
            <p className="mt-2.5 text-[15px] leading-relaxed" style={{ color: t.ink }}>
              {s.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Example requests for an agent, as a chat: the AI tool's logo and name, each
 * request as a solid blue message bubble, and the composer underneath. Two-zone
 * card, like the pricing cards.
 */
export function Prompts({ items, client }: { items: string[]; client?: { logo: string; name: string } }) {
  return (
    <div className="mx-auto max-w-[860px] rounded-[22px] border border-line bg-surface p-2 shadow-sm">
      <div className="rounded-2xl border border-line bg-surface-2 p-5 md:p-7">
        <div className="flex items-center gap-2.5">
          {client ? <ClientLogo id={client.logo} size={28} /> : null}
          <span className="font-display text-[15px] font-semibold text-ink">{client ? `Ask ${client.name}` : "Ask your agent"}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/postbase-icon.png" alt="" className="size-3.5 rounded-[3px]" />
            Postbase connected
          </span>
        </div>
        <ul className="mt-6 flex flex-col items-end gap-3">
          {items.map((p) => (
            <li key={p} className="max-w-[88%] rounded-2xl rounded-br-md bg-[#2b59d9] px-4 py-3 text-[15px] leading-relaxed text-white shadow-sm">
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-[14px] text-muted">Ask {client?.name ?? "your agent"} to draft or schedule a post…</span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#2b59d9] text-white" aria-hidden>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/** A dark code block with the snippet a reader needs to copy. */
export function CodeBlock({ language, code, caption }: { language: string; code: string; caption?: string }) {
  return (
    <figure className="mx-auto max-w-[820px]">
      {caption ? <figcaption className="mb-2.5 text-center text-[14px] text-muted">{caption}</figcaption> : null}
      <div className="overflow-hidden rounded-2xl bg-[#12141a] ring-1 ring-white/10">
        <div className="border-b border-white/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">{language}</div>
        <pre className="overflow-x-auto px-5 py-4 font-mono text-[13.5px] leading-6 text-[#e6e8ef]">
          <code>{code}</code>
        </pre>
      </div>
    </figure>
  );
}

export type LinkCard = {
  href: string;
  title: string;
  body: string;
  brand?: string;
  client?: string;
  /** No logo: the Postbase mark in this solid brand colour instead. */
  mark?: string;
  /** An image logo (a competitor's mark) on a white tile, with its brand colour. */
  logo?: { src: string; tone: string };
  soon?: boolean;
};

// Near-black logos use the text colour instead, so they flip to white in dark mode.
const DARK = new Set(["#000000", "#0b100f"]);

/** A network or AI-tool logo, drawn large (no tile) in its brand colour. */
function BigLogo({ brand, client, size }: { brand?: string; client?: string; size: number | string }) {
  const b = brand ? BRANDS[brand] : undefined;
  const c = client ? LOGOS[client] : undefined;
  const path = b?.path ?? c?.path;
  if (!path) return null;
  const color = b?.bg ?? c?.color ?? "#000000";
  const gradient = color.startsWith("linear-gradient");
  const ink = DARK.has(color.toLowerCase());
  const gid = `g-${brand ?? client}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={b?.viewBox ?? "0 0 24 24"}
      aria-hidden
      className={ink ? "text-ink" : undefined}
      fill={gradient ? `url(#${gid})` : ink ? "currentColor" : color}
    >
      {gradient ? (
        // Instagram's gradient, rebuilt for SVG.
        <defs>
          <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#feda75" />
            <stop offset="0.25" stopColor="#fa7e1e" />
            <stop offset="0.5" stopColor="#d62976" />
            <stop offset="0.75" stopColor="#962fbf" />
            <stop offset="1" stopColor="#4f5bd5" />
          </linearGradient>
        </defs>
      ) : null}
      <path d={path} />
    </svg>
  );
}

/**
 * Grid of links to sibling pages (other networks, other AI tools). Each card
 * has its logo drawn large, cropped by the card's bottom-right corner; on hover
 * it slides further in and straightens.
 */
/** The card's accent: its Postbase mark colour, or its logo's brand colour. */
function cardTone(l: LinkCard): string | null {
  if (l.mark) return l.mark;
  if (l.logo) return DARK.has(l.logo.tone.toLowerCase()) ? "var(--ink)" : l.logo.tone;
  const color = l.brand ? BRANDS[l.brand]?.bg : l.client ? LOGOS[l.client]?.color : undefined;
  if (!color) return null;
  if (color.startsWith("linear-gradient")) return "#d62976"; // Instagram's pink
  return DARK.has(color.toLowerCase()) ? "var(--ink)" : color; // black logos follow the text colour
}

export function LinkCards({ items }: { items: LinkCard[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((l) => {
        const tone = cardTone(l);
        const inner = (
          <>
            {tone ? (
              <>
                {/* A wash of the logo's colour from the top left… */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30"
                  style={{ background: `radial-gradient(110% 90% at 0% 0%, ${tone}, transparent 60%)` }}
                />
                {/* …and a glow behind the logo that swells on hover. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-20 -right-20 size-[260px] rounded-full opacity-30 blur-2xl transition-[opacity,transform] duration-700 ease-out group-hover:scale-125 group-hover:opacity-60"
                  style={{ background: `radial-gradient(circle, ${tone}, transparent 70%)` }}
                />
              </>
            ) : null}
            {l.mark ? (
              <LogoMark
                color={l.mark}
                edge="right"
                className="pointer-events-none absolute -bottom-3 right-0 w-[76px] transition-transform duration-500 ease-out sm:w-[92px] group-hover:-translate-y-3"
              />
            ) : l.logo ? (
              // The logo on a white tile, cropped by the corner like the drawn logos.
              <div
                className="pointer-events-none absolute -bottom-5 -right-4 flex size-[112px] origin-bottom-right -rotate-12 scale-[0.8] items-center justify-center rounded-[26px] border border-line bg-white shadow-[0_14px_30px_-14px_rgba(16,24,40,0.45)] transition-transform duration-500 ease-out sm:scale-100 group-hover:-translate-x-3 group-hover:-translate-y-3 group-hover:rotate-0"
                aria-hidden
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.logo.src} alt="" className="size-[68px] object-contain" />
              </div>
            ) : (
              <div
                className="pointer-events-none absolute -bottom-6 -right-5 origin-bottom-right -rotate-12 scale-[0.8] transition-transform sm:scale-100 duration-500 ease-out group-hover:-translate-x-3 group-hover:-translate-y-3 group-hover:rotate-0"
                aria-hidden
              >
                <BigLogo brand={l.brand} client={l.client} size={130} />
              </div>
            )}
            <div className={`relative ${l.brand || l.client || l.mark || l.logo ? "max-w-[calc(100%-108px)]" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">{l.title}</span>
                {l.soon ? (
                  <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                    Coming soon
                  </span>
                ) : null}
              </div>
              <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-muted">{l.body}</p>
            </div>
          </>
        );
        const cls = `${card} relative block h-full min-h-[130px] overflow-hidden p-6 sm:min-h-[170px]`;
        return (
          <li key={l.href}>
            {l.soon ? (
              <div className={`${cls} opacity-70`}>{inner}</div>
            ) : (
              <Link
                href={l.href}
                className={`${cls} group transition-colors ${tone ? "hover:border-[var(--tone)]" : "hover:border-ink"}`}
                style={tone ? ({ "--tone": tone } as React.CSSProperties) : undefined}
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
