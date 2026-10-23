-- ── Postbots: routines and the team inbox ──────────────────────────
-- Routines: any bot can do any job on a schedule ("every Monday 09:05, draft
-- this week's posts from our releases"). The bot saves them from chat; the
-- Postbots cron runs them like a chat turn and posts the result in its chat.
-- Inbox: every draft or set of findings any bot posts, from chat, a listen
-- check or a routine, so the work lands in one place to approve or dismiss.
-- Members read; every write goes through the server (service role), like the
-- rest of Postbots (0063). Additive: safe to apply before the deploy.

create table bot_routines (
  id           uuid primary key default gen_random_uuid(),
  bot_id       uuid not null references bots (id) on delete cascade,
  org_id       uuid not null references orgs (id) on delete cascade,
  -- What to do, in the user's words as the bot agreed them.
  instruction  text not null,
  -- Days it runs, 0 = Sunday … 6 = Saturday; empty means every day.
  days         smallint[] not null default '{}',
  -- Local run times, "HH:MM", in `timezone`.
  times        text[] not null,
  timezone     text not null default 'UTC',
  active       boolean not null default true,
  next_run_at  timestamptz,
  last_run_at  timestamptz,
  -- Set while it runs, so two cron runs can't run the same routine at once.
  run_lease    timestamptz,
  created_at   timestamptz not null default now()
);
create index bot_routines_bot_idx on bot_routines (bot_id, created_at);
create index bot_routines_due_idx on bot_routines (next_run_at) where active;

create table bot_inbox (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs (id) on delete cascade,
  bot_id      uuid not null references bots (id) on delete cascade,
  message_id  uuid not null references bot_messages (id) on delete cascade,
  -- Which card of the message (a message can carry several).
  card_index  integer not null,
  kind        text not null check (kind in ('draft', 'findings')),
  -- 'done' once saved or scheduled; 'dismissed' when cleared without acting.
  status      text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  created_at  timestamptz not null default now(),
  unique (message_id, card_index)
);
create index bot_inbox_org_idx on bot_inbox (org_id, status, created_at desc);

alter table bot_routines enable row level security;
create policy "org members read bot routines" on bot_routines for select using (is_org_member(org_id));
revoke insert, update, delete on bot_routines from anon, authenticated;

alter table bot_inbox enable row level security;
create policy "org members read bot inbox" on bot_inbox for select using (is_org_member(org_id));
revoke insert, update, delete on bot_inbox from anon, authenticated;
