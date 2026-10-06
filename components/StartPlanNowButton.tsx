"use client";

import { SubmitButton } from "@/components/SubmitButton";
import { startPlanNow } from "@/app/(app)/billing-actions";

/** Ends the free trial early (charges now). Asks first: this takes money. */
export function StartPlanNowButton({ planName }: { planName: string }) {
  return (
    <form
      action={startPlanNow}
      onSubmit={(e) => {
        if (!window.confirm(`End your free trial and start ${planName} now? Your first payment is charged to your card today.`)) e.preventDefault();
      }}
    >
      <SubmitButton
        pendingLabel="Starting…"
        className="rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md disabled:opacity-60"
      >
        Start my plan now
      </SubmitButton>
    </form>
  );
}
