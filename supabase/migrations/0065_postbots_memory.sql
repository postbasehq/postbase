-- ── Postbots: what the bots know about you ─────────────────────────
-- One short note per workspace that every bot reads, so a new bot already
-- knows who you are and what you're building ("I can see you run Postbase").
-- Bots write it (service role) when you tell them about yourself. Additive.
create table bot_memory (
  org_id     uuid primary key references orgs (id) on delete cascade,
  notes      text not null default '',
  updated_at timestamptz not null default now()
);
alter table bot_memory enable row level security;
create policy "org members read bot memory" on bot_memory for select using (is_org_member(org_id));
revoke insert, update, delete on bot_memory from anon, authenticated;
