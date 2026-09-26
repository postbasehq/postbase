import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AGENT_MESSAGE_LIMIT,
  AI_IMAGE_LIMIT,
  AI_VIDEO_LIMIT,
  CHANNEL_LIMIT,
  planIsActive,
  type PlanId,
} from "@/lib/plans";

/**
 * Billing is enforced only once Stripe is fully configured (secret, webhook and
 * at least the base price). Self-hosted installs without Stripe keep full access.
 */
export function billingEnforced(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_CREATOR_MONTH,
  );
}

export type OrgAccessRow = { subscription_status: string | null; comped: boolean | null };

/** Whether an org may schedule, publish and use AI: a live subscription (incl. trialing) or comped. */
export function orgHasAccess(org: OrgAccessRow | null | undefined): boolean {
  if (!billingEnforced()) return true;
  if (!org) return false;
  return Boolean(org.comped) || planIsActive(org.subscription_status);
}

export async function hasAccess(db: SupabaseClient, orgId: string): Promise<boolean> {
  if (!billingEnforced()) return true;
  const { data: org } = await db
    .from("orgs")
    .select("subscription_status, comped")
    .eq("id", orgId)
    .maybeSingle();
  return orgHasAccess(org);
}

export const NO_PLAN_MESSAGE =
  "This workspace has no active plan. Start your 7-day free trial on the Billing page to schedule posts.";

/**
 * Whether the org has hit its plan's channel allowance. Used to gate connecting
 * a NEW channel (reconnecting an existing one updates in place and is exempt).
 */
export async function atChannelLimit(db: SupabaseClient, orgId: string): Promise<boolean> {
  const { data: org } = await db.from("orgs").select("plan").eq("id", orgId).single();
  const plan = (org?.plan ?? "trial") as PlanId;
  const { count } = await db
    .from("channels")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  return (count ?? 0) >= (CHANNEL_LIMIT[plan] ?? CHANNEL_LIMIT.trial);
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
export async function aiUsage(db: SupabaseClient, orgId: string): Promise<AiUsage> {
  const { data: org } = await db.from("orgs").select("plan").eq("id", orgId).single();
  const plan = (org?.plan ?? "trial") as PlanId;
  const since = monthStartIso();
  const [img, vid] = await Promise.all([
    db.from("ai_generations").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("kind", "image").gte("created_at", since),
    db.from("ai_generations").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("kind", "video").gte("created_at", since),
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

export type AgentUsage = { plan: PlanId; used: number; limit: number; remaining: number };

/** This month's AI-agent message usage vs the org's plan quota. */
export async function agentUsage(db: SupabaseClient, orgId: string): Promise<AgentUsage> {
  const { data: org } = await db.from("orgs").select("plan").eq("id", orgId).single();
  const plan = (org?.plan ?? "trial") as PlanId;
  const { count } = await db
    .from("agent_messages")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("created_at", monthStartIso());
  const limit = AGENT_MESSAGE_LIMIT[plan] ?? AGENT_MESSAGE_LIMIT.trial;
  const used = count ?? 0;
  return { plan, used, limit, remaining: Math.max(0, limit - used) };
}

/** Whether the org has hit its monthly AI-agent message quota. */
export async function atAgentLimit(db: SupabaseClient, orgId: string): Promise<boolean> {
  if (!(await hasAccess(db, orgId))) return true;
  const u = await agentUsage(db, orgId);
  return u.remaining <= 0;
}

/** Record one used agent message (service-role insert, so it can't be tampered with). */
export async function recordAgentMessage(db: SupabaseClient, orgId: string): Promise<void> {
  await db.from("agent_messages").insert({ org_id: orgId });
}
