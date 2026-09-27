import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { BrandTile } from "@/components/BrandTile";
import { pageMeta } from "@/lib/site";
import { LIVE_NETWORKS, NETWORKS, networkBySlug } from "@/lib/seo/networks";
import { CLIENTS } from "@/lib/seo/clients";
import { CtaBand, FaqList, Underlined, card, wrap } from "@/components/marketing/ui";
import { Eyebrow, Facts, LinkCards, SectionHead, SeoHero, Steps, section } from "@/components/marketing/seo/sections";
import { NetworkComposerDemo, NetworkTiles } from "@/components/marketing/seo/demos";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";

export const dynamicParams = false;

export function generateStaticParams() {
  return LIVE_NETWORKS.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const n = networkBySlug((await params).slug);
  if (!n) return {};
  return { title: { absolute: `${n.metaTitle} · Postbase` }, description: n.metaDescription, ...pageMeta(`/integrations/${n.slug}`, { ownImage: true }) };
}

export default async function IntegrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const n = networkBySlug((await params).slug);
  if (!n) notFound();
  const path = `/integrations/${n.slug}`;
  const trail = [{ label: "Home", href: "/" }, { label: "Integrations", href: "/integrations" }, { label: n.name }];
  const noun = n.noun ?? `${n.name} posts`;

  return (
    <>
      <SeoJsonLd path={path} name={n.metaTitle} description={n.metaDescription} trail={trail} faqs={n.faqs} />
      <SiteNav />
      <main>
        <SeoHero
          trail={trail}
          eyebrow={<Eyebrow icon={<BrandTile platform={n.id} size={22} radius={6} />}>{n.eyebrow}</Eyebrow>}
          h1={n.h1}
          sub={n.sub}
          secondary={{ label: "See pricing", href: "/pricing" }}
          frame={`One draft, cut to fit ${n.name}`}
        >
          <NetworkComposerDemo network={n.id} text={n.demo.text} media={n.demo.media} />
        </SeoHero>

        <section className={section}>
          <SectionHead title={`What Postbase does on ${n.name}`} />
          <Facts items={n.facts} />
          <div className={`${card} mt-4 flex flex-col gap-3 p-7 md:flex-row md:items-center md:gap-8`}>
            <span className="self-start rounded-full bg-blue px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-on-blue md:self-center">
              {n.tiles.special.label}
            </span>
            <div>
              <h3 className="font-display text-[22px] font-semibold tracking-[-0.01em] text-ink">{n.tiles.special.title}</h3>
              <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-muted">{n.tiles.special.body}</p>
            </div>
          </div>
        </section>

        <section className={section}>
          <SectionHead
            title={
              <>
                Plan, write and post <Underlined>in one place</Underlined>
              </>
            }
            sub={`Schedule ${noun} from the calendar, from the built-in agent, or from Claude and other AI tools.`}
          />
          <NetworkTiles network={n.id} name={n.name} calendar={n.tiles.calendar} agent={n.tiles.agent} agentPrompt={n.tiles.agentPrompt} />
        </section>

        <section className={section}>
          <SectionHead title={`How to schedule ${noun}`} sub="Three steps, and the first one you only do once." />
          <Steps items={n.steps} />
        </section>

        <section className={section}>
          <SectionHead
            title={`Post to ${n.name} from your AI tools`}
            sub="Add the Postbase MCP server to the AI tool you already use and ask it to schedule posts for you."
          />
          <LinkCards
            items={CLIENTS.map((c) => ({
              href: `/ai/${c.slug}`,
              title: c.name,
              client: c.logo,
              body: c.kind === "chat" ? "Add Postbase as a connector." : c.kind === "terminal" ? "One command in your terminal." : "Add the server to your editor.",
            }))}
          />
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={n.faqs} />
        </section>

        <section className={section}>
          <SectionHead title="Every network you post to" />
          <LinkCards
            items={NETWORKS.filter((o) => o.slug !== n.slug).map((o) => ({
              href: `/integrations/${o.slug}`,
              title: o.name,
              brand: o.id,
              body: o.blurb,
              soon: !o.live,
            }))}
          />
        </section>

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body={`Plan next week's ${noun} in one sitting. Postbase fits each post to every network and publishes it on time.`}
            secondary={{ label: "See all integrations", href: "/integrations" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
