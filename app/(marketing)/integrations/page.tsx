import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { NETWORKS } from "@/lib/seo/networks";
import { CLIENTS } from "@/lib/seo/clients";
import { CtaBand, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { CalendarHeroDemo } from "@/components/marketing/seo/demos";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";

const TITLE = "Integrations: every network Postbase posts to";
const DESCRIPTION =
  "Schedule posts to X, LinkedIn, Bluesky, Mastodon, TikTok and YouTube from one calendar, and connect Claude, Cursor and other AI tools over MCP.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Integrations" }];

export const metadata: Metadata = { title: "Integrations: X, LinkedIn, TikTok, YouTube and more", description: DESCRIPTION, ...pageMeta("/integrations", { ownImage: true }) };

export default function IntegrationsPage() {
  return (
    <>
      <SeoJsonLd path="/integrations" name={TITLE} description={DESCRIPTION} trail={TRAIL} />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          h1={["Every network,", "one calendar"]}
          sub="Connect your accounts once, then write, schedule and publish to all of them from the composer, the calendar or your AI agent."
          frame="Your whole week in one calendar"
        >
          <CalendarHeroDemo />
        </SeoHero>

        <section className={section}>
          <SectionHead title="Social networks" sub="Each network gets its own version of your post, checked against its limits as you type." />
          <LinkCards
            items={NETWORKS.map((n) => ({ href: `/integrations/${n.slug}`, title: n.name, brand: n.id, body: n.blurb, soon: !n.live }))}
          />
        </section>

        <section className={section}>
          <SectionHead title="AI tools" sub="Add the Postbase MCP server and your AI tool can schedule posts for you." />
          <LinkCards
            items={CLIENTS.map((c) => ({ href: `/ai/${c.slug}`, title: c.name, client: c.logo, body: c.metaDescription.split(". ")[0] + "." }))}
          />
        </section>

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body="Connect your first account in a minute. Every plan includes every network, the MCP server and the API."
            secondary={{ label: "See pricing", href: "/pricing" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
