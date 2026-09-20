import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shared helpers for Meta's deauthorize + data-deletion callbacks. These are
 * unauthenticated webhooks (no Postbase session) — Meta signs them, and we act
 * with the service-role client after verifying the signature.
 */

/** Read `signed_request` from a JSON or form-encoded Meta callback body. */
export async function readSignedRequest(req: Request): Promise<string | null> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = (await req.json().catch(() => null)) as { signed_request?: string } | null;
    return j?.signed_request ?? null;
  }
  const form = await req.formData().catch(() => null);
  const v = form?.get("signed_request");
  return v ? String(v) : null;
}

/** Delete every Instagram/Facebook channel linked to a Meta app-scoped user id. */
export async function deleteMetaChannelsForUser(userId: string): Promise<number> {
  const db = createAdminClient();
  const { data } = await db
    .from("channels")
    .delete()
    .in("platform", ["instagram", "facebook"])
    .eq("provider_user_id", userId)
    .select("id");
  return data?.length ?? 0;
}
