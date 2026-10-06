import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForPrice } from "@/lib/plans";

/*
 * Applies a Stripe subscription's current state to its workspace (used by
 * app/api/stripe/webhook). Matched by subscription id so an old subscription's
 * events can't overwrite or end the workspace's current one; database errors
 * throw so the webhook answers 500 and Stripe retries.
 */

const LIVE = new Set(["trialing", "active", "past_due", "unpaid", "incomplete", "paused"]);

type Db = ReturnType<typeof createAdminClient>;
type OrgRow = { id: string; stripe_subscription_id: string | null; subscription_status: string | null };

export class RetryLater extends Error {}

/** The workspace a subscription belongs to: its checkout metadata, else its customer. */
async function orgFor(db: Db, sub: Stripe.Subscription): Promise<OrgRow | null> {
  const select = "id, stripe_subscription_id, subscription_status";
  const orgId = sub.metadata?.org_id;
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data, error } = orgId
    ? await db.from("orgs").select(select).eq("id", orgId).maybeSingle()
    : await db.from("orgs").select(select).eq("stripe_customer_id", customer).maybeSingle();
  if (error) throw new RetryLater(`org lookup for ${sub.id}: ${error.message}`);
  return data as OrgRow | null;
}

/**
 * Apply a subscription's current state to its workspace. Returns what happened,
 * so callers only notify for changes that actually landed.
 */
export async function syncSubscription(db: Db, sub: Stripe.Subscription): Promise<"updated" | "ended" | "ignored"> {
  const org = await orgFor(db, sub);
  if (!org) {
    console.error(`[stripe] no workspace for subscription ${sub.id}`);
    return "ignored";
  }
  const current = org.stripe_subscription_id;
  const currentLive = LIVE.has(String(org.subscription_status));

  if (LIVE.has(sub.status)) {
    // A different subscription is live on this workspace: only take over from
    // one that has ended (a re-subscribe), never from a live one.
    if (current && current !== sub.id && currentLive) {
      // Two live subscriptions means the customer is paying twice: flag it.
      const msg = `[stripe] ignoring ${sub.id}: workspace ${org.id} already has live ${current} (customer may be double-billed)`;
      console.error(msg);
      Sentry.captureMessage(msg, "error");
      return "ignored";
    }
    const item = sub.items.data[0];
    const price = item?.price?.id;
    const plan = planForPrice(price);
    const update: Record<string, unknown> = {
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      // Since API 2025-03-31.basil the billing period lives on the subscription item.
      current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    };
    if (plan) update.plan = plan;
    else console.error(`[stripe] unknown price ${price} on subscription ${sub.id}; plan not updated`);
    const { error } = await db.from("orgs").update(update).eq("id", org.id);
    if (error) throw new RetryLater(`update for ${sub.id}: ${error.message}`);
    return "updated";
  }

  // Ended (canceled / incomplete_expired). Only end the workspace's plan when it's
  // this subscription that ended, not an older one finishing late. Access is
  // derived from subscription_status, so "canceled" locks the workspace; plan
  // drops to trial limits. A new checkout won't grant a second trial.
  if (current && current !== sub.id) return "ignored";
  const { error } = await db
    .from("orgs")
    .update({ subscription_status: "canceled", plan: "trial", stripe_subscription_id: null })
    .eq("id", org.id);
  if (error) throw new RetryLater(`end for ${sub.id}: ${error.message}`);
  return "ended";
}

