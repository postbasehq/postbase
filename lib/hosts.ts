/**
 * Which address serves which pages, once Postbase runs on three hosts:
 *
 *   www.postbase.so   marketing site, blog, pricing
 *   app.postbase.so   the app (calendar, agent, composer, billing…)
 *   bots.postbase.so  Postbots, at clean paths (bots.postbase.so/<bot id>)
 *
 * Off until NEXT_PUBLIC_APP_HOST and NEXT_PUBLIC_BOTS_HOST are set, so local
 * dev and Vercel previews stay on one host. Sign-in, the API, the MCP OAuth
 * flow and invites work on every host: network callbacks are registered on
 * www, and Claude's connector points there, so those never move. Everything
 * else is a redirect to its home, so old links, emails, Stripe returns and
 * network callbacks keep working untouched.
 */

/** Plain data so middleware (edge) and components can both read it. */
export type HostConfig = {
  marketing: string;
  app: string | null;
  bots: string | null;
  /** Cookie domain shared by all three, e.g. ".postbase.so". */
  cookieDomain: string | null;
};

// Spelled out: Next only inlines NEXT_PUBLIC_ values into browser code when
// each is written literally, so `process.env` as a whole would read empty there.
const ENV = {
  NEXT_PUBLIC_MARKETING_HOST: process.env.NEXT_PUBLIC_MARKETING_HOST,
  NEXT_PUBLIC_APP_HOST: process.env.NEXT_PUBLIC_APP_HOST,
  NEXT_PUBLIC_BOTS_HOST: process.env.NEXT_PUBLIC_BOTS_HOST,
  NEXT_PUBLIC_COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
};

export function hostConfig(env: Record<string, string | undefined> = ENV): HostConfig {
  return {
    marketing: env.NEXT_PUBLIC_MARKETING_HOST || "www.postbase.so",
    app: env.NEXT_PUBLIC_APP_HOST || null,
    bots: env.NEXT_PUBLIC_BOTS_HOST || null,
    cookieDomain: env.NEXT_PUBLIC_COOKIE_DOMAIN || null,
  };
}

/** The split is on only with both app and bots hosts set. */
export function splitOn(c: HostConfig): c is HostConfig & { app: string; bots: string } {
  return Boolean(c.app && c.bots);
}

/**
 * The cookie domain for sign-in on this host: the shared one once the split is
 * on and the host is under it, otherwise null (host-only, as before).
 */
export function cookieDomainFor(c: HostConfig, host: string): string | null {
  if (!splitOn(c) || !c.cookieDomain) return null;
  const h = host.toLowerCase().split(":")[0];
  const base = c.cookieDomain.replace(/^\./, "");
  return h === base || h.endsWith(`.${base}`) ? c.cookieDomain : null;
}

/** The app's pages (the (app) route group). */
export const APP_PREFIXES = [
  "/agent", "/analytics", "/api-keys", "/billing", "/calendar", "/channels",
  "/composer", "/drafts", "/media", "/queue", "/settings", "/team",
];

/** Served on every host: sign-in, the API, MCP OAuth, invites, OAuth metadata. */
export const SHARED_PREFIXES = ["/login", "/auth", "/api", "/oauth", "/invite", "/well-known", "/.well-known"];

const under = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** A /bots path as it reads on the bots host: "/bots/abc" is "/abc", "/bots" is "/". */
export function cleanBotsPath(path: string): string {
  return path.replace(/^\/bots(?=\/|$)/, "") || "/";
}

export type HostRoute =
  | { kind: "next" }
  /** Serve this internal path instead (the URL bar keeps the clean one). */
  | { kind: "rewrite"; path: string }
  | { kind: "redirect"; url: string };

/**
 * Where a request belongs. `host` is the request's Host header, `path` its
 * pathname and `search` its query string ("?a=1" or ""). Only GET and HEAD
 * are redirected; a POST (a server action, a form) runs where it was sent.
 */
export function routeHost(c: HostConfig, host: string, method: string, path: string, search: string): HostRoute {
  if (!splitOn(c)) return { kind: "next" };
  const h = host.toLowerCase().split(":")[0];
  const onMarketing = h === c.marketing || h === c.marketing.replace(/^www\./, "");
  const onApp = h === c.app;
  const onBots = h === c.bots;
  // Previews, localhost, the MCP host: leave alone.
  if (!onMarketing && !onApp && !onBots) return { kind: "next" };

  const redirectable = method === "GET" || method === "HEAD";
  const go = (to: string, p: string): HostRoute =>
    redirectable ? { kind: "redirect", url: `https://${to}${p}${search}` } : { kind: "next" };

  if (onBots) {
    // Old-style /bots/<id> links: show the clean path.
    if (path === "/bots" || path.startsWith("/bots/")) return go(c.bots, cleanBotsPath(path));
    if (under(path, SHARED_PREFIXES)) return { kind: "next" };
    if (under(path, APP_PREFIXES)) return go(c.app, path);
    return { kind: "rewrite", path: path === "/" ? "/bots" : `/bots${path}` };
  }

  if (path === "/bots" || path.startsWith("/bots/")) return go(c.bots, cleanBotsPath(path));
  if (under(path, SHARED_PREFIXES)) return { kind: "next" };

  if (onApp) {
    if (path === "/") return go(c.app, "/calendar");
    if (under(path, APP_PREFIXES)) return { kind: "next" };
    // A marketing page asked for on the app host.
    return go(c.marketing, path);
  }

  // Marketing host: app pages live on the app host now.
  if (under(path, APP_PREFIXES)) return go(c.app, path);
  return { kind: "next" };
}

/**
 * A link to a Postbots page from inside Postbots. On the bots host the paths
 * are clean ("/abc"); on one host they stay "/bots/abc". Deterministic from
 * env, so server and browser render the same href.
 */
export function botsHref(path: string): string {
  return splitOn(hostConfig()) ? cleanBotsPath(path) : path;
}
