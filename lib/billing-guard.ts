import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AGENT_DAILY_CAP,
  AGENT_MONTHLY_BUDGET_USD,
  AI_IMAGE_LIMIT,
  AI_VIDEO_LIMIT,
  CHANNEL_LIMIT,
  PLANS,
  SEAT_LIMIT,
  WORKSPACE_LIMIT,
  planIsActive,
  type PlanId,
} from "@/lib/plans";

/**
 * Billing is enforced only once Stripe is fully configured (secret, webhook and
 * at least the base price). Self-hosted installs without Stripe keep full access.
 *
 * FORCE_BILLING=1 turns enforcement on in local development without Stripe, to
 * see the no-plan screen and upgrade prompts. Ignored in production builds.
 */
export function billingEnforced(): boolean {
  if (process.env.FORCE_BILLING === "1" && process.env.NODE_ENV !== "production") return true;
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_CREATOR_MONTH,
  );
}

export type OrgAccessRow = { subscription_status: string | null; comped: boolean | null };

/**
 * A plan covers several workspaces (lib/plans.ts WORKSPACE_LIMIT). The
 * subscription sits on the workspace that bought it; workspaces created from it
 * point to it via orgs.billing_org_id and share its plan, access and
 * allowances. Everything below that asks "which plan?" or "how much is used?"
 * goes through here.
 *
 * Uses the service role on purpose: someone invited only to a client workspace
 * isn't a member of the billing workspace, but still needs its plan to apply.
 */
export type BillingGroup = {
  /** The workspace that holds the subscription. */
  rootId: string;
  rootName: string;
  /** Every workspace sharing the plan, the billing one first. */
  orgIds: string[];
  plan: PlanId;
  /**
   * The plan whose per-use allowances apply (AI generations, X posts with
   * links, the agent's backstops): "trial" while the subscription is still in
   * its free trial, so a trial can't spend a top plan's allowance before
   * anything is paid. Also "trial" while a payment has failed (past_due): the
   * workspace keeps publishing during Stripe's retries, but paid-per-use extras
   * drop to trial level until the card works. Channels, workspaces, seats and
   * storage use `plan`.
   */
  usagePlan: PlanId;
  trialing: boolean;
  /** The last payment failed and Stripe is retrying it. */
  pastDue: boolean;
  subscription_status: string | null;
  comped: boolean;
  /** True when the workspace asked about is covered by another's plan. */
  linked: boolean;
};

export async function billingGroup(orgId: string): Promise<BillingGroup> {
  const db = createAdminClient();
  // Query errors throw rather than reading as "trial, no access": a database
  // blip must never look like a lapsed plan (the publisher would fail every
  // due post for the workspace).
  const { data: self, error: selfError } = await db
    .from("orgs")
    .select("id, name, billing_org_id, plan, subscription_status, comped")
    .eq("id", orgId)
    .maybeSingle();
  if (selfError) throw new Error(`billingGroup(${orgId}): ${selfError.message}`);
  const rootId = (self?.billing_org_id as string | null) ?? orgId;
  const [{ data: root, error: rootError }, { data: members, error: membersError }] = await Promise.all([
    rootId === orgId
      ? Promise.resolve({ data: self, error: null })
      : db.from("orgs").select("id, name, plan, subscription_status, comped").eq("id", rootId).maybeSingle(),
    db.from("orgs").select("id").eq("billing_org_id", rootId).order("created_at", { ascending: true }),
  ]);
  if (rootError || membersError) {
    throw new Error(`billingGroup(${orgId}): ${(rootError ?? membersError)!.message}`);
  }
  const plan = ((root?.plan as PlanId | undefined) ?? "trial") as PlanId;
  const comped = Boolean(root?.comped);
  const trialing = root?.subscription_status === "trialing" && !comped;
  const pastDue = root?.subscription_status === "past_due" && !comped;
  return {
    rootId,
    rootName: (root?.name as string) ?? "",
    orgIds: [rootId, ...(members ?? []).map((m) => m.id as string)],
    plan,
    usagePlan: trialing || pastDue ? "trial" : plan,
    trialing,
    pastDue,
    subscription_status: (root?.subscription_status as string | null) ?? null,
    comped,
    linked: rootId !== orgId,
  };
}

