"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/org";

/**
 * Conversation-history actions for the /agent chat. All session-scoped — RLS on
 * agent_conversations / agent_chat_messages restricts every row to the caller's
 * org, so these never need to filter by org themselves beyond the membership
 * the policies enforce.
 */

export type ConversationSummary = { id: string; title: string; updatedAt: string };

export type StoredMessage = {
  role: "user" | "assistant";
  content: string;
  proposal: unknown | null;
};

export async function listConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at }));
}

export async function getConversation(id: string): Promise<StoredMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_chat_messages")
    .select("role, content, proposal")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  return (data ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    proposal: m.proposal ?? null,
  }));
}

export async function renameConversation(id: string, title: string): Promise<{ ok: boolean }> {
  const clean = title.trim().slice(0, 120);
  if (!clean) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_conversations")
    .update({ title: clean })
    .eq("id", id);
  return { ok: !error };
}

export async function deleteConversation(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  // Ensure the caller owns an org (defence in depth; RLS also gates the delete).
  if (!(await getCurrentOrgId())) return { ok: false };
  const { error } = await supabase.from("agent_conversations").delete().eq("id", id);
  return { ok: !error };
}
