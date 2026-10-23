-- ── MCP OAuth: detect a replayed refresh token ──────────────────────
-- Refresh tokens rotate: each refresh deletes the presented row and issues a
-- new pair. Without a record of spent tokens, a stolen refresh token used
-- after the real client's next refresh is simply "not found", and one used
-- before it silently wins (the real client is the one that fails).
-- Keeping the spent hashes lets the server spot a replay and revoke that
-- connection (client + user + workspace), per OAuth 2.1 §4.3.1.
-- Service role only, like the other oauth_* tables (0024). Additive.

create table if not exists public.oauth_spent_refresh (
  refresh_token_hash text primary key,
  client_id  text not null,
  org_id     uuid not null,
  user_id    uuid not null,
  spent_at   timestamptz not null default now()
);
create index if not exists oauth_spent_refresh_spent_idx on public.oauth_spent_refresh (spent_at);

alter table public.oauth_spent_refresh enable row level security;
revoke all on public.oauth_spent_refresh from anon, authenticated;
