-- ── Members can't move a channel out of its workspace ─────────────────
-- 0048 kept member UPDATE on channels for the reconnect flows, but the policy
-- let a member who belongs to two workspaces change org_id and so pull a
-- channel out of one (a disconnect by another name). Reconnects only write the
-- token/profile/status columns, so members get UPDATE on exactly those.

revoke update on channels from anon, authenticated;
grant update (
  handle,
  encrypted_tokens,
  token_expiry,
  status,
  display_name,
  avatar_url,
  verified,
  provider_user_id,
  status_error,
  status_at,
  reconnect_by
) on channels to authenticated;
