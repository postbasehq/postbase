-- ── AI generation usage ─────────────────────────────────────────────
-- One row per successful AI media generation, used to enforce a per-plan
-- monthly quota (images + videos). Inserts happen server-side via the service
-- role; org members can read their own usage. No update/delete policy, so a
-- user can't tamper with the count.

create table ai_generations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs (id) on delete cascade,
  kind       text not null check (kind in ('image', 'video')),
  created_at timestamptz not null default now()
);
create index ai_generations_org_kind_idx on ai_generations (org_id, kind, created_at);

alter table ai_generations enable row level security;
create policy "org members read ai usage" on ai_generations
  for select using (is_org_member(org_id));
