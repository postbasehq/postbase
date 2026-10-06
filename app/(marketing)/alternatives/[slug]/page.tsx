import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CHECKED, COMPETITORS, COMPETITOR_LOGO, US, competitorBySlug, competitorCard } from "@/lib/seo/competitors";
import { CtaBand, FaqList, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, SeoHero, Steps, section } from "@/components/marketing/seo/sections";
import { AlternativeTiles } from "@/components/marketing/seo/demos";
import { CompareTable } from "@/components/marketing/seo/CompareDemo";
import { LogoMark } from "@/components/marketing/Decor";
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
          icons={[{ before: c.name.split(" ")[0], img: COMPETITOR_LOGO[c.slug].src }]}
          sub={c.sub}
          secondary={{ label: "See pricing", href: "/pricing" }}
          frame={`Postbase vs ${c.name} at a glance`}
        >
          <CompareTable
            item={{
              slug: c.slug,
              name: c.name,
              logo: COMPETITOR_LOGO[c.slug].src,
              rows: c.rows.map((row) => ({ label: row.label, us: US[row.key], them: row.them })),
            }}
          />
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
        </SeoHero>

        <section className={section}>
          <SectionHead title="Which one should you pick?" sub={`${c.them} Both are good tools; it comes down to what you post and how you work.`} />
          <div className="grid gap-5 md:grid-cols-2">
            <Choice title="Choose Postbase if" items={c.chooseUs} logo="/postbase-icon.png" tone="blue" />
            <Choice title={`Choose ${c.name} if`} items={c.chooseThem} logo={COMPETITOR_LOGO[c.slug].src} tone="amber" />
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
            items={COMPETITORS.filter((o) => o.slug !== c.slug).map(competitorCard)}
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

const CHOICE = {
  blue: { bg: "#2b59d9", ink: "#ffffff", mark: "#2148b3", check: "#2b59d9" },
  amber: { bg: "#e3a72c", ink: "#14161a", mark: "#c98e17", check: "#b07a0f" },
} as const;

/** "Choose X if": a solid brand tile with the tool's logo, the mark flush on the top edge, and white checks. */
function Choice({ title, items, logo, tone }: { title: string; items: string[]; logo: string; tone: keyof typeof CHOICE }) {
  const t = CHOICE[tone];
  return (
    <div className="relative isolate overflow-hidden rounded-[24px] p-8 md:p-9" style={{ background: t.bg }}>
      <LogoMark color={t.mark} edge="top" className="pointer-events-none absolute right-7 top-0 -z-10 w-[110px]" />
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" className="size-7 rounded-[6px] object-contain" />
        </span>
        <h3 className="font-display text-[24px] font-semibold tracking-[-0.02em]" style={{ color: t.ink }}>
          {title}
        </h3>
      </div>
      <ul className="mt-6 flex flex-col gap-4">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-3 text-[15.5px] leading-relaxed" style={{ color: t.ink }}>
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white" style={{ color: t.check }} aria-hidden>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
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