/** The plan's access row for a workspace: its own, or its billing workspace's. */
export async function accessRowFor(orgId: string): Promise<OrgAccessRow> {
  const g = await billingGroup(orgId);
  return { subscription_status: g.subscription_status, comped: g.comped };
}

/** Workspaces used vs the plan's allowance, for the switcher and Billing. */
export async function workspaceUsage(orgId: string) {
  const g = await billingGroup(orgId);
  const limit = WORKSPACE_LIMIT[g.plan] ?? 1;
  return { plan: g.plan, used: g.orgIds.length, limit, group: g };
}

/** Whether an org may schedule, publish and use AI: a live subscription (incl. trialing) or comped. */
export function orgHasAccess(org: OrgAccessRow | null | undefined): boolean {
  if (!billingEnforced()) return true;
  if (!org) return false;
  return Boolean(org.comped) || planIsActive(org.subscription_status);
}

// `db` is kept for call-site compatibility; the lookup always uses the service
// role (see billingGroup).
export async function hasAccess(_db: SupabaseClient, orgId: string): Promise<boolean> {
  if (!billingEnforced()) return true;
  return orgHasAccess(await accessRowFor(orgId));
}

export const NO_PLAN_MESSAGE =
  "This workspace has no active plan. Start your 7-day free trial on the Billing page to schedule posts.";

export const PAST_DUE_NOTE = "Your last payment didn't go through. Update your card on the Billing page to restore your plan's full allowance.";

/**
 * Why the workspace can't schedule (or retry) posts right now, or null:
 * no active plan, or more channels, workspaces or people than the plan
 * includes, e.g. after a downgrade. Limits are only checked when adding
 * things, so this is what makes a smaller plan actually apply. Posts already
 * scheduled still go out (and repeating series continue); new ones wait until
 * the workspace fits the plan again.
 */
export async function schedulingProblem(orgId: string): Promise<string | null> {
  if (!billingEnforced()) return null;
  const g = await billingGroup(orgId);
  if (!orgHasAccess(g)) return NO_PLAN_MESSAGE;
  if (g.comped) return null;
  return overPlanMessage(g);
}

/** The first allowance the plan's workspaces are over, as a message, or null. */
export async function overPlanMessage(g: BillingGroup): Promise<string | null> {
  const planName = g.plan === "trial" ? "current" : PLANS[g.plan].name;
  const fix = "or upgrade on the Billing page to schedule posts.";
  const [{ count: channels, error }, seats] = await Promise.all([
    createAdminClient().from("channels").select("id", { count: "exact", head: true }).in("org_id", g.orgIds),
    countSeats(g),
  ]);
  if (error) throw new Error(`overPlanMessage(${g.rootId}): ${error.message}`);
  const over = (used: number, limit: number) => (used > limit ? used - limit : 0);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  const workspaceLimit = WORKSPACE_LIMIT[g.plan] ?? 1;
  const extraWorkspaces = over(g.orgIds.length, workspaceLimit);
  if (extraWorkspaces) {
    return `Your ${planName} plan includes ${plural(workspaceLimit, "workspace", "workspaces")} and you have ${g.orgIds.length}. Delete ${extraWorkspaces} in Settings, ${fix}`;
  }
  const channelLimit = CHANNEL_LIMIT[g.plan] ?? CHANNEL_LIMIT.trial;
  const extraChannels = over(channels ?? 0, channelLimit);
  if (extraChannels) {
    return `Your ${planName} plan includes ${plural(channelLimit, "channel", "channels")} and you have ${channels} connected. Disconnect ${extraChannels} on the Channels page, ${fix}`;
  }
  const seatLimit = SEAT_LIMIT[g.plan] ?? 1;
  const extraSeats = over(seats, seatLimit);
  if (extraSeats) {
    return `Your ${planName} plan includes ${plural(seatLimit, "person", "people")} and there are ${seats} (counting pending invites). Remove ${extraSeats} on the Team page, ${fix}`;
  }
  return null;
}

/**
 * Whether the org has hit its plan's channel allowance. Used to gate connecting
 * a NEW channel (reconnecting an existing one updates in place and is exempt).
 */
