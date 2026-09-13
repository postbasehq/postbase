import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PlanPicker } from "@/components/PlanPicker";

export const metadata = {
  title: "Pricing — Postbase",
  description: "Simple plans for creators. Post everywhere, even from your AI.",
};

export default function PricingPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-[1120px] px-6 py-16">
        <div className="mx-auto max-w-[640px] text-center">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.02em]">
            Post everywhere. Even from your AI.
          </h1>
          <p className="mt-3 text-muted">
            One rail for X, Instagram, LinkedIn, and TikTok — plus an MCP server so your agent
            can publish too. Start with a 7-day free trial.
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
