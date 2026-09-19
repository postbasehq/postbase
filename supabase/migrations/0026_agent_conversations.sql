-- ── AI agent conversation history ───────────────────────────────────
-- Persists the /agent chat so threads survive refresh and can be resumed,
-- renamed, and deleted. Written by the session (org member) — RLS scopes every
-- row to the org. NOTE: this is the message *content* store; the separate
-- `agent_messages` table (0025) is the per-plan usage counter and is unrelated.

create table agent_conversations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs (id) on delete cascade,
  author_id  uuid references auth.users (id) on delete set null,
  title      text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index agent_conversations_org_idx on agent_conversations (org_id, updated_at desc);

create table agent_chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references agent_conversations (id) on delete cascade,
  org_id          uuid not null references orgs (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null default '',
  proposal        jsonb,
  created_at      timestamptz not null default now()
);
create index agent_chat_messages_convo_idx on agent_chat_messages (conversation_id, created_at);

alter table agent_conversations enable row level security;
create policy "org members manage conversations" on agent_conversations
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table agent_chat_messages enable row level security;
create policy "org members manage chat messages" on agent_chat_messages
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));
