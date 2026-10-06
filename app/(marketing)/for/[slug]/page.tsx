import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { RecommendedPlan } from "@/components/PlanPicker";
import { PERSONAS, personaBySlug, type Persona } from "@/lib/seo/personas";
import { CLIENTS } from "@/lib/seo/clients";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { relatedCards } from "@/lib/seo/related";
import { CtaBand, FaqList, Underlined, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, SeoHero, Steps, section } from "@/components/marketing/seo/sections";
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

// Postbase blue, amber and red (solid, same in light and dark).
const PROBLEM_TONES = ["#2b59d9", "#e3a72c", "#d14a3e"];

export default async function PersonaPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = personaBySlug((await params).slug);
  if (!p) notFound();
  const path = `/for/${p.slug}`;
  const trail = [{ label: "Home", href: "/" }, { label: p.eyebrow }];

  return (
    <>
      <SeoJsonLd path={path} name={p.metaTitle} description={p.metaDescription} trail={trail} faqs={p.faqs} />
      <SiteNav />
      <main>
        <SeoHero
          trail={trail}
          h1={p.h1}
          sub={p.sub}
          secondary={{ label: "See pricing", href: "/pricing" }}
          frame={p.frame}
        >
          <Hero hero={p.hero} />
        </SeoHero>

        <section className={section}>
          <SectionHead title="Sound familiar?" />
          <Steps items={p.problems} badge={null} />
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
          <SectionHead title="The plan we'd pick" sub={p.planWhy} />
          <RecommendedPlan id={p.plan} badge="Our pick" />
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
              ...PERSONAS.filter((o) => o.slug !== p.slug).map((o, i) => ({ href: `/for/${o.slug}`, title: o.eyebrow, body: o.blurb, mark: PROBLEM_TONES[i % 3] })),
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
