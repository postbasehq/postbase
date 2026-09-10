import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey } from "@/lib/apikey";

/**
 * Authenticate a public-API request by its `Authorization: Bearer pb_live_…` key.
 * Returns the owning org id, or null if the key is missing/invalid.
 * Uses the admin client because API callers have no user session — the key IS the auth.
 */
export async function authenticateApiKey(
  req: Request,
): Promise<{ orgId: string } | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const key = match[1].trim();
  if (!key.startsWith("pb_")) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("api_keys")
    .select("id, org_id")
    .eq("hashed_key", hashApiKey(key))
    .maybeSingle();

  if (!data) return null;

  // best-effort usage timestamp; don't block the request on it
  void db
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { orgId: data.org_id };
}
