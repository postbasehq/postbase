-- Hosted MCP: OAuth 2.1 authorization server (dynamic client registration +
-- PKCE) backing the "Sign in with Postbase (no API key)" connector flow.
-- All three tables are service-role only — the app touches them exclusively
-- through the admin client, so RLS is enabled with NO policies (which blocks
-- anon/authenticated entirely) and table grants are revoked.

-- Dynamically-registered MCP clients (RFC 7591). Public clients (PKCE), so no secret.
create table if not exists public.oauth_clients (
  client_id text primary key,
  client_name text,
  redirect_uris jsonb not null default '[]'::jsonb,
  token_endpoint_auth_method text not null default 'none',
  created_at timestamptz not null default now()
);

-- Short-lived authorization codes (single-use), bound to a user's org + PKCE challenge.
create table if not exists public.oauth_codes (
  code_hash text primary key,
  client_id text not null,
  org_id uuid not null,
  user_id uuid not null,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  scope text,
  resource text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Issued access/refresh tokens (hashes only), mapping a bearer to an org.
create table if not exists public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  access_token_hash text not null unique,
  refresh_token_hash text unique,
  client_id text not null,
  org_id uuid not null,
  user_id uuid not null,
  scope text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists oauth_tokens_refresh_idx on public.oauth_tokens(refresh_token_hash);

alter table public.oauth_clients enable row level security;
alter table public.oauth_codes enable row level security;
alter table public.oauth_tokens enable row level security;

revoke all on public.oauth_clients from anon, authenticated;
revoke all on public.oauth_codes from anon, authenticated;
revoke all on public.oauth_tokens from anon, authenticated;
