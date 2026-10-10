/*
 * MCP tool output schemas for the hosted server (app/api/mcp/route.ts), and the
 * structuredContent each tool returns. Kept out of the route file because a
 * Next.js route may only export its handlers.
 */

// Output schemas: what structuredContent holds for each tool. Loose on purpose
// (nullable fields, extra properties allowed), since clients reject a result
// that doesn't match. Lists are wrapped in an object, as the spec requires.
const str = { type: "string" };
const strOrNull = { type: ["string", "null"] };
const result = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object",
  properties: { ...properties, server_time: { type: "string", description: "Current server time (UTC, ISO 8601)" } },
  required: [...required, "server_time"],
});
export const OUTPUT = {
  list_channels: result(
    {
      channels: {
        type: "array",
        items: { type: "object", properties: { id: str, platform: str, handle: strOrNull, status: strOrNull }, required: ["id", "platform"] },
      },
    },
    ["channels"],
  ),
  list_media: result(
    {
      media: {
        type: "array",
        items: {
          type: "object",
          properties: { id: str, name: strOrNull, type: strOrNull, size_bytes: { type: ["number", "null"] }, url: strOrNull, created_at: strOrNull },
          required: ["id"],
        },
      },
    },
    ["media"],
  ),
  list_scheduled: result(
    {
      posts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: str,
            body: strOrNull,
            scheduled_at: strOrNull,
            status: strOrNull,
            post_targets: { type: ["array", "null"], items: { type: "object", properties: { channel_id: strOrNull, status: strOrNull } } },
          },
          required: ["id"],
        },
      },
    },
    ["posts"],
  ),
  create_post: result(
    {
      id: str,
      body: strOrNull,
      scheduled_at: strOrNull,
      status: { type: "string", description: "draft or scheduled (or, for a repeated call, the first post's current status)" },
      media: { type: "number", description: "How many media files are attached" },
      warning: { type: "string", description: "Something to tell the user, such as X charging for links" },
      idempotent_replay: { type: "boolean", description: "True when this repeats an earlier call with the same idempotency_key: the post it made is returned, nothing new is created" },
    },
    ["id", "status"],
  ),
  get_post: result(
    {
      id: str,
      status: str,
      body: strOrNull,
      thread: { type: "array", items: str },
      scheduled_at: strOrNull,
      created_at: strOrNull,
      media: { type: "array", items: { type: "object", properties: { url: str, type: strOrNull } } },
      channels: {
        type: "array",
        items: {
          type: "object",
          properties: {
            channel_id: str,
            platform: strOrNull,
            handle: strOrNull,
            status: str,
            url: { ...strOrNull, description: "The live post, once published" },
            error: { ...strOrNull, description: "Why it failed" },
            warning: { ...strOrNull, description: "Published, but with something to know (e.g. a dropped link)" },
            retry_at: { ...strOrNull, description: "When a failed channel will be tried again automatically" },
            body: { ...strOrNull, description: "This channel's own text, if it has one" },
            metrics: { type: ["object", "null"], description: "Latest likes, views, etc. where the network reports them" },
          },
          required: ["channel_id", "status"],
        },
      },
      summary: {
        type: "object",
        properties: { published: { type: "number" }, failed: { type: "number" }, pending: { type: "number" } },
      },
      warning: { type: "string" },
    },
    ["id", "status", "channels"],
  ),
  get_analytics: result(
    {
      from: strOrNull,
      to: strOrNull,
      totals: { type: "object", description: "Sums over every post in the range (impressions null where no network reports them)" },
      posts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            post_id: str,
            body: strOrNull,
            published_at: strOrNull,
            channels: { type: "array", items: { type: "object" } },
            totals: { type: "object" },
          },
          required: ["post_id"],
        },
      },
      has_more: { type: "boolean" },
    },
    ["posts", "totals"],
  ),
  retry_post: result(
    { id: str, retrying: { type: "array", items: str, description: "Ids of the channels being sent again" } },
    ["id", "retrying"],
  ),
  add_media: result(
    { id: str, name: strOrNull, type: strOrNull, size_bytes: { type: ["number", "null"] }, url: strOrNull, created_at: strOrNull },
    ["id"],
  ),
  cancel_post: result({ cancelled: { type: "boolean" }, message: str }, ["cancelled", "message"]),
};

/** structuredContent for a tool's result: lists go under a key, objects as they are. */
export function structured(name: string, out: unknown, now: string): Record<string, unknown> {
  const key = { list_channels: "channels", list_media: "media", list_scheduled: "posts" }[name];
  const body = key ? { [key]: out } : (out as Record<string, unknown>);
  return { ...body, server_time: now };
}
