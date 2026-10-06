"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_ORG_COOKIE, getCurrentOrgId, getOrgRole } from "@/lib/org";
import { billingEnforced, billingGroup, orgHasAccess } from "@/lib/billing-guard";
import { PLANS, WORKSPACE_LIMIT, nextWorkspacePlan } from "@/lib/plans";
import { redirect } from "next/navigation";
import { deleteWorkspaceAs, leaveWorkspaceAs } from "@/lib/account/workspace";
import { rateLimit } from "@/lib/rate-limit";

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

export type WorkspaceRemovalState = { error?: string };

/** After leaving or deleting, land in another workspace rather than a stale cookie. */
async function moveOn(): Promise<never> {
  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  revalidatePath("/", "layout");
  redirect("/calendar");
}

/** Leave the current workspace (rules in lib/account/workspace.ts). */
export async function leaveCurrentWorkspace(_prev: WorkspaceRemovalState, _formData: FormData): Promise<WorkspaceRemovalState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getCurrentOrgId();
  if (!user || !orgId) return { error: "Sign in again, then try once more." };
  try {
    await leaveWorkspaceAs(user.id, orgId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't leave the workspace." };
  }
  return moveOn();
}

/** Delete the current workspace and everything in it; the name is typed to confirm. */
export async function deleteCurrentWorkspace(_prev: WorkspaceRemovalState, formData: FormData): Promise<WorkspaceRemovalState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getCurrentOrgId();
  if (!user || !orgId) return { error: "Sign in again, then try once more." };
  const { data: org } = await createAdminClient().from("orgs").select("name").eq("id", orgId).maybeSingle();
  if (String(formData.get("confirm") ?? "").trim() !== String(org?.name ?? "").trim()) {
    return { error: "Type the workspace name exactly to confirm." };
  }
  if (!(await rateLimit(`delete-workspace:${user.id}`, 60 * 60, 10))) return { error: "Too many attempts. Try again in an hour." };
  try {
    await deleteWorkspaceAs(user.id, orgId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't delete the workspace." };
  }
  return moveOn();
}
