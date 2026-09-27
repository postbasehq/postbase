import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CLIENTS } from "@/lib/seo/clients";
import { CtaBand, wrap } from "@/components/marketing/ui";
import { Eyebrow, LinkCards, SectionHead, SeoHero, Steps, section } from "@/components/marketing/seo/sections";
import { ClientSetupDemo, ClientTiles } from "@/components/marketing/seo/demos";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";

const TITLE = "Social media MCP server for Claude, Cursor and AI agents";
const DESCRIPTION =
  "Connect Claude, Claude Code, Cursor, VS Code, Windsurf or Gemini CLI to Postbase over MCP and let your AI schedule posts to X, LinkedIn, Bluesky and Mastodon.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "AI tools" }];

export const metadata: Metadata = { title: TITLE, description: DESCRIPTION, ...pageMeta("/ai", { ownImage: true }) };

const claude = CLIENTS[0];

export default function AiPage() {
  return (
    <>
      <SeoJsonLd path="/ai" name={TITLE} description={DESCRIPTION} trail={TRAIL} />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          eyebrow={<Eyebrow>MCP server</Eyebrow>}
          h1={["Let your AI post to", "social media"]}
          sub="Postbase has a hosted MCP server. Add it to the AI tool you already use, sign in, and ask it to schedule posts for you."
          cta={{ label: "Connect in a minute", href: "/login" }}
          secondary={{ label: "Read the docs", href: "https://docs.postbase.so/mcp/connect" }}
          frame="Connect your AI tool from the Developers page"
        >
          <ClientSetupDemo client={{ logo: claude.logo, name: claude.name, setup: claude.setup }} />
        </SeoHero>

        <section className={section}>
          <SectionHead title="Pick your AI tool" sub="Each one takes about a minute to set up." />
          <LinkCards
            items={CLIENTS.map((c) => ({ href: `/ai/${c.slug}`, title: c.name, client: c.logo, body: c.metaDescription.split(". ")[0] + "." }))}
          />
        </section>

        <section className={section}>
          <SectionHead title="How it works" />
          <Steps
            items={[
              { title: "Add the server", body: "Paste the Postbase server URL into your AI tool, or run one command in your terminal." },
              {
                title: "Sign in to Postbase",
                body: "Pick the workspace your AI may post to. There's no API key to copy, and you can revoke access any time.",
              },
              {
                title: "Ask for a post",
                body: "Tell it what to post, where and when. Everything it schedules lands in your Postbase calendar.",
              },
            ]}
          />
        </section>

        <section className={section}>
          <SectionHead title="You stay in control" />
          <ClientTiles name="Your agent" />
        </section>

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
