import { NextResponse } from "next/server";
import { ApiError, type UpdatePostInput } from "@/lib/api-core";

/*
 * The snake_case fields the REST API and the MCP tools both take for a post,
 * turned into api-core's input. Only fields present in the request are set,
 * so an update leaves everything else as it was.
 */

type Args = Record<string, unknown>;

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** A relative delay wins over an absolute time: clients often don't know the clock. */
function scheduledAtFrom(args: Args): string | null | undefined {
  const mins = Number(args.schedule_in_minutes);
  if (args.schedule_in_minutes != null && Number.isFinite(mins) && mins > 0) {
    return new Date(Date.now() + mins * 60_000).toISOString();
  }
  if (!("scheduled_at" in args)) return undefined;
  return typeof args.scheduled_at === "string" && args.scheduled_at ? args.scheduled_at : null;
}

function youtubeFrom(v: unknown): UpdatePostInput["youtube"] {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const y = v as Args;
  return {
    title: typeof y.title === "string" ? y.title : undefined,
    privacy: typeof y.privacy === "string" ? y.privacy : undefined,
    madeForKids: typeof y.made_for_kids === "boolean" ? y.made_for_kids : undefined,
  };
}

function channelBodiesFrom(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  return Object.fromEntries(Object.entries(v as Args).filter((e): e is [string, string] => typeof e[1] === "string"));
}

/** The post fields present in `args`. */
export function postFieldsFrom(args: Args): UpdatePostInput {
  const out: UpdatePostInput = {};
  if (typeof args.body === "string") out.body = args.body;
  if (Array.isArray(args.thread)) out.thread = strings(args.thread);
  if (Array.isArray(args.channel_ids)) out.channelIds = strings(args.channel_ids);
  if ("channel_bodies" in args) out.channelBodies = channelBodiesFrom(args.channel_bodies) ?? {};
  if (Array.isArray(args.media_ids)) out.mediaIds = strings(args.media_ids);
  if (Array.isArray(args.media_urls)) out.mediaUrls = strings(args.media_urls);
  const at = scheduledAtFrom(args);
  if (at !== undefined) out.scheduledAt = at;
  const youtube = youtubeFrom(args.youtube);
  if (youtube) out.youtube = youtube;
  return out;
}

/**
 * A REST error response: ApiError keeps its status, anything else is a 400.
 * `error` stays the readable message (as it always was), `code` is for code.
 */
export function errorResponse(e: unknown) {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  const message = e instanceof Error ? e.message : "Bad request";
  return NextResponse.json({ error: message, code: "bad_request" }, { status: 400 });
}

/** The JSON body as an object, or null if it isn't one. */
export async function jsonBody(req: Request): Promise<Args | null> {
  try {
    const v = await req.json();
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Args) : null;
  } catch {
    return null;
  }
}
