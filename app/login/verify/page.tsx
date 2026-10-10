import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { TwoFactorPrompt } from "@/components/auth/TwoFactorPrompt";
import { createClient } from "@/lib/supabase/server";
import { needsTwoFactor, safeNext, verifiedTotpFactors } from "@/lib/mfa";

export const metadata: Metadata = { title: "Two-factor code", robots: { index: false, follow: false } };

type SearchParams = Record<string, string | string[] | undefined>;

/** Second sign-in step for accounts with 2FA: the middleware sends aal1 sessions here. */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  // Already verified, or 2FA isn't on: nothing to ask.
  if (!(await needsTwoFactor(supabase, user))) redirect(next);

  const factors = verifiedTotpFactors(user).map((f) => ({ id: f.id, name: f.friendly_name || "Authenticator app" }));

  return (
    <AuthShell
      tone="blue"
      scene="creators"
      title="Grow an audience on every network without living on social media."
      sub="Schedule everywhere, find the conversations worth joining, and let Postbots do the daily legwork."
    >
      <TwoFactorPrompt email={user.email ?? ""} factors={factors} next={next} />
    </AuthShell>
  );
}