export async function atChannelLimit(_db: SupabaseClient, orgId: string): Promise<boolean> {
  const g = await billingGroup(orgId);
  // Counted across every workspace the plan covers.
  const { count } = await createAdminClient()
    .from("channels")
    .select("id", { count: "exact", head: true })
    .in("org_id", g.orgIds);
  return (count ?? 0) >= (CHANNEL_LIMIT[g.plan] ?? CHANNEL_LIMIT.trial);
}

export type AiKind = "image" | "video";
export type AiUsage = {
  plan: PlanId;
  /** In the free trial: limits are trial-level until the first payment. */
  trialing: boolean;
  /** A payment failed: limits are trial-level until it goes through. */
  pastDue: boolean;
  image: { used: number; limit: number; remaining: number };
  video: { used: number; limit: number; remaining: number };
};

/** Start (UTC) of the current calendar month — the AI quota window. */
function monthStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** This month's AI generation usage vs the org's plan quota. */
export async function aiUsage(_db: SupabaseClient, orgId: string): Promise<AiUsage> {
  const g = await billingGroup(orgId);
  const plan = g.plan;
  const allowance = g.usagePlan; // trial-level while the free trial runs
  const db = createAdminClient();
  const since = monthStartIso();
  // The monthly allowance is shared across the plan's workspaces.
  const [img, vid] = await Promise.all([
    db.from("ai_generations").select("id", { count: "exact", head: true }).in("org_id", g.orgIds).eq("kind", "image").gte("created_at", since),
    db.from("ai_generations").select("id", { count: "exact", head: true }).in("org_id", g.orgIds).eq("kind", "video").gte("created_at", since),
  ]);
  const imgLimit = AI_IMAGE_LIMIT[allowance] ?? AI_IMAGE_LIMIT.trial;
  const vidLimit = AI_VIDEO_LIMIT[allowance] ?? AI_VIDEO_LIMIT.trial;
  const iu = img.count ?? 0;
  const vu = vid.count ?? 0;
  return {
    plan,
    trialing: g.trialing,
    pastDue: g.pastDue,
    image: { used: iu, limit: imgLimit, remaining: Math.max(0, imgLimit - iu) },
    video: { used: vu, limit: vidLimit, remaining: Math.max(0, vidLimit - vu) },
  };
}

/**
 * Why the org can't generate another `kind` right now, or null. During the free
 * trial the allowance is trial-level, and the message says how to unlock the
 * plan's full allowance (start the plan now on Billing).
 */
export async function aiLimitMessage(db: SupabaseClient, orgId: string, kind: AiKind): Promise<string | null> {
  const u = await aiUsage(db, orgId);
  if (u[kind].remaining > 0) return null;
  const noun = kind === "image" ? "AI images" : "AI videos";
  if (u.pastDue) return `${PAST_DUE_NOTE} Until then, AI is limited to ${u[kind].limit} ${noun} a month.`;
  if (u.trialing) {
    const full = (kind === "image" ? AI_IMAGE_LIMIT : AI_VIDEO_LIMIT)[u.plan] ?? 0;
    return `Your free trial includes ${u[kind].limit} ${noun}. To get your plan's ${full} a month now, start your plan early on the Billing page.`;
  }
  return `You've used all your ${noun} for this month. Upgrade your plan for more.`;
}

export type AgentUsage = {
  plan: PlanId;
  /** Messages sent this month across the plan's workspaces (for display; not limited). */
  month: number;
  /** Messages sent today across the plan's workspaces, against the daily cap. */
  today: number;
  dailyCap: number;
  remainingToday: number;
  /** Logged model cost this month across the plan's workspaces, against the ceiling. */
  spentUsd: number;
  budgetUsd: number;
};

/** Start (UTC) of today: when the daily safety cap resets. */
function dayStartIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

/**
 * AI-agent usage. Messages are unlimited under fair use; two backstops apply,
 * both per plan across its workspaces (lib/plans.ts): a daily message cap and
 * a monthly spend ceiling on the logged model cost.
 */
