"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cleanCode, safeNext, verifiedTotpFactors } from "@/lib/mfa";

export type VerifyState = { error?: string };

/** Sign-in step-up: check the authenticator code and upgrade the session to aal2. */
export async function verifySignIn(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const code = cleanCode(formData.get("code"));
  if (!code) return { error: "Enter the 6-digit code from your authenticator app." };
  // Only ever one of this user's own verified factors.
  const factor = verifiedTotpFactors(user).find((f) => f.id === formData.get("factor_id"));
  if (!factor) return { error: "Pick the device you set up." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) {
    return {
      error:
        error.status === 429
          ? "Too many attempts. Wait a few minutes and try again."
          : "That code didn’t work. Use the newest code, and check your phone’s clock is set automatically.",
    };
  }
  redirect(safeNext(String(formData.get("next") ?? "")));
}
