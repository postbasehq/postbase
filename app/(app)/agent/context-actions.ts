"use server";

import { createClient } from "@/lib/supabase/server";
import type { AgentPostRow } from "@/lib/agent/tools";

/**
 * Fetches the user's drafts or scheduled posts for the chat's @-mention context
 * picker. Session-scoped — RLS restricts rows to the caller's org.
 */
type Row = {
  id: string;
  body: string;
  scheduled_at: string | null;
  status: string;
  post_targets: { channels: { platform: string; handle: string | null } | null }[] | null;
};

const mapRows = (data: unknown): AgentPostRow[] =>
  ((data ?? []) as Row[]).map((p) => ({
    id: p.id,
    body: p.body,
    scheduledAt: p.scheduled_at,
    status: p.status,
    channels: (p.post_targets ?? [])
      .map((t) => ({ platform: t.channels?.platform ?? "", handle: t.channels?.handle ?? null }))
      .filter((c) => c.platform),
  }));

export async function listContextPosts(
  status: "draft" | "scheduled",
): Promise<AgentPostRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, body, scheduled_at, status, post_targets(channels(platform, handle))")
    .eq("status", status)
    .order(status === "scheduled" ? "scheduled_at" : "updated_at", {
      ascending: status === "scheduled",
      nullsFirst: false,
    })
    .limit(25);
  return mapRows(data);
}

/** Search drafts + scheduled posts by body for the /-mention filter. */
export async function searchContextPosts(query: string): Promise<AgentPostRow[]> {
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, body, scheduled_at, status, post_targets(channels(platform, handle))")
    .in("status", ["draft", "scheduled"])
    .ilike("body", `%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(25);
  return mapRows(data);
}