export async function agentUsage(_db: SupabaseClient, orgId: string): Promise<AgentUsage> {
  const g = await billingGroup(orgId);
  const db = createAdminClient();
  const [{ count: month }, { count: today }, { data: spent }] = await Promise.all([
    db.from("agent_messages").select("id", { count: "exact", head: true }).in("org_id", g.orgIds).gte("created_at", monthStartIso()),
    db.from("agent_messages").select("id", { count: "exact", head: true }).in("org_id", g.orgIds).gte("created_at", dayStartIso()),
    db.rpc("agent_spend_since", { p_orgs: g.orgIds, p_since: monthStartIso() }),
  ]);
  // Trial-level backstops while the free trial runs.
  const dailyCap = AGENT_DAILY_CAP[g.usagePlan] ?? AGENT_DAILY_CAP.trial;
  const budget = AGENT_MONTHLY_BUDGET_USD[g.usagePlan] ?? AGENT_MONTHLY_BUDGET_USD.trial;
  return {
    plan: g.plan,
    month: month ?? 0,
    today: today ?? 0,
    dailyCap,
    remainingToday: Math.max(0, dailyCap - (today ?? 0)),
    spentUsd: Number(spent ?? 0),
    budgetUsd: budget,
  };
}

/**
 * Take one AI generation from the plan's monthly allowance, atomically
 * (reserve_ai_generation: per-plan lock, count, insert), before the work
 * starts, so parallel requests can't overrun it. Give it back with
 * releaseAiGeneration if the generation fails.
 */
export async function reserveAiGeneration(
  orgId: string,
  kind: AiKind,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const g = await billingGroup(orgId);
  const limit = (kind === "image" ? AI_IMAGE_LIMIT : AI_VIDEO_LIMIT)[g.usagePlan] ?? 0;
  const { data, error } = await createAdminClient().rpc("reserve_ai_generation", {
    p_orgs: g.orgIds,
    p_org: orgId,
    p_kind: kind,
    p_limit: limit,
    p_since: monthStartIso(),
  });
  if (error) return { ok: false, error: "Couldn't check your AI allowance. Try again in a moment." };
  if (!data) {
    return { ok: false, error: (await aiLimitMessage(createAdminClient(), orgId, kind)) ?? "You've used this month's AI allowance." };
  }
  return { ok: true, id: data as string };
}

/** Give a reserved generation back (the work failed, or wasn't charged). */
export async function releaseAiGeneration(id: string): Promise<void> {
  await createAdminClient().from("ai_generations").delete().eq("id", id);
}

/**
 * Count one agent turn against the plan's backstops atomically
 * (reserve_agent_message: per-plan lock, daily cap, monthly spend, insert).
 * Returns the usage row id (its cost is filled in when the turn ends).
 */
export async function reserveAgentMessage(
  orgId: string,
): Promise<{ ok: true; id: string } | { ok: false; reason: "no_plan" | "daily" | "budget" | "error" }> {
  const db = createAdminClient();
  if (!(await hasAccess(db, orgId))) return { ok: false, reason: "no_plan" };
  const g = await billingGroup(orgId);
  const { data, error } = await db.rpc("reserve_agent_message", {
    p_orgs: g.orgIds,
    p_org: orgId,
    p_daily_cap: AGENT_DAILY_CAP[g.usagePlan] ?? AGENT_DAILY_CAP.trial,
    p_day_start: dayStartIso(),
    p_budget: AGENT_MONTHLY_BUDGET_USD[g.usagePlan] ?? AGENT_MONTHLY_BUDGET_USD.trial,
    p_month_start: monthStartIso(),
  });
  if (error || !data) return { ok: false, reason: "error" };
  if (data === "daily" || data === "budget") return { ok: false, reason: data };
  return { ok: true, id: data as string };
}

/**
 * People across the plan's workspaces: each distinct member counts once however
 * many workspaces they're in, plus pending invites (by email).
 */
export async function seatUsage(orgId: string): Promise<{ used: number; group: BillingGroup }> {
  const g = await billingGroup(orgId);
  return { used: await countSeats(g), group: g };
}

async function countSeats(g: BillingGroup): Promise<number> {
  const db = createAdminClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    db.from("org_members").select("user_id").in("org_id", g.orgIds),
    // Pending invites hold a seat until they expire.
    db.from("org_invites").select("email").in("org_id", g.orgIds).is("accepted_at", null).gt("expires_at", new Date().toISOString()),
  ]);
  const users = new Set((members ?? []).map((m) => m.user_id as string));
  const emails = new Set((invites ?? []).map((i) => String(i.email).toLowerCase()));
  return users.size + emails.size;
}
