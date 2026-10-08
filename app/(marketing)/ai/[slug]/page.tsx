import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CLIENTS, clientBySlug } from "@/lib/seo/clients";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { COMBO_CLIENTS, COMBO_NETWORKS } from "@/lib/seo/combos";
import { CtaBand, FaqList, Underlined, wrap } from "@/components/marketing/ui";
import { CodeBlock, LinkCards, Prompts, SectionHead, SeoHero, Steps, section } from "@/components/marketing/seo/sections";
import { ClientSetupDemo, ClientTiles } from "@/components/marketing/seo/demos";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { RelatedPosts } from "@/components/marketing/blog/RelatedPosts";

export const dynamicParams = false;

export function generateStaticParams() {
  return CLIENTS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = clientBySlug((await params).slug);
  if (!c) return {};
  return { title: { absolute: `${c.metaTitle} · Postbase` }, description: c.metaDescription, ...pageMeta(`/ai/${c.slug}`, { ownImage: true }) };
}

export default async function AiClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = clientBySlug((await params).slug);
  if (!c) notFound();
  const path = `/ai/${c.slug}`;
  const trail = [{ label: "Home", href: "/" }, { label: "AI tools", href: "/ai" }, { label: c.name }];

  return (
    <>
      <SeoJsonLd
        path={path}
        name={c.metaTitle}
        description={c.metaDescription}
        trail={trail}
        faqs={c.faqs}
        howTo={{ name: `Set up Postbase in ${c.name}`, steps: c.steps, totalTime: "PT1M" }}
      />
      <SiteNav />
      <main>
        <SeoHero
          trail={trail}
          h1={c.h1}
          icons={c.h1Icon ? [{ before: c.h1Icon, client: c.logo }] : []}
          sub={c.sub}
          cta={{ label: "Connect in a minute", href: "/login" }}
          secondary={{ label: "Read the docs", href: "https://docs.postbase.so/mcp/connect" }}
          frame={`Connect ${c.name} from the AI & API page`}
        >
          <ClientSetupDemo client={{ logo: c.logo, name: c.name, setup: c.setup }} />
        </SeoHero>

        <section className={section}>
          <SectionHead title={`Set up Postbase in ${c.name}`} sub="About a minute, and you only do it once." />
          <Steps items={c.steps} />
          <div className="mt-8">
            <CodeBlock language={c.setup.language} code={c.setup.code} caption={c.setup.instruction} />
          </div>
        </section>

        <section className={section}>
          <SectionHead
            title={
              <>
                What to ask <Underlined>{c.name}</Underlined>
              </>
            }
            sub="Plain language works. These are a few things people ask for."
          />
          <Prompts items={c.prompts} client={{ logo: c.logo, name: c.name }} />
        </section>

        <section className={section}>
          <SectionHead title="You stay in control" sub={`${c.name} gets a small set of tools, and everything it does shows up in Postbase.`} />
          <ClientTiles name={c.name} />
        </section>

        <section className={section}>
          <SectionHead title={`Networks ${c.name} can post to`} sub="Any account you've connected in Postbase." />
          <LinkCards
            items={LIVE_NETWORKS.map((n) => {
              const combo = (COMBO_CLIENTS as readonly string[]).includes(c.slug) && (COMBO_NETWORKS as readonly string[]).includes(n.slug);
              return combo
                ? { href: `/ai/${c.slug}/${n.slug}`, title: `${c.name} + ${n.name}`, brand: n.id, body: `How to post to ${n.name} from ${c.name}.` }
                : { href: `/integrations/${n.slug}`, title: n.name, brand: n.id, body: n.blurb };
            })}
          />
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={c.faqs} />
        </section>

        <section className={section}>
          <SectionHead title="Other AI tools" />
          <LinkCards
            items={CLIENTS.filter((o) => o.slug !== c.slug).map((o) => ({
              href: `/ai/${o.slug}`,
              title: o.name,
              client: o.logo,
              body: o.blurb,
            }))}
          />
        </section>

        <RelatedPosts path={path} />

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            developers
            body={`Connect ${c.name} in a minute. It drafts and schedules, and you see every post in your calendar.`}
            secondary={{ label: "Read the docs", href: "https://docs.postbase.so/mcp/connect" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
