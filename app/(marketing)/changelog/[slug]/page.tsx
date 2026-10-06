import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_URL, pageMeta } from "@/lib/site";
import { formatDay, getEntry, listEntries, mondayOf } from "@/lib/changelog";
import { Breadcrumbs, CtaBand, wrap } from "@/components/marketing/ui";
import { ChangelogDemo } from "@/components/marketing/changelog/ChangelogDemo";
import { TYPE, TypePill } from "@/components/marketing/changelog/types";
import { LogoMark } from "@/components/marketing/Decor";

export const dynamicParams = false;

export function generateStaticParams() {
  return listEntries().map((e) => ({ slug: e.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const e = getEntry((await params).slug);
  if (!e) return {};
  const meta = pageMeta(`/changelog/${e.slug}`, { ownImage: true });
  return {
    title: { absolute: `${e.title} · Postbase changelog` },
    description: e.summary,
    ...meta,
    openGraph: { ...meta.openGraph, type: "article", publishedTime: e.date },
  };
}

export default async function ChangelogEntryPage({ params }: { params: Params }) {
  const e = getEntry((await params).slug);
  if (!e) notFound();
  const all = listEntries();
  const i = all.findIndex((x) => x.slug === e.slug);
  const newer = all[i - 1];
  const older = all[i + 1];
  const sameWeek = all.filter((x) => x.slug !== e.slug && mondayOf(x.date) === mondayOf(e.date));
  const path = `/changelog/${e.slug}`;
  const trail = [{ label: "Home", href: "/" }, { label: "Changelog", href: "/changelog" }, { label: e.title }];
  const t = TYPE[e.type];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${SITE_URL}${path}#article`,
        headline: e.title,
        description: e.summary,
        datePublished: e.date,
        dateModified: e.date,
        mainEntityOfPage: `${SITE_URL}${path}`,
        author: { "@type": "Organization", name: "Postbase", url: SITE_URL },
        publisher: { "@id": `${SITE_URL}/#organization` },
        about: { "@id": `${SITE_URL}/#software` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: trail.map((x, n) => ({ "@type": "ListItem", position: n + 1, name: x.label, item: `${SITE_URL}${x.href ?? path}` })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output contains no HTML; escape "<" anyway so it can't close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }}
      />
      <SiteNav />
      <main>
        <header className={`${wrap} pt-10 md:pt-14`}>
          <div className="[&_ol]:justify-start">
            <Breadcrumbs trail={trail.slice(0, 2)} />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <TypePill type={e.type} />
            <span className="text-[14px] font-medium text-muted">
              {e.area} · {formatDay(e.date)}
            </span>
          </div>
          <h1 className="mt-4 max-w-[22ch] font-display text-[clamp(36px,5vw,60px)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink text-balance">
            {e.title}
          </h1>
          <p className="mt-5 max-w-[60ch] text-[18px] leading-relaxed text-muted">{e.summary}</p>
        </header>

        {e.demo ? (
          <section className={`${wrap} pt-12`}>
            <div className="relative isolate overflow-hidden rounded-[28px] p-8 md:p-12" style={{ background: t.bg }}>
              <LogoMark color={t.mark} edge="top" className="pointer-events-none absolute right-8 top-0 -z-10 w-[120px]" />
              <div className="flex justify-center max-md:[zoom:0.6]">
                <ChangelogDemo demo={e.demo} />
              </div>
            </div>
          </section>
        ) : null}

        <section className={`${wrap} pt-12`}>
          <article className="prose-blog max-w-[68ch]" dangerouslySetInnerHTML={{ __html: e.html }} />
        </section>

        {sameWeek.length ? (
          <section className={`${wrap} pt-16`}>
            <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">Also that week</h2>
            <div className="mt-5 rounded-[22px] border border-line bg-surface p-2 shadow-sm">
              <ul className="rounded-2xl border border-line bg-surface">
                {sameWeek.map((x) => (
                  <li key={x.slug} className="border-b border-line last:border-b-0">
                    <Link href={`/changelog/${x.slug}`} className="flex items-start gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-surface-2">
                      <TypePill type={x.type} />
                      <span className="min-w-0">
                        <span className="block font-display text-[16px] font-semibold text-ink">{x.title}</span>
                        <span className="block text-[14px] text-muted">{x.summary}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <nav aria-label="More changes" className={`${wrap} grid gap-4 pt-10 sm:grid-cols-2`}>
          {[
            { e: older, label: "Earlier" },
            { e: newer, label: "Later" },
          ].map(({ e: x, label }) =>
            x ? (
              <Link
                key={label}
                href={`/changelog/${x.slug}`}
                className="group flex flex-col rounded-[22px] border border-line bg-surface p-2 shadow-sm transition-colors hover:border-ink"
              >
                <span className="flex items-center justify-between rounded-2xl border border-line bg-surface-2 px-4 py-3">
                  <span className="text-[13px] font-semibold text-muted">{label}</span>
                  <TypePill type={x.type} />
                </span>
                <span className="px-4 pb-3 pt-3.5 font-display text-[17px] font-semibold text-ink group-hover:text-blue-ink">{x.title}</span>
              </Link>
            ) : (
              <span key={label} />
            ),
          )}
        </nav>

        <div className={`${wrap} pt-8`}>
          <Link href="/changelog" className="text-[14px] font-semibold text-blue-ink hover:underline">
            The full changelog
          </Link>
        </div>

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand body="Try it free for 7 days. Every plan includes every network, the MCP server and the API." secondary={{ label: "See pricing", href: "/pricing" }} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
