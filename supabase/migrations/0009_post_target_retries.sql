-- Retry bookkeeping for per-channel delivery. The publish poller retries a
-- failed target with backoff until MAX attempts, then leaves it terminally failed.
alter table post_targets add column if not exists attempts int not null default 0;
alter table post_targets add column if not exists next_attempt_at timestamptz;

-- Support the poller's retry sweep: failed targets due for another attempt.
create index if not exists post_targets_retry_idx
  on post_targets (next_attempt_at)
  where status = 'failed';
