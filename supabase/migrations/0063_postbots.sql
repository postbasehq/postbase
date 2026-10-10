-- ── Postbots ────────────────────────────────────────────────────────
-- Bots you hire from the Postbots app (/bots): each one has a job (v1: Listen),
-- a setup it agrees with you in chat, and one running conversation. Scheduled
-- sweeps post into that conversation when something new turns up.
-- Members read; every write goes through the server (service role), like the
-- agent chat (0046), so nobody can forge a bot's message. Additive: safe to
-- apply before the deploy.

create table bots (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs (id) on delete cascade,
  author_id    uuid references auth.users (id) on delete set null,
  kind         text not null check (kind in ('listen')),
  name         text not null,
  color        text not null default 'blue',
  -- 'setup' until the bot has agreed what to do, then 'active' or 'paused'.
  status       text not null default 'setup' check (status in ('setup', 'active', 'paused')),
  -- Listen: { keywords[], exclude[], sources[], times[] ("HH:MM"), weekdaysOnly, timezone }
  config       jsonb not null default '{}'::jsonb,
  next_run_at  timestamptz,
  last_run_at  timestamptz,
  -- Set while a sweep runs, so two cron runs can't sweep the same bot at once.
  run_lease    timestamptz,
  last_read_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index bots_org_idx on bots (org_id, updated_at desc);
create index bots_due_idx on bots (next_run_at) where status = 'active';

create table bot_messages (
  id         uuid primary key default gen_random_uuid(),
  bot_id     uuid not null references bots (id) on delete cascade,
  org_id     uuid not null references orgs (id) on delete cascade,
  role       text not null check (role in ('user', 'bot')),
  content    text not null default '',
  -- Rich cards shown under the text: a question, findings, a post draft.
  cards      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index bot_messages_bot_idx on bot_messages (bot_id, created_at);
create index bot_messages_org_idx on bot_messages (org_id);

-- What a bot has already reported, so a sweep only brings up new things.
create table bot_seen_items (
  bot_id      uuid not null references bots (id) on delete cascade,
  source      text not null,
  external_id text not null,
  seen_at     timestamptz not null default now(),
  primary key (bot_id, source, external_id)
);

alter table bots enable row level security;
create policy "org members read bots" on bots for select using (is_org_member(org_id));
revoke insert, update, delete on bots from anon, authenticated;

alter table bot_messages enable row level security;
create policy "org members read bot messages" on bot_messages for select using (is_org_member(org_id));
revoke insert, update, delete on bot_messages from anon, authenticated;

alter table bot_seen_items enable row level security;
revoke all on bot_seen_items from anon, authenticated;
