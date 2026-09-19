-- ── Agent message usage ─────────────────────────────────────────────
-- One row per user turn handled by the in-app AI agent (/agent chat), used to
-- enforce a per-plan monthly message quota so a heavy user can't run up an
-- unbounded model bill. Inserts happen server-side via the service role; org
-- members can read their own usage. No update/delete policy, so the count
-- can't be tampered with client-side. Mirrors ai_generations (0022).

create table agent_messages (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index agent_messages_org_idx on agent_messages (org_id, created_at);

alter table agent_messages enable row level security;
create policy "org members read agent usage" on agent_messages
  for select using (is_org_member(org_id));
