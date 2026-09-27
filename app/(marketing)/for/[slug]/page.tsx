import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { PLANS } from "@/lib/plans";
import { PERSONAS, personaBySlug, type Persona } from "@/lib/seo/personas";
import { CLIENTS } from "@/lib/seo/clients";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { relatedCards } from "@/lib/seo/related";
import { CtaBand, FaqList, Underlined, card, wrap } from "@/components/marketing/ui";
import { Eyebrow, LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { CalendarHeroDemo, ClientSetupDemo, NetworkComposerDemo } from "@/components/marketing/seo/demos";
import { FeatureTiles } from "@/components/marketing/seo/FeatureTiles";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { RelatedPosts } from "@/components/marketing/blog/RelatedPosts";

export const dynamicParams = false;

export function generateStaticParams() {
  return PERSONAS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = personaBySlug((await params).slug);
  if (!p) return {};
  return { title: { absolute: `${p.metaTitle} · Postbase` }, description: p.metaDescription, ...pageMeta(`/for/${p.slug}`, { ownImage: true }) };
}

function Hero({ hero }: { hero: Persona["hero"] }) {
  if (hero.kind === "calendar") return <CalendarHeroDemo />;
  if (hero.kind === "client") {
    const c = CLIENTS.find((x) => x.slug === hero.client) ?? CLIENTS[0];
    return <ClientSetupDemo client={{ logo: c.logo, name: c.name, setup: c.setup }} />;
  }
  const n = LIVE_NETWORKS.find((x) => x.slug === hero.network) ?? LIVE_NETWORKS[0];
  return <NetworkComposerDemo network={n.id} text={n.demo.text} media={n.demo.media} />;
}

const PROBLEM_TONES = ["#2b59d9", "#e3a72c", "#d14a3e"];

export default async function PersonaPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = personaBySlug((await params).slug);
  if (!p) notFound();
  const path = `/for/${p.slug}`;
  const trail = [{ label: "Home", href: "/" }, { label: p.eyebrow }];
  const plan = PLANS[p.plan];

  return (
    <>
      <SeoJsonLd path={path} name={p.metaTitle} description={p.metaDescription} trail={trail} faqs={p.faqs} />
      <SiteNav />
      <main>
        <SeoHero
          trail={trail}
          eyebrow={<Eyebrow>{p.eyebrow}</Eyebrow>}
          h1={p.h1}
          sub={p.sub}
          secondary={{ label: "See pricing", href: "/pricing" }}
          frame={p.frame}
        >
          <Hero hero={p.hero} />
        </SeoHero>

        <section className={section}>
          <SectionHead title="Sound familiar?" />
          <div className="grid gap-4 md:grid-cols-3">
            {p.problems.map((pr, i) => (
              <div key={pr.title} className={`${card} p-7`}>
                <span className="block h-1.5 w-10 rounded-full" style={{ backgroundColor: PROBLEM_TONES[i % 3] }} aria-hidden />
                <h3 className="mt-5 font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">{pr.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{pr.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={section}>
          <SectionHead
            title={
              <>
                How Postbase <Underlined>helps</Underlined>
              </>
            }
          />
          <FeatureTiles features={p.features} />
        </section>

        <section className={section}>
          <SectionHead title="The plan we'd pick" />
          <div className={`${card} mx-auto flex max-w-[820px] flex-col gap-6 p-7 md:flex-row md:items-center md:p-9`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-[24px] font-semibold text-ink">{plan.name}</span>
                <span className="font-display text-[20px] font-semibold text-ink">
                  ${plan.monthly}
                  <span className="text-[14px] font-medium text-muted">/month</span>
                </span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.planWhy}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="rounded-full bg-surface-2 px-3 py-1 text-[13px] font-medium text-ink">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <a
              href="/login"
              className="shrink-0 rounded-full bg-blue px-6 py-3 text-center font-display text-[15px] font-semibold text-on-blue shadow-sm"
            >
              Start 7-day trial
            </a>
          </div>
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={p.faqs} />
        </section>

        <section className={section}>
          <SectionHead title="Related" />
          <LinkCards
            items={[
              ...relatedCards(p.related),
              ...PERSONAS.filter((o) => o.slug !== p.slug).map((o) => ({ href: `/for/${o.slug}`, title: o.eyebrow, body: o.sub.split(". ")[0] + "." })),
            ]}
          />
        </section>

        <RelatedPosts path={path} />

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand body={p.sub} secondary={{ label: "See pricing", href: "/pricing" }} developers={p.hero.kind === "client"} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
