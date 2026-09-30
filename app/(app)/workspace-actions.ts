"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_ORG_COOKIE, getCurrentOrgId, getOrgRole } from "@/lib/org";
import { billingEnforced, billingGroup, orgHasAccess } from "@/lib/billing-guard";
import { PLANS, WORKSPACE_LIMIT, nextWorkspacePlan } from "@/lib/plans";

export type CreateWorkspaceResult = { ok: true; id: string } | { ok: false; error: string; upgrade?: boolean };

/**
 * Create a workspace covered by the current workspace's plan. It shares the
 * plan's channels, seats and AI allowances (lib/billing-guard.ts billingGroup),
 * and the creator becomes its owner. Only owners and admins of the paying
 * workspace can add one, up to the plan's workspace allowance.
 */
export async function createWorkspace(name: string): Promise<CreateWorkspaceResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getCurrentOrgId();
  if (!user || !orgId) return { ok: false, error: "Not signed in." };

  const clean = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return { ok: false, error: "Give the workspace a name." };
  if (clean.length > 60) return { ok: false, error: "Keep it to 60 characters or fewer." };

  const group = await billingGroup(orgId);
  const role = await getOrgRole(group.rootId);
  if (role !== "owner" && role !== "admin") {
    return { ok: false, error: `Only owners and admins of ${group.rootName} can add workspaces to its plan.` };
  }
  if (billingEnforced() && !orgHasAccess(group)) {
    return { ok: false, error: "Start a plan first, then you can add workspaces.", upgrade: true };
  }
  const limit = WORKSPACE_LIMIT[group.plan] ?? 1;
  if (group.orgIds.length >= limit) {
    const next = nextWorkspacePlan(group.plan);
    return {
      ok: false,
      upgrade: true,
      error: next
        ? `Your plan includes ${limit} ${limit === 1 ? "workspace" : "workspaces"}. ${PLANS[next].name} includes ${WORKSPACE_LIMIT[next]}.`
        : `You've used all ${limit} workspaces on your plan.`,
    };
  }

  const db = createAdminClient();
  const { data: org, error } = await db
    .from("orgs")
    .insert({ name: clean, billing_org_id: group.rootId, onboarded_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !org) return { ok: false, error: "Couldn't create the workspace." };
  const { error: memberErr } = await db.from("org_members").insert({ org_id: org.id, user_id: user.id, role: "owner" });
  if (memberErr) {
    await db.from("orgs").delete().eq("id", org.id);
    return { ok: false, error: "Couldn't create the workspace." };
  }

  // Switch straight into it.
  (await cookies()).set(ACTIVE_ORG_COOKIE, org.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  return { ok: true, id: org.id };
}
