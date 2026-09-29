import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CHECKED, COMPETITORS, US, competitorBySlug, type Competitor } from "@/lib/seo/competitors";
import { CtaBand, FaqList, card, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, SeoHero, Steps, section } from "@/components/marketing/seo/sections";
import { AlternativeTiles, CalendarHeroDemo } from "@/components/marketing/seo/demos";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { RelatedPosts } from "@/components/marketing/blog/RelatedPosts";

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = competitorBySlug((await params).slug);
  if (!c) return {};
  return { title: { absolute: `${c.metaTitle} · Postbase` }, description: c.metaDescription, ...pageMeta(`/alternatives/${c.slug}`, { ownImage: true }) };
}

export default async function AlternativePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = competitorBySlug((await params).slug);
  if (!c) notFound();
  const path = `/alternatives/${c.slug}`;
  const trail = [{ label: "Home", href: "/" }, { label: "Alternatives", href: "/alternatives" }, { label: c.name }];

  return (
    <>
      <SeoJsonLd path={path} name={c.metaTitle} description={c.metaDescription} trail={trail} faqs={c.faqs} />
      <SiteNav />
      <main>
        <SeoHero
          trail={trail}
          h1={c.h1}
          sub={c.sub}
          secondary={{ label: "See pricing", href: "/pricing" }}
          frame="Your whole week in one calendar"
        >
          <CalendarHeroDemo />
        </SeoHero>

        <section className={section}>
          <SectionHead title={`Postbase vs ${c.name} at a glance`} sub={c.them} />
          <Comparison c={c} />
          <p className="mt-4 text-center text-[12.5px] text-muted">
            {c.name} details from their official pages, checked {c.checked ?? CHECKED}. Plans change, so check{" "}
            {c.sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 ? (i === c.sources.length - 1 ? " and " : ", ") : null}
                <a href={s.url} rel="nofollow noopener" target="_blank" className="underline decoration-line underline-offset-2 hover:text-ink">
                  {s.label}
                </a>
              </span>
            ))}{" "}
            before you decide.
          </p>
        </section>

        <section className={section}>
          <SectionHead title="Which one should you pick?" sub="Both are good tools. It comes down to what you post and how you work." />
          <div className="grid gap-4 md:grid-cols-2">
            <Choice title="Choose Postbase if" items={c.chooseUs} tone="#2b59d9" />
            <Choice title={`Choose ${c.name} if`} items={c.chooseThem} tone="#e3a72c" />
          </div>
        </section>

        <section className={section}>
          <SectionHead title="What you get with Postbase" sub="A calendar for every network, an agent built in, and an MCP server for the AI tools you already use." />
          <AlternativeTiles />
        </section>

        <section className={section}>
          <SectionHead title={`Switching from ${c.name}`} sub="Run both for a week before you decide." />
          <Steps items={c.switchSteps} />
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={c.faqs} />
        </section>

        <section className={section}>
          <SectionHead title="Other comparisons" />
          <LinkCards
            items={COMPETITORS.filter((o) => o.slug !== c.slug).map((o) => ({
              href: `/alternatives/${o.slug}`,
              title: `Postbase vs ${o.name}`,
              body: o.blurb,
            }))}
          />
        </section>

        <RelatedPosts path={path} />

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body={`Try Postbase next to ${c.name} for a week. Every plan includes every network, the MCP server and the API.`}
            secondary={{ label: "See pricing", href: "/pricing" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Comparison({ c }: { c: Competitor }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="hidden grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)] border-b border-line bg-surface-2/60 px-6 py-4 font-display text-[15px] font-semibold text-ink md:grid">
        <span />
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/postbase-icon.png" alt="" className="size-5 rounded-[24%]" />
          Postbase
        </span>
        <span>{c.name}</span>
      </div>
      <dl className="divide-y divide-line">
        {c.rows.map((r) => (
          <div key={r.label} className="grid gap-2 px-6 py-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)] md:gap-6">
            <dt className="font-display text-[15px] font-semibold text-ink">{r.label}</dt>
            <dd className="text-[15px] leading-relaxed text-ink">
              <span className="mr-1.5 font-semibold text-blue-ink md:hidden">Postbase:</span>
              {US[r.key]}
            </dd>
            <dd className="text-[15px] leading-relaxed text-muted">
              <span className="mr-1.5 font-semibold text-ink md:hidden">{c.name}:</span>
              {r.them}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Choice({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className={`${card} p-7`}>
      <h3 className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
      <ul className="mt-5 flex flex-col gap-3.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: tone }} aria-hidden>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 5 5L20 7" />
              </svg>
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
