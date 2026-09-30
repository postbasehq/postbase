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

/** Rename a library asset's display label. Scoped to the caller's active org. */
export async function renameMediaAsset(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No workspace found.");

  await supabase
    .from("media_library")
    .update({ name: name.slice(0, 200) })
    .eq("id", id)
    .eq("org_id", orgId);
  revalidatePath("/media");
}

// ── Folders ─────────────────────────────────────────────────────────────

export type MediaFolder = { id: string; name: string };
export type FolderResult = { ok: true; folder?: MediaFolder } | { ok: false; error: string };

async function folderContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getCurrentOrgId();
  return { supabase, user, orgId };
}

const cleanName = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Create a folder in the current workspace. */
export async function createMediaFolder(name: string): Promise<FolderResult> {
  const { supabase, user, orgId } = await folderContext();
  if (!user || !orgId) return { ok: false, error: "Not signed in." };
  const n = cleanName(name);
  if (!n) return { ok: false, error: "Give the folder a name." };
  if (n.length > 60) return { ok: false, error: "Keep it to 60 characters or fewer." };
  const { data, error } = await supabase
    .from("media_folders")
    .insert({ org_id: orgId, name: n, created_by: user.id })
    .select("id, name")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? "There's already a folder with that name." : "Couldn't create the folder." };
  revalidatePath("/media");
  return { ok: true, folder: data };
}

/** Rename a folder in the current workspace. */
export async function renameMediaFolder(id: string, name: string): Promise<FolderResult> {
  const { supabase, user, orgId } = await folderContext();
  if (!user || !orgId) return { ok: false, error: "Not signed in." };
  const n = cleanName(name);
  if (!n) return { ok: false, error: "Give the folder a name." };
  if (n.length > 60) return { ok: false, error: "Keep it to 60 characters or fewer." };
  const { error } = await supabase.from("media_folders").update({ name: n }).eq("id", id).eq("org_id", orgId);
  if (error) return { ok: false, error: error.code === "23505" ? "There's already a folder with that name." : "Couldn't rename the folder." };
  revalidatePath("/media");
  return { ok: true, folder: { id, name: n } };
}

/** Delete a folder. Its files stay in the library, unfiled (folder_id is set null). */
export async function deleteMediaFolder(id: string): Promise<FolderResult> {
  const { supabase, user, orgId } = await folderContext();
  if (!user || !orgId) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.from("media_folders").delete().eq("id", id).eq("org_id", orgId);
  if (error) return { ok: false, error: "Couldn't delete the folder." };
  revalidatePath("/media");
  return { ok: true };
}

/** Move files into a folder, or out of all folders (null). Current workspace only. */
export async function moveMediaToFolder(ids: string[], folderId: string | null): Promise<FolderResult> {
  const { supabase, user, orgId } = await folderContext();
  if (!user || !orgId) return { ok: false, error: "Not signed in." };
  const clean = ids.filter(Boolean).slice(0, 500);
  if (clean.length === 0) return { ok: true };
  if (folderId) {
    // The folder must be in this workspace, not just one the user can see.
    const { data: folder } = await supabase.from("media_folders").select("id").eq("id", folderId).eq("org_id", orgId).maybeSingle();
    if (!folder) return { ok: false, error: "That folder doesn't exist." };
  }
  const { error } = await supabase.from("media_library").update({ folder_id: folderId }).in("id", clean).eq("org_id", orgId);
  if (error) return { ok: false, error: "Couldn't move the files." };
  revalidatePath("/media");
  return { ok: true };
}
