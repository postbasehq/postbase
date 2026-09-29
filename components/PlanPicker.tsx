"use client";

import { useEffect, useState } from "react";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { SubmitButton } from "@/components/SubmitButton";
import { LogoMark } from "@/components/marketing/Decor";

type Interval = "month" | "year";

/** Yearly billing is 10x monthly (two months free). */
const yearly = (monthly: number) => monthly * 10;
const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

// Postbase blue for monthly, amber for yearly (fixed hexes, same in light and dark).
const BLUE = "#2b59d9";
const AMBER = "#e3a72c";

function Check({ yearly: y }: { yearly: boolean }) {
  return (
    <svg className="mt-[1px] shrink-0" width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="9" cy="9" r="9" fill={y ? AMBER : BLUE} />
      <path d="m5.2 9.3 2.5 2.5 5-5.4" fill="none" stroke={y ? "#14161a" : "#fff"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChannelsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
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
  const chosen = chosenPlan != null && chosenPlan in PLANS ? chosenPlan : null;

  return (
    <div className="flex flex-col gap-6">
      <IntervalToggle interval={interval} onChange={setInterval} />

      <div className="grid gap-4 md:grid-cols-3 md:py-3">
        {PLAN_ORDER.map((id) => {
          const featured = chosen ? id === chosen : id === "team";
          return (
            <PlanCard
              key={id}
              id={id}
              interval={interval}
              featured={featured}
              badge={featured ? (chosen ? "Your pick" : "Most popular") : undefined}
              currentPlan={currentPlan}
              action={action}
              className={featured ? "md:-my-3" : ""}
            />
          );
        })}
      </div>

      <p className="text-center text-[13px] text-muted">
        7-day free trial, card required. Cancel before it ends and you won&apos;t be charged. Prices in US
        dollars, including any sales tax or VAT.
      </p>

      {showSelfHost ? <SelfHostCard /> : null}
    </div>
  );
}

function IntervalToggle({ interval, onChange }: { interval: Interval; onChange: (v: Interval) => void }) {
  return (
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
            onClick={() => onChange(v)}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              interval !== v
                ? "text-muted hover:text-ink"
                : v === "year"
                  ? "bg-[#e3a72c] text-[#14161a]"
                  : "bg-[#2b59d9] text-white"
            }`}
          >
            {v === "month" ? "Monthly" : "Yearly"}
            {v === "year" ? <span className="ml-1.5 text-[12px] opacity-80">2 months free</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One recommended plan with its own Monthly/Yearly switch (persona pages). */
export function RecommendedPlan({ id, badge }: { id: keyof typeof PLANS; badge: string }) {
  const [interval, setInterval] = useState<Interval>("month");
  return (
    <div className="flex flex-col gap-6">
      <IntervalToggle interval={interval} onChange={setInterval} />
      <PlanCard id={id} interval={interval} featured badge={badge} className="mx-auto w-full max-w-[400px]" />
    </div>
  );
}

const accentFor = (y: boolean) =>
  y
    ? { fill: "bg-[#e3a72c] text-[#14161a]", edge: "border-[#e3a72c] ring-1 ring-[#e3a72c]" }
    : { fill: "bg-[#2b59d9] text-white", edge: "border-[#2b59d9] ring-1 ring-[#2b59d9]" };

/**
 * One plan card. PlanPicker renders three; marketing pages can show a single
 * recommended plan with it too (featured, with its own badge).
 */
export function PlanCard({
  id,
  interval = "month",
  featured = false,
  badge,
  currentPlan,
  action,
  className = "",
}: {
  id: keyof typeof PLANS;
  interval?: Interval;
  featured?: boolean;
  /** Pill next to the plan name when featured, e.g. "Most popular". */
  badge?: string;
  currentPlan?: string | null;
  action?: (formData: FormData) => Promise<void>;
  className?: string;
}) {
  const p = PLANS[id];
  const y = interval === "year";
  const accent = accentFor(y);
  const subscribed = Boolean(currentPlan);
  const isCurrent = currentPlan === id;
  const perMonth = y ? yearly(p.monthly) / 12 : p.monthly;
  const billed = y ? `${money(yearly(p.monthly))} billed yearly · save ${money(p.monthly * 2)}` : "Billed monthly";
  const cta = isCurrent ? "Current plan" : subscribed ? `Switch to ${p.name}` : "Start 7-day free trial";
  const buttonCls = `block w-full rounded-full px-4 py-3 text-center font-display text-[14px] font-semibold transition-shadow disabled:cursor-default disabled:opacity-60 ${
    featured
      ? `${accent.fill} shadow-sm hover:shadow-md`
      : "border border-[#e4e6eb] bg-white text-[#14161a] shadow-sm hover:border-[#14161a]"
  }`;

  return (
    <div
      className={`flex flex-col rounded-[22px] border bg-surface p-2 shadow-sm ${className} ${
        featured ? `${accent.edge} md:shadow-lg` : "border-line"
      }`}
    >
      {/* Zone 1: who it's for, the price and the one action */}
      <div
        className={`relative isolate overflow-hidden rounded-2xl border border-line bg-surface-2 p-5 ${
          featured ? "md:py-7" : ""
        }`}
      >
        {/* The Postbase mark hanging from the panel's top edge, barely there. */}
        <LogoMark
          color="currentColor"
          className="pointer-events-none absolute -z-10 right-4 top-0 w-[220px] text-ink opacity-[0.06]"
        />
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-[20px] font-semibold text-ink">{p.name}</h3>
          {isCurrent ? (
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink">
              Your plan
            </span>
          ) : featured && badge ? (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${accent.fill}`}>{badge}</span>
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
              $0 today, then{" "}
              {y ? `${money(yearly(p.monthly))}/year` : `${money(p.monthly)}/month`}
            </p>
          ) : null}
        </div>
      </div>

      {/* Zone 2: the limits that decide the plan, then what's included */}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-5">
        <div className="flex flex-col gap-2.5 text-[14px] text-ink">
          <div className="flex items-center gap-2.5">
            <span className="text-muted"><ChannelsIcon /></span>
            <span><span className="font-semibold">{p.channels}</span> social channels</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-muted"><PeopleIcon /></span>
            <span>
              <span className="font-semibold">{p.seats}</span> {p.seats === 1 ? "person" : "people"}
            </span>
          </div>
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {p.inherits ? `${p.inherits.replace(", plus", "")} +` : "Included"}
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <ul className="flex flex-col gap-3">
          {p.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[14px] leading-snug text-ink">
              <Check yearly={y} />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export const GITHUB_PATH =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

function GitHubMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={GITHUB_PATH} />
    </svg>
  );
}

