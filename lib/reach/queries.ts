import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Data access for the PUBLIC Postbase Reach follower surface. Everything here
 * runs through the service role because the follower page is anonymous — RLS on
 * the reach_* tables only grants the owning org access, so these helpers are the
 * single, tightly-scoped door for public reads/writes (always by a specific
 * published page).
 */

export type ReachPage = {
  id: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme: Record<string, unknown> | null;
};

export type ReachContent = {
  id: string;
  title: string | null;
  url: string;
  body: string | null;
  thumbnail_url: string | null;
  source: string;
};

export type ReachCta = {
  id: string;
  kind: string;
  label: string;
  url: string;
  description: string | null;
};

/** A published page by its public handle, or null. */
export async function getPublishedPage(handle: string): Promise<ReachPage | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("reach_pages")
    .select("id, handle, display_name, bio, avatar_url, theme")
    .eq("handle", handle)
    .eq("published", true)
    .maybeSingle();
  return (data as ReachPage) ?? null;
}

/**
 * Retrieve the most relevant approved content for a query via Postgres FTS,
 * falling back to a trigram/ILIKE match so short or keyword-light questions
 * still surface something. Returns [] when nothing matches — the agent treats
 * that as "unsupported" and refuses rather than inventing.
 */
export async function searchCorpus(
  pageId: string,
  query: string,
  limit = 6,
): Promise<ReachContent[]> {
  const db = createAdminClient();
  const cols = "id, title, url, body, thumbnail_url, source";

  const websearch = query.trim().slice(0, 300);
  if (websearch) {
    const { data } = await db
      .from("reach_content")
      .select(cols)
      .eq("page_id", pageId)
      .eq("approved", true)
      .textSearch("fts", websearch, { type: "websearch", config: "english" })
      .limit(limit);
    if (data && data.length > 0) return data as ReachContent[];
  }

  // Fallback: fuzzy title/body match on the raw terms.
  const like = `%${websearch.replace(/[%_]/g, "").slice(0, 60)}%`;
  const { data } = await db
    .from("reach_content")
    .select(cols)
    .eq("page_id", pageId)
    .eq("approved", true)
    .or(`title.ilike.${like},body.ilike.${like}`)
    .limit(limit);
  return (data as ReachContent[]) ?? [];
}

/** All active CTAs for a page, in display order. */
export async function getActiveCtas(pageId: string): Promise<ReachCta[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("reach_ctas")
    .select("id, kind, label, url, description")
    .eq("page_id", pageId)
    .eq("active", true)
    .order("sort", { ascending: true });
  return (data as ReachCta[]) ?? [];
}

/** Start (or continue) an anonymous follower conversation. */
export async function startConversation(pageId: string, sessionId: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db
    .from("reach_conversations")
    .insert({ page_id: pageId, session_id: sessionId })
    .select("id")
    .single();
  return (data as { id: string }).id;
}

/**
 * Resume a follower's conversation only if it belongs to this page and session;
 * otherwise null (the caller starts a fresh one). Stops a client from writing
 * into someone else's conversation by passing its id.
 */
export async function getConversation(
  pageId: string,
  conversationId: string,
  sessionId: string,
): Promise<{ id: string; userTurns: number } | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("reach_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("page_id", pageId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!data) return null;
  const { count } = await db
    .from("reach_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("role", "user");
  return { id: data.id as string, userTurns: count ?? 0 };
}

/** Log one turn. Assistant turns carry the intent signal (answered/cited/cta). */
export async function logMessage(row: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  answered?: boolean;
  citedContentIds?: string[];
  ctaId?: string | null;
}): Promise<void> {
  const db = createAdminClient();
  await db.from("reach_messages").insert({
    conversation_id: row.conversationId,
    role: row.role,
    content: row.content,
    answered: row.answered ?? null,
    cited_content_ids: row.citedContentIds ?? null,
    cta_id: row.ctaId ?? null,
  });
}

/** Capture a follower email lead. */
export async function captureLead(
  pageId: string,
  conversationId: string | null,
  email: string,
): Promise<void> {
  const db = createAdminClient();
  await db.from("reach_leads").insert({
    page_id: pageId,
    conversation_id: conversationId,
    email,
  });
}
