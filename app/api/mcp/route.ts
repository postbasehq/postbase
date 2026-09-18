import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { resolveAccessToken, mcpResourceUrl, issuer } from "@/lib/oauth";
import { listChannels, listPosts, createPost, cancelPost } from "@/lib/api-core";

/**
 * Hosted MCP server (Streamable HTTP, stateless JSON-RPC). Authenticated by an
 * OAuth bearer token ("Sign in with Postbase") or a pb_live_ API key — both
 * resolve to one org, and every tool is scoped to it. Kept dependency-free and
 * auditable rather than pulling in the MCP SDK.
 */

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "postbase", version: "1.0.0" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, WWW-Authenticate",
};

const TOOLS = [
  {
    name: "list_channels",
    description: "List the connected social accounts (channels) and their platforms.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_post",
    description:
      "Draft or schedule a post/thread. Provide `body` (single post) or `thread` (array of posts). Omit `scheduled_at` to save as a draft.",
    inputSchema: {
      type: "object",
      properties: {
        body: { type: "string", description: "The post text (for a single post)." },
        thread: {
          type: "array",
          items: { type: "string" },
          description: "Multiple posts to publish as a thread.",
        },
        channel_ids: {
          type: "array",
          items: { type: "string" },
          description: "Channel ids to publish to (from list_channels).",
        },
        scheduled_at: {
          type: "string",
          description: "ISO 8601 time to publish. Omit or null to save as a draft.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_scheduled",
    description: "List scheduled/queued posts (optionally filter by status).",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status, e.g. scheduled or draft." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cancel_post",
    description: "Cancel a scheduled post (reverts it to a draft) by its id.",
    inputSchema: {
      type: "object",
      properties: { post_id: { type: "string", description: "The post id to cancel." } },
      required: ["post_id"],
      additionalProperties: false,
    },
  },
];

type Args = Record<string, unknown>;
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

async function runTool(orgId: string, name: string, args: Args): Promise<unknown> {
  switch (name) {
    case "list_channels":
      return listChannels(orgId);
    case "list_scheduled":
      return listPosts(orgId, typeof args.status === "string" ? args.status : "scheduled");
    case "create_post":
      return createPost(orgId, {
        body: typeof args.body === "string" ? args.body : "",
        thread: Array.isArray(args.thread) ? asStringArray(args.thread) : undefined,
        channelIds: asStringArray(args.channel_ids),
        scheduledAt: typeof args.scheduled_at === "string" ? args.scheduled_at : null,
      });
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
          content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
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

function unauthorized() {
  return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${issuer()}/.well-known/oauth-protected-resource"`,
    },
  });
}

export async function POST(req: Request) {
  const auth = await authorize(req);
  if (!auth) return unauthorized();

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
  if (!auth) return unauthorized();
  return new NextResponse("Method Not Allowed", { status: 405, headers: cors });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
