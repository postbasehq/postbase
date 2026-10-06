"use server";

import { createHash, randomBytes } from "node:crypto";
import { isSafePath } from "@/lib/safe-path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId, getOrgRole, ACTIVE_ORG_COOKIE } from "@/lib/org";
import { SEAT_LIMIT } from "@/lib/plans";
import { seatUsage } from "@/lib/billing-guard";
import { sendInviteEmail } from "@/lib/email/notify";
import { rateLimit } from "@/lib/rate-limit";

const COOKIE = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 };

type Db = ReturnType<typeof createAdminClient>;

async function requireManager(orgId: string) {
  const role = await getOrgRole(orgId);
  if (role !== "owner" && role !== "admin") {
    throw new Error("Only owners and admins can manage the team.");
  }
}


const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Send (or re-send) an invite: one live invite per address per workspace. A
 * pending one is refreshed with a new link and expiry; otherwise a new one is
 * made, which needs a free seat (unexpired pending invites count as seats).
 * Rate-limited, since each one emails the address.
 */
async function issueInvite(orgId: string, email: string, role: string, inviter: { id: string; email: string | null } | null) {
  const db = createAdminClient();
  const { data: existing } = await db
    .from("org_invites")
    .select("id, expires_at")
    .eq("org_id", orgId)
    .eq("email", email)
    .is("accepted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // A still-valid pending invite already holds its seat; anything else needs one.
  const holdsSeat = existing && Date.parse(existing.expires_at as string) > Date.now();
  if (!holdsSeat) {
    const { used, group } = await seatUsage(orgId);
    if (used >= (SEAT_LIMIT[group.plan] ?? 1)) {
      throw new Error("You’ve reached your plan’s seat limit. Upgrade in Billing to add more.");
    }
  }

  // Each invite emails the address with this workspace's name in the subject:
  // cap it so re-inviting (or invite/revoke loops) can't be used to spam someone.
  const [orgOk, addressOk] = await Promise.all([
    rateLimit(`invite-org:${orgId}`, 60 * 60, 20),
    rateLimit(`invite-to:${createHash("sha256").update(email).digest("hex").slice(0, 32)}`, 24 * 60 * 60, 3),
  ]);
  if (!orgOk) throw new Error("Too many invites in the last hour. Try again later.");
  if (!addressOk) throw new Error("That address has been invited several times today. Try again tomorrow.");

  const token = randomBytes(24).toString("base64url");
  const expires_at = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const { data: invite, error } = existing
    ? await db.from("org_invites").update({ token, role, expires_at, invited_by: inviter?.id ?? null }).eq("id", existing.id).select("id").single()
    : await db.from("org_invites").insert({ org_id: orgId, email, role, token, expires_at, invited_by: inviter?.id ?? null }).select("id").single();
  if (error) throw new Error(error.message);
  // Email the link too; copying it from the Team page still works.
  const { data: org } = await db.from("orgs").select("name").eq("id", orgId).maybeSingle();
  await sendInviteEmail({ id: invite.id, email, token, role, orgName: org?.name ?? "a workspace", inviter: inviter?.email ?? null });
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

  await issueInvite(orgId, email, role, user ? { id: user.id, email: user.email ?? null } : null);
  revalidatePath("/team");
}

/** Re-send a pending (or expired) invite: new link, new 7-day expiry, emailed again. */
export async function resendInvite(formData: FormData) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found.");
  await requireManager(orgId);
  const inviteId = String(formData.get("invite_id") ?? "");
  const { data: invite } = await createAdminClient()
    .from("org_invites")
    .select("email, role")
    .eq("id", inviteId)
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .maybeSingle();
  if (!invite) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await issueInvite(orgId, invite.email as string, invite.role as string, user ? { id: user.id, email: user.email ?? null } : null);
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
  // Cut their programmatic access to this workspace too: connected MCP apps
  // (tokens + pending codes) and the API keys they created. Scoped to exactly
  // this user in this workspace; their access elsewhere is untouched.
  await Promise.all([
    db.from("oauth_tokens").delete().eq("org_id", orgId).eq("user_id", targetUser),
    db.from("oauth_codes").delete().eq("org_id", orgId).eq("user_id", targetUser),
    db.from("api_keys").delete().eq("org_id", orgId).eq("created_by", targetUser),
  ]);
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
  if (Date.parse(invite.expires_at) <= Date.now()) throw new Error("This invite has expired. Ask for a new one.");
  if (invite.email.toLowerCase() !== user!.email!.toLowerCase()) {
    throw new Error(`This invite is for ${invite.email}. Sign in with that email to accept.`);
  }

  // Already in the workspace: keep the role they have (an owner accepting a
  // stray "member" invite must not be demoted). Otherwise join with the
  // invite's role.
  const { data: already } = await db
    .from("org_members")
    .select("role")
    .eq("org_id", invite.org_id)
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!already) {
    const { error: joinError } = await db.from("org_members").insert({ org_id: invite.org_id, user_id: user!.id, role: invite.role });
    if (joinError) throw new Error("Couldn't join the workspace. Try the link again.");
  }
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
  // Optional same-site page to land on (e.g. /billing); anything else goes to the queue.
  const next = String(formData.get("next") ?? "");
  redirect(isSafePath(next) ? next : "/queue");
}
