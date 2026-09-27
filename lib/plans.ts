/**
 * Cloud plans, anchored on Postiz ($29 for 5 channels). Postbase pays X per API
 * call (posts $0.015, or $0.20 with a link; reads $0.005), so X stats are read
 * only on demand (lib/analytics/collect.ts) and X posting is covered by fair use.
 * AI generation and agent messages are capped per plan because they cost per use.
 */

export type PlanId = "trial" | "creator" | "team" | "growth";

export type Plan = {
  id: Exclude<PlanId, "trial">;
  name: string;
  monthly: number; // USD/mo
  channels: number;
  seats: number;
  blurb: string;
  /** Set when the card lists only what this plan adds ("Everything in Creator, plus"). */
  inherits?: string;
  /** Honest, shipped features only: every line must be true of the product today. */
  features: string[];
  // Stripe price ids (from env) for monthly / annual billing.
  priceMonthly?: string;
  priceAnnual?: string;
};

// Monthly AI generation quota by plan (composer image/video generation).
// In line with Postiz (20 / 100 / 300 at the same price points).
export const AI_IMAGE_LIMIT: Record<PlanId, number> = {
  trial: 5,
  creator: 20,
  team: 100,
  growth: 300,
};
// Video is ~10-50x the per-unit cost of an image, so quotas stay conservative
// to protect margin (see AI pricing notes).
export const AI_VIDEO_LIMIT: Record<PlanId, number> = {
  trial: 1,
  creator: 3,
  team: 10,
  growth: 30,
};

// Monthly AI-agent message quota by plan. Each user turn in the /agent chat
// costs one message (a turn may fan out to several tool calls). Kept generous
// on paid plans but capped so a runaway session can't rack up an open-ended
// model bill; the trial gets a taste.
// Measured on Sonnet 5 with prompt caching: ~$0.002 (a lookup) to ~$0.006 (draft
// + schedule) per message, so even Pro's full quota is ~$9/month. Sonnet beats
// Haiku 4.5 on cost here: our ~5k-token prompt is below Haiku's cache minimum.
// Real per-message cost is logged on agent_messages.cost_usd.
export const AGENT_MESSAGE_LIMIT: Record<PlanId, number> = {
  trial: 25,
  creator: 150,
  team: 500,
  growth: 1500,
};

/** The AI-quota feature line for a plan, derived from the limits (single source). */
export const aiFeature = (plan: PlanId): string =>
  `${AI_IMAGE_LIMIT[plan]} AI images + ${AI_VIDEO_LIMIT[plan]} videos a month`;

const agentFeature = (plan: PlanId): string =>
  `AI agent: ${AGENT_MESSAGE_LIMIT[plan].toLocaleString("en-US")} messages a month`;

export const PLANS: Record<Exclude<PlanId, "trial">, Plan> = {
  creator: {
    id: "creator",
    name: "Creator",
    monthly: 29,
    channels: 5,
    seats: 1,
    blurb: "For solo creators publishing everywhere.",
    features: [
      "X, LinkedIn, TikTok, YouTube, Bluesky and Mastodon",
      "Unlimited posts, threads and video",
      "Calendar, drafts and analytics",
      agentFeature("creator"),
      aiFeature("creator"),
      "MCP server and API",
    ],
    priceMonthly: process.env.STRIPE_PRICE_CREATOR_MONTH,
    priceAnnual: process.env.STRIPE_PRICE_CREATOR_YEAR,
  },
  team: {
    id: "team",
    name: "Team",
    monthly: 39,
    channels: 15,
    seats: 5,
    blurb: "For creators with a small team.",
    inherits: "Everything in Creator, plus",
    features: ["A shared workspace for up to 5 people", agentFeature("team"), aiFeature("team")],
    priceMonthly: process.env.STRIPE_PRICE_TEAM_MONTH,
    priceAnnual: process.env.STRIPE_PRICE_TEAM_YEAR,
  },
  growth: {
    id: "growth",
    name: "Pro",
    monthly: 59,
    channels: 50,
    seats: 15,
    blurb: "For power users running many accounts.",
    inherits: "Everything in Team, plus",
    features: ["Up to 15 people", agentFeature("growth"), aiFeature("growth"), "Priority email support"],
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
