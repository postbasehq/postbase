"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId } from "@/lib/org";

export type FeedbackState = { ok?: boolean; error?: string };

const CATEGORIES = new Set(["idea", "issue", "praise", "other"]);

/** Store an in-app feedback submission, scoped to the current user/org. */
export async function submitFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to send feedback." };

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Add a message before sending." };

  const rawCategory = String(formData.get("category") ?? "other");
  const category = CATEGORIES.has(rawCategory) ? rawCategory : "other";

  const orgId = await getCurrentOrgId();
  const db = createAdminClient();
  const { error } = await db.from("feedback").insert({
    org_id: orgId,
    user_id: user.id,
    email: user.email ?? null,
    category,
    message: message.slice(0, 4000),
  });
  if (error) return { error: "Couldn't send feedback — please try again." };

  return { ok: true };
}
