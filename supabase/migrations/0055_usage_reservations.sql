-- ── Atomic AI and agent allowances ────────────────────────────────────
-- AI generations and agent messages were checked, then recorded after the
-- work: parallel requests all passed the check, so a plan could exceed its
-- monthly AI allowance or the agent's daily cap/spend ceiling. Like
-- reserve_x_links (0042), these take a per-plan advisory lock, count, and
-- insert the usage row in one transaction. The caller deletes the row to give
-- it back if the work fails. p_orgs is the plan's workspaces, payer first.

create or replace function reserve_ai_generation(
  p_orgs uuid[], p_org uuid, p_kind text, p_limit integer, p_since timestamptz
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  used integer;
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('ai_generations:' || p_orgs[1]::text, 0));
  select count(*) into used
    from ai_generations
   where org_id = any (p_orgs) and kind = p_kind and created_at >= p_since;
  if used >= p_limit then
    return null;
  end if;
  insert into ai_generations (org_id, kind) values (p_org, p_kind) returning id into new_id;
  return new_id;
end;
$$;

-- Returns the new agent_messages row id, or 'daily' / 'budget' when a backstop is hit.
create or replace function reserve_agent_message(
  p_orgs uuid[], p_org uuid, p_daily_cap integer, p_day_start timestamptz,
  p_budget numeric, p_month_start timestamptz
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  today integer;
  spent numeric;
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('agent_messages:' || p_orgs[1]::text, 0));
  select count(*) into today
    from agent_messages
   where org_id = any (p_orgs) and created_at >= p_day_start;
  if today >= p_daily_cap then
    return 'daily';
  end if;
  -- Unpriced rows (in flight, or errored) count as one cent, as agent_spend_since does.
  select coalesce(sum(coalesce(cost_usd, 0.01)), 0) into spent
    from agent_messages
   where org_id = any (p_orgs) and created_at >= p_month_start;
  if spent >= p_budget then
    return 'budget';
  end if;
  insert into agent_messages (org_id) values (p_org) returning id into new_id;
  return new_id::text;
end;
$$;

revoke all on function reserve_ai_generation(uuid[], uuid, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function reserve_ai_generation(uuid[], uuid, text, integer, timestamptz) to service_role;
revoke all on function reserve_agent_message(uuid[], uuid, integer, timestamptz, numeric, timestamptz) from public, anon, authenticated;
grant execute on function reserve_agent_message(uuid[], uuid, integer, timestamptz, numeric, timestamptz) to service_role;
