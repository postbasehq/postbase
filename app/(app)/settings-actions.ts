"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cleanCode, MAX_FACTORS, verifiedTotpFactors } from "@/lib/mfa";
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

// ── Two-factor sign-in (TOTP) ───────────────────────────────────────────
// All of these run on the user's own session: Supabase only lets an aal2
// session add a second factor or remove a verified one, and the app never
// serves an aal1 session past /login/verify.

export type TwoFactorSetup = { error?: string; factorId?: string; qr?: string; secret?: string };
export type TwoFactorResult = { ok?: boolean; error?: string };

const BAD_CODE = "That code didn’t work. Use the newest code, and check your phone’s clock is set automatically.";

/** Start setting up an authenticator app: returns the QR code and secret to scan. */
export async function startTwoFactor(rawName: string): Promise<TwoFactorSetup> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You’re signed out. Sign in again." };

  const verified = verifiedTotpFactors(user);
  if (verified.length >= MAX_FACTORS) return { error: `You can set up ${MAX_FACTORS} devices at most. Remove one first.` };
  const name = rawName.replace(/\s+/g, " ").trim().slice(0, 40) || (verified.length ? "Backup device" : "Authenticator app");
  if (verified.some((f) => f.friendly_name?.toLowerCase() === name.toLowerCase())) {
    return { error: `You already have a device called “${name}”. Pick another name.` };
  }

  // A setup that was started and never finished leaves an unverified factor
  // behind; clear those so names don't clash.
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of list?.all ?? []) {
    if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: name, issuer: "Postbase" });
  if (error || !data) return { error: "Couldn’t start setup. Try again." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Finish setup with the first code from the app. This also verifies the session (aal2). */
export async function confirmTwoFactor(factorId: string, rawCode: string): Promise<TwoFactorResult> {
  const code = cleanCode(rawCode);
  if (!code) return { error: "Enter the 6-digit code from your authenticator app." };
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: error.status === 429 ? "Too many attempts. Wait a few minutes and try again." : BAD_CODE };
  revalidatePath("/settings");
  return { ok: true };
}

/** Remove a device. Needs a fresh code from it, or from another device if it's lost. */
export async function removeTwoFactor(factorId: string, rawCode: string): Promise<TwoFactorResult> {
  const code = cleanCode(rawCode);
  if (!code) return { error: "Enter a 6-digit code from one of your authenticator apps." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You’re signed out. Sign in again." };

  const factors = verifiedTotpFactors(user);
  if (!factors.some((f) => f.id === factorId)) return { error: "That device is already gone." };
  // Try the device being removed first, then any other one.
  let ok = false;
  const order = [...factors.filter((f) => f.id === factorId), ...factors.filter((f) => f.id !== factorId)];
  for (const f of order) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: f.id, code });
    if (!error) {
      ok = true;
      break;
    }
    if (error.status === 429) return { error: "Too many attempts. Wait a few minutes and try again." };
  }
  if (!ok) return { error: BAD_CODE };

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: "Couldn’t remove it. Try again." };
  revalidatePath("/settings");
  return { ok: true };
}
