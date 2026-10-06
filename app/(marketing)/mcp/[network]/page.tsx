import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CLIENTS } from "@/lib/seo/clients";
import { COMBO_CLIENTS } from "@/lib/seo/combos";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { MCP_NETWORKS, MCP_URL, mcpNetwork } from "@/lib/seo/mcp";
import { CtaBand, FaqList, card, wrap } from "@/components/marketing/ui";
import { CodeBlock, Facts, LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { ClientSetupDemo } from "@/components/marketing/seo/demos";
import { McpTools } from "@/components/marketing/seo/McpTools";
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

const claude = CLIENTS[0];

export default async function McpNetworkPage({ params }: { params: Params }) {
  const { network } = await params;
  const m = mcpNetwork(network);
  const n = LIVE_NETWORKS.find((x) => x.slug === network);
  if (!m || !n) notFound();
  const path = `/mcp/${network}`;
  const trail = [{ label: "Home", href: "/" }, { label: "MCP server", href: "/mcp" }, { label: n.name }];
  const call = JSON.stringify({ name: "create_post", arguments: m.example.args }, null, 2);

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
          frame={`Add ${MCP_URL} to your AI tool`}
        >
          <ClientSetupDemo client={{ logo: claude.logo, name: claude.name, setup: claude.setup }} />
        </SeoHero>

        <section className={section}>
          <SectionHead title={`How posting to ${n.name} works`} />
          <Facts items={m.behaviour} />
        </section>

        <section className={section}>
          <SectionHead title="An example call" sub={`What your AI tool sends to create_post. Get channel ids from list_channels.`} />
          <CodeBlock language="json" code={call} caption={m.example.caption} />
        </section>

        <section className={section}>
          <SectionHead title="Checked before it's queued" sub="Problems come back to the agent when it calls the tool, not hours later when the post is due." />
          <div className={`${card} mx-auto max-w-[820px] p-7`}>
            <ul className="flex flex-col gap-2.5">
              {m.checks.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={section}>
          <SectionHead title="The tools" sub="The same four tools on every network." />
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
