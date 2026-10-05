import { canManageOrg, getCurrentOrgId, getOrgRole } from "@/lib/org";
import { PlanPicker } from "@/components/PlanPicker";
import { CompareTable } from "@/components/marketing/PricingSections";
import { BillingStatus, ManageButton } from "@/components/BillingStatus";
import { loadBillingStatus } from "@/lib/billing-status";
import { startCheckout } from "../billing-actions";
import { setActiveOrg } from "../team-actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; plan?: string; interval?: string }>;
}) {
  const { checkout, plan: chosenPlan, interval } = await searchParams;
  const orgId = await getCurrentOrgId();
  const { plan, active, canManage, card, billedThrough } = await loadBillingStatus(orgId);
  // Checkout and the Stripe portal are owner/admin only (enforced in billing-actions).
  const isManager = orgId ? canManageOrg(await getOrgRole(orgId)) : false;

  // A workspace covered by another's plan has nothing to buy here: point to the one that pays.
  if (billedThrough) {
    // Only people in the paying workspace can open its billing.
    const canSwitch = Boolean(await getOrgRole(billedThrough.id));
    return (
      <div className="pb-16">
        <p className="text-sm text-muted">
          This workspace is included in {billedThrough.name}&apos;s plan.
          {canSwitch ? null : ` Ask an owner of ${billedThrough.name} to change it.`}
        </p>
        <div className="mt-6">
          <BillingStatus
            {...card}
            note={`Channels, people and AI allowances are shared across every workspace on the plan. Plan changes and invoices are handled in ${billedThrough.name}.`}
            action={
              !canSwitch ? null : (
              <form action={setActiveOrg}>
                <input type="hidden" name="org_id" value={billedThrough.id} />
                <input type="hidden" name="next" value="/billing" />
                <SubmitButton
                  pendingLabel="Switching…"
                  className="rounded-full bg-[#2b59d9] px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md"
                >
                  Go to {billedThrough.name} billing
                </SubmitButton>
              </form>
              )
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted">
        {isManager
          ? "Manage your Postbase subscription."
          : "Only owners and admins of this workspace can change the plan, payment method or invoices."}
      </p>

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
      <div className="mt-6">
        <BillingStatus
          {...card}
          action={canManage && isManager ? <ManageButton /> : null}
        />
      </div>

      {/* plans */}
      {isManager ? (
        <div className="mt-8">
          <PlanPicker
            action={startCheckout}
            currentPlan={active ? plan : null}
            chosenPlan={chosenPlan ?? null}
            initialInterval={interval === "year" ? "year" : "month"}
          />
        </div>
      ) : null}

      {/* every limit side by side */}
      {isManager ? (
        <div className="mt-16 pb-16">
          <CompareTable billing={{ currentPlan: active ? plan : null, action: startCheckout }} />
        </div>
      ) : null}
    </div>
  );
}
