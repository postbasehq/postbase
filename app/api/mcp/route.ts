import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { resolveAccessToken, resourceMetadataUrlFor } from "@/lib/oauth";
import { listChannels, listPosts, listMedia, createPost, cancelPost, getPost, updatePost, retryPost, importMedia } from "@/lib/api-core";
import { postFieldsFrom } from "@/lib/api-input";
import { cancelMessage } from "@/lib/publish/cancel";
import { failedAuthLimited, mediaImportLimit, postLimit, requestLimit, tooManyRequests } from "@/lib/api-limits";
import { OUTPUT, structured } from "@/lib/mcp-output";

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
    outputSchema: OUTPUT.list_channels,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_post",
    title: "Create or schedule a post",
    annotations: { title: "Create or schedule a post", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    description:
      "Create a draft, or schedule a post or thread, on one or more connected channels. Relative times (\"in 10 minutes\", \"in 2 hours\") can be given as `schedule_in_minutes`, which the server converts using its own clock. The post appears on the user's Postbase calendar and publishes at `scheduled_at` via each network's official API. Provide `body` for a single post or `thread` for several posts; the same text goes to every channel unless `channel_bodies` gives one its own. Limits per post: X 280 (links count 23), Bluesky 300, Mastodon 500, LinkedIn 3,000, YouTube 5,000 (description). Threads publish as reply chains on X, Bluesky and Mastodon; on LinkedIn the extra parts become the first comment. To attach images or a video, pass `media_ids` from list_media, or `media_urls` (public https links, which are added to the user's media library); YouTube needs a video and `youtube.made_for_kids`. Pass an `idempotency_key` so a retried call returns the first post instead of creating a duplicate. Check the outcome later with get_post. TikTok posts can only be saved as drafts here: the user schedules them in Postbase, where TikTok requires them to choose who sees the post. Omit `scheduled_at` and `schedule_in_minutes` to save a draft. Docs: https://docs.postbase.so/mcp/tools",
    outputSchema: OUTPUT.create_post,
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
        media_ids: {
          type: "array",
          items: { type: "string" },
          description: "Ids of files from list_media to attach, in order. Images or one video, as the network allows.",
        },
        channel_bodies: {
          type: "object",
          additionalProperties: { type: "string" },
          description: "Text for particular channels instead of `body`, keyed by channel id (each a single post, not a thread). E.g. a shorter version for X.",
        },
        media_urls: {
          type: "array",
          items: { type: "string" },
          description: "Public https URLs of images or a video to attach, after any media_ids. Each file is added to the user's media library (JPG, PNG, WebP, GIF, MP4, MOV or WebM, up to 200 MB; up to 10 per call).",
        },
        youtube: {
          type: "object",
          description: "YouTube details, used when a YouTube channel is in channel_ids.",
          properties: {
            title: { type: "string", description: "Video title, up to 100 characters. Defaults to the post's first line." },
            privacy: { type: "string", enum: ["public", "unlisted", "private"], description: "Who can watch it. Defaults to public." },
            made_for_kids: { type: "boolean", description: "Whether the video is made for kids. YouTube requires this declaration; ask the user." },
          },
          additionalProperties: false,
        },
        idempotency_key: {
          type: "string",
          description: "Any unique string for this post (e.g. a UUID). Calling again with the same key returns the post the first call made, so a retry never posts twice.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_media",
    title: "List media",
    annotations: { title: "List media", readOnlyHint: true, openWorldHint: false },
    description:
      "List files in this workspace's Postbase media library (newest first, up to 50): id, name, MIME type, size and URL. Pass the ids to create_post's `media_ids` to attach them. Files are uploaded by the user in Postbase. Docs: https://docs.postbase.so/mcp/tools",
    outputSchema: OUTPUT.list_media,
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["image", "video"], description: "Only images or only videos." },
        search: { type: "string", description: "Match part of the file name." },
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
    outputSchema: OUTPUT.list_scheduled,
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
      "Cancel a scheduled post before it publishes. The post goes back to being a draft, so nothing is deleted and it can be rescheduled with update_post or in Postbase. Get the id from list_scheduled. Docs: https://docs.postbase.so/mcp/tools",
    outputSchema: OUTPUT.cancel_post,
    inputSchema: {
      type: "object",
      properties: { post_id: { type: "string", description: "The post id to cancel." } },
      required: ["post_id"],
      additionalProperties: false,
    },
  },
];

const createSchema = TOOLS.find((t) => t.name === "create_post")!.inputSchema as { properties: Record<string, unknown> };
// Same fields as create_post (no idempotency key: an edit is safe to repeat) plus the post id.
const { idempotency_key: _skip, ...updateFields } = createSchema.properties;
void _skip;

