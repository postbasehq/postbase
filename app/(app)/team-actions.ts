"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId, getOrgRole, ACTIVE_ORG_COOKIE } from "@/lib/org";
import { SEAT_LIMIT, type PlanId } from "@/lib/plans";

const COOKIE = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 };

type Db = ReturnType<typeof createAdminClient>;

async function requireManager(orgId: string) {
  const role = await getOrgRole(orgId);
  if (role !== "owner" && role !== "admin") {
    throw new Error("Only owners and admins can manage the team.");
  }
}

/** Seats used = accepted members + still-pending invites. */
async function seatUsage(db: Db, orgId: string): Promise<number> {
  const [members, invites] = await Promise.all([
    db.from("org_members").select("user_id", { count: "exact", head: true }).eq("org_id", orgId),
    db
      .from("org_invites")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .is("accepted_at", null),
  ]);
  return (members.count ?? 0) + (invites.count ?? 0);
}

/** Invite an email to the current org with a role. */
export async function createInvite(formData: FormData) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found.");
  await requireManager(orgId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member");
  if (!email.includes("@")) throw new Error("Enter a valid email address.");
  if (role !== "member" && role !== "admin") throw new Error("Pick a valid role.");

  const db = createAdminClient();
  const { data: org } = await db.from("orgs").select("plan").eq("id", orgId).single();
  const plan = (org?.plan ?? "trial") as PlanId;
  if ((await seatUsage(db, orgId)) >= (SEAT_LIMIT[plan] ?? 1)) {
    throw new Error("You’ve reached your plan’s seat limit. Upgrade in Billing to add more.");
  }

  const token = randomBytes(24).toString("base64url");
  const { error } = await db
    .from("org_invites")
    .insert({ org_id: orgId, email, role, token, invited_by: user?.id ?? null });
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function revokeInvite(formData: FormData) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found.");
  await requireManager(orgId);
  const inviteId = String(formData.get("invite_id") ?? "");
  const db = createAdminClient();
  await db.from("org_invites").delete().eq("id", inviteId).eq("org_id", orgId);
  revalidatePath("/team");
}

export async function removeMember(formData: FormData) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found.");
  await requireManager(orgId);
  const targetUser = String(formData.get("user_id") ?? "");
  const db = createAdminClient();

  const { data: target } = await db
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", targetUser)
    .maybeSingle();
  if (!target) return;
  if (target.role === "owner") {
    const { count } = await db
      .from("org_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) throw new Error("You can’t remove the last owner.");
  }
  await db.from("org_members").delete().eq("org_id", orgId).eq("user_id", targetUser);
  revalidatePath("/team");
}

/** Accept an invite (token). Adds the current user to the org and switches to it. */
export async function acceptInvite(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const token = String(formData.get("token") ?? "");
  const db = createAdminClient();
  const { data: invite } = await db.from("org_invites").select("*").eq("token", token).maybeSingle();
  if (!invite || invite.accepted_at) throw new Error("This invite is invalid or already used.");
  if (invite.email.toLowerCase() !== user!.email!.toLowerCase()) {
    throw new Error(`This invite is for ${invite.email}. Sign in with that email to accept.`);
  }

  await db
    .from("org_members")
    .upsert({ org_id: invite.org_id, user_id: user!.id, role: invite.role }, { onConflict: "org_id,user_id" });
  await db
    .from("org_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user!.id })
    .eq("id", invite.id);

  const jar = await cookies();
  jar.set(ACTIVE_ORG_COOKIE, invite.org_id, COOKIE);
  redirect("/queue");
}

/** Switch the active workspace (for users in more than one org). */
export async function setActiveOrg(formData: FormData) {
  const orgId = String(formData.get("org_id") ?? "");
  const role = await getOrgRole(orgId);
  if (!role) throw new Error("You’re not a member of that workspace.");
  const jar = await cookies();
  jar.set(ACTIVE_ORG_COOKIE, orgId, COOKIE);
  revalidatePath("/", "layout");
  redirect("/queue");
}
