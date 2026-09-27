-- ── Agent message cost logging ──────────────────────────────────────
-- Tokens and an estimated USD cost per agent message, so plan quotas can be
-- set from real usage rather than estimates. Written server-side (service
-- role) after each turn; existing rows stay null.
alter table agent_messages
  add column if not exists model text,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists cache_read_tokens integer,
  add column if not exists cache_write_tokens integer,
  add column if not exists cost_usd numeric(10, 5);
