import { SiteNav } from "@/components/SiteNav";
import { pageMeta } from "@/lib/site";
import { SiteFooter } from "@/components/SiteFooter";
import { PlanPicker } from "@/components/PlanPicker";
import { JsonLd } from "@/components/marketing/JsonLd";
import { PricingDecor } from "@/components/marketing/Decor";
import { CtaBand, wrap } from "@/components/marketing/ui";
import { CompareTable, IncludedGrid, PricingFaq } from "@/components/marketing/PricingSections";

export const metadata = {
  title: "Pricing: plans from $29/month",
  description:
    "Postbase starts at $29/month with a 7-day free trial, including every network, the MCP server and the API. Agencies get 20 client workspaces on one $99 bill. Or self-host it for free.",
  ...pageMeta("/pricing"),
};

export default function PricingPage() {
  return (
    <>
      <JsonLd description={metadata.description as string} />
      <SiteNav />
      <main>
        <section className="relative isolate">
          <PricingDecor />
          <div className={`${wrap} pt-14 md:pt-20`}>
            <div className="mx-auto max-w-[760px] text-center">
              <h1 className="text-balance font-display text-[clamp(40px,6vw,72px)] font-semibold leading-[1.04] tracking-[-0.04em] text-ink">
                Simple pricing, seven days free
              </h1>
              <p className="mx-auto mt-5 max-w-[56ch] text-balance text-[17px] leading-relaxed text-muted md:text-[19px]">
                Every plan includes X, LinkedIn, TikTok, YouTube, Bluesky and Mastodon, the AI agent and
                the MCP server. Pick by how many workspaces, channels and people you need.
              </p>
            </div>

            <div className="mt-12">
              <PlanPicker showSelfHost />
            </div>
          </div>
        </section>

        <CompareTable />
        <IncludedGrid />
        <PricingFaq />

        <section className={`${wrap} pb-24 pt-28 md:pt-36`}>
          <CtaBand
            title="Start posting this week"
            body="Connect your accounts, write your first post and schedule it in a few minutes. Seven days free, cancel anytime."
            secondary={{ label: "Compare plans", href: "#compare" }}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
