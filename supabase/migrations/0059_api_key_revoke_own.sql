-- ── Members revoke only their own API keys ─────────────────────────────
-- Any member could delete every API key in the workspace, breaking the
-- owner's integrations. Now a member revokes (and rotates) only keys they
-- created; owners and admins can revoke any key. Keys from before created_by
-- existed (null) are managed by owners/admins.

drop policy if exists "org members revoke api_keys" on api_keys;

create policy "org members revoke own api_keys" on api_keys
  for delete using (
    is_org_member(org_id) and (created_by = auth.uid() or is_org_manager(org_id))
  );
