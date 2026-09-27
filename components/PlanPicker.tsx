"use client";

import { useState } from "react";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { SubmitButton } from "@/components/SubmitButton";

type Interval = "month" | "year";

/** Yearly billing is 10x monthly (two months free). */
const yearly = (monthly: number) => monthly * 10;
const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

function Check() {
  return (
    <svg
      className="mt-[3px] shrink-0 text-blue"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

/**
 * The one set of plan cards, used on the homepage, /pricing and /billing.
 * Marketing (no `action`): each card links to /billing?plan=&interval=, which
 * sends signed-out visitors through sign-in and back. Billing (`action` set):
 * each card submits to startCheckout (which opens the portal if already
 * subscribed); `currentPlan` is only set for a live subscription.
 */
export function PlanPicker({
  action,
  currentPlan,
  initialInterval = "month",
  chosenPlan,
  showSelfHost = false,
}: {
  action?: (formData: FormData) => Promise<void>;
  currentPlan?: string | null;
  initialInterval?: Interval;
  /** Plan picked on the pricing page before sign-in; featured on the billing page. */
  chosenPlan?: string | null;
  /** Marketing pages: add the self-host card under the plans. */
  showSelfHost?: boolean;
}) {
  const [interval, setInterval] = useState<Interval>(initialInterval);
  const subscribed = Boolean(currentPlan);
  const chosen = chosenPlan != null && chosenPlan in PLANS ? chosenPlan : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 text-[14px] shadow-sm"
        >
          {(["month", "year"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={interval === v}
              onClick={() => setInterval(v)}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
                interval === v ? "bg-blue text-on-blue" : "text-muted hover:text-ink"
              }`}
            >
              {v === "month" ? "Monthly" : "Yearly"}
              {v === "year" ? <span className="ml-1.5 text-[12px] opacity-80">2 months free</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = currentPlan === id;
          const featured = chosen ? id === chosen : id === "team";
          const perMonth = interval === "year" ? yearly(p.monthly) / 12 : p.monthly;
          const billed =
            interval === "year"
              ? `${money(yearly(p.monthly))} billed yearly · save ${money(p.monthly * 2)}`
              : "Billed monthly";
          const cta = isCurrent ? "Current plan" : subscribed ? `Switch to ${p.name}` : "Start 7-day free trial";
          const buttonCls = `block w-full rounded-full px-4 py-3 text-center font-display text-[14px] font-semibold transition-shadow disabled:cursor-default disabled:opacity-60 ${
            featured
              ? "bg-blue text-on-blue shadow-sm hover:shadow-md"
              : "border border-line bg-surface text-ink hover:border-ink"
          }`;

          return (
            <div
              key={id}
              className={`relative flex flex-col rounded-2xl border bg-surface p-6 shadow-sm ${
                featured ? "border-blue ring-1 ring-blue" : "border-line"
              }`}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[18px] font-semibold text-ink">{p.name}</h3>
                {isCurrent ? (
                  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-ink">
                    Your plan
                  </span>
                ) : featured ? (
                  <span className="rounded-full bg-blue px-2 py-0.5 text-[11px] font-semibold text-on-blue">
                    {chosen ? "Your pick" : "Most popular"}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[14px] text-muted">{p.blurb}</p>

              <div className="mt-5 flex items-end gap-1">
                <span className="font-display text-[44px] font-semibold leading-none tracking-[-0.035em] text-ink">
                  {money(perMonth)}
                </span>
                <span className="pb-1 text-[14px] font-medium text-muted">/month</span>
              </div>
              <p className="mt-1.5 text-[13px] text-muted">{billed}</p>

              {/* The two limits that decide the plan */}
              <div className="mt-5 grid grid-cols-2 divide-x divide-line rounded-xl border border-line">
                <div className="px-3 py-2.5">
                  <div className="font-display text-[20px] font-semibold leading-none text-ink">{p.channels}</div>
                  <div className="mt-1 text-[12px] text-muted">social channels</div>
                </div>
                <div className="px-3 py-2.5">
                  <div className="font-display text-[20px] font-semibold leading-none text-ink">{p.seats}</div>
                  <div className="mt-1 text-[12px] text-muted">{p.seats === 1 ? "person" : "people"}</div>
                </div>
              </div>

              <div className="mt-5">
                {action ? (
                  <form action={action}>
                    <input type="hidden" name="plan" value={id} />
                    <input type="hidden" name="interval" value={interval} />
                    <SubmitButton disabled={isCurrent} pendingLabel="Opening checkout…" className={buttonCls}>
                      {cta}
                    </SubmitButton>
                  </form>
                ) : (
                  <a href={`/billing?plan=${id}&interval=${interval}`} className={buttonCls}>
                    {cta}
                  </a>
                )}
                {!subscribed ? (
                  <p className="mt-2 text-center text-[12px] text-muted">
                    $0 today, then {interval === "year" ? `${money(yearly(p.monthly))}/year` : `${money(p.monthly)}/month`}
                  </p>
                ) : null}
              </div>

              <div className="mt-6 border-t border-line pt-5">
                {p.inherits ? <p className="mb-3 text-[13px] font-semibold text-ink">{p.inherits}</p> : null}
                <ul className="flex flex-col gap-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] leading-snug text-ink">
                      <Check />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[13px] text-muted">
        7-day free trial, card required. Cancel before it ends and you won&apos;t be charged. Prices in US
        dollars, including any sales tax or VAT.
      </p>

      {showSelfHost ? (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface px-6 py-5 shadow-sm">
          <div>
            <div className="font-display text-[16px] font-semibold text-ink">Self-host for free</div>
            <p className="mt-0.5 text-[14px] text-muted">
              Postbase is open source. Run the same product on your own servers, with your own platform API keys.
            </p>
          </div>
          <a
            href="https://github.com/postbasehq/postbase"
            className="ml-auto rounded-full border border-line px-5 py-2.5 font-display text-[14px] font-semibold text-ink transition-colors hover:border-ink"
          >
            View on GitHub
          </a>
        </div>
      ) : null}
    </div>
  );
}
