import type Anthropic from "@anthropic-ai/sdk";

/*
 * Apps a workspace can connect to its Postbots, through Composio
 * (https://docs.composio.dev). Composio holds the OAuth tokens; we hold none.
 *
 * Connections belong to the workspace (Composio user id `postbase_org_<id>`),
 * like Postbase channels: every bot in the workspace can use them.
 *
 * In a chat, a turn opens a Composio session limited to the connected apps.
 * The session hands the bot a few meta tools (search the app's tools, then run
 * them), so it never loads hundreds of tool schemas. Destructive tools (delete,
 * remove) are filtered out, and the prompt has the bot confirm before writing.
 *
 * Off until COMPOSIO_API_KEY is set. REST, not the SDK: the SDK needs Node 22.22+.
 */

const BASE = "https://backend.composio.dev/api/v3.1";

export { APPS, APP_CATEGORIES, appName, isAppSlug, type AppCategory, type AppInfo } from "@/lib/postbots/apps-catalog";
import { isAppSlug } from "@/lib/postbots/apps-catalog";

export const appsEnabled = () => Boolean(process.env.COMPOSIO_API_KEY);

const userIdFor = (orgId: string) => `postbase_org_${orgId}`;

/** Most a tool result can add to the model's context. */
const MAX_RESULT_CHARS = 12_000;

async function composio<T>(path: string, init: { method?: string; body?: unknown; query?: Record<string, string | string[]> } = {}): Promise<T> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new Error("Apps aren't switched on yet.");
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(init.query ?? {})) for (const one of [v].flat()) url.searchParams.append(k, one);
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { "x-api-key": key, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Composio returned ${res.status}.`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

export type AppConnection = { id: string; slug: string; status: string };

/** The workspace's connected accounts for our apps (active or still connecting). */
export async function listConnections(orgId: string): Promise<AppConnection[]> {
  const out: AppConnection[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const data = await composio<{ items: { id: string; status: string; toolkit: { slug: string } }[]; next_cursor?: string | null }>(
      "/connected_accounts",
      { query: { user_ids: userIdFor(orgId), limit: "100", ...(cursor ? { cursor } : {}) } },
    );
    for (const a of data.items) {
      // Composio's docs write slugs in capitals; ours are lower case.
      const slug = a.toolkit.slug.toLowerCase();
      if (isAppSlug(slug)) out.push({ id: a.id, slug, status: a.status });
    }
    if (!data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return out;
}

/** Slugs of the apps a workspace can use right now. */
export async function connectedApps(orgId: string): Promise<string[]> {
  if (!appsEnabled()) return [];
  const all = await listConnections(orgId);
  return [...new Set(all.filter((a) => a.status === "ACTIVE").map((a) => a.slug))];
}

type SessionOptions = { toolkits: string[]; forTools?: boolean };

async function createSession(orgId: string, { toolkits, forTools }: SessionOptions): Promise<string> {
  const body: Record<string, unknown> = {
    user_id: userIdFor(orgId),
    toolkits: { enable: toolkits },
    // We run the connect flow in our own UI, never in chat.
    manage_connections: { enable: false },
  };
  if (forTools) {
    body.workbench = { enable: false };
    // No raw API calls, which would get round the tag filter.
    body.proxy_execute = { enable: false };
    // "disable" (not the "disabled" the REST docs show, which is silently ignored).
    body.tags = { disable: ["destructiveHint"] };
  }
  const data = await composio<{ session_id: string }>("/tool_router/session", { method: "POST", body });
  return data.session_id;
}

/** A Composio-hosted sign-in link for one app; it returns to `callbackUrl`. */
export async function createConnectLink(orgId: string, slug: string, callbackUrl: string): Promise<string> {
  const session = await createSession(orgId, { toolkits: [slug] });
  const data = await composio<{ redirect_url: string }>(`/tool_router/session/${session}/link`, {
    method: "POST",
    body: { toolkit: slug, callback_url: callbackUrl },
  });
  return data.redirect_url;
}

/** Disconnect every account the workspace has for an app. */
export async function disconnectApp(orgId: string, slug: string): Promise<void> {
  const mine = (await listConnections(orgId)).filter((a) => a.slug === slug);
  await Promise.all(mine.map((a) => composio(`/connected_accounts/${encodeURIComponent(a.id)}`, { method: "DELETE" })));
}

export type AppToolSession = { id: string; tools: Anthropic.Tool[] };

/** Open a session over the workspace's connected apps and get its tools for the model. */
export async function openAppTools(orgId: string, slugs: string[]): Promise<AppToolSession | null> {
  if (!appsEnabled() || slugs.length === 0) return null;
  const id = await createSession(orgId, { toolkits: slugs, forTools: true });
  const data = await composio<{ items: { slug: string; description: string; input_parameters: Record<string, unknown> }[] }>(
    `/tool_router/session/${id}/tools`,
    { query: { limit: "50" } },
  );
  const tools: Anthropic.Tool[] = data.items.map((t) => ({
    name: t.slug,
    description: t.description.slice(0, 4000),
    input_schema: { type: "object", ...t.input_parameters } as Anthropic.Tool["input_schema"],
  }));
  return { id, tools };
}

/** Run one of a session's tools; returns text for the model. */
export async function runAppTool(sessionId: string, slug: string, args: Record<string, unknown>): Promise<string> {
  const meta = slug.startsWith("COMPOSIO_");
  const data = await composio<{ result_type: string; data?: unknown; error?: string | null; input_requests?: Record<string, { message?: string }> }>(
    `/tool_router/session/${sessionId}/${meta ? "execute_meta" : "execute"}`,
    { method: "POST", body: meta ? { slug, arguments: args } : { tool_slug: slug, arguments: args } },
  );
  if (data.result_type === "input_required") {
    const asks = Object.values(data.input_requests ?? {}).map((r) => r.message).filter(Boolean);
    return `This needs the user's approval in the app first${asks.length ? `: ${asks.join(" ")}` : ""}. Tell them; don't retry.`;
  }
  if (data.result_type === "failed" || data.error) {
    // Multi-execute puts each tool's own reason in data.results.
    const detail = data.data ? ` ${JSON.stringify(data.data).slice(0, 2000)}` : "";
    return `Failed: ${data.error ?? "the app returned an error."}${detail}`;
  }
  const text = JSON.stringify(data.data ?? {});
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}… (cut; ask for less)` : text;
}
