import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AGENT_DAILY_CAP,
  AGENT_MONTHLY_BUDGET_USD,
  AI_IMAGE_LIMIT,
  AI_VIDEO_LIMIT,
  CHANNEL_LIMIT,
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
  return {
    rootId,
    rootName: (root?.name as string) ?? "",
    orgIds: [rootId, ...(members ?? []).map((m) => m.id as string)],
    plan: ((root?.plan as PlanId | undefined) ?? "trial") as PlanId,
    subscription_status: (root?.subscription_status as string | null) ?? null,
    comped: Boolean(root?.comped),
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
  const db = createAdminClient();
  const since = monthStartIso();
  // The monthly allowance is shared across the plan's workspaces.
  const [img, vid] = await Promise.all([
    db.from("ai_generations").select("id", { count: "exact", head: true }).in("org_id", g.orgIds).eq("kind", "image").gte("created_at", since),
    db.from("ai_generations").select("id", { count: "exact", head: true }).in("org_id", g.orgIds).eq("kind", "video").gte("created_at", since),
  ]);
  const imgLimit = AI_IMAGE_LIMIT[plan] ?? AI_IMAGE_LIMIT.trial;
  const vidLimit = AI_VIDEO_LIMIT[plan] ?? AI_VIDEO_LIMIT.trial;
  const iu = img.count ?? 0;
  const vu = vid.count ?? 0;
  return {
    plan,
    image: { used: iu, limit: imgLimit, remaining: Math.max(0, imgLimit - iu) },
    video: { used: vu, limit: vidLimit, remaining: Math.max(0, vidLimit - vu) },
  };
}

/** Whether the org has hit its monthly quota for the given kind. */
export async function atAiLimit(db: SupabaseClient, orgId: string, kind: AiKind): Promise<boolean> {
  if (!(await hasAccess(db, orgId))) return true;
  const u = await aiUsage(db, orgId);
  return u[kind].remaining <= 0;
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
  const dailyCap = AGENT_DAILY_CAP[g.plan] ?? AGENT_DAILY_CAP.trial;
  const budget = AGENT_MONTHLY_BUDGET_USD[g.plan] ?? AGENT_MONTHLY_BUDGET_USD.trial;
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

/** Why the agent can't take another message right now, or null if it can. */
export async function agentLimitReason(db: SupabaseClient, orgId: string): Promise<"no_plan" | "daily" | "budget" | null> {
  if (!(await hasAccess(db, orgId))) return "no_plan";
  const u = await agentUsage(db, orgId);
  if (u.remainingToday <= 0) return "daily";
  if (u.spentUsd >= u.budgetUsd) return "budget";
  return null;
}

/** Whether the workspace has no access, or has hit one of the agent's backstops. */
export async function atAgentLimit(db: SupabaseClient, orgId: string): Promise<boolean> {
  return (await agentLimitReason(db, orgId)) !== null;
}

/** Record one used agent message (service-role insert, so it can't be tampered with). */
export async function recordAgentMessage(db: SupabaseClient, orgId: string): Promise<string | null> {
  const { data } = await db.from("agent_messages").insert({ org_id: orgId }).select("id").single();
  return data?.id ?? null;
}

/**
 * People across the plan's workspaces: each distinct member counts once however
 * many workspaces they're in, plus pending invites (by email).
 */
export async function seatUsage(orgId: string): Promise<{ used: number; group: BillingGroup }> {
  const g = await billingGroup(orgId);
  const db = createAdminClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    db.from("org_members").select("user_id").in("org_id", g.orgIds),
    db.from("org_invites").select("email").in("org_id", g.orgIds).is("accepted_at", null),
  ]);
  const users = new Set((members ?? []).map((m) => m.user_id as string));
  const emails = new Set((invites ?? []).map((i) => String(i.email).toLowerCase()));
  return { used: users.size + emails.size, group: g };
}
