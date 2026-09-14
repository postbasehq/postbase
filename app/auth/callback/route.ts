import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