/** Open-source alternative to the hosted plans: repo, licence, live star count. */
function SelfHostCard() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/github/stars")
      .then((r) => r.json())
      .then((d: { stars: number | null }) => {
        if (alive && typeof d.stars === "number") setStars(d.stars);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="relative isolate flex flex-wrap items-center gap-5 overflow-hidden rounded-2xl border border-line bg-surface px-6 py-6 shadow-sm md:flex-nowrap md:px-7">
      {/* Right-hand panel in Postbase blue, split off by a diagonal squiggle (md+) */}
      <svg
        aria-hidden
        viewBox="0 0 400 160"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden h-full w-[420px] md:block"
      >
        <path
          d="M92 0C74 18 102 34 84 54S54 84 72 104S46 136 54 160H400V0Z"
          fill="#2b59d9"
        />
      </svg>
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-surface">
        <GitHubMark size={28} />
      </span>
      <div className="min-w-0 flex-1 md:pr-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[18px] font-semibold text-ink">Self-host for free</h3>
          {stars != null ? (
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums text-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#e3a72c" aria-hidden>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {stars} {stars === 1 ? "star" : "stars"}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          Run the same product on your own servers, with your own platform API keys. The plans above
          <br className="hidden md:block" /> are for the hosted version, where we look after the servers, app
          approvals and updates.
        </p>
      </div>
      <div className="relative flex w-full shrink-0 flex-wrap items-center gap-2 md:w-auto md:pl-4">
        <a
          href="https://docs.postbase.so/self-hosting/installation"
          className="rounded-full border border-line px-4 py-2.5 font-display text-[14px] font-semibold text-ink transition-colors hover:border-ink md:border-white md:text-white md:hover:bg-white md:hover:text-[#2b59d9]"
        >
          Install guide
        </a>
        <a
          href="https://github.com/postbasehq/postbase"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-display text-[14px] font-semibold text-surface shadow-sm transition-shadow hover:shadow-md md:bg-white md:text-[#14161a]"
        >
          <GitHubMark size={16} />
          View on GitHub
        </a>
      </div>
    </div>
  );
}
