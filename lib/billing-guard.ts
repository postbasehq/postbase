import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_IMAGE_LIMIT, AI_VIDEO_LIMIT, CHANNEL_LIMIT, type PlanId } from "@/lib/plans";

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
  const u = await aiUsage(db, orgId);
  return u[kind].remaining <= 0;
}
