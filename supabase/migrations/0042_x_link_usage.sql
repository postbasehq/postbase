-- ── X link-post allowance ───────────────────────────────────────────
-- X bills $0.20 for a post containing a link (vs $0.015 plain), so each plan
-- gets a monthly allowance of X posts with links (lib/plans.ts X_LINK_LIMIT),
-- shared across the billing group's workspaces. One row per send attempt that
-- had link posts; `count` is how many of its posts carried a link.
--
-- Abuse-proofing:
--   * Rows outlive the post (target_id on delete set null), so deleting a
--     published post never hands its allowance back.
--   * Users get no access at all: RLS on with no policies and no grants. Only
--     the service role (the publisher) reads or writes, and only it may call
--     reserve_x_links.
--   * reserve_x_links checks and records under a per-plan advisory lock, so
--     two overlapping publisher runs can't both take the last slot.

create table if not exists x_link_usage (
  id           uuid primary key default gen_random_uuid(),
  root_org_id  uuid not null references orgs (id) on delete cascade,
  org_id       uuid references orgs (id) on delete set null,
  target_id    uuid references post_targets (id) on delete set null,
  count        integer not null check (count > 0),
  created_at   timestamptz not null default now()
);
create index if not exists x_link_usage_root_month_idx on x_link_usage (root_org_id, created_at);

alter table x_link_usage enable row level security;
revoke all on x_link_usage from anon, authenticated;

-- Reserve `p_count` link posts for one send. Returns the usage row id, or null
-- when it would go over `p_limit` for the period starting `p_since`.
create or replace function reserve_x_links(
  p_root uuid, p_org uuid, p_target uuid, p_count integer, p_limit integer, p_since timestamptz
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  used integer;
  new_id uuid;
begin
  if p_count <= 0 then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('x_link_usage:' || p_root::text, 0));
  select coalesce(sum(count), 0) into used
    from x_link_usage
   where root_org_id = p_root and created_at >= p_since;
  if used + p_count > p_limit then
    return null;
  end if;
  insert into x_link_usage (root_org_id, org_id, target_id, count)
  values (p_root, p_org, p_target, p_count)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function reserve_x_links(uuid, uuid, uuid, integer, integer, timestamptz) from public, anon, authenticated;
grant execute on function reserve_x_links(uuid, uuid, uuid, integer, integer, timestamptz) to service_role;

-- Thread progress: ids of the thread's posts already on X, in order, so a retry
-- continues the thread instead of re-posting it from the top.
alter table post_targets add column if not exists thread_ids text[];
