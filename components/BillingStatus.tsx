import { LogoMark } from "@/components/marketing/Decor";
import { SubmitButton } from "@/components/SubmitButton";
import { openPortal } from "@/app/(app)/billing-actions";

/*
 * The Billing page's status card, built like a plan card: a panel with the plan,
 * its status and the one action, then the plan's allowances as usage meters.
 */

export type Meter = { label: string; used: number; limit: number; monthly?: boolean };

export function BillingStatus({
  planName,
  statusLabel,
  tone,
  dateLabel,
  date,
  trialDaysLeft,
  note,
  meters,
  resets,
  action,
}: {
  planName: string;
  statusLabel: string;
  /** Dot colour: green with access, amber when cancelled but running out the period, grey without. */
  tone: "live" | "ending" | "off";
  dateLabel?: string;
  date?: string | null;
  trialDaysLeft?: number | null;
  /** A line under the status, e.g. what cancelling means. */
  note?: string;
  meters: Meter[];
  /** When the monthly allowances reset, e.g. "1 Nov". */
  resets: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-line bg-surface p-2 shadow-sm">
      {/* Zone 1: the plan, its status and the one action */}
      <div className="relative isolate flex flex-wrap items-end justify-between gap-5 overflow-hidden rounded-2xl border border-line bg-surface-2 p-5 md:p-6">
        <LogoMark
          color="currentColor"
          className="pointer-events-none absolute -z-10 right-6 top-0 w-[200px] text-ink opacity-[0.06]"
        />
        <div>
          <div className="text-[13px] font-medium text-muted">Current plan</div>
          <div className="mt-1 font-display text-[32px] font-semibold leading-none tracking-[-0.03em] text-ink">{planName}</div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink">
              <span
                className="size-2 rounded-full"
                style={{ background: tone === "live" ? "var(--green)" : tone === "ending" ? "#e3a72c" : "var(--muted)" }}
              />
              {statusLabel}
            </span>
            {date ? (
              <span className="text-muted">
                {dateLabel} <span className="font-medium text-ink">{date}</span>
              </span>
            ) : null}
          </div>
          {note ? <p className="mt-3 max-w-[60ch] text-[13px] text-muted">{note}</p> : null}
        </div>
        {action}
        {trialDaysLeft != null ? <TrialBar daysLeft={trialDaysLeft} /> : null}
      </div>

      {/* Zone 2: what the plan allows, and how much of it is used */}
      <div className="px-4 pb-4 pt-5">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3 xl:grid-cols-5">
          {meters.map((m) => (
            <UsageMeter key={m.label} {...m} />
          ))}
        </div>
        <p className="mt-5 text-[12px] text-muted">AI allowances reset on {resets}.</p>
      </div>
    </div>
  );
}

function UsageMeter({ label, used, limit, monthly }: Meter) {
  const pct = limit > 0 ? Math.min(1, used / limit) : 0;
  // Solid brand colours: blue while there's room, amber near the limit. Red only
  // for a monthly allowance that's run out; a full seat or channel count is normal.
  const fill = pct >= 1 && monthly ? "#d14a3e" : pct >= 0.8 ? "#e3a72c" : "#2b59d9";
  return (
    <div>
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1 text-[13px] tabular-nums text-muted">
        <span className="font-display text-[20px] font-semibold tracking-[-0.02em] text-ink">{used.toLocaleString("en-US")}</span>
        {" "}/ {limit.toLocaleString("en-US")}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct * 100, used > 0 ? 3 : 0)}%`, background: fill }} />
      </div>
    </div>
  );
}

/** Seven pips for the 7-day trial, filled for the days already used. */
function TrialBar({ daysLeft }: { daysLeft: number }) {
  const used = Math.max(0, Math.min(7, 7 - daysLeft));
  return (
    <div className="basis-full">
      <div className="flex gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < used ? "#2b59d9" : "var(--line)" }} />
        ))}
      </div>
      <p className="mt-2 text-[12px] text-muted">
        {daysLeft <= 0 ? "Your trial ends today." : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left in your free trial.`}
      </p>
    </div>
  );
}

/** Opens the Stripe billing portal. */
export function ManageButton() {
  return (
    <form action={openPortal}>
      <SubmitButton
        pendingLabel="Opening…"
        className="rounded-full border border-line bg-surface px-5 py-2.5 font-display text-sm font-semibold text-ink shadow-sm transition-colors hover:border-ink disabled:opacity-60"
      >
        Manage subscription
      </SubmitButton>
    </form>
  );
}
