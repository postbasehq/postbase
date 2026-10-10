-- ── API idempotency keys ──────────────────────────────────────────
-- A REST/MCP caller can send an idempotency key with create_post. Repeating
-- the request with the same key returns the first post instead of making a
-- second one (agents and HTTP clients retry on timeouts). Unique per
-- workspace; the insert itself enforces it, so two racing requests can't
-- both create a post. Additive; posts are only written by the service role.
alter table posts add column if not exists idempotency_key text;
create unique index if not exists posts_org_idempotency_key
  on posts (org_id, idempotency_key) where idempotency_key is not null;
