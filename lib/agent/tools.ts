import type Anthropic from "@anthropic-ai/sdk";
import { listChannels, listPosts, cancelPost } from "@/lib/api-core";
import { generateAiImage } from "@/app/(app)/actions";
import { higgsfieldConfigured } from "@/lib/higgsfield";

/**
 * Tool layer for the Postbase Agent. The read tools and cancel run live against
 * the same org-scoped core the public API/MCP server use. The write path
 * (`propose_post`) never touches the database — it returns a structured draft
 * that the UI renders for the human to confirm and schedule.
 */

export type ProposedMedia = { url: string; type: string };

export type PostProposal = {
  body: string;
  thread: string[];
  channelIds: string[];
  scheduledAt: string | null;
  media: ProposedMedia[];
  /** Per-channel caption overrides: channel_id → caption. Empty = use body. */
  variants: Record<string, string>;
};

export type AgentPostRow = {
  id: string;
  body: string;
  scheduledAt: string | null;
  status: string;
  channels: { platform: string; handle: string | null }[];
};

/** A listing the client renders as a formatted table instead of the model prosing it. */
export type AgentList = { kind: "posts"; title: string; rows: AgentPostRow[] };

/** What a tool run hands back: text for the model, plus an optional side-effect payload. */
export type ToolRun = {
  forModel: string;
  /** Set only by propose_post — the route streams this to the client as a card. */
  proposal?: PostProposal;
  /** Set by listing tools — the route streams this to the client as a table. */
  list?: AgentList;
  /** Set by generate_image — the route streams this so the client shows the image. */
  image?: { url: string; type: string };
};

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_channels",
    description:
      "List the user's connected social accounts (channels). Returns each channel's id, platform, and handle. Call this before proposing a post so you use real channel ids.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_scheduled",
    description:
      "List the user's posts, optionally filtered by status (e.g. 'scheduled' or 'draft'). Use to answer questions about what's queued or to find a post to cancel.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status, e.g. 'scheduled' or 'draft'." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "generate_image",
    description:
      "Generate an image from a text description to attach to a post. Returns a URL. Only use when the user wants visual content. Takes a few seconds.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "A detailed description of the image to generate." },
        aspect_ratio: {
          type: "string",
          description: "Aspect ratio, one of '1:1', '16:9', '9:16'. Defaults to '1:1'.",
        },
      },
      required: ["prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_post",
    description:
      "Propose a post or thread for the user to review and schedule. This does NOT publish or schedule — it shows the user an editable preview card with a Schedule button. Always use real channel_ids from list_channels. Provide `body` for a single post, or `thread` (array) for a multi-part X thread. Omit `scheduled_at` to propose a draft.",
    input_schema: {
      type: "object",
      properties: {
        body: { type: "string", description: "The post text (for a single post)." },
        thread: {
          type: "array",
          items: { type: "string" },
          description: "Multiple posts to publish as a thread (each an array item).",
        },
        channel_ids: {
          type: "array",
          items: { type: "string" },
          description: "Channel ids to publish to, from list_channels.",
        },
        scheduled_at: {
          type: "string",
          description: "ISO 8601 time to publish in the user's timezone. Omit for a draft.",
        },
        image_urls: {
          type: "array",
          items: { type: "string" },
          description: "URLs of images to attach (e.g. from generate_image).",
        },
        variants: {
          type: "object",
          additionalProperties: { type: "string" },
          description:
            "Optional per-channel caption overrides: an object mapping a channel_id (from channel_ids) to that channel's caption. Use when channels need different text, e.g. hashtags on LinkedIn but not X. Omit channels that should use the main body/thread.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "cancel_post",
    description: "Cancel a scheduled post (reverts it to a draft) by its id.",
    input_schema: {
      type: "object",
      properties: { post_id: { type: "string", description: "The post id to cancel." } },
      required: ["post_id"],
      additionalProperties: false,
    },
  },
];

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export async function runAgentTool(
  orgId: string,
  name: string,
  input: Record<string, unknown>,
): Promise<ToolRun> {
  switch (name) {
    case "list_channels": {
      const channels = await listChannels(orgId);
      return { forModel: JSON.stringify(channels) };
    }

    case "list_scheduled": {
      const status = str(input.status) || "scheduled";
      const [posts, channels] = await Promise.all([listPosts(orgId, status), listChannels(orgId)]);
      const chMap = new Map(channels.map((c) => [c.id, c]));
      const rows: AgentPostRow[] = (posts as { id: string; body: string; scheduled_at: string | null; status: string; post_targets?: { channel_id: string }[] }[]).map((p) => ({
        id: p.id,
        body: p.body,
        scheduledAt: p.scheduled_at ?? null,
        status: p.status,
        channels: (p.post_targets ?? [])
          .map((t) => {
            const c = chMap.get(t.channel_id);
            return { platform: c?.platform ?? "", handle: c?.handle ?? null };
          })
          .filter((c) => c.platform),
      }));
      const title = status === "draft" ? "Drafts" : status === "scheduled" ? "Scheduled posts" : `Posts · ${status}`;
      // Compact summary for the model; the full rows render as a table client-side.
      const forModel = JSON.stringify({
        count: rows.length,
        status,
        posts: rows.map((r) => ({ id: r.id, body: r.body, scheduledAt: r.scheduledAt, channels: r.channels.map((c) => c.platform) })),
      });
      return { forModel, list: { kind: "posts", title, rows } };
    }

    case "generate_image": {
      if (!higgsfieldConfigured()) {
        return { forModel: "Image generation isn't configured on this workspace." };
      }
      const res = await generateAiImage(str(input.prompt), str(input.aspect_ratio) || "1:1");
      return res.ok
        ? {
            forModel: "Image generated and shown to the user. Do not include the URL in your reply.",
            image: { url: res.url, type: res.type },
          }
        : { forModel: `Image generation failed: ${res.error}` };
    }

    case "propose_post": {
      const thread = asStringArray(input.thread);
      const body = str(input.body) || thread[0] || "";
      const media = asStringArray(input.image_urls).map((url) => ({ url, type: "image/jpeg" }));
      const channelIds = asStringArray(input.channel_ids);
      const variants: Record<string, string> = {};
      if (input.variants && typeof input.variants === "object" && !Array.isArray(input.variants)) {
        for (const [k, v] of Object.entries(input.variants as Record<string, unknown>)) {
          if (typeof v === "string" && v.trim() && channelIds.includes(k)) variants[k] = v;
        }
      }
      const proposal: PostProposal = {
        body,
        thread: thread.length > 1 ? thread : [],
        channelIds,
        scheduledAt: str(input.scheduled_at) || null,
        media,
        variants,
      };
      if (!proposal.body.trim() && proposal.thread.length === 0) {
        return { forModel: "Can't propose an empty post — provide body or thread text." };
      }
      return {
        forModel:
          "Draft shown to the user as a preview card. Tell them to review it and click Schedule (or ask you to change it). Do not claim it's scheduled.",
        proposal,
      };
    }

    case "cancel_post": {
      const ok = await cancelPost(orgId, str(input.post_id));
      return { forModel: JSON.stringify({ cancelled: ok }) };
    }

    default:
      return { forModel: `Unknown tool: ${name}` };
  }
}
