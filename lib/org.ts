import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * A user can belong to more than one org (their own + teams they were invited to).
 * The "active" org is stored in a cookie; helpers here resolve it and list the
 * orgs a user can switch between.
 */
export const ACTIVE_ORG_COOKIE = "active_org";

export type UserOrg = { id: string; name: string; role: string };

/*
 * Request-scoped lookups. The layout and the page each ask who's signed in and
 * which workspace is active, often several times; each ask was a round trip to
 * Supabase. React's cache() runs them once per page render (it doesn't memoize
 * in server actions or background jobs, which always read fresh).
 */

/** The signed-in user (auth.getUser verifies the session with Supabase Auth). */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

async function userId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null;
}

type Membership = { org_id: string; role: string; orgs: { id: string; name: string } | null };

/** The user's workspace memberships, read once per render. */
const memberships = cache(async (uid: string): Promise<Membership[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("org_members").select("org_id, role, orgs(id, name)").eq("user_id", uid);
  return (data ?? []) as unknown as Membership[];
});

/** The current user's active org id — the cookie if they're a member, else owned/first. */
export const getCurrentOrgId = cache(async (): Promise<string | null> => {
  const uid = await userId();
  if (!uid) return null;

  const mems = await memberships(uid);
  if (mems.length === 0) return null;

  const jar = await cookies();
  const preferred = jar.get(ACTIVE_ORG_COOKIE)?.value;
  if (preferred && mems.some((m) => m.org_id === preferred)) return preferred;

  const owned = mems.find((m) => m.role === "owner");
  return (owned ?? mems[0]).org_id;
});

/** All orgs the current user belongs to, with their role (for the org switcher). */
export const getUserOrgs = cache(async (): Promise<UserOrg[]> => {
  const uid = await userId();
  if (!uid) return [];
  return (await memberships(uid))
    .filter((m) => m.orgs)
    .map((m) => ({ id: m.orgs!.id, name: m.orgs!.name, role: m.role }));
});

/** The current user's role in a given org (owner | admin | member), or null. */
export async function getOrgRole(orgId: string): Promise<string | null> {
  const uid = await userId();
  if (!uid) return null;
  return (await memberships(uid)).find((m) => m.org_id === orgId)?.role ?? null;
}

/** Owners and admins manage billing, channels and the team; members create and schedule. */
export function canManageOrg(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Matches no row. Filtering by it returns nothing rather than every workspace. */
const NO_ORG = "00000000-0000-0000-0000-000000000000";

/**
 * The active workspace id to filter queries by. RLS alone returns rows from
 * every workspace the user belongs to, so pages that list workspace data must
 * filter by this as well. Never null: with no workspace, it matches nothing.
 */
export async function scopeOrgId(): Promise<string> {
  return (await getCurrentOrgId()) ?? NO_ORG;
}
