/**
 * Cloud plans (see planning docs/PRICING.md). Borrowed from Postiz / Post Bridge,
 * anchored at $29, no agency tier. X is BYOK on every plan, so posting is ~free to
 * us and margins stay high — plans scale by channels/seats/features, not usage.
 */

export type PlanId = "trial" | "creator" | "team" | "growth";

export type Plan = {
  id: Exclude<PlanId, "trial">;
  name: string;
  monthly: number; // USD/mo
  channels: number;
  seats: number | "team";
  blurb: string;
  features: string[];
  // Stripe price ids (from env) for monthly / annual billing.
  priceMonthly?: string;
  priceAnnual?: string;
};

export const PLANS: Record<Exclude<PlanId, "trial">, Plan> = {
  creator: {
    id: "creator",
    name: "Creator",
    monthly: 29,
    channels: 5,
    seats: 1,
    blurb: "For solo creators publishing everywhere.",
    features: ["5 channels", "Unlimited posts", "All platforms", "MCP server", "Analytics", "Threads, media & calendar"],
    priceMonthly: process.env.STRIPE_PRICE_CREATOR_MONTH,
    priceAnnual: process.env.STRIPE_PRICE_CREATOR_YEAR,
  },
  team: {
    id: "team",
    name: "Team",
    monthly: 39,
    channels: 15,
    seats: "team",
    blurb: "For creators with a small team.",
    features: ["15 channels", "Team seats", "Bulk & video scheduling", "Everything in Creator"],
    priceMonthly: process.env.STRIPE_PRICE_TEAM_MONTH,
    priceAnnual: process.env.STRIPE_PRICE_TEAM_YEAR,
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthly: 59,
    channels: 50,
    seats: "team",
    blurb: "For power users running many accounts.",
    features: ["50 channels", "Priority publishing", "Priority support", "Everything in Team"],
    priceMonthly: process.env.STRIPE_PRICE_GROWTH_MONTH,
    priceAnnual: process.env.STRIPE_PRICE_GROWTH_YEAR,
  },
};

export const PLAN_ORDER: Exclude<PlanId, "trial">[] = ["creator", "team", "growth"];

// Channel allowance by plan. Trial gets Creator-level access.
export const CHANNEL_LIMIT: Record<PlanId, number> = {
  trial: 5,
  creator: 5,
  team: 15,
  growth: 50,
};

// Seats (org members, incl. pending invites) by plan.
export const SEAT_LIMIT: Record<PlanId, number> = {
  trial: 1,
  creator: 1,
  team: 5,
  growth: 15,
};

// Statuses that grant access to the product (trialing counts).
const ACTIVE_STATUSES = new Set(["trialing", "active", "past_due"]);

export function planIsActive(status: string | null | undefined): boolean {
  return status ? ACTIVE_STATUSES.has(status) : false;
}

/** Resolve the price id for a plan + interval. */
export function priceId(plan: Exclude<PlanId, "trial">, interval: "month" | "year"): string | undefined {
  return interval === "year" ? PLANS[plan].priceAnnual : PLANS[plan].priceMonthly;
}

/** Map a Stripe price id back to a plan id (for webhook syncing). */
export function planForPrice(price: string | null | undefined): Exclude<PlanId, "trial"> | null {
  if (!price) return null;
  for (const p of PLAN_ORDER) {
    if (PLANS[p].priceMonthly === price || PLANS[p].priceAnnual === price) return p;
  }
  return null;
}
