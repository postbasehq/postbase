-- ── API keys belong to the member who created them ────────────────────
-- Keys weren't tied to anyone, so a member who made one kept full API access
-- to the workspace after being removed from the team. Now each key records its
-- creator (set by the database, not the client); removing a member deletes
-- their keys, and authenticateApiKey rejects a key whose creator has left.
-- Keys made before this migration have no creator and keep working.

alter table api_keys
  add column if not exists created_by uuid references auth.users (id) on delete cascade default auth.uid();

drop policy if exists "org members manage api_keys" on api_keys;
create policy "org members read api_keys" on api_keys
  for select using (is_org_member(org_id));
create policy "org members create own api_keys" on api_keys
  for insert with check (is_org_member(org_id) and created_by = auth.uid());
create policy "org members revoke api_keys" on api_keys
  for delete using (is_org_member(org_id));

-- last_used_at is bumped by the service role; members never update keys.
revoke update on api_keys from anon, authenticated;
