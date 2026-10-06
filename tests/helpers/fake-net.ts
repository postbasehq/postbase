/*
 * A scripted fake network for tests: replaces global fetch, which Supabase,
 * Resend and the social-network clients all use. Each test supplies a handler
 * that answers requests (return undefined to fall through to a 404) and gets a
 * log of every request made, so it can assert on what was written.
 */

export type FakeRequest = {
  method: string;
  url: URL;
  /** Supabase REST table (or rpc/<name>), when the request is to the fake database. */
  table: string;
  query: string;
  body: unknown;
  headers: Headers;
  /** Supabase asked for a single object (maybeSingle/single). */
  single: boolean;
};

export type Handler = (req: FakeRequest) => Response | undefined | Promise<Response | undefined>;

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

/** A Supabase count response (head: true). */
export const counted = (n: number) => new Response(null, { status: 200, headers: { "content-range": `0-0/${n}` } });

export function installFakeNet(handler: Handler) {
  const log: FakeRequest[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    const headers = new Headers(init.headers);
    let body: unknown = init.body ?? null;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        /* keep text */
      }
    }
    const req: FakeRequest = {
      method: init.method ?? "GET",
      url,
      table: url.pathname.replace("/rest/v1/", ""),
      query: decodeURIComponent(url.search),
      body,
      headers,
      single: (headers.get("accept") ?? "").includes("vnd.pgrst.object"),
    };
    log.push(req);
    return (await handler(req)) ?? json({ message: `no fake for ${req.method} ${url.host}${url.pathname}` }, 404);
  }) as typeof fetch;
  return {
    log,
    /** Writes (non-GET) to the fake database, as "METHOD table query". */
    writes: () => log.filter((r) => r.url.host === "db.test" && r.method !== "GET" && r.method !== "HEAD").map((r) => `${r.method} ${r.table} ${r.query}`),
    restore: () => {
      globalThis.fetch = original;
    },
  };
}
