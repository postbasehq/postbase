/**
 * Cloud plans, anchored on Postiz ($29 for 5 channels). Postbase pays X per API
 * call (posts $0.015, or $0.20 with a link; reads $0.005), so X stats are read
 * only on demand (lib/analytics/collect.ts) and X posting is covered by fair use.
 * AI image and video generation are capped per plan because they cost per use; the
 * AI agent is unlimited under fair use, with a daily safety cap.
 */

export type PlanId = "trial" | "creator" | "team" | "growth" | "agency";

export type Plan = {
  id: Exclude<PlanId, "trial">;
  name: string;
  monthly: number; // USD/mo
  channels: number;
  seats: number;
  /** Workspaces the plan covers, sharing its channels, seats and AI allowances. */
  workspaces: number;
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
  agency: 600,
};
// Confirmed Higgsfield API prices (2026-10): a Soul 2 image is $0.0032; a video
// is a 5s Kling 2.6 Pro clip at $0.07/s list, about $0.35 (lib/higgsfield.ts).
// So Agency's full allowance costs at most ~$2 in images + ~$21 in video.
// Failed or blocked generations aren't charged by Higgsfield and don't count.
export const AI_VIDEO_LIMIT: Record<PlanId, number> = {
  trial: 1,
  creator: 3,
  team: 10,
  growth: 30,
  agency: 60,
};

// The AI agent is unlimited under fair use (see the Terms). Each user turn in
// the /agent chat is one message (a turn may fan out to several tool calls).
// Measured on Sonnet 5 with prompt caching: ~$0.002 (a lookup) to ~$0.006 (draft
// + schedule) per message, so normal use costs cents a month. Real per-message
// cost is logged on agent_messages.cost_usd.
//
// Two backstops stop a script or runaway session running up an open-ended
// model bill. Both are per plan, shared across its workspaces (like every other
// allowance), and sized far above normal use so they aren't marketed:
// - a daily message cap, reset at midnight UTC;
// - a monthly spend ceiling on the logged model cost, reset on the 1st (UTC).
// Each message's input is also bounded (server-side history, length caps in
// app/api/agent/chat/route.ts), so one message costs at most a few cents.
export const AGENT_DAILY_CAP: Record<PlanId, number> = {
  trial: 25,
  creator: 50,
  team: 100,
  growth: 150,
  agency: 300,
};
export const AGENT_MONTHLY_BUDGET_USD: Record<PlanId, number> = {
  trial: 1,
  creator: 5,
  team: 8,
  growth: 12,
  agency: 20,
};

// X posts containing a link, per month (shared across the plan's workspaces).
// X bills $0.20 for a post with a link vs $0.015 without, so these are sized to
// cost at most ~15% of the plan's price. Plain posts and threads stay unlimited.
// Each post in a thread that carries a link counts as one.
export const X_LINK_LIMIT: Record<PlanId, number> = {
  trial: 3,
  creator: 20,
  team: 30,
  growth: 45,
  agency: 75,
};

/** The X-links feature line for a plan, derived from the limit. */
export const xLinkFeature = (plan: PlanId): string => `${X_LINK_LIMIT[plan]} X posts with links a month`;

// Storage for files uploaded in the composer, agent chat and AI generation
// (the post-media bucket), shared across the plan's workspaces. Files nothing
// uses are cleaned up after 48 hours, so this only bounds kept media.
const GB = 1024 ** 3;
export const STORAGE_LIMIT_BYTES: Record<PlanId, number> = {
  trial: 1 * GB,
  creator: 5 * GB,
  team: 10 * GB,
  growth: 25 * GB,
  agency: 50 * GB,
};

/** The AI-quota feature line for a plan, derived from the limits (single source). */
export const aiFeature = (plan: PlanId): string =>
  `${AI_IMAGE_LIMIT[plan]} AI images + ${AI_VIDEO_LIMIT[plan]} videos a month`;

const AGENT_FEATURE = "Unlimited AI agent";

export const PLANS: Record<Exclude<PlanId, "trial">, Plan> = {
  creator: {
    id: "creator",
    name: "Creator",
    monthly: 29,
    channels: 5,
    seats: 1,
    workspaces: 1,
    blurb: "For solo creators publishing everywhere.",
    features: [
      "Post to X, LinkedIn, TikTok, YouTube, Bluesky or Mastodon",
      "Unlimited posts, threads and video",
      "Calendar, drafts and analytics",
      AGENT_FEATURE,
      aiFeature("creator"),
      xLinkFeature("creator"),
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
    workspaces: 3,
    blurb: "For creators with a small team.",
    inherits: "Everything in Creator, plus",
    features: ["Invite your team", "Separate workspaces for clients or brands", aiFeature("team"), xLinkFeature("team")],
    priceMonthly: process.env.STRIPE_PRICE_TEAM_MONTH,
    priceAnnual: process.env.STRIPE_PRICE_TEAM_YEAR,
  },
  growth: {
    id: "growth",
    name: "Pro",
    monthly: 59,
    channels: 50,
    seats: 15,
    workspaces: 5,
    blurb: "For growing brands and small agencies.",
    inherits: "Everything in Team, plus",
    features: [aiFeature("growth"), xLinkFeature("growth"), "Priority email support"],
    // Shown as "Pro"; the internal id stays "growth". Older envs used GROWTH_*.
    priceMonthly: process.env.STRIPE_PRICE_PRO_MONTH ?? process.env.STRIPE_PRICE_GROWTH_MONTH,
    priceAnnual: process.env.STRIPE_PRICE_PRO_YEAR ?? process.env.STRIPE_PRICE_GROWTH_YEAR,
  },
  agency: {
    id: "agency",
    name: "Agency",
    monthly: 99,
    channels: 100,
    seats: 30,
    workspaces: 20,
    blurb: "For agencies managing client accounts.",
    inherits: "Everything in Pro, plus",
    features: ["A workspace for each client, on one bill", aiFeature("agency"), xLinkFeature("agency"), "Priority email support"],
    priceMonthly: process.env.STRIPE_PRICE_AGENCY_MONTH,
    priceAnnual: process.env.STRIPE_PRICE_AGENCY_YEAR,
  },
};

export const PLAN_ORDER: Exclude<PlanId, "trial">[] = ["creator", "team", "growth", "agency"];

// Allowances below are shared across all the workspaces a plan covers (see
// lib/billing-guard.ts billingGroup). Trial gets Creator-level access.

// Channel allowance by plan.
export const CHANNEL_LIMIT: Record<PlanId, number> = {
  trial: 5,
  creator: 5,
  team: 15,
  growth: 50,
  agency: 100,
};

// Seats (people across the plan's workspaces, incl. pending invites) by plan.
export const SEAT_LIMIT: Record<PlanId, number> = {
  trial: 1,
  creator: 1,
  team: 5,
  growth: 15,
  agency: 30,
};

// Workspaces a plan covers, including the one that pays for it.
export const WORKSPACE_LIMIT: Record<PlanId, number> = {
  trial: 1,
  creator: 1,
  team: 3,
  growth: 5,
  agency: 20,
};

/** The cheapest plan that covers more workspaces than this one, for upgrade prompts. */
export function nextWorkspacePlan(plan: PlanId): Exclude<PlanId, "trial"> | null {
  return PLAN_ORDER.find((p) => WORKSPACE_LIMIT[p] > WORKSPACE_LIMIT[plan]) ?? null;
}

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
