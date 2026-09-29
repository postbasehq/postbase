import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { LegalToc } from "@/components/LegalToc";
import { Arrow } from "@/components/marketing/ui";
import type { LegalDoc } from "@/lib/legal";

const DOCS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

/** Shared layout for /terms and /privacy: header, link to the other doc, contents list and the rendered Markdown. */
export function LegalPage({ doc, current, summary }: { doc: LegalDoc; current: "/terms" | "/privacy"; summary: string }) {
  const other = DOCS.find((d) => d.href !== current)!;
  return (
    <>
      <SiteNav />
      <header className="mx-auto max-w-[1180px] px-5 pb-10 pt-6 md:px-8 md:pt-8">
        <h1 className="mt-4 font-display text-[clamp(38px,5.6vw,64px)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
          {doc.title}
        </h1>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-relaxed text-muted">{summary}</p>
        <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
          {doc.updated ? <span>Last updated {doc.updated}</span> : null}
          <Link href={other.href} className="inline-flex items-center gap-1.5 font-semibold text-ink underline-offset-4 hover:underline">
            Read the {other.label}
            <Arrow />
          </Link>
        </p>
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
