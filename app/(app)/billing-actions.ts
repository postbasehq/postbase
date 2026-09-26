"use server";

import { redirect } from "next/navigation";
import { getStripe, stripeConfigured, billingUrls } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId } from "@/lib/org";
import { PLANS, planIsActive, priceId, type PlanId } from "@/lib/plans";

/** Get (or lazily create) the org's Stripe customer. */
async function ensureCustomer(orgId: string, email: string): Promise<string> {
  const db = createAdminClient();
  const { data: org } = await db
    .from("orgs")
    .select("stripe_customer_id, name")
    .eq("id", orgId)
    .single();
  if (org?.stripe_customer_id) return org.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email,
    name: org?.name ?? undefined,
    metadata: { org_id: orgId },
  });
  await db.from("orgs").update({ stripe_customer_id: customer.id }).eq("id", orgId);
  return customer.id;
}

/** Start a Checkout Session for a plan + interval and redirect to Stripe. */
export async function startCheckout(formData: FormData) {
  if (!stripeConfigured()) throw new Error("Billing isn’t configured on this server yet.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Sign in to subscribe.");
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found.");

  const plan = String(formData.get("plan") ?? "") as Exclude<PlanId, "trial">;
  const interval = String(formData.get("interval") ?? "month") === "year" ? "year" : "month";
  const price = priceId(plan, interval);
  if (!PLANS[plan] || !price) throw new Error("That plan isn’t available.");

  // Already subscribed: plan changes go through the portal, never a second subscription.
  const { data: org } = await createAdminClient()
    .from("orgs")
    .select("stripe_subscription_id, subscription_status")
    .eq("id", orgId)
    .single();
  if (org?.stripe_subscription_id && planIsActive(org.subscription_status)) {
    return openPortal();
  }

  const customer = await ensureCustomer(orgId, user.email);
  // The 7-day trial is once per workspace: no trial if it has ever subscribed.
  const previous = await getStripe().subscriptions.list({ customer, status: "all", limit: 1 });
  const trial = previous.data.length === 0 ? { trial_period_days: 7 } : {};
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { ...trial, metadata: { org_id: orgId } },
    success_url: billingUrls.success,
    cancel_url: billingUrls.cancel,
    allow_promotion_codes: true,
  });
  if (!session.url) throw new Error("Couldn’t start checkout.");
  redirect(session.url);
}

/** Open the Stripe Billing Portal for the current org. */
export async function openPortal() {
  if (!stripeConfigured()) throw new Error("Billing isn’t configured on this server yet.");
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found.");

  const db = createAdminClient();
  const { data: org } = await db
    .from("orgs")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();
  if (!org?.stripe_customer_id) redirect("/billing");

  const session = await getStripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: billingUrls.return,
  });
  redirect(session.url);
}
