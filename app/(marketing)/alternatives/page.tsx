import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { COMPETITORS, COMPETITOR_LOGO, US, competitorCard } from "@/lib/seo/competitors";
import { CtaBand, wrap } from "@/components/marketing/ui";
import { LinkCards, SectionHead, SeoHero, section } from "@/components/marketing/seo/sections";
import { AlternativeTiles } from "@/components/marketing/seo/demos";
import { CompareDecor, CompareDemo, type CompareItem } from "@/components/marketing/seo/CompareDemo";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";

const TITLE = "Postbase alternatives and comparisons";
const DESCRIPTION =
  "Honest comparisons of Postbase with Buffer, Hootsuite, Sprout Social, Later, Typefully, Publer and more: pricing, networks, API and MCP.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Alternatives" }];

export const metadata: Metadata = { title: "Postbase alternatives and comparisons", description: DESCRIPTION, ...pageMeta("/alternatives", { ownImage: true }) };

// The hero card's rows: the ones that differ most across tools.
const HERO_ROWS = ["price", "mcp", "api", "oss"] as const;

const ITEMS: CompareItem[] = COMPETITORS.map((c) => ({
  slug: c.slug,
  name: c.name,
  logo: COMPETITOR_LOGO[c.slug].src,
  rows: HERO_ROWS.map((k) => {
    const r = c.rows.find((x) => x.key === k)!;
    return { label: r.label, us: US[k], them: r.them };
  }),
}));

export default function AlternativesPage() {
  return (
    <>
      <SeoJsonLd path="/alternatives" name={TITLE} description={DESCRIPTION} trail={TRAIL} />
      <SiteNav />
      <main>
        <div className="relative isolate">
          <CompareDecor logos={ITEMS.map((c) => c.logo)} />
          <SeoHero
            trail={TRAIL}
            h1={["How Postbase", "compares"]}
            sub="Side-by-side comparisons with the tools people usually look at, including when the other one is the better pick."
            frame="Pick a tool to compare"
          >
            <CompareDemo items={ITEMS} />
          </SeoHero>
        </div>

        <section className={section}>
          <SectionHead title="Comparisons" />
          <LinkCards items={COMPETITORS.map(competitorCard)} />
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
