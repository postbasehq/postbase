import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { needsTwoFactor, verifyUrl } from "@/lib/mfa";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the Supabase auth session on every request, guards the app routes,
 * and holds 2FA users at /login/verify until the session is verified (aal2).
 * If Supabase env vars are not set yet, it no-ops so the marketing site still runs.
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense-in-depth: the (app) layout also guards these, but block unauthenticated
  // access to every app route at the edge too.
  const protectedPrefixes = [
    "/agent", "/analytics", "/api-keys", "/billing", "/calendar", "/channels",
    "/composer", "/drafts", "/media", "/queue", "/settings", "/team",
  ];
  const path = request.nextUrl.pathname;
  if (!user && protectedPrefixes.some((p) => path === p || path.startsWith(`${p}/`))) {
    // Send them back where they were going after sign-in (e.g. pricing →
    // /billing?plan=team), via the login page's ?next= handling.
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(redirectUrl);
  }

  // Two-factor step-up. The session APIs (matched in middleware.ts) answer 401;
  // pages, server actions and the MCP consent page go to the code prompt.
  const stepUp = [...protectedPrefixes, "/oauth", "/api"];
  if (user && stepUp.some((p) => path === p || path.startsWith(`${p}/`)) && (await needsTwoFactor(supabase, user))) {
    const held = path.startsWith("/api/")
      ? NextResponse.json({ error: "Two-factor verification required." }, { status: 401 })
      : NextResponse.redirect(new URL(verifyUrl(path + request.nextUrl.search), request.url));
    // Keep any refreshed session cookies, or the rotated refresh token is lost.
    response.cookies.getAll().forEach((c) => held.cookies.set(c));
    return held;
  }

  return response;
}
