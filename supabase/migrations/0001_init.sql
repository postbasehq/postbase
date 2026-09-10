-- Postbase — initial schema (Phase 0)
-- Mirrors docs/TECH_STACK.md §3. Multi-tenant, scoped by org_id, RLS from day one.
-- Auth users live in Supabase's auth.users; app tables reference auth.uid().

create extension if not exists pgcrypto;

-- ── enums ────────────────────────────────────────────────────────────
create type platform as enum ('x', 'linkedin', 'instagram', 'youtube');
create type post_status as enum ('draft', 'scheduled', 'publishing', 'published', 'failed');
create type org_role as enum ('owner', 'admin', 'member');

-- ── orgs & membership ────────────────────────────────────────────────
create table orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text not null default 'trial',
  created_at  timestamptz not null default now()
);

create table org_members (
  org_id   uuid not null references orgs (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  role     org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- membership helper (SECURITY DEFINER avoids RLS recursion)
create or replace function is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

-- ── channels (connected social accounts) ─────────────────────────────
create table channels (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references orgs (id) on delete cascade,
  platform          platform not null,
  handle            text,
  encrypted_tokens  text,            -- OAuth tokens, encrypted at the app layer
  token_expiry      timestamptz,
  status            text not null default 'active',
  created_at        timestamptz not null default now()
);
create index channels_org_idx on channels (org_id);

-- ── posts & per-channel targets ──────────────────────────────────────
create table posts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs (id) on delete cascade,
  author_id     uuid references auth.users (id) on delete set null,
  body          text not null default '',
  scheduled_at  timestamptz,
  status        post_status not null default 'draft',
  created_at    timestamptz not null default now()
);
create index posts_org_idx on posts (org_id);
create index posts_scheduled_idx on posts (scheduled_at) where status = 'scheduled';

create table post_targets (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references posts (id) on delete cascade,
  channel_id        uuid not null references channels (id) on delete cascade,
  variant_body      text,            -- overrides posts.body when set
  status            post_status not null default 'scheduled',
  platform_post_id  text,
  error             text
);
create index post_targets_post_idx on post_targets (post_id);

create table media (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references posts (id) on delete cascade,
  storage_url  text not null,
  type         text not null
);

-- ── API keys (for the MCP server / public API) ───────────────────────
create table api_keys (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs (id) on delete cascade,
  hashed_key   text not null,        -- store only the hash, never the key
  label        text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index api_keys_org_idx on api_keys (org_id);

-- ── row-level security ───────────────────────────────────────────────
alter table orgs           enable row level security;
alter table org_members    enable row level security;
alter table channels       enable row level security;
alter table posts          enable row level security;
alter table post_targets   enable row level security;
alter table media          enable row level security;
alter table api_keys       enable row level security;

create policy "members read their orgs" on orgs
  for select using (is_org_member(id));

create policy "members read membership" on org_members
  for select using (is_org_member(org_id));

-- org-scoped tables: full access for members of the owning org
create policy "org members manage channels" on channels
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "org members manage posts" on posts
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "org members manage api_keys" on api_keys
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

-- child tables inherit access via their parent post
create policy "org members manage post_targets" on post_targets
  for all using (
    exists (select 1 from posts p where p.id = post_id and is_org_member(p.org_id))
  ) with check (
    exists (select 1 from posts p where p.id = post_id and is_org_member(p.org_id))
  );

create policy "org members manage media" on media
  for all using (
    exists (select 1 from posts p where p.id = post_id and is_org_member(p.org_id))
  ) with check (
    exists (select 1 from posts p where p.id = post_id and is_org_member(p.org_id))
  );
