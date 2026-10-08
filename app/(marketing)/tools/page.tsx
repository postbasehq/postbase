import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { CtaBand, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { TOOLS } from "@/lib/seo/related";

const DESCRIPTION = "Free tools for posting to social media: a character counter and thread splitter, a LinkedIn text formatter, a post preview for eight networks, an image and video size guide, and an MCP config generator.";
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
          <LinkCards items={Object.values(TOOLS)} />
        </section>
        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand body="Schedule to every network from one calendar, or let your AI agent do it." secondary={{ label: "Read the blog", href: "/blog" }} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
