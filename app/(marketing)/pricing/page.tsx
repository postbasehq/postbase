import { SiteNav } from "@/components/SiteNav";
import { pageMeta } from "@/lib/site";
import { SiteFooter } from "@/components/SiteFooter";
import { PlanPicker } from "@/components/PlanPicker";

export const metadata = {
  title: "Pricing",
  description:
    "Postbase plans start at $29/month with a 7-day free trial: every network, the MCP server and the API included. Or self-host the open-source version for free.",
  ...pageMeta("/pricing"),
};

export default function PricingPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="mx-auto max-w-[640px] text-center">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.02em]">
            Let your AI post for you.
          </h1>
          <p className="mt-3 text-muted">
            One rail for X, LinkedIn, Instagram, TikTok, YouTube, Bluesky, and Mastodon — plus an MCP
            server so your agent can publish too. Start with a 7-day free trial.
          </p>
        </div>

        <div className="mt-10">
          <PlanPicker />
        </div>

        <p className="mx-auto mt-10 max-w-[640px] text-center text-sm text-muted">
          Prefer to self-host? Postbase is open source — run it yourself for free. Hosted cloud
          is the paid, managed option.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
