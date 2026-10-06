import { createAdminClient } from "@/lib/supabase/admin";
import { atChannelLimit } from "@/lib/billing-guard";

/*
 * The only writer of new/reconnected channel rows. Members have no INSERT or
 * UPDATE on `channels` and can't read `encrypted_tokens` (migration 0057), so
 * tokens can't be copied out or replayed into another workspace; every connect
 * flow (OAuth callbacks, Bluesky, Meta) saves through here with the service
 * role, scoped to the caller's verified workspace (`orgId` must come from
 * getCurrentOrgId, never from the request).
 */
export async function saveChannel(
  orgId: string,
  platform: string,
  handle: string,
  fields: Record<string, unknown>,
): Promise<{ error: string | null; limit: boolean }> {
  const db = createAdminClient();
  // Reconnecting the same account updates its row instead of duplicating it.
  const { data: existing, error: findError } = await db
    .from("channels")
    .select("id")
    .eq("org_id", orgId)
    .eq("platform", platform)
    .eq("handle", handle)
    .maybeSingle();
  if (findError) return { error: findError.message, limit: false };
  if (!existing && (await atChannelLimit(db, orgId))) return { error: null, limit: true };

  const { error } = existing
    ? await db.from("channels").update(fields).eq("id", existing.id).eq("org_id", orgId)
    : await db.from("channels").insert({ org_id: orgId, platform, handle, ...fields });
  return { error: error?.message ?? null, limit: false };
}
