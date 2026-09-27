import { SiteNav } from "@/components/SiteNav";
import { pageMeta } from "@/lib/site";
import { SiteFooter } from "@/components/SiteFooter";
import { PlanPicker } from "@/components/PlanPicker";
import { JsonLd } from "@/components/marketing/JsonLd";

export const metadata = {
  title: "Pricing: plans from $29/month",
  description:
    "Postbase starts at $29/month with a 7-day free trial, including every network, the MCP server and the API. Or self-host it for free.",
  ...pageMeta("/pricing"),
};

export default function PricingPage() {
  return (
    <>
      <JsonLd description={metadata.description as string} />
      <SiteNav />
      <main className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="mx-auto max-w-[760px] text-center">
          <h1 className="text-balance font-display text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
            Simple pricing, seven days free
          </h1>
          <p className="mx-auto mt-3 max-w-[620px] text-[16px] text-muted">
            Every plan includes X, LinkedIn, TikTok, YouTube, Bluesky and Mastodon, the AI agent and
            the MCP server. Pick by how many channels and people you need.
          </p>
        </div>

        <div className="mt-10">
          <PlanPicker showSelfHost />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
