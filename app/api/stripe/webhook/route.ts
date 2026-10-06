import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncSubscription } from "@/lib/stripe-sync";
import { notifyPaymentFailed, notifySubscriptionEnded, notifyTrialEnding } from "@/lib/email/notify";

/**
 * Stripe webhook — keeps each org's plan/status in sync with its subscription.
 * Set the endpoint to /api/stripe/webhook and STRIPE_WEBHOOK_SECRET in Stripe.
 *
 * Order-proof and retry-safe:
 * - Stripe doesn't guarantee event order, so a subscription event's payload is
 *   only a pointer: the subscription is re-read from Stripe and its current
 *   state applied. A late "updated" can't revive a cancelled subscription.
 * - Changes are matched by subscription id, so events for an old subscription
 *   can't overwrite (or end) the workspace's current one.
 * - If the database write fails the handler answers 500, so Stripe retries
 *   instead of the change being lost.
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
  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.trial_will_end":
      case "customer.subscription.deleted": {
        // The payload may be stale (events arrive out of order): read it fresh.
        const sub = await getStripe().subscriptions.retrieve(event.data.object.id);
        const outcome = await syncSubscription(db, sub);
        if (event.type === "customer.subscription.trial_will_end" && outcome === "updated") await notifyTrialEnding(sub);
        if (event.type === "customer.subscription.deleted" && outcome === "ended") await notifySubscriptionEnded(sub);
        break;
      }
      case "invoice.payment_failed":
        // Status changes (past_due) arrive as subscription.updated; this one tells people.
        await notifyPaymentFailed(event.data.object);
        break;
      default:
        break;
    }
  } catch (e) {
    // Database or Stripe trouble: 500 so Stripe retries (it backs off for up to
    // 3 days). Every step above is safe to repeat.
    console.error(`[stripe] ${event.type} ${event.id} failed:`, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
