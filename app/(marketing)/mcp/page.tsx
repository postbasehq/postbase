import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CLIENTS } from "@/lib/seo/clients";
import { LIVE_NETWORKS } from "@/lib/seo/networks";
import { MCP_FACTS, MCP_FAQS, MCP_NETWORKS, MCP_URL } from "@/lib/seo/mcp";
import { CtaBand, FaqList, wrap } from "@/components/marketing/ui";
import { CodeBlock, Facts, LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { ClientSetupDemo } from "@/components/marketing/seo/demos";
import { McpTools } from "@/components/marketing/seo/McpTools";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { RelatedPosts } from "@/components/marketing/blog/RelatedPosts";

const TITLE = "Social media MCP server (hosted, OAuth sign-in)";
const DESCRIPTION =
  "The Postbase MCP server lets Claude, ChatGPT, Cursor and other AI tools schedule posts and threads to X, LinkedIn, Bluesky and Mastodon. Hosted, open source.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "MCP server" }];

export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, ...pageMeta("/mcp", { ownImage: true }) };

const claude = CLIENTS[0];

const REMOTE = JSON.stringify({ mcpServers: { postbase: { url: MCP_URL } } }, null, 2);
const LOCAL = JSON.stringify(
  { mcpServers: { postbase: { command: "npx", args: ["-y", "@postbasehq/mcp"], env: { POSTBASE_API_KEY: "pb_live_…" } } } },
  null,
  2,
);

export default function McpPage() {
  return (
    <>
      <SeoJsonLd path="/mcp" name={TITLE} description={DESCRIPTION} trail={TRAIL} faqs={MCP_FAQS} />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          h1={["The social media", "MCP server"]}
          sub="One hosted server that lets Claude, ChatGPT, Cursor or any MCP client draft and schedule posts and threads to X, LinkedIn, Bluesky and Mastodon. Sign in with Postbase: no API key, and every post lands on a calendar you can check."
          cta={{ label: "Connect in a minute", href: "/login" }}
          secondary={{ label: "Tool reference", href: "https://docs.postbase.so/mcp/tools" }}
          frame="Add the server, sign in, ask for a post"
        >
          <ClientSetupDemo client={{ logo: claude.logo, name: claude.name, setup: claude.setup }} />
        </SeoHero>

        <section className={section}>
          <SectionHead title="The server at a glance" />
          <Facts items={MCP_FACTS} />
        </section>

        <section className={section}>
          <SectionHead
            title="Four tools, nothing destructive"
            sub="The agent can read your channels and queue, create drafts and scheduled posts, and cancel one before it goes out. It can't delete anything."
          />
          <McpTools />
        </section>

        <section className={section}>
          <SectionHead title="Per network" sub="What create_post does on each network, with example calls." />
          <LinkCards
            items={MCP_NETWORKS.map((m) => {
              const n = LIVE_NETWORKS.find((x) => x.slug === m.slug)!;
              return { href: `/mcp/${m.slug}`, title: `${n.name} MCP server`, brand: n.id, body: m.behaviour[0].value };
            })}
          />
        </section>

        <section className={section}>
          <SectionHead
            title="Two ways to connect"
            sub="Most AI tools take the hosted URL and sign you in with OAuth. If yours only runs local servers, use the npm package with an API key."
          />
          <div className="flex flex-col gap-8">
            <CodeBlock language="json" code={REMOTE} caption="Hosted, with OAuth sign-in" />
            <CodeBlock language="json" code={LOCAL} caption="Local, with an API key (npm @postbasehq/mcp)" />
          </div>
        </section>

        <section className={section}>
          <SectionHead title="Setup for your AI tool" sub="Step-by-step guides, each about a minute." />
          <LinkCards items={CLIENTS.map((c) => ({ href: `/ai/${c.slug}`, title: c.name, client: c.logo, body: c.blurb }))} />
        </section>

        <section className={section}>
          <SectionHead title="Frequently asked questions" />
          <FaqList items={MCP_FAQS} />
        </section>

        <RelatedPosts path="/mcp" />

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            developers
            body="Connect your agent in a minute. It drafts and schedules, and you see every post in your calendar."
            secondary={{ label: "Read the docs", href: "https://docs.postbase.so/mcp/connect" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
