"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";
import { generateApiKey, hashApiKey, maskApiKey } from "@/lib/apikey";
import { revokeToken } from "@/lib/oauth";

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
    key_hint: maskApiKey(key),
    label,
  });
  if (error) return { error: error.message };

  revalidatePath("/api-keys");
  return { key, label };
}

/**
 * Rotate a key: revoke the old one and mint a replacement with the same label,
 * in a single action. The new plaintext is returned ONCE, like create.
 */
export async function rotateApiKey(
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) return { error: "No workspace found for this user." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing key id." };
  const label = String(formData.get("label") ?? "").trim() || "Default";

  const key = generateApiKey();
  const { error: insertError } = await supabase.from("api_keys").insert({
    org_id: orgId,
    hashed_key: hashApiKey(key),
    key_hint: maskApiKey(key),
    label,
  });
  if (insertError) return { error: insertError.message };

  // Best-effort: remove the old key. The new one is already live either way.
  await supabase.from("api_keys").delete().eq("id", id).eq("org_id", orgId);

  revalidatePath("/api-keys");
  return { key, label };
}

/** Revoke a connected app (OAuth token) the current user authorized. */
export async function revokeConnectedApp(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing token id.");

  await revokeToken(id, user.id);
  revalidatePath("/api-keys");
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
