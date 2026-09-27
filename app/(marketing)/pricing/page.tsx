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
        <div className="mx-auto max-w-[640px] text-center">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.02em]">
            Let your AI post for you.
          </h1>
          <p className="mt-3 text-muted">
            One rail for X, LinkedIn, TikTok, YouTube, Bluesky, and Mastodon — plus an MCP
            server so your agent can publish too. Start with a 7-day free trial.
          </p>
        </div>

        <div className="mt-10">
          <PlanPicker />
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Prices in US dollars, including any sales tax or VAT. Checkout can show your local currency.
        </p>

        <p className="mx-auto mt-10 max-w-[640px] text-center text-sm text-muted">
          Prefer to self-host? Postbase is open source — run it yourself for free. Hosted cloud
          is the paid, managed option.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
