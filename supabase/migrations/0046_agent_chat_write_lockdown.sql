-- ── Agent chat: server-only writes ─────────────────────────────────────
-- 0026 let any org member insert/update chat rows straight through PostgREST,
-- so a member could forge an "assistant" message (rendered as HTML in the
-- owner's /agent view) or attach rows to another org's conversation_id and
-- inject agent history. Every legitimate write goes through /api/agent/chat
-- with the service role, so members only need to read messages. Conversations
-- keep member rename/delete (history-actions.ts); creation is server-only too.

drop policy if exists "org members manage chat messages" on agent_chat_messages;
create policy "org members read chat messages" on agent_chat_messages
  for select using (is_org_member(org_id));
revoke insert, update, delete on agent_chat_messages from anon, authenticated;

drop policy if exists "org members manage conversations" on agent_conversations;
create policy "org members read conversations" on agent_conversations
  for select using (is_org_member(org_id));
create policy "org members rename conversations" on agent_conversations
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "org members delete conversations" on agent_conversations
  for delete using (is_org_member(org_id));
revoke insert on agent_conversations from anon, authenticated;
