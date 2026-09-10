-- Postbase — security hardening (Phase 1)
-- Tighten post_targets RLS so a target must reference a channel in the SAME org as
-- its post. Prevents a user from attaching another tenant's channel to their post
-- (defense-in-depth alongside the app-layer check in createPost).

drop policy if exists "org members manage post_targets" on post_targets;

create policy "org members manage post_targets" on post_targets
  for all
  using (
    exists (select 1 from posts p where p.id = post_id and is_org_member(p.org_id))
  )
  with check (
    exists (select 1 from posts p where p.id = post_id and is_org_member(p.org_id))
    and exists (select 1 from channels c where c.id = channel_id and is_org_member(c.org_id))
  );
