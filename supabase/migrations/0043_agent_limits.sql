-- ── AI agent limits ─────────────────────────────────────────────────
-- The chat route now builds the model's history from stored messages instead
-- of trusting the browser's copy, so images generated in a reply are stored
-- with it (the model needs their URLs to attach them in a later turn).
alter table agent_chat_messages add column if not exists images text[];

-- Spend backstop: the plan's AI agent cost this period, across its workspaces.
-- A message whose cost wasn't logged (the run errored after calling the model)
-- counts as $0.01 so failures can't be used to dodge the ceiling.
create or replace function agent_spend_since(p_orgs uuid[], p_since timestamptz)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(coalesce(cost_usd, 0.01)), 0)
    from agent_messages
   where org_id = any (p_orgs) and created_at >= p_since;
$$;

revoke all on function agent_spend_since(uuid[], timestamptz) from public, anon, authenticated;
grant execute on function agent_spend_since(uuid[], timestamptz) to service_role;
