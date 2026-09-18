"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrgId } from "@/lib/org";

export type FeedbackState = { ok?: boolean; error?: string };

/** Post a public feature-board idea (title + optional details). */
export async function submitIdea(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to post an idea." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give your idea a short title." };
  const details = String(formData.get("details") ?? "").trim();

  const orgId = await getCurrentOrgId();
  const db = createAdminClient();
  const { data: created, error } = await db
    .from("feedback")
    .insert({
      org_id: orgId,
      user_id: user.id,
      email: user.email ?? null,
      category: "idea",
      title: title.slice(0, 140),
      message: details.slice(0, 4000),
      is_public: true,
      status: "open",
    })
    .select("id")
    .single();
  if (error || !created) return { error: "Couldn't post your idea — please try again." };

  // The author implicitly upvotes their own idea.
  await db.from("feedback_votes").insert({ feedback_id: created.id, user_id: user.id });

  revalidatePath("/feedback");
  return { ok: true };
}

/** Toggle the current user's upvote on a board idea. */
export async function toggleVote(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in to vote.");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing idea id.");

  const db = createAdminClient();
  const { data: existing } = await db
    .from("feedback_votes")
    .select("feedback_id")
    .eq("feedback_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await db.from("feedback_votes").delete().eq("feedback_id", id).eq("user_id", user.id);
  } else {
    await db.from("feedback_votes").insert({ feedback_id: id, user_id: user.id });
  }

  revalidatePath("/feedback");
}
