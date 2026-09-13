"use server";

import { revalidatePath } from "next/cache";
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

  revalidatePath("/dashboard");
}
