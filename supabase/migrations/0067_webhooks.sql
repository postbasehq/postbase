-- ── Webhooks ──────────────────────────────────────────────────────
-- A workspace can register https endpoints that get signed POSTs when its
-- posts finish publishing (post.published / post.partial / post.failed) or a
-- channel needs reconnecting (channel.needs_reconnect). Service-role only, like
-- the OAuth tables (0024): RLS on with no policies, grants revoked. The app
-- reads and writes them through the admin client, always scoped by org_id.

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  url text not null,
  -- The signing secret, AES-GCM encrypted (lib/crypto): it's needed to sign
  -- every delivery, so it can't be hashed like an API key.
  encrypted_secret text not null,
  secret_hint text not null,
  events text[] not null,
  description text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists webhook_endpoints_org_idx on public.webhook_endpoints (org_id);

-- One row per event per endpoint: the delivery and its retries. dedupe_key
-- stops the same outcome being sent twice if a post's status is recomputed.
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete cascade,
  event_id uuid not null,
  event_type text not null,
  dedupe_key text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  response_status int,
  error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (endpoint_id, dedupe_key)
);
create index if not exists webhook_deliveries_due_idx
  on public.webhook_deliveries (next_attempt_at) where status = 'pending';
create index if not exists webhook_deliveries_endpoint_idx
  on public.webhook_deliveries (endpoint_id, created_at desc);

alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;
revoke all on public.webhook_endpoints from anon, authenticated;
revoke all on public.webhook_deliveries from anon, authenticated;
