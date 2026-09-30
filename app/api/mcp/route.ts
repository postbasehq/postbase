import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { resolveAccessToken, resourceMetadataUrlFor } from "@/lib/oauth";
import { listChannels, listPosts, createPost, cancelPost } from "@/lib/api-core";
import { failedAuthLimited, postLimit, requestLimit, tooManyRequests } from "@/lib/api-limits";

/**
 * Hosted MCP server (Streamable HTTP, stateless JSON-RPC). Authenticated by an
 * OAuth bearer token ("Sign in with Postbase") or a pb_live_ API key — both
 * resolve to one org, and every tool is scoped to it. Kept dependency-free and
 * auditable rather than pulling in the MCP SDK.
 */

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "postbase", title: "Postbase", version: "1.0.0" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, WWW-Authenticate",
};

const TOOLS = [
  {
    name: "list_channels",
    title: "List channels",
    // MCP tool annotations: lets clients (and directory review) tell reads from writes.
    annotations: { title: "List channels", readOnlyHint: true, openWorldHint: false },
    description:
      "List the social accounts (channels) connected to this Postbase workspace: id, platform (x, linkedin, bluesky, mastodon, tiktok, youtube), handle and status. Use the ids with create_post. Docs: https://docs.postbase.so/mcp/tools",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_post",
    title: "Create or schedule a post",
    annotations: { title: "Create or schedule a post", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    description:
      "Create a draft, or schedule a post or thread, on one or more connected channels. Relative times (\"in 10 minutes\", \"in 2 hours\") can be given as `schedule_in_minutes`, which the server converts using its own clock. The post appears on the user's Postbase calendar and publishes at `scheduled_at` via each network's official API. Provide `body` for a single post or `thread` for several posts; the same text goes to every channel in the call, so call once per network for different wording. Limits per post: X 280 (links count 23), Bluesky 300, Mastodon 500, LinkedIn 3,000. Threads publish as reply chains on X, Bluesky and Mastodon; on LinkedIn the extra parts become the first comment. Text only: TikTok and YouTube need a video, so save a draft for those and the user adds media in Postbase. Omit `scheduled_at` and `schedule_in_minutes` to save a draft. Docs: https://docs.postbase.so/mcp/tools",
    inputSchema: {
      type: "object",
      properties: {
        body: { type: "string", description: "The post text, for a single post. Use `thread` instead for several posts." },
        thread: {
          type: "array",
          items: { type: "string" },
          description: "Several posts to publish as a thread, in order (each within the network's character limit).",
        },
        channel_ids: {
          type: "array",
          items: { type: "string" },
          description: "Ids of the channels to publish to, from list_channels.",
        },
        scheduled_at: {
          type: "string",
          description: "When to publish, as ISO 8601 with a timezone offset (e.g. 2026-10-01T09:00:00+01:00). Omit to save a draft. Scheduling needs an active plan or trial.",
        },
        schedule_in_minutes: {
          type: "number",
          description: "Publish this many minutes from now (e.g. 10), measured on the server's clock. Use instead of `scheduled_at` for relative times.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_scheduled",
    title: "List scheduled posts",
    annotations: { title: "List scheduled posts", readOnlyHint: true, openWorldHint: false },
    description:
      "List posts in this workspace with their text, time and channels. Defaults to scheduled posts; pass `status` to see drafts, published or failed posts instead. Docs: https://docs.postbase.so/mcp/tools",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "One of scheduled (default), draft, published or failed." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cancel_post",
    title: "Cancel a scheduled post",
    annotations: { title: "Cancel a scheduled post", readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    description:
      "Cancel a scheduled post before it publishes. The post goes back to being a draft, so nothing is deleted and it can be rescheduled in Postbase. Get the id from list_scheduled. Docs: https://docs.postbase.so/mcp/tools",
    inputSchema: {
      type: "object",
      properties: { post_id: { type: "string", description: "The post id to cancel." } },
      required: ["post_id"],
      additionalProperties: false,
    },
  },
];

// Clients often have no clock, so point them at relative scheduling and give them the time.
const INSTRUCTIONS =
  "Postbase schedules social posts. To schedule relative to now (\"in 10 minutes\", \"in an hour\"), create_post accepts schedule_in_minutes and the server converts it using its own clock. Every tool result also includes the current server time (UTC).";

type Args = Record<string, unknown>;
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

// A relative delay wins over an absolute time: clients often don't know the clock.
function scheduledAtFrom(args: Args): string | null {
  const mins = Number(args.schedule_in_minutes);
  if (args.schedule_in_minutes != null && Number.isFinite(mins) && mins > 0) {
    return new Date(Date.now() + mins * 60_000).toISOString();
  }
  return typeof args.scheduled_at === "string" ? args.scheduled_at : null;
}

async function runTool(orgId: string, name: string, args: Args): Promise<unknown> {
  switch (name) {
    case "list_channels":
      return listChannels(orgId);
    case "list_scheduled":
      return listPosts(orgId, typeof args.status === "string" ? args.status : "scheduled");
    case "create_post": {
      // Same hourly post limit as the REST API; the message reaches the AI tool.
      const hit = await postLimit(orgId);
      if (hit) throw new Error(hit.message);
      return createPost(orgId, {
        body: typeof args.body === "string" ? args.body : "",
        thread: Array.isArray(args.thread) ? asStringArray(args.thread) : undefined,
        channelIds: asStringArray(args.channel_ids),
        scheduledAt: scheduledAtFrom(args),
      });
    }
    case "cancel_post": {
      const ok = await cancelPost(orgId, String(args.post_id ?? ""));
      return { cancelled: ok };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const rpcResult = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id: unknown, code: number, message: string) => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

async function handleRpc(orgId: string, msg: {
  id?: unknown;
  method?: string;
  params?: Record<string, unknown>;
}): Promise<object | null> {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion:
          typeof params?.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    case "notifications/initialized":
    case "notifications/cancelled":
      return null; // notification — no response
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const name = String(params?.name ?? "");
      const args = (params?.arguments as Args) ?? {};
      try {
        const out = await runTool(orgId, name, args);
        return rpcResult(id, {
          content: [
            { type: "text", text: JSON.stringify(out, null, 2) },
            { type: "text", text: `Current server time: ${new Date().toISOString()} (UTC)` },
          ],
        });
      } catch (e) {
        return rpcResult(id, {
          content: [{ type: "text", text: e instanceof Error ? e.message : "Tool failed" }],
          isError: true,
        });
      }
    }
    default:
      if (method?.startsWith("notifications/")) return null;
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

async function authorize(req: Request): Promise<{ orgId: string } | null> {
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) {
    const viaToken = await resolveAccessToken(bearer);
    if (viaToken) return viaToken;
  }
  // Fall back to a pb_live_ API key on the same endpoint.
  return authenticateApiKey(req);
}

function unauthorized(req: Request) {
  return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrlFor(req)}"`,
    },
  });
}

/** Unauthorized, or 429 once an IP keeps failing (slows key guessing). */
async function rejectAuth(req: Request) {
  if (await failedAuthLimited(req)) {
    return tooManyRequests({ retryAfter: 60, message: "Too many failed attempts. Try again in a minute." }, cors);
  }
  return unauthorized(req);
}

export async function POST(req: Request) {
  const auth = await authorize(req);
  if (!auth) return rejectAuth(req);
  // Requests per minute, shared with the REST API.
  const hit = await requestLimit(auth.orgId);
  if (hit) return tooManyRequests(hit, cors);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { headers: cors });
  }

  // A batch (array) or a single message.
  if (Array.isArray(payload)) {
    const responses = (
      await Promise.all(payload.map((m) => handleRpc(auth.orgId, m)))
    ).filter(Boolean);
    if (responses.length === 0) return new NextResponse(null, { status: 202, headers: cors });
    return NextResponse.json(responses, { headers: cors });
  }

  const response = await handleRpc(auth.orgId, payload as { method?: string });
  if (!response) return new NextResponse(null, { status: 202, headers: cors });
  return NextResponse.json(response, { headers: cors });
}

// This stateless server offers no server-initiated stream, so GET has nothing
// to upgrade — but it still needs auth discovery for unauthenticated probes.
export async function GET(req: Request) {
  const auth = await authorize(req);
  if (!auth) return rejectAuth(req);
  return new NextResponse("Method Not Allowed", { status: 405, headers: cors });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
