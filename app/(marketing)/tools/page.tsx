import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CtaBand, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";

const DESCRIPTION = "Free tools for posting to social media: a character counter and thread splitter, an image and video size guide, and an MCP config generator for AI tools.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Tools" }];

export const metadata: Metadata = { title: "Free social media tools", description: DESCRIPTION, ...pageMeta("/tools") };

export default function ToolsPage() {
  return (
    <>
      <SeoJsonLd path="/tools" name="Free tools" description={DESCRIPTION} trail={TRAIL} />
      <SiteNav />
      <main>
        <SeoHero trail={TRAIL} h1={["Free tools for", "posting"]} sub={DESCRIPTION} />
        <section className={section}>
          <SectionHead title="Tools" />
          <LinkCards
            items={[
              {
                href: "/tools/character-counter",
                title: "Character counter",
                brand: "x",
                body: "Count a post per network and split it into a thread.",
              },
              {
                href: "/tools/social-media-image-sizes",
                title: "Image and video sizes",
                brand: "instagram",
                body: "Every image and video size for nine networks.",
              },
              {
                href: "/tools/mcp-config",
                title: "MCP config generator",
                client: "claude",
                body: "The exact MCP setup for your AI tool, ready to paste.",
              },
            ]}
          />
        </section>
        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand body="Schedule to every network from one calendar, or let your AI agent do it." secondary={{ label: "Read the blog", href: "/blog" }} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
