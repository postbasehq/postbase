import { createClient } from "@/lib/supabase/server";

/**
 * The current user's org id. Every user gets exactly one org on sign-up
 * (see supabase/migrations/0002_org_bootstrap.sql); RLS scopes the read to
 * orgs the user belongs to.
 */
export async function getCurrentOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("orgs").select("id").limit(1).maybeSingle();
  return data?.id ?? null;
}
