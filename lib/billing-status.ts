import { createAdminClient } from "@/lib/supabase/admin";
import { CHANNEL_LIMIT, PLANS, SEAT_LIMIT, WORKSPACE_LIMIT, planIsActive, type PlanId } from "@/lib/plans";
import { PAST_DUE_NOTE, agentUsage, aiUsage, billingEnforced, billingGroup, overPlanMessage, seatUsage } from "@/lib/billing-guard";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { xLinkUsage } from "@/lib/x-links";
import type { Meter } from "@/components/BillingStatus";

/*
 * Everything the billing status card shows for a workspace: plan, status,
 * the relevant date and usage against the plan's allowances. Shared by the
 * Billing and Settings pages.
 */

const STATUS_LABEL: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

export async function loadBillingStatus(orgId: string | null) {
  const db = createAdminClient();
  // The plan lives on the workspace that pays; linked workspaces share it.
  const group = orgId ? await billingGroup(orgId) : null;
  const { data: org } = group
    ? await db
        .from("orgs")
        .select("plan, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id, comped")
        .eq("id", group.rootId)
        .single()
    : { data: null };

  const plan = (org?.plan ?? "trial") as PlanId;
  const status = org?.subscription_status ?? null;
  const active = planIsActive(status);
  const periodEnd = org?.current_period_end ? fmt(new Date(org.current_period_end)) : null;
  const comped = Boolean(org?.comped) && !active;
  const planName = comped
    ? "Complimentary"
    : plan !== "trial"
      ? PLANS[plan as Exclude<PlanId, "trial">]?.name
      : "No plan";

  // Usage against the plan's allowances. Seats count pending invites, as the Team page does.
  // Usage is counted across every workspace the plan covers.
  const [channels, seats, agent, ai, cancelAt, xLinks] = orgId && group
    ? await Promise.all([
        db.from("channels").select("id", { count: "exact", head: true }).in("org_id", group.orgIds),
        seatUsage(orgId),
        agentUsage(db, orgId),
        aiUsage(db, orgId),
        scheduledCancel(org?.stripe_subscription_id),
        xLinkUsage(orgId),
      ])
    : [null, null, null, null, null, null];
  const meters: Meter[] = [
    { label: "Workspaces", used: group?.orgIds.length ?? 1, limit: WORKSPACE_LIMIT[plan] ?? 1 },
    { label: "Channels", used: channels?.count ?? 0, limit: CHANNEL_LIMIT[plan] ?? CHANNEL_LIMIT.trial },
    { label: "People", used: seats?.used ?? 0, limit: SEAT_LIMIT[plan] ?? 1 },
    { label: "AI images", monthly: true, used: ai?.image.used ?? 0, limit: ai?.image.limit ?? 0 },
    { label: "AI videos", monthly: true, used: ai?.video.used ?? 0, limit: ai?.video.limit ?? 0 },
    ...(xLinks?.enforced ? [{ label: "X posts with links", monthly: true, used: xLinks.used, limit: xLinks.limit }] : []),
  ];
  // More channels, workspaces or people than the plan includes (e.g. after a
  // downgrade): scheduling is paused until it fits (schedulingProblem).
  const overPlan = group && active && !comped && billingEnforced() ? await overPlanMessage(group).catch(() => null) : null;
  const now = new Date();
  const resets = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const trialDaysLeft =
    status === "trialing" && org?.current_period_end
      ? Math.max(0, Math.ceil((new Date(org.current_period_end).getTime() - now.getTime()) / 86_400_000))
      : null;
  // Cancelled but still running until the date: no renewal, and the trial won't convert.
  const ending = active && Boolean(cancelAt);
  const statusLabel = comped
    ? "Full access, no billing"
    : ending
      ? status === "trialing"
        ? "Trial cancelled"
        : "Cancelled"
      : status
        ? (STATUS_LABEL[status] ?? status)
        : "Not subscribed";

  return {
    plan,
    active,
    comped,
    /** In the free trial and not cancelled: "Start my plan now" applies. */
    trialing: status === "trialing" && !ending && !comped,
    /** Set when this workspace is covered by another workspace's plan. */
    billedThrough: group?.linked ? { id: group.rootId, name: group.rootName } : null,
    /** Whether "Manage subscription" (the Stripe portal) can open. */
    canManage: stripeConfigured() && Boolean(org?.stripe_customer_id && org?.stripe_subscription_id),
    card: {
      planName,
      statusLabel,
      tone: (ending ? "ending" : active || comped ? "live" : "off") as "live" | "ending" | "off",
      dateLabel: ending
        ? "Access until"
        : status === "canceled"
          ? org?.current_period_end && new Date(org.current_period_end) < now
            ? "Ended"
            : "Access until"
          : status === "trialing"
            ? "Trial ends"
            : "Renews",
      date: ending && cancelAt ? fmt(cancelAt) : periodEnd,
      trialDaysLeft,
      note: ending
        ? status === "trialing"
          ? "You won't be charged. Changed your mind? Resume the trial from Manage subscription."
          : "It won't renew. Changed your mind? Resume it from Manage subscription."
        : status === "past_due" && !comped
          ? `${PAST_DUE_NOTE} Posts keep going out meanwhile; AI and X posts with links are at trial level.`
          : (overPlan ?? undefined),
      meters,
      resets,
    },
  };
}

/**
 * When the subscription is set to end, read live from Stripe so it's right as
 * soon as someone cancels in the portal (the webhook doesn't store it). Null
 * when it isn't cancelling, or Stripe can't be reached.
 */
async function scheduledCancel(subscriptionId: string | null | undefined): Promise<Date | null> {
  if (!subscriptionId || !stripeConfigured()) return null;
  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    const at = sub.cancel_at ?? (sub.cancel_at_period_end ? sub.items.data[0]?.current_period_end : null);
    return at ? new Date(at * 1000) : null;
  } catch (e) {
    console.error("[billing] couldn't read subscription from Stripe", e);
    return null;
  }
}
