-- ── Postbase Reach ──────────────────────────────────────────────────
-- A conversational link-in-bio agent. Each org gets a public bio page that
-- answers follower questions against an ingested content corpus and routes them
-- to creator-approved commercial CTAs. The follower surface is public and
-- anonymous, so reads/writes on it go through the service role in the API route
-- (mirrors the rest of the app); RLS below only grants the owning org access.
--
-- The defensible asset here is the conversation data: what followers ask, what
-- we couldn't answer, what content/CTAs convert. That lives in reach_messages /
-- reach_leads and powers the creator dashboard.

-- Fuzzy matching for the corpus search (title/body).
create extension if not exists pg_trgm;

-- One public bio page per org (MVP: a single page per workspace).
create table reach_pages (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs (id) on delete cascade,
  handle       text not null unique,          -- public slug: /r/<handle>
  display_name text,
  bio          text,
  avatar_url   text,
  theme        jsonb,
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index reach_pages_org_idx on reach_pages (org_id);

-- The searchable content corpus (videos, posts, articles).
-- `fts` is a generated tsvector so retrieval is a plain GIN index lookup; a
-- pgvector column can be added later for semantic recall without reshaping this.
create table reach_content (
  id            uuid primary key default gen_random_uuid(),
  page_id       uuid not null references reach_pages (id) on delete cascade,
  source        text not null,                -- youtube | tiktok | website | manual
  external_id   text,                         -- platform id / url hash (dedupe)
  title         text,
  url           text not null,
  body          text,                         -- transcript / caption / article text
  thumbnail_url text,
  published_at  timestamptz,
  approved      boolean not null default true,
  fts           tsvector generated always as (
                  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
                ) stored,
  created_at    timestamptz not null default now()
);
create index reach_content_page_idx on reach_content (page_id);
create index reach_content_fts_idx  on reach_content using gin (fts);
create unique index reach_content_dedupe on reach_content (page_id, source, external_id);

-- Creator-approved commercial calls to action. `description` tells the agent
-- when this is the right next step to surface.
create table reach_ctas (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references reach_pages (id) on delete cascade,
  kind        text not null,                  -- newsletter|product|course|affiliate|consult|sponsor|link
  label       text not null,
  url         text not null,
  description text,
  sort        int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index reach_ctas_page_idx on reach_ctas (page_id);

-- Follower conversations (anonymous sessions).
create table reach_conversations (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references reach_pages (id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now()
);
create index reach_conversations_page_idx on reach_conversations (page_id);

-- Individual turns. `answered = false` on assistant turns is the
-- "questions we couldn't answer" signal; cited_content_ids / cta_id power the
-- recommended-content and click analytics.
create table reach_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references reach_conversations (id) on delete cascade,
  role             text not null,             -- user | assistant
  content          text not null,
  answered         boolean,
  cited_content_ids uuid[],
  cta_id           uuid references reach_ctas (id) on delete set null,
  cta_clicked      boolean not null default false,
  created_at       timestamptz not null default now()
);
create index reach_messages_conv_idx on reach_messages (conversation_id);

-- Email leads captured in-conversation.
create table reach_leads (
  id              uuid primary key default gen_random_uuid(),
  page_id         uuid not null references reach_pages (id) on delete cascade,
  conversation_id uuid references reach_conversations (id) on delete set null,
  email           text not null,
  created_at      timestamptz not null default now()
);
create index reach_leads_page_idx on reach_leads (page_id);

-- ── RLS ─────────────────────────────────────────────────────────────
-- Owner (org member) access only. The public follower surface never uses these
-- policies — it goes through the service role in the API route, scoped to a
-- single published page.
alter table reach_pages         enable row level security;
alter table reach_content       enable row level security;
alter table reach_ctas          enable row level security;
alter table reach_conversations enable row level security;
alter table reach_messages      enable row level security;
alter table reach_leads         enable row level security;

create policy "org members manage reach pages" on reach_pages
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "org members manage reach content" on reach_content
  for all using (exists (select 1 from reach_pages p where p.id = page_id and is_org_member(p.org_id)))
  with check (exists (select 1 from reach_pages p where p.id = page_id and is_org_member(p.org_id)));

create policy "org members manage reach ctas" on reach_ctas
  for all using (exists (select 1 from reach_pages p where p.id = page_id and is_org_member(p.org_id)))
  with check (exists (select 1 from reach_pages p where p.id = page_id and is_org_member(p.org_id)));

create policy "org members read reach conversations" on reach_conversations
  for select using (exists (select 1 from reach_pages p where p.id = page_id and is_org_member(p.org_id)));

create policy "org members read reach messages" on reach_messages
  for select using (exists (
    select 1 from reach_conversations c join reach_pages p on p.id = c.page_id
    where c.id = conversation_id and is_org_member(p.org_id)
  ));

create policy "org members read reach leads" on reach_leads
  for select using (exists (select 1 from reach_pages p where p.id = page_id and is_org_member(p.org_id)));
