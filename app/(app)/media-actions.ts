"use server";

import { revalidatePath } from "next/cache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { r2Client, r2Bucket } from "@/lib/r2";

/**
 * Delete a library asset: remove the R2 object, then the row. Scoped to the
 * caller's active org — RLS on media_library ensures the row (and thus its key)
 * belongs to the caller before we touch R2.
 */
export async function deleteMediaAsset(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found.");

  // RLS restricts this select to the caller's orgs; org_id check is belt-and-braces.
  const { data: row } = await supabase
    .from("media_library")
    .select("id, key")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!row) return;

  try {
    await r2Client().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: row.key }));
  } catch {
    // If the object is already gone, still drop the row.
  }

  await supabase.from("media_library").delete().eq("id", row.id).eq("org_id", orgId);
  revalidatePath("/media");
}
