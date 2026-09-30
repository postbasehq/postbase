"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId, getOrgRole } from "@/lib/org";

export type RenameState = { ok?: boolean; error?: string; name?: string };

/** Rename the current workspace. Owners and admins only. */
export async function renameWorkspace(_prev: RenameState, formData: FormData): Promise<RenameState> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return { error: "No workspace found." };
  const role = await getOrgRole(orgId);
  if (role !== "owner" && role !== "admin") return { error: "Only owners and admins can rename the workspace." };

  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  if (!name) return { error: "Give the workspace a name." };
  if (name.length > 60) return { error: "Keep it to 60 characters or fewer." };

  const { error } = await createAdminClient().from("orgs").update({ name }).eq("id", orgId);
  if (error) return { error: "Couldn’t save the name. Try again." };

  // The name shows in the sidebar switcher on every page.
  revalidatePath("/", "layout");
  return { ok: true, name };
}
