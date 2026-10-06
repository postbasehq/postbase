"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "@/lib/account/delete";
import { sendAccountDeleted } from "@/lib/email/notify";
import { rateLimit } from "@/lib/rate-limit";
import { needsTwoFactor } from "@/lib/mfa";

export type DeleteAccountState = { error?: string };

const RECENT_SIGN_IN_MS = 24 * 60 * 60 * 1000;

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
  // Defence in depth with the middleware: a session still owing its 2FA code can't delete.
  if (await needsTwoFactor(supabase, user)) return { error: "Enter your two-factor code first, then try again." };

  const typed = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (typed !== user.email.toLowerCase()) return { error: "Type your email address exactly to confirm." };
  if (!(await rateLimit(`delete-account:${user.id}`, 60 * 60, 5))) return { error: "Too many attempts. Try again in an hour." };
  // Re-authentication: a stolen session alone can't delete the account; a
  // fresh sign-in needs the inbox (or Google/GitHub) as well.
  const signedIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0;
  if (Date.now() - signedIn > RECENT_SIGN_IN_MS) {
    return { error: "For your security, sign out and sign back in, then delete your account within 24 hours." };
  }

  let deleted: string[];
  try {
    const plan = await deleteAccount(user.id, user.email);
    deleted = plan.purge.map((o) => o.name);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't delete the account. Email team@postbase.so and we'll do it for you." };
  }

  await sendAccountDeleted({ email: user.email, userId: user.id, workspaces: deleted });
  // The user no longer exists; clear this browser's session cookies too.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  redirect("/?account=deleted");
}
