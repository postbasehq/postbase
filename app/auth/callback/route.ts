import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcome } from "@/lib/email/notify";

// Exchanges the magic-link / OAuth code for a session, then redirects to the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only allow same-origin relative redirects (no open redirect via ?next=).
  const nextParam = searchParams.get("next") ?? "/calendar";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/calendar";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A brand-new account (first sign-in within two hours of creation, inside the sign-in link's life) gets the
      // welcome email; sendWelcome is keyed per user, so it only ever goes once.
      const u = data.user;
      if (u && Date.now() - Date.parse(u.created_at) < 2 * 60 * 60_000) await sendWelcome({ id: u.id, email: u.email });
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
