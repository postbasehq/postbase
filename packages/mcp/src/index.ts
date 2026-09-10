#!/usr/bin/env node
/**
 * @postbasehq/mcp — Model Context Protocol server for Postbase.
 * Lets an AI agent list channels and schedule/cancel posts through the Postbase API.
 *
 * Config (in your MCP client):
 *   { "command": "npx", "args": ["@postbasehq/mcp"],
 *     "env": { "POSTBASE_API_KEY": "pb_live_…" } }
 *
 * Optional env: POSTBASE_API_URL (default https://postbase.so/api/v1) — set to
 * http://localhost:3000/api/v1 for local development.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_KEY = process.env.POSTBASE_API_KEY;
const BASE_URL = process.env.POSTBASE_API_URL ?? "https://postbase.so/api/v1";

if (!API_KEY) {
  console.error(
    "Postbase MCP: POSTBASE_API_KEY is not set. Generate a key in your Postbase dashboard (MCP & API) and add it to this server's env.",
  );
  process.exit(1);
}

async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      (json.error as string) ?? `Postbase API error ${res.status}`,
    );
  }
  return json;
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: "postbase", version: "0.1.0" });

server.tool(
  "list_channels",
  "List the social channels connected to the Postbase workspace.",
  {},
  async () => ok((await api("GET", "/channels")).channels),
);

server.tool(
  "create_post",
  "Create a post. Provide channel_ids from list_channels and an ISO 8601 scheduled_at to schedule it (omit to save as a draft).",
  {
    body: z.string().describe("The post text."),
    channel_ids: z
      .array(z.string())
      .optional()
      .describe("Channel ids to publish to (from list_channels)."),
    scheduled_at: z
      .string()
      .optional()
      .describe("ISO 8601 time to publish, e.g. 2026-09-12T09:00:00Z. Omit for a draft."),
  },
  async (args) =>
    ok(
      (
        await api("POST", "/posts", {
          body: args.body,
          channel_ids: args.channel_ids ?? [],
          scheduled_at: args.scheduled_at ?? null,
        })
      ).post,
    ),
);

server.tool(
  "list_scheduled",
  "List posts that are scheduled to publish.",
  {},
  async () => ok((await api("GET", "/posts?status=scheduled")).posts),
);

server.tool(
  "cancel_post",
  "Cancel a scheduled post by id (returns it to draft).",
  { post_id: z.string().describe("The id of the post to cancel.") },
  async (args) => ok(await api("POST", `/posts/${args.post_id}/cancel`)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Postbase MCP running against ${BASE_URL}`);
