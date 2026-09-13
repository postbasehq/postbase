"use client";

import { useState } from "react";
import { PLAN_ORDER, PLANS } from "@/lib/plans";

/**
 * Plan cards with a monthly/annual toggle. On the billing page each card submits
 * to the `startCheckout` server action; the current plan is marked.
 */
export function PlanPicker({
  action,
  currentPlan,
}: {
  action?: (formData: FormData) => Promise<void>;
  currentPlan?: string | null;
}) {
  const [interval, setInterval] = useState<"month" | "year">("month");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 self-center rounded-full border border-line bg-surface p-1 text-sm shadow-sm">
        {(["month", "year"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setInterval(v)}
            className={`rounded-full px-4 py-1.5 font-medium ${
              interval === v ? "bg-blue text-on-blue" : "text-muted hover:text-ink"
            }`}
          >
            {v === "month" ? "Monthly" : "Annual"}
            {v === "year" ? <span className="ml-1.5 text-xs opacity-80">2 months free</span> : null}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const price = interval === "year" ? Math.round((p.monthly * 10) / 12) : p.monthly;
          const isCurrent = currentPlan === id;
          const featured = id === "team";
          return (
            <div
              key={id}
              className={`flex flex-col gap-4 rounded-2xl border bg-surface p-5 shadow-sm ${
                featured ? "border-blue" : "border-line"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                  {featured ? (
                    <span className="rounded-full bg-blue-soft px-2 py-0.5 text-[11px] font-semibold text-blue-ink">
                      Popular
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted">{p.blurb}</p>
              </div>

              <div className="flex items-end gap-1">
                <span className="font-display text-3xl font-semibold tracking-[-0.02em]">${price}</span>
                <span className="pb-1 text-sm text-muted">/mo</span>
                {interval === "year" ? (
                  <span className="ml-auto pb-1 text-xs text-muted">billed yearly</span>
                ) : null}
              </div>

              <ul className="flex flex-col gap-1.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-green" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {action ? (
                  <form action={action}>
                    <input type="hidden" name="plan" value={id} />
                    <input type="hidden" name="interval" value={interval} />
                    <button
                      type="submit"
                      disabled={isCurrent}
                      className={`w-full rounded-full px-4 py-2.5 font-display text-sm font-semibold shadow-sm transition-shadow hover:shadow-md disabled:cursor-default disabled:opacity-60 ${
                        featured ? "bg-blue text-on-blue" : "border border-line text-blue-ink hover:bg-surface-2"
                      }`}
                    >
                      {isCurrent ? "Current plan" : "Start 7-day trial"}
                    </button>
                  </form>
                ) : (
                  <a
                    href="/billing"
                    className={`block w-full rounded-full px-4 py-2.5 text-center font-display text-sm font-semibold shadow-sm ${
                      featured ? "bg-blue text-on-blue" : "border border-line text-blue-ink hover:bg-surface-2"
                    }`}
                  >
                    Start 7-day trial
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted">
        7-day free trial, card required. X uses your own API key (BYOK). Cancel anytime.
      </p>
    </div>
  );
}
