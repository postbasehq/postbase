import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * A user can belong to more than one org (their own + teams they were invited to).
 * The "active" org is stored in a cookie; helpers here resolve it and list the
 * orgs a user can switch between.
 */
export const ACTIVE_ORG_COOKIE = "active_org";

export type UserOrg = { id: string; name: string; role: string };

async function userId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** The current user's active org id — the cookie if they're a member, else owned/first. */
export async function getCurrentOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const uid = await userId();
  if (!uid) return null;

  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", uid);
  const mems = memberships ?? [];
  if (mems.length === 0) return null;

  const jar = await cookies();
  const preferred = jar.get(ACTIVE_ORG_COOKIE)?.value;
  if (preferred && mems.some((m) => m.org_id === preferred)) return preferred;

  const owned = mems.find((m) => m.role === "owner");
  return (owned ?? mems[0]).org_id;
}

/** All orgs the current user belongs to, with their role (for the org switcher). */
export async function getUserOrgs(): Promise<UserOrg[]> {
  const supabase = await createClient();
  const uid = await userId();
  if (!uid) return [];
  const { data } = await supabase
    .from("org_members")
    .select("role, orgs(id, name)")
    .eq("user_id", uid);
  return ((data ?? []) as unknown as { role: string; orgs: { id: string; name: string } | null }[])
    .filter((m) => m.orgs)
    .map((m) => ({ id: m.orgs!.id, name: m.orgs!.name, role: m.role }));
}

/** The current user's role in a given org (owner | admin | member), or null. */
export async function getOrgRole(orgId: string): Promise<string | null> {
  const supabase = await createClient();
  const uid = await userId();
  if (!uid) return null;
  const { data } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", uid)
    .maybeSingle();
  return data?.role ?? null;
}
