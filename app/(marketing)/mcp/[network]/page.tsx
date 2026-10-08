import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CLIENTS } from "@/lib/seo/clients";
import { COMBO_CLIENTS } from "@/lib/seo/combos";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { MCP_NETWORKS, MCP_SCENES, mcpNetwork } from "@/lib/seo/mcp";
import { CtaBand, FaqList, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { McpInActionDemo } from "@/components/marketing/seo/McpDemo";
import { ChecksPanel, McpFacts, McpTools } from "@/components/marketing/seo/McpTools";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { RelatedPosts } from "@/components/marketing/blog/RelatedPosts";

export const dynamicParams = false;

export function generateStaticParams() {
  return MCP_NETWORKS.map((m) => ({ network: m.slug }));
}

type Params = Promise<{ network: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { network } = await params;
  const m = mcpNetwork(network);
  if (!m) return {};
  return {
    title: { absolute: `${m.metaTitle} · Postbase` },
    description: m.metaDescription,
    ...pageMeta(`/mcp/${network}`, { ownImage: true }),
  };
}


export default async function McpNetworkPage({ params }: { params: Params }) {
  const { network } = await params;
  const m = mcpNetwork(network);
  const n = LIVE_NETWORKS.find((x) => x.slug === network);
  if (!m || !n) notFound();
  const path = `/mcp/${network}`;
  const trail = [{ label: "Home", href: "/" }, { label: "MCP server", href: "/mcp" }, { label: n.name }];

  return (
    <>
      <SeoJsonLd path={path} name={m.metaTitle} description={m.metaDescription} trail={trail} faqs={m.faqs} />
      <SiteNav />
      <main>
        <SeoHero
          trail={trail}
          h1={m.h1}
          icons={[{ before: n.name.split(" ")[0], brand: n.id }]}
          sub={m.sub}
          cta={{ label: "Connect in a minute", href: "/login" }}
          secondary={{ label: "The MCP server", href: "/mcp" }}
          frame={`Claude scheduling to ${n.name} through Postbase`}
        >
          <McpInActionDemo scene={MCP_SCENES[m.slug]} />
        </SeoHero>

        <section className={section}>
          <SectionHead title={`How posting to ${n.name} works`} />
          <McpFacts network={n.id} items={m.behaviour} />
        </section>

        <section className={section}>
          <ChecksPanel items={m.checks} />
        </section>

        <section className={section}>
          <SectionHead title="The tools" sub="The same five tools on every network." />
          <McpTools />
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={m.faqs} />
        </section>

        <section className={section}>
          <SectionHead title="Related" />
          <LinkCards
            items={[
              ...COMBO_CLIENTS.map((c) => {
                const o = CLIENTS.find((x) => x.slug === c)!;
                return { href: `/ai/${c}/${network}`, title: `${o.name} + ${n.name}`, client: o.logo, body: `Set up ${o.name} to post to ${n.name}.` };
              }),
              ...MCP_NETWORKS.filter((x) => x.slug !== network).map((x) => {
                const o = LIVE_NETWORKS.find((l) => l.slug === x.slug)!;
                return { href: `/mcp/${x.slug}`, title: `${o.name} MCP server`, brand: o.id, body: x.behaviour[0].value };
              }),
              { href: `/integrations/${n.slug}`, title: n.eyebrow, brand: n.id, body: n.blurb },
            ]}
          />
        </section>

        <RelatedPosts path={path} />

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            developers
            body={`Connect your AI tool in a minute. It schedules your ${n.name} posts, and you see every one in your calendar.`}
            secondary={{ label: "Read the docs", href: "https://docs.postbase.so/mcp/tools" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
