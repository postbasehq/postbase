-- Track when a post row last changed, so the publish poller can recognise a post
-- that was claimed (scheduled -> publishing) but never finished — a run that
-- crashed or timed out — and re-claim it once it's older than the stuck window.

alter table posts
  add column if not exists updated_at timestamptz not null default now();

-- Backfill existing rows to a sensible value.
update posts set updated_at = coalesce(scheduled_at, created_at) where updated_at is null;

-- Keep updated_at fresh on every write.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on posts;
create trigger posts_set_updated_at
  before update on posts
  for each row
  execute function set_updated_at();

-- Support the poller's straggler sweep: publishing posts ordered by updated_at.
create index if not exists posts_publishing_updated_idx
  on posts (updated_at)
  where status = 'publishing';
