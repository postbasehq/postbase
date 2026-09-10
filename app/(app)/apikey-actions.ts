"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { generateApiKey, hashApiKey } from "@/lib/apikey";

export type CreateKeyState = { key?: string; label?: string; error?: string };

/** Create an API key. Returns the plaintext ONCE (only the hash is stored). */
export async function createApiKey(
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return { error: "No workspace found for this user." };

  const label = String(formData.get("label") ?? "").trim() || "Default";
  const key = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    org_id: orgId,
    hashed_key: hashApiKey(key),
    label,
  });
  if (error) return { error: error.message };

  revalidatePath("/api-keys");
  return { key, label };
}

export async function revokeApiKey(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found for this user.");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing key id.");

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  revalidatePath("/api-keys");
}
