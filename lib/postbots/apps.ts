import type Anthropic from "@anthropic-ai/sdk";

/*
 * Apps a workspace can connect to its Postbots, through Composio
 * (https://docs.composio.dev). Composio holds the OAuth tokens; we hold none.
 *
 * Connections belong to the workspace (Composio user id `postbase_org_<id>`),
 * like Postbase channels: every bot in the workspace can use them.
 *
 * A turn opens a Composio session limited to the connected apps. The session
 * hands the bot a few meta tools (search the app's tools, then run them), so it
 * never loads hundreds of tool schemas. What a session may run is enforced by
 * Composio from each tool's tag, never by the prompt, because tool results
 * (an email, an issue, a web page) can carry instructions aimed at the bot:
 *   chat     reads run; creates and updates pause for the user's approval
 *            (an Approve/Deny card); deletes are off
 *   routine  read-only: nobody is watching, so nothing gets sent or changed
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

/** What a session is for: starting a sign-in, a chat turn, or a routine run. */
export type SessionMode = "connect" | "chat" | "routine";

/** The tag policy Composio enforces for each mode ("disable", not the "disabled" some docs show). */
export function sessionTags(mode: SessionMode): Record<string, string[]> | undefined {
  if (mode === "chat") return { disable: ["destructiveHint"], require_approval: ["createHint", "updateHint"] };
  // "enable" means a tool must carry the tag: untagged tools are out too.
  if (mode === "routine") return { enable: ["readOnlyHint"], disable: ["createHint", "updateHint", "destructiveHint"] };
  return undefined;
}

async function createSession(orgId: string, toolkits: string[], mode: SessionMode): Promise<string> {
  const body: Record<string, unknown> = {
    user_id: userIdFor(orgId),
    toolkits: { enable: toolkits },
    // We run the connect flow in our own UI, never in chat.
    manage_connections: { enable: false },
  };
  if (mode !== "connect") {
    body.workbench = { enable: false };
    // No raw API calls, which would get round the tag policy.
    body.proxy_execute = { enable: false };
    body.tags = sessionTags(mode);
  }
  const data = await composio<{ session_id: string }>("/tool_router/session", { method: "POST", body });
  return data.session_id;
}

/**
 * The meta tools a bot may call. The rest (connection management, the remote
 * workbench and bash sandbox) run code or change setup, and stay off even if a
 * session offers them.
 */
export const ALLOWED_META_TOOLS = new Set(["COMPOSIO_SEARCH_TOOLS", "COMPOSIO_GET_TOOL_SCHEMAS", "COMPOSIO_MULTI_EXECUTE_TOOL"]);

export const isAllowedAppTool = (slug: string) => !slug.startsWith("COMPOSIO_") || ALLOWED_META_TOOLS.has(slug);

/** A Composio-hosted sign-in link for one app; it returns to `callbackUrl`. */
export async function createConnectLink(orgId: string, slug: string, callbackUrl: string): Promise<string> {
  const session = await createSession(orgId, [slug], "connect");
  const data = await composio<{ redirect_url: string }>(`/tool_router/session/${session}/link`, {
    method: "POST",
    body: { toolkit: slug, callback_url: callbackUrl },
  });
  return data.redirect_url;
}

async function deleteAccounts(accounts: { id: string }[]): Promise<void> {
  await Promise.all(accounts.map((a) => composio(`/connected_accounts/${encodeURIComponent(a.id)}`, { method: "DELETE" })));
}

/** Disconnect every account the workspace has for an app. */
export async function disconnectApp(orgId: string, slug: string): Promise<void> {
  await deleteAccounts((await listConnections(orgId)).filter((a) => a.slug === slug));
}

/**
 * Disconnect everything the workspace ever connected, our catalogue or not,
 * so the app tokens Composio holds die with the workspace.
 */
export async function disconnectAllApps(orgId: string): Promise<void> {
  if (!appsEnabled()) return;
  for (let page = 0; page < 20; page++) {
    const data = await composio<{ items: { id: string }[] }>("/connected_accounts", { query: { user_ids: userIdFor(orgId), limit: "100" } });
    if (data.items.length === 0) return;
    await deleteAccounts(data.items);
  }
}

