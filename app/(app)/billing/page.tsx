import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId } from "@/lib/org";
import { PlanPicker } from "@/components/PlanPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { PLANS, planIsActive, type PlanId } from "@/lib/plans";
import { startCheckout, openPortal } from "../billing-actions";

const STATUS_LABEL: Record<string, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; plan?: string; interval?: string }>;
}) {
  const { checkout, plan: chosenPlan, interval } = await searchParams;
  const orgId = await getCurrentOrgId();

  const db = createAdminClient();
  const { data: org } = orgId
    ? await db
        .from("orgs")
        .select("plan, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id, comped")
        .eq("id", orgId)
        .single()
    : { data: null };

  const plan = (org?.plan ?? "trial") as PlanId;
  const status = org?.subscription_status ?? null;
  const active = planIsActive(status);
  const periodEnd = org?.current_period_end
    ? new Date(org.current_period_end).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;
  const comped = Boolean(org?.comped) && !active;
  const planName = comped
    ? "Complimentary"
    : plan !== "trial"
      ? PLANS[plan as Exclude<PlanId, "trial">]?.name
      : "No plan";

  return (
    <div>
      <p className="text-sm text-muted">Manage your Postbase subscription.</p>

      {checkout === "success" ? (
        <div className="mt-4 rounded-xl bg-green/12 px-4 py-3 text-sm text-green">
          You’re subscribed — welcome aboard. It can take a moment to reflect below.
        </div>
      ) : checkout === "cancelled" ? (
        <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
          Checkout cancelled — no charge was made.
        </div>
      ) : null}

      {/* current status */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div>
          <div className="text-xs font-medium text-muted">Current plan</div>
          <div className="font-display text-lg font-semibold">{planName}</div>
        </div>
        <div className="ml-1">
          <div className="text-xs font-medium text-muted">Status</div>
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${
              active || comped ? "text-green" : "text-muted"
            }`}
          >
            <span className={`size-2 rounded-full ${active || comped ? "bg-green" : "bg-muted"}`} />
            {comped ? "Full access, no billing" : status ? (STATUS_LABEL[status] ?? status) : "Not subscribed"}
          </span>
        </div>
        {periodEnd ? (
          <div>
            <div className="text-xs font-medium text-muted">
              {status === "canceled" ? "Access until" : "Renews"}
            </div>
            <div className="text-sm">{periodEnd}</div>
          </div>
        ) : null}
        {org?.stripe_customer_id && org?.stripe_subscription_id ? (
          <form action={openPortal} className="ml-auto">
            <SubmitButton
              pendingLabel="Opening…"
              className="rounded-full border border-line px-5 py-2.5 font-display text-sm font-semibold text-blue-ink hover:bg-surface-2 disabled:opacity-60"
            >
              Manage subscription
            </SubmitButton>
          </form>
        ) : null}
      </div>

      {/* plans */}
      <div className="mt-8">
        <PlanPicker
          action={startCheckout}
          currentPlan={active ? plan : null}
          chosenPlan={chosenPlan ?? null}
          initialInterval={interval === "year" ? "year" : "month"}
        />
      </div>
    </div>
  );
}
