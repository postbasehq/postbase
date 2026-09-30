-- ── Post metrics history ────────────────────────────────────────────
-- post_targets.metrics only holds the latest reading, overwritten on each
-- refresh, so nothing can show change over time. This keeps a timestamped copy
-- of every reading that changed, written by the metrics collector
-- (lib/analytics/collect.ts) alongside the post_targets update. Analytics reads
-- it for trends ("this week vs last"), growth curves and timing.
--
-- org_id, channel_id and platform are copied in so the page can filter and
-- group without joining through posts and channels. Inserts happen
-- server-side via the service role; org members can read their own history.
-- No update/delete policy. Rows go when the post, channel or workspace does.

create table post_metric_snapshots (
  id          bigint generated always as identity primary key,
  org_id      uuid not null references orgs (id) on delete cascade,
  target_id   uuid not null references post_targets (id) on delete cascade,
  channel_id  uuid not null references channels (id) on delete cascade,
  platform    text not null,
  captured_at timestamptz not null default now(),
  metrics     jsonb not null
);
create index post_metric_snapshots_org_idx on post_metric_snapshots (org_id, captured_at);
create index post_metric_snapshots_target_idx on post_metric_snapshots (target_id, captured_at);

alter table post_metric_snapshots enable row level security;
create policy "org members read metric history" on post_metric_snapshots
  for select using (is_org_member(org_id));

-- Seed each post's current reading as its first point, so history starts
-- from what's already known rather than empty.
insert into post_metric_snapshots (org_id, target_id, channel_id, platform, captured_at, metrics)
select c.org_id, t.id, t.channel_id, c.platform, t.metrics_updated_at, t.metrics
from post_targets t
join channels c on c.id = t.channel_id
where t.metrics is not null and t.metrics_updated_at is not null;