export type AppToolSession = { id: string; tools: Anthropic.Tool[] };

/** Open a session over the workspace's connected apps and get its tools for the model. */
export async function openAppTools(orgId: string, slugs: string[], mode: "chat" | "routine"): Promise<AppToolSession | null> {
  if (!appsEnabled() || slugs.length === 0) return null;
  const id = await createSession(orgId, slugs, mode);
  const data = await composio<{ items: { slug: string; description: string; input_parameters: Record<string, unknown> }[] }>(
    `/tool_router/session/${id}/tools`,
    { query: { limit: "50" } },
  );
  const tools: Anthropic.Tool[] = data.items
    .filter((t) => isAllowedAppTool(t.slug))
    .map((t) => ({
      name: t.slug,
      description: t.description.slice(0, 4000),
      input_schema: { type: "object", ...t.input_parameters } as Anthropic.Tool["input_schema"],
    }));
  return { id, tools };
}

/** A paused app call, kept server-side on its card until the user answers. */
export type PausedAppCall = {
  sessionId: string;
  slug: string;
  arguments: Record<string, unknown>;
  requestState: string;
  requestIds: string[];
};

export type AppToolResult =
  | { text: string }
  /** A create or update Composio held back for the user's approval. */
  | { approval: { summary: string; call: PausedAppCall } };

type ExecuteResponse = {
  result_type: string;
  data?: unknown;
  error?: string | null;
  input_requests?: Record<string, { message?: string }>;
  request_state?: string;
};

async function execute(sessionId: string, slug: string, args: Record<string, unknown>, answer?: { responses: Record<string, unknown>; requestState: string }) {
  const meta = slug.startsWith("COMPOSIO_");
  const body: Record<string, unknown> = meta ? { slug, arguments: args } : { tool_slug: slug, arguments: args };
  if (answer) {
    body.input_responses = answer.responses;
    body.request_state = answer.requestState;
  }
  return composio<ExecuteResponse>(`/tool_router/session/${sessionId}/${meta ? "execute_meta" : "execute"}`, { method: "POST", body });
}

function resultText(data: ExecuteResponse): string {
  if (data.result_type === "failed" || data.error) {
    // Multi-execute puts each tool's own reason in data.results.
    const detail = data.data ? ` ${JSON.stringify(data.data).slice(0, 2000)}` : "";
    return `Failed: ${data.error ?? "the app returned an error."}${detail}`;
  }
  const text = JSON.stringify(data.data ?? {});
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}… (cut; ask for less)` : text;
}

/** Run one of a session's tools. Writes come back paused, for an approval card. */
export async function runAppTool(sessionId: string, slug: string, args: Record<string, unknown>): Promise<AppToolResult> {
  if (!isAllowedAppTool(slug)) return { text: `${slug} isn't available to Postbots.` };
  const data = await execute(sessionId, slug, args);
  if (data.result_type === "input_required") {
    const requests = data.input_requests ?? {};
    const requestIds = Object.keys(requests);
    if (!data.request_state || requestIds.length === 0) return { text: "That needs approval, which couldn't be requested. Tell the user; don't retry." };
    const summary = Object.values(requests)
      .map((r) => (r.message ?? "").replace(/^Your agent wants to run the following tools?:\s*/i, "").trim())
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2000);
    return { approval: { summary: summary || slug, call: { sessionId, slug, arguments: args, requestState: data.request_state, requestIds } } };
  }
  return { text: resultText(data) };
}

/** Answer a paused call: run it on approve; on deny Composio needn't hear back. */
export async function resumeAppCall(call: PausedAppCall): Promise<{ ok: boolean; text: string }> {
  const responses = Object.fromEntries(call.requestIds.map((id) => [id, { action: "accept", content: { decision: "approve" } }]));
  const data = await execute(call.sessionId, call.slug, call.arguments, { responses, requestState: call.requestState });
  if (data.result_type === "input_required") return { ok: false, text: "It asked for approval again. Ask the bot to try once more." };
  const text = resultText(data);
  return { ok: !text.startsWith("Failed:"), text };
}
