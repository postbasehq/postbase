-- Per-channel post metrics (normalized: impressions, likes, comments, shares, saves).
-- Stored on the target; refreshed periodically by the metrics collector.
alter table post_targets add column if not exists metrics jsonb;
alter table post_targets add column if not exists metrics_updated_at timestamptz;

-- Find published targets due for a metrics refresh.
create index if not exists post_targets_metrics_idx
  on post_targets (metrics_updated_at)
  where status = 'published' and platform_post_id is not null;
