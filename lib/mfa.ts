import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Two-factor sign-in (TOTP authenticator apps, via Supabase Auth MFA).
 *
 * A user with at least one verified factor must step their session up to aal2
 * at /login/verify before any app route, session API or the MCP consent page.
 * API keys and MCP access tokens are not Supabase sessions, so they are
 * unaffected: they were minted after a full sign-in and keep working until
 * revoked. Row-level security enforces the same rule (migration 0053), so an
 * aal1 session can't read workspace data straight through PostgREST either.
 */

export const VERIFY_PATH = "/login/verify";

/** Supabase allows 10 factors per user; a couple of backup devices is plenty. */
export const MAX_FACTORS = 5;

export function verifiedTotpFactors(user: User | null | undefined) {
  return (user?.factors ?? []).filter((f) => f.factor_type === "totp" && f.status === "verified");
}

/**
 * True when this signed-in user has 2FA on but the session hasn't been verified
 * with a code yet. `user` must come from getUser() (checked with the auth
 * server, so its factor list is current); the aal claim is read from that same
 * access token.
 */
export async function needsTwoFactor(supabase: SupabaseClient, user: User | null): Promise<boolean> {
  if (!user || verifiedTotpFactors(user).length === 0) return false;
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel !== "aal2";
}

/** Only same-origin relative paths survive a ?next= (no open redirect). */
export function safeNext(next: string | null | undefined, fallback = "/calendar"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith(VERIFY_PATH) ? next : fallback;
}

export function verifyUrl(next: string): string {
  return `${VERIFY_PATH}?next=${encodeURIComponent(next)}`;
}

/** A 6-digit code, tolerating the spaces authenticator apps show ("123 456"). */
export function cleanCode(raw: FormDataEntryValue | string | null): string | null {
  const code = String(raw ?? "").replace(/\s+/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}
