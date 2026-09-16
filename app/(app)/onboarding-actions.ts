"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId } from "@/lib/org";

// Mark the current workspace's onboarding as finished (or skipped) so the
// welcome wizard doesn't show again. Owner-scoped; verified via the session.
export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const orgId = await getCurrentOrgId();
  if (!orgId) return;

  // Only the owner may complete onboarding for the workspace.
  const { data: org } = await supabase
    .from("orgs")
    .select("id")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return;

  await createAdminClient()
    .from("orgs")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", orgId);

  revalidatePath("/queue");
}

// Clear the flag so the welcome wizard shows again, then drop the user on the
// calendar (home) where it renders over the page. Triggered from Settings → "Replay setup".
export async function restartOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const orgId = await getCurrentOrgId();
  if (!orgId) return;

  const { data: org } = await supabase
    .from("orgs")
    .select("id")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return;

  await createAdminClient().from("orgs").update({ onboarded_at: null }).eq("id", orgId);

  revalidatePath("/calendar");
  redirect("/calendar");
}