const MORE_TOOLS = [
  {
    name: "get_post",
    title: "Get a post",
    annotations: { title: "Get a post", readOnlyHint: true, openWorldHint: false },
    description:
      "Get one post and how it went on each channel: status (draft, scheduled, publishing, published or failed), the live URL once it's published, the error if a channel failed and when it will be retried, plus the latest likes and views where the network reports them. Use after create_post to confirm a post went out. Docs: https://docs.postbase.so/mcp/tools",
    outputSchema: OUTPUT.get_post,
    inputSchema: {
      type: "object",
      properties: { post_id: { type: "string", description: "The post id, from create_post or list_scheduled." } },
      required: ["post_id"],
      additionalProperties: false,
    },
  },
  {
    name: "update_post",
    title: "Edit a post",
    annotations: { title: "Edit a post", readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    description:
      "Edit a draft or scheduled post before it publishes: its text, thread, channels, per-channel text, media, time or YouTube details. Only the fields you pass change. Pass `scheduled_at` or `schedule_in_minutes` to reschedule, or a draft to schedule it; `scheduled_at: null` turns it back into a draft. A post that has started publishing can't be edited. The same rules as create_post apply (TikTok stays a draft). Docs: https://docs.postbase.so/mcp/tools",
    outputSchema: OUTPUT.get_post,
    inputSchema: {
      type: "object",
      properties: {
        post_id: { type: "string", description: "The post id to edit." },
        ...updateFields,
        scheduled_at: {
          type: ["string", "null"],
          description: "New time, as ISO 8601 with a timezone offset. null turns the post back into a draft.",
        },
      },
      required: ["post_id"],
      additionalProperties: false,
    },
  },
  {
    name: "retry_post",
    title: "Retry failed channels",
    annotations: { title: "Retry failed channels", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    description:
      "Send a post again to the channels where it failed, right away. Channels where it already published are left alone, so nothing is posted twice. Check get_post first to see why a channel failed (an expired connection needs the user to reconnect it in Postbase). Docs: https://docs.postbase.so/mcp/tools",
    outputSchema: OUTPUT.retry_post,
    inputSchema: {
      type: "object",
      properties: { post_id: { type: "string", description: "The post id to retry." } },
      required: ["post_id"],
      additionalProperties: false,
    },
  },
  {
    name: "add_media",
    title: "Add media from a URL",
    annotations: { title: "Add media from a URL", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    description:
      "Add an image or video to the user's Postbase media library from a public https URL, and return its id for create_post's `media_ids`. JPG, PNG, WebP, GIF, MP4, MOV or WebM, up to 200 MB; it counts toward the plan's storage. (create_post also takes `media_urls` directly.) Docs: https://docs.postbase.so/mcp/tools",
    outputSchema: OUTPUT.add_media,
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Public https URL of the file." },
        name: { type: "string", description: "A name for the file in the library. Defaults to the file name in the URL." },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
];

const ALL_TOOLS = [...TOOLS, ...MORE_TOOLS];

// Clients often have no clock, so point them at relative scheduling and give them the time.
const INSTRUCTIONS =
  "Postbase schedules social posts. To schedule relative to now (\"in 10 minutes\", \"in an hour\"), create_post accepts schedule_in_minutes and the server converts it using its own clock. Every tool result also includes the current server time (UTC). After scheduling, get_post shows whether each channel published, with its live URL or error.";

type Args = Record<string, unknown>;

async function runTool(orgId: string, name: string, args: Args): Promise<unknown> {
  switch (name) {
    case "list_channels":
      return listChannels(orgId);
    case "list_media":
      return listMedia(orgId, {
        type: typeof args.type === "string" ? args.type : undefined,
        search: typeof args.search === "string" ? args.search : undefined,
      });
    case "list_scheduled":
      return listPosts(orgId, typeof args.status === "string" ? args.status : "scheduled");
    case "create_post": {
      // Same hourly limits as the REST API; the message reaches the AI tool.
      const hit = await postLimit(orgId);
      if (hit) throw new Error(hit.message);
      const fields = postFieldsFrom(args);
      const mediaHit = await mediaImportLimit(orgId, fields.mediaUrls?.length ?? 0);
      if (mediaHit) throw new Error(mediaHit.message);
      return createPost(orgId, {
        ...fields,
        channelIds: fields.channelIds ?? [],
        scheduledAt: fields.scheduledAt ?? null,
        idempotencyKey: typeof args.idempotency_key === "string" ? args.idempotency_key : undefined,
      });
    }
    case "get_post":
      return getPost(orgId, String(args.post_id ?? ""));
    case "update_post": {
      const fields = postFieldsFrom(args);
      const mediaHit = await mediaImportLimit(orgId, fields.mediaUrls?.length ?? 0);
      if (mediaHit) throw new Error(mediaHit.message);
      return updatePost(orgId, String(args.post_id ?? ""), fields);
    }
    case "retry_post":
      return retryPost(orgId, String(args.post_id ?? ""));
    case "add_media": {
      const hit = await mediaImportLimit(orgId, 1);
      if (hit) throw new Error(hit.message);
      return importMedia(orgId, String(args.url ?? ""), typeof args.name === "string" ? args.name : undefined);
    }
    case "cancel_post": {
      const outcome = await cancelPost(orgId, String(args.post_id ?? ""));
      return { cancelled: outcome.ok, message: cancelMessage(outcome) };
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
      return rpcResult(id, { tools: ALL_TOOLS });
    case "tools/call": {
      const name = String(params?.name ?? "");
      const args = (params?.arguments as Args) ?? {};
      try {
        const out = await runTool(orgId, name, args);
        const now = new Date().toISOString();
        const data = structured(name, out, now);
        return rpcResult(id, {
          content: [
            { type: "text", text: JSON.stringify(data, null, 2) },
            { type: "text", text: `Current server time: ${now} (UTC)` },
          ],
          structuredContent: data,
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
