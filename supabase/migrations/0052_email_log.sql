-- ── Transactional email: once per event ───────────────────────────────
-- The app now sends its own emails (post failed, reconnect needed, team
-- invite, welcome, billing). Each send first claims a key for its event
-- (e.g. post-failed:<post>:<claim time>, payment-failed:<invoice>:<attempt>);
-- only the insert that wins sends, so cron overlaps, retries and repeated
-- Stripe webhooks never email twice. Service role only.

create table if not exists email_log (
  key        text primary key,
  sent_at    timestamptz not null default now()
);
alter table email_log enable row level security;
revoke all on email_log from anon, authenticated;
