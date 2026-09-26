-- Fixed-window rate limiting for public/abusable endpoints (Reach chat first;
-- reusable for the API/MCP). Service-role only: RLS on with no policies, and
-- the increment function is not executable by anon/authenticated.
create table if not exists rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, window_start)
);
alter table rate_limits enable row level security;
revoke all on rate_limits from anon, authenticated;

-- Count one hit against `p_key` in the current window; true while within the
-- limit. The upsert is atomic, so concurrent requests can't both slip under.
create or replace function rate_limit_hit(p_key text, p_window_seconds int, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c int;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into c;

  -- Opportunistic cleanup of expired windows (~1% of calls).
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '2 days';
  end if;

  return c <= p_limit;
end;
$$;

revoke execute on function rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function rate_limit_hit(text, int, int) to service_role;
