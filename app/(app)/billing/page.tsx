import { canManageOrg, getCurrentOrgId, getOrgRole } from "@/lib/org";
import { PlanPicker } from "@/components/PlanPicker";
import { CompareTable } from "@/components/marketing/PricingSections";
import { BillingStatus, ManageButton } from "@/components/BillingStatus";
import { StartPlanNowButton } from "@/components/StartPlanNowButton";
import { loadBillingStatus } from "@/lib/billing-status";
import { trialEligible } from "@/lib/trial";
import { startCheckout } from "../billing-actions";
import { setActiveOrg } from "../team-actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; plan?: string; interval?: string; start?: string }>;
}) {
  const { checkout, plan: chosenPlan, interval, start } = await searchParams;
  const orgId = await getCurrentOrgId();
  // Everything at once: each is a round trip to the database.
  const [{ plan, active, canManage, card, billedThrough, trialing }, role] = await Promise.all([
    loadBillingStatus(orgId),
    orgId ? getOrgRole(orgId) : null,
  ]);
  // Checkout and the Stripe portal are owner/admin only (enforced in billing-actions).
  const isManager = orgId ? canManageOrg(role) : false;
  // These two need the status above, so they follow it (together).
  const [trial, canSwitch] = await Promise.all([
    // Promise the free trial only if checkout would really start one (lib/trial.ts).
    orgId && !active && isManager ? trialEligible(orgId) : true,
    // Only people in the paying workspace can open its billing.
    billedThrough ? getOrgRole(billedThrough.id).then(Boolean) : false,
  ]);

  // A workspace covered by another's plan has nothing to buy here: point to the one that pays.
  if (billedThrough) {
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
      ) : start === "ok" ? (
        <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink">
          Your plan has started and its full allowances are on. It can take a moment to show below.
        </div>
      ) : start === "failed" ? (
        <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink">
          We couldn’t take the payment, so your free trial carries on as before. Update your card under Manage
          subscription and try again.
        </div>
      ) : null}

      {/* current status */}
      <div className="mt-6">
        <BillingStatus
          {...card}
          note={
            trialing
              ? "During the free trial, AI images and videos, X posts with links and the AI agent run on trial allowances. Your plan’s full allowances start with your first payment, or start your plan now."
              : undefined
          }
          action={
            canManage && isManager ? (
              <div className="flex flex-wrap items-center gap-2">
                {trialing ? <StartPlanNowButton planName={card.planName} /> : null}
                <ManageButton />
              </div>
            ) : null
          }
        />
      </div>

      {/* plans */}
      {isManager ? (
        <div className="mt-8">
          <PlanPicker
            trial={trial}
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
