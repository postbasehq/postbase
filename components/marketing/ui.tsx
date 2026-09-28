import Link from "next/link";
import { Fit } from "@/components/marketing/Fit";
import { CtaCollage } from "@/components/marketing/CtaCollage";
import { LogoMark } from "@/components/marketing/Decor";

/*
 * Building blocks shared by the homepage and the SEO pages (integrations, AI
 * clients, alternatives), so every marketing page has the same type scale,
 * cards and closing band.
 */

export const wrap = "mx-auto max-w-[1180px] px-5 md:px-8";
export const card = "rounded-[24px] border border-line bg-surface";

export function Heading({ title, sub, as: Tag = "h2" }: { title: React.ReactNode; sub?: React.ReactNode; as?: "h2" | "h3" }) {
  return (
    <div className="mx-auto mb-12 max-w-[760px] text-center md:mb-14">
      <Tag className="font-display text-[clamp(32px,4.4vw,52px)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink text-balance">
        {title}
      </Tag>
      {sub ? (
        <p className="mx-auto mt-4 max-w-[56ch] text-[17px] leading-relaxed text-muted text-balance">{sub}</p>
      ) : null}
    </div>
  );
}

/** Hand-drawn stroke under a highlighted word. */
export function Underlined({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block text-blue">
      {children}
      <svg
        viewBox="0 0 300 16"
        preserveAspectRatio="none"
        className="absolute -bottom-[0.14em] left-[2%] h-[0.16em] w-[96%] text-blue"
        aria-hidden
      >
        <path d="M3 11C60 5 150 2 297 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Arrow() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-blue px-7 py-3.5 font-display text-[15px] font-semibold text-on-blue shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
    >
      {children}
      <Arrow />
    </a>
  );
}

export function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-full border border-line bg-surface px-6 py-3.5 font-display text-[15px] font-semibold text-ink transition-colors hover:border-ink"
    >
      {children}
    </a>
  );
}

/** The blue closing band with a collage of real app pieces. */
export function CtaBand({
  title = "Ready to get started?",
  body,
  secondary,
  developers = false,
}: {
  title?: React.ReactNode;
  body: React.ReactNode;
  secondary?: { label: string; href: string };
  developers?: boolean;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-[32px] bg-[#2b59d9] px-7 py-14 shadow-[0_40px_100px_-40px_rgba(43,89,217,0.8)] md:px-14 md:py-20">
      {/* Postbase marks, flat sides flush with the band's edges */}
      <LogoMark color="#e3a72c" edge="top" className="absolute right-[6%] top-0 -z-10 hidden w-[280px] -scale-x-100 md:block" />
      <LogoMark color="#d14a3e" edge="right" className="absolute bottom-[6%] right-0 -z-10 w-[140px] -scale-y-100 md:w-[190px]" />
      <LogoMark color="#e3a72c" edge="top" className="absolute bottom-0 left-[8%] -z-10 w-[150px] -scale-y-100 md:left-auto md:right-[34%] md:w-[170px]" />

      <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <h2 className="max-w-[12ch] font-display text-[clamp(40px,6vw,76px)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
            {title}
          </h2>
          <p className="mt-5 max-w-[40ch] text-[18px] leading-relaxed text-white/85">{body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-display text-[15px] font-semibold text-[#2b59d9] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
            >
              Start your 7-day free trial
              <Arrow />
            </a>
            {secondary ? (
              <a
                href={secondary.href}
                className="rounded-full px-5 py-3.5 font-display text-[15px] font-semibold text-white ring-1 ring-white/50 transition-colors hover:ring-white"
              >
                {secondary.label}
              </a>
            ) : null}
          </div>
          <p className="mt-4 text-[13px] text-white/70">Cancel anytime · or self-host for free</p>
        </div>

        {/* floating pieces of the real app */}
        <div>
          <Fit minWidth={480} height={430}>
            <CtaCollage developers={developers} />
          </Fit>
        </div>
      </div>
    </div>
  );
}

/** Question/answer list, same styling as the homepage FAQ. */
export function FaqList({ items }: { items: [string, string][] }) {
  return (
    <div className="mx-auto max-w-[820px] divide-y divide-line border-y border-line">
      {items.map(([q, a]) => (
        <details key={q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-[17px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {q}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-45"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </summary>
          <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}

/** "Home / Integrations / X" trail above a page's heading. */
export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] font-medium text-muted">
      <ol className="flex flex-wrap items-center justify-center gap-1.5">
        {trail.map((t, i) => (
          <li key={t.label} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {t.href ? (
              <Link href={t.href} className="transition-colors hover:text-ink">
                {t.label}
              </Link>
            ) : (
              <span className="text-ink" aria-current="page">
                {t.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
