import Link from "next/link";
import { BrandTile } from "@/components/BrandTile";
import { ClientLogo } from "@/components/ClientLogo";
import { Breadcrumbs, PrimaryButton, SecondaryButton, Underlined, card, wrap } from "@/components/marketing/ui";

/*
 * Sections for the SEO landing pages (/integrations, /ai, /alternatives). One
 * template per family, so every page shares the homepage's look: big display
 * headings, a product shot in a card, brand-colour tiles, the FAQ list and the
 * blue closing band.
 */

export const section = `${wrap} pt-24 md:pt-32`;

export function Eyebrow({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3.5 font-display text-[13px] font-semibold text-ink shadow-sm">
      {icon}
      {children}
    </span>
  );
}

export function SeoHero({
  trail,
  eyebrow,
  h1,
  sub,
  cta = { label: "Start your 7-day free trial", href: "/login" },
  secondary,
  frame,
  children,
}: {
  trail: { label: string; href?: string }[];
  eyebrow: React.ReactNode;
  h1: [string, string];
  sub: string;
  cta?: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Caption above the product shot. */
  frame?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={`${wrap} pt-10 text-center md:pt-14`}>
      <Breadcrumbs trail={trail} />
      <div className="mt-8">{eyebrow}</div>
      <h1 className="mx-auto mt-6 max-w-[17ch] font-display text-[clamp(40px,6.2vw,76px)] font-semibold leading-[1.04] tracking-[-0.04em] text-ink text-balance">
        {h1[0]} <Underlined>{h1[1]}</Underlined>
      </h1>
      <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-relaxed text-muted text-balance md:text-[19px]">{sub}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <PrimaryButton href={cta.href}>{cta.label}</PrimaryButton>
        {secondary ? <SecondaryButton href={secondary.href}>{secondary.label}</SecondaryButton> : null}
      </div>
      <p className="mt-3 text-[13px] text-muted">Cancel anytime · or self-host for free</p>

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
export function Facts({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((f) => (
        <div key={f.label} className={`${card} p-6`}>
          <dt className="font-display text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-ink">{f.label}</dt>
          <dd className="mt-2.5 text-[16px] leading-snug text-ink">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const STEP_TONES = ["#2b59d9", "#e3a72c", "#d14a3e"];

/** Numbered how-to steps. */
export function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {items.map((s, i) => (
        <li key={s.title} className={`${card} p-7`}>
          <span
            className="grid size-10 place-items-center rounded-full font-display text-[16px] font-semibold"
            style={{ backgroundColor: STEP_TONES[i % 3], color: i % 3 === 1 ? "#202124" : "#fff" }}
          >
            {i + 1}
          </span>
          <h3 className="mt-5 font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">{s.title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

/** Example requests for an agent, as quote cards. */
export function Prompts({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((p) => (
        <li key={p} className={`${card} flex gap-3.5 p-6`}>
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-blue text-on-blue" aria-hidden>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <p className="text-[16px] leading-relaxed text-ink">&ldquo;{p}&rdquo;</p>
        </li>
      ))}
    </ul>
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

export type LinkCard = { href: string; title: string; body: string; brand?: string; client?: string; soon?: boolean };

/** Grid of links to sibling pages (other networks, other clients). */
export function LinkCards({ items }: { items: LinkCard[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((l) => {
        const inner = (
          <>
            <div className="flex items-center gap-3">
              {l.brand ? <BrandTile platform={l.brand} size={40} radius={11} /> : null}
              {l.client ? <ClientLogo id={l.client} size={40} /> : null}
              <span className="font-display text-[18px] font-semibold tracking-[-0.01em] text-ink">{l.title}</span>
              {l.soon ? (
                <span className="ml-auto rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted">Coming soon</span>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-auto text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                  aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{l.body}</p>
          </>
        );
        return (
          <li key={l.href}>
            {l.soon ? (
              <div className={`${card} h-full p-6 opacity-70`}>{inner}</div>
            ) : (
              <Link href={l.href} className={`${card} group block h-full p-6 transition-colors hover:border-ink`}>
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
