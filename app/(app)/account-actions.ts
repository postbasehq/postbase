"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "@/lib/account/delete";
import { sendAccountDeleted } from "@/lib/email/notify";
import { rateLimit } from "@/lib/rate-limit";

export type DeleteAccountState = { error?: string };

/**
 * Delete the signed-in account. The person types their email to confirm; the
 * plan (what's deleted, what's left, what blocks it) is recomputed here, never
 * taken from the page.
 */
export async function deleteMyAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sign in again, then try once more." };

  const typed = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (typed !== user.email.toLowerCase()) return { error: "Type your email address exactly to confirm." };
  if (!(await rateLimit(`delete-account:${user.id}`, 60 * 60, 5))) return { error: "Too many attempts. Try again in an hour." };

  let deleted: string[];
  try {
    const plan = await deleteAccount(user.id);
    deleted = plan.purge.map((o) => o.name);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't delete the account. Email team@postbase.so and we'll do it for you." };
  }

  await sendAccountDeleted({ email: user.email, userId: user.id, workspaces: deleted });
  // The user no longer exists; clear this browser's session cookies too.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  redirect("/?account=deleted");
}
