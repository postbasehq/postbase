import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { needsTwoFactor, verifyUrl } from "@/lib/mfa";
import { APP_PREFIXES, cookieDomainFor, hostConfig, routeHost } from "@/lib/hosts";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Set once a browser's sign-in cookies have moved to the shared domain. */
const MOVED = "pb_shared_session";
const YEAR_ISH = 400 * 24 * 60 * 60;

/**
 * Sends each request to its host (lib/hosts.ts), refreshes the Supabase auth
 * session, guards the app routes, and holds 2FA users at /login/verify until
 * the session is verified (aal2). If Supabase env vars are not set yet, it
 * only routes, so the marketing site still runs.
 */
export async function updateSession(request: NextRequest) {
  const hosts = hostConfig();
  const host = request.headers.get("host") ?? "";
  const route = routeHost(hosts, host, request.method, request.nextUrl.pathname, request.nextUrl.search);
  const domain = cookieDomainFor(hosts, host);

  // Once the hosts split, the sign-in cookie lives on the shared domain so all
  // three hosts see it. A browser still holding the old host-only cookie gets
  // it copied across (and the old one cleared) on its next visit, so nobody
  // has to sign in again.
  const move =
    domain !== null && !request.cookies.has(MOVED) && request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const appHost = hosts.app !== null && [hosts.app, hosts.bots].includes(host.toLowerCase().split(":")[0]);
  const finish = (res: NextResponse) => {
    if (move && domain) {
      const old = request.cookies.getAll().filter((c) => c.name.startsWith("sb-"));
      for (const c of old) {
        if (!res.cookies.get(c.name)) {
          res.cookies.set(c.name, c.value, { domain, path: "/", sameSite: "lax", secure: true, maxAge: YEAR_ISH });
        }
      }
      res.cookies.set(MOVED, "1", { domain, path: "/", sameSite: "lax", secure: true, maxAge: YEAR_ISH });
      // Last: res.cookies.set rewrites the whole Set-Cookie header. No Domain
      // attribute, so these clear only the old host-only copies.
      for (const c of old) res.headers.append("Set-Cookie", `${c.name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`);
    }
    // The app and Postbots aren't for search engines.
    if (appHost) res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  };

  if (route.kind === "redirect") return finish(NextResponse.redirect(route.url, 308));
  // The path the app sees: on the bots host "/abc" is really "/bots/abc".
  const path = route.kind === "rewrite" ? route.path : request.nextUrl.pathname;
  const pass = () =>
    route.kind === "rewrite"
      ? NextResponse.rewrite(new URL(route.path + request.nextUrl.search, request.url), { request })
      : NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return finish(pass());

  let response = pass();

  const supabase = createServerClient(url, anon, {
    ...(domain ? { cookieOptions: { domain } } : {}),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = pass();
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
  const protectedPrefixes = [...APP_PREFIXES, "/bots"];
  if (!user && protectedPrefixes.some((p) => path === p || path.startsWith(`${p}/`))) {
    // Send them back where they were going after sign-in (e.g. pricing →
    // /billing?plan=team), via the login page's ?next= handling.
    // On the bots host the address bar has the clean path, so come back to that.
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return finish(NextResponse.redirect(redirectUrl));
  }

  // Two-factor step-up. The session APIs (matched in middleware.ts) answer 401;
  // pages, server actions and the MCP consent page go to the code prompt.
  const stepUp = [...protectedPrefixes, "/oauth", "/api"];
  // A server action runs whichever page URL it's POSTed to (it's found by the
  // Next-Action header), so it must step up even when posted to "/".
  const serverAction = request.method === "POST" && request.headers.has("next-action");
  if (user && (serverAction || stepUp.some((p) => path === p || path.startsWith(`${p}/`))) && (await needsTwoFactor(supabase, user))) {
    const held = path.startsWith("/api/")
      ? NextResponse.json({ error: "Two-factor verification required." }, { status: 401 })
      : NextResponse.redirect(new URL(verifyUrl(request.nextUrl.pathname + request.nextUrl.search), request.url));
    // Keep any refreshed session cookies, or the rotated refresh token is lost.
    response.cookies.getAll().forEach((c) => held.cookies.set(c));
    return finish(held);
  }

  return finish(response);
}
