import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { COMPETITORS } from "@/lib/seo/competitors";
import { CtaBand, wrap } from "@/components/marketing/ui";
import { Eyebrow, LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { AlternativeTiles, CalendarHeroDemo } from "@/components/marketing/seo/demos";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";

const TITLE = "Postbase alternatives and comparisons";
const DESCRIPTION =
  "Honest comparisons of Postbase with Buffer, Hootsuite, Sprout Social, Later, Typefully, Publer and more: pricing, networks, API and MCP.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Alternatives" }];

export const metadata: Metadata = { title: "Postbase alternatives and comparisons", description: DESCRIPTION, ...pageMeta("/alternatives", { ownImage: true }) };

export default function AlternativesPage() {
  return (
    <>
      <SeoJsonLd path="/alternatives" name={TITLE} description={DESCRIPTION} trail={TRAIL} />
      <SiteNav />
      <main>
        <SeoHero
          trail={TRAIL}
          eyebrow={<Eyebrow>Compare</Eyebrow>}
          h1={["How Postbase", "compares"]}
          sub="Side-by-side comparisons with the tools people usually look at, including when the other one is the better pick."
          frame="Your whole week in one calendar"
        >
          <CalendarHeroDemo />
        </SeoHero>

        <section className={section}>
          <SectionHead title="Comparisons" />
          <LinkCards items={COMPETITORS.map((c) => ({ href: `/alternatives/${c.slug}`, title: `Postbase vs ${c.name}`, body: c.them }))} />
        </section>

        <section className={section}>
          <SectionHead title="What you get with Postbase" />
          <AlternativeTiles />
        </section>

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body="Try it for a week. Every plan includes every network, the MCP server and the API."
            secondary={{ label: "See pricing", href: "/pricing" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
