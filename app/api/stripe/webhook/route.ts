import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForPrice } from "@/lib/plans";

/**
 * Stripe webhook — keeps each org's plan/status in sync with its subscription.
 * Set the endpoint to /api/stripe/webhook and STRIPE_WEBHOOK_SECRET in Stripe.
 */
export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new NextResponse("Missing signature", { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const db = createAdminClient();

  async function syncSubscription(sub: Stripe.Subscription) {
    const orgId = sub.metadata?.org_id;
    const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const price = sub.items.data[0]?.price?.id;
    const plan = planForPrice(price);
    const update: Record<string, unknown> = {
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    };
    if (plan) update.plan = plan;
    else console.error(`[stripe] unknown price ${price} on subscription ${sub.id}; plan not updated`);
    const q = db.from("orgs").update(update);
    await (orgId ? q.eq("id", orgId) : q.eq("stripe_customer_id", customer));
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.trial_will_end":
      await syncSubscription(event.data.object);
      break;
    case "customer.subscription.deleted": {
      // Ended for good (cancelled at period end, or unpaid). Access is derived
      // from subscription_status, so "canceled" locks the workspace; plan drops
      // to trial limits. A new checkout won't grant a second trial.
      const sub = event.data.object;
      const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await db
        .from("orgs")
        .update({ subscription_status: "canceled", plan: "trial", stripe_subscription_id: null })
        .eq("stripe_customer_id", customer);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
