-- ── Channel tokens are server-only ────────────────────────────────────
-- Members could SELECT channels.encrypted_tokens and INSERT/UPDATE channel
-- rows. Ciphertexts aren't bound to their row, so a member could copy a
-- channel's tokens and, after being removed, re-insert them into their own
-- workspace (where the publisher would decrypt and use them), or re-insert
-- deleted channels to get round the plan's channel limit.
-- Every connect/reconnect now saves through lib/channel-store.ts with the
-- service role, scoped to the caller's workspace, and token reads are
-- server-side. Members keep reading everything except the tokens, and
-- owners/admins keep DELETE (disconnect, 0048).
-- Apply AFTER the deploy that moves those writes server-side.

drop policy if exists "org members connect channels" on channels;
drop policy if exists "org members update channels" on channels;
revoke insert, update on channels from anon, authenticated;

revoke select on channels from anon, authenticated;
grant select (
  id, org_id, platform, handle, display_name, avatar_url, verified, status,
  status_error, status_at, reconnect_by, token_expiry, provider_user_id, created_at
) on channels to authenticated;
