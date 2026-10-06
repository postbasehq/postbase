import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/site";
import { listWeeks } from "@/lib/changelog";
import { CtaBand, wrap } from "@/components/marketing/ui";
import { SeoHero, section } from "@/components/marketing/seo/sections";
import { HeroDecor } from "@/components/marketing/Decor";
import { SeoJsonLd } from "@/components/marketing/seo/SeoJsonLd";
import { ChangelogBrowser } from "@/components/marketing/changelog/ChangelogBrowser";

const TITLE = "Changelog: what's new in Postbase";
const DESCRIPTION =
  "Every week's new features, improvements and fixes in Postbase, the open-source social media scheduler with an MCP server for AI agents.";
const TRAIL = [{ label: "Home", href: "/" }, { label: "Changelog" }];

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · Postbase` },
  description: DESCRIPTION,
  ...pageMeta("/changelog", { ownImage: true }),
  alternates: { canonical: "/changelog", types: { "application/rss+xml": "/changelog/rss.xml" } },
};

export default function ChangelogPage() {
  const weeks = listWeeks();
  return (
    <>
      <SeoJsonLd path="/changelog" name={TITLE} description={DESCRIPTION} trail={TRAIL} />
      <SiteNav />
      <main>
        <div className="relative isolate">
          <HeroDecor />
          <SeoHero
            trail={TRAIL}
            h1={["What's new in", "Postbase"]}
            sub="New features, improvements and fixes, every week. Pick a colour to filter, or open any change for the details."
            secondary={{ label: "Follow by RSS", href: "/changelog/rss.xml" }}
          />
        </div>

        <section className={`${section} !pt-14`}>
          <ChangelogBrowser weeks={weeks} />
        </section>

        <section className={`${wrap} py-24 md:py-32`}>
          <CtaBand
            body="Try everything above free for 7 days. Every plan includes every network, the MCP server and the API."
            secondary={{ label: "See pricing", href: "/pricing" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
