-- ── Only owners and admins can delete (disconnect) channels ───────────
-- 0001 gave every org member ALL on channels, so a member could disconnect any
-- account straight through PostgREST, bypassing the role check in
-- disconnectChannel. Members still read, connect (insert) and reconnect
-- (update) channels; delete needs owner or admin. The Meta data-deletion
-- callback deletes with the service role and is unaffected.

create or replace function is_org_manager(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members m
    where m.org_id = target_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;
revoke all on function is_org_manager(uuid) from public, anon;
grant execute on function is_org_manager(uuid) to authenticated, service_role;

drop policy if exists "org members manage channels" on channels;
create policy "org members read channels" on channels
  for select using (is_org_member(org_id));
create policy "org members connect channels" on channels
  for insert with check (is_org_member(org_id));
create policy "org members update channels" on channels
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "org managers delete channels" on channels
  for delete using (is_org_manager(org_id));
