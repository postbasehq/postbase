import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, stripeConfigured } from "@/lib/stripe";

/**
 * Whether checking out now starts the 7-day free trial: only for a workspace
 * that has never subscribed (once per workspace). The single source of truth
 * for checkout (billing-actions startCheckout) and for every place that
 * promises "7 days free" in the app (PlanGate, PlanPicker on /billing), so the
 * promise always matches the charge.
 *
 * Fails safe: if Stripe can't be asked, say there's no trial — telling someone
 * they'll be charged and then not charging them is fine; the reverse isn't.
 */
export async function trialEligible(orgId: string): Promise<boolean> {
  const { data: org, error } = await createAdminClient()
    .from("orgs")
    .select("subscription_status, stripe_customer_id")
    .eq("id", orgId)
    .maybeSingle();
  if (error || !org) return false;
  // Any status at all (trialing, active, past_due, canceled…) means it has subscribed before.
  if (org.subscription_status) return false;
  if (!org.stripe_customer_id || !stripeConfigured()) return true;
  try {
    const previous = await getStripe().subscriptions.list({ customer: org.stripe_customer_id, status: "all", limit: 1 });
    return previous.data.length === 0;
  } catch {
    return false;
  }
}
