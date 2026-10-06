import { createAdminClient } from "@/lib/supabase/admin";
import { leaveWorkspace, purgeWorkspace } from "@/lib/account/delete";

/*
 * Leaving and deleting a single workspace (Settings → Workspace).
 *  Leave: anyone, unless they're the only owner of a workspace with other
 *    people (the team would be stranded) or it's their only workspace.
 *  Delete (owners): everything in it goes, as in account deletion
 *    (purgeWorkspace: subscription cancelled, channel access revoked, files
 *    removed, rows cascade). Not their only workspace, and not while it pays
 *    for other workspaces. A workspace on another's plan hands its month's AI
 *    and agent usage to the paying workspace first, so deleting it can't
 *    reset the shared allowance.
 */

export type WorkspaceRemoval = {
  name: string;
  role: string;
  /** Other people in the workspace. */
  others: number;
  /** Has a live Stripe subscription that deleting would cancel. */
  paid: boolean;
  leaveBlocker: string | null;
  deleteBlocker: string | null;
};

export async function planWorkspaceRemoval(userId: string, orgId: string): Promise<WorkspaceRemoval | null> {
  const db = createAdminClient();
  const [{ data: org }, { data: members }, { count: myWorkspaces }, { data: dependants }] = await Promise.all([
    db.from("orgs").select("id, name, subscription_status, stripe_subscription_id").eq("id", orgId).maybeSingle(),
    db.from("org_members").select("user_id, role").eq("org_id", orgId),
    db.from("org_members").select("org_id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("orgs").select("name").eq("billing_org_id", orgId),
  ]);
  const me = (members ?? []).find((m) => m.user_id === userId);
  if (!org || !me) return null;
  const others = (members ?? []).filter((m) => m.user_id !== userId);
  const onlyWorkspace = (myWorkspaces ?? 0) <= 1;
  const soleOwner = me.role === "owner" && !others.some((o) => o.role === "owner");

  let leaveBlocker: string | null = null;
  if (onlyWorkspace) leaveBlocker = "This is your only workspace. To close everything, delete your account instead.";
  else if (soleOwner && others.length) leaveBlocker = "You're the only owner. Remove the other people from the Team page first, or delete the workspace.";
  else if (!others.length) leaveBlocker = "You're the only person here, so leaving would strand it. Delete the workspace instead.";

  let deleteBlocker: string | null = null;
  if (me.role !== "owner") deleteBlocker = "Only owners can delete a workspace.";
  else if (onlyWorkspace) deleteBlocker = "This is your only workspace. To close everything, delete your account instead.";
  else if (dependants?.length) {
    const names = dependants.map((d) => `“${d.name}”`).join(", ");
    const one = dependants.length === 1;
    deleteBlocker = `This workspace pays for ${names}, which would lose ${one ? "its" : "their"} plan. Delete ${one ? "it" : "them"} first.`;
  }

  return {
    name: org.name as string,
    role: me.role as string,
    others: others.length,
    paid: Boolean(org.stripe_subscription_id) && ["active", "trialing", "past_due"].includes(String(org.subscription_status)),
    leaveBlocker,
    deleteBlocker,
  };
}

export async function leaveWorkspaceAs(userId: string, orgId: string): Promise<void> {
  const plan = await planWorkspaceRemoval(userId, orgId);
  if (!plan) throw new Error("You're not in that workspace.");
  if (plan.leaveBlocker) throw new Error(plan.leaveBlocker);
  await leaveWorkspace(createAdminClient(), orgId, userId);
}

export async function deleteWorkspaceAs(userId: string, orgId: string): Promise<string> {
  const plan = await planWorkspaceRemoval(userId, orgId);
  if (!plan) throw new Error("You're not in that workspace.");
  if (plan.deleteBlocker) throw new Error(plan.deleteBlocker);

  // On another workspace's plan: its usage counts toward that plan's monthly
  // allowances, so keep it there rather than letting the delete erase it.
  const db = createAdminClient();
  const { data: org } = await db.from("orgs").select("billing_org_id").eq("id", orgId).maybeSingle();
  const payer = org?.billing_org_id as string | null;
  if (payer) {
    const moved = await Promise.all([
      db.from("ai_generations").update({ org_id: payer }).eq("org_id", orgId),
      db.from("agent_messages").update({ org_id: payer }).eq("org_id", orgId),
    ]);
    const failed = moved.find((r) => r.error);
    if (failed?.error) throw new Error(`Couldn't delete the workspace: ${failed.error.message}`);
  }
  await purgeWorkspace(orgId);
  return plan.name;
}
