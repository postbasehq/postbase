import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { LegalToc } from "@/components/LegalToc";
import type { LegalDoc } from "@/lib/legal";

const DOCS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

/** Shared layout for /terms and /privacy: header, doc switch, contents list and the rendered Markdown. */
export function LegalPage({ doc, current, summary }: { doc: LegalDoc; current: "/terms" | "/privacy"; summary: string }) {
  return (
    <>
      <SiteNav />
      <header className="mx-auto max-w-[1180px] px-5 pb-10 pt-14 md:px-8 md:pt-20">
        <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-sm">
          {DOCS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                d.href === current ? "bg-blue text-on-blue" : "text-muted hover:text-ink"
              }`}
            >
              {d.label}
            </Link>
          ))}
        </div>
        <h1 className="mt-8 font-display text-[clamp(38px,5.6vw,64px)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
          {doc.title}
        </h1>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-muted">{summary}</p>
        {doc.updated ? (
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-muted">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Last updated {doc.updated}
          </span>
        ) : null}
      </header>

      <div className="mx-auto grid max-w-[1180px] gap-12 px-5 pb-28 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <LegalToc headings={doc.headings} />
        </aside>
        <main className="min-w-0 rounded-[28px] border border-line bg-surface px-6 py-8 shadow-sm md:px-12 md:py-12">
          <article className="prose-legal max-w-[70ch]" dangerouslySetInnerHTML={{ __html: doc.html }} />
          <div className="mt-12 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-ground px-5 py-4">
            <div>
              <div className="font-display text-[15px] font-semibold text-ink">Questions about this?</div>
              <p className="text-[13.5px] text-muted">Email us and a real person will reply.</p>
            </div>
            <a
              href="mailto:team@postbase.so"
              className="ml-auto rounded-full bg-blue px-5 py-2.5 font-display text-[14px] font-semibold text-on-blue shadow-sm"
            >
              team@postbase.so
            </a>
          </div>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
