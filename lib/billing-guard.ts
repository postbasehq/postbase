import type { SupabaseClient } from "@supabase/supabase-js";
import { CHANNEL_LIMIT, type PlanId } from "@/lib/plans";

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
