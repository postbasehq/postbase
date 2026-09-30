-- ── Metrics history: baseline readings ──────────────────────────────
-- 0035 copied each post's then-current metrics in as its first reading. Those
-- are lifetime totals, not what the post earned on that day, so analytics
-- must use them only as a starting point and not count them as earnings.
-- New readings written by the collector are ordinary (false).

alter table post_metric_snapshots
  add column if not exists is_baseline boolean not null default false;

-- The rows 0035 inserted: every reading that existed before this migration,
-- except the analytics demo workspace (scripts/analytics-demo.sql), whose
-- readings are a deliberate growth curve.
update post_metric_snapshots
set is_baseline = true
where org_id <> 'd3d0a000-0000-4000-8000-000000000001';
