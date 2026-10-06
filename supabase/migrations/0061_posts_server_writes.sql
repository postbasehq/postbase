-- ── Posts are written server-side only ─────────────────────────────────
-- Members could INSERT/UPDATE/DELETE posts, post_targets and media straight
-- through the API with their own session, skipping every server check: the
-- plan's limits after a downgrade, post validation, the own-media allowlist.
-- (The publisher re-checks the plan, media and channel workspace at send time,
-- but not the downgrade limits.) The app now writes these tables with the
-- service role, scoped to the caller's workspace (app/(app)/actions.ts,
-- agent/confirm-actions.ts, lib/api-core.ts, lib/publish/cancel.ts). Members
-- keep reading them.
-- Apply AFTER the deploy that moves those writes server-side.

drop policy if exists "org members manage posts" on posts;
create policy "org members read posts" on posts
  for select using (is_org_member(org_id));

drop policy if exists "org members write post_targets" on post_targets;
drop policy if exists "org members update post_targets" on post_targets;
drop policy if exists "org members delete post_targets" on post_targets;

drop policy if exists "org members manage media" on media;
create policy "org members read media" on media
  for select using (
    exists (select 1 from posts p where p.id = media.post_id and is_org_member(p.org_id))
  );

revoke insert, update, delete, truncate on posts, post_targets, media from anon, authenticated;
