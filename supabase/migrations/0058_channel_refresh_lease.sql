-- ── One token refresh per channel at a time ───────────────────────────
-- X refresh tokens are single-use: when the publisher and the analytics
-- collector (or two overlapping cron runs) refreshed the same channel at once,
-- the loser's refresh was rejected and the channel was wrongly flagged
-- "reconnect". A short lease on the channel row lets one process refresh while
-- the others wait for the new tokens (lib/platforms/token-refresh.ts).
-- Server-only: members have no access to this column (0057 grants explicit
-- columns).

alter table channels add column if not exists refresh_lock_until timestamptz;
