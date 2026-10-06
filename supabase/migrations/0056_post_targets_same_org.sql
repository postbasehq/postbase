-- ── A post can only target channels in its own workspace ──────────────
-- The live post_targets policy (0001) only checked the post, so a member could
-- attach ANOTHER workspace's channel_id to their own post (insert, or update
-- channel_id) and the publisher would post through that workspace's account.
-- 0003 meant to fix this but wasn't in effect, and only required the channel
-- to be in some workspace of the caller's. Now:
--  * RLS: the channel must be in the same workspace as the post.
--  * A trigger enforces the same for every writer, the service role included,
--    so no code path can create a cross-workspace target.

drop policy if exists "org members manage post_targets" on post_targets;

create policy "org members read post_targets" on post_targets
  for select using (
    exists (select 1 from posts p where p.id = post_id and is_org_member(p.org_id))
  );

create policy "org members write post_targets" on post_targets
  for insert with check (
    exists (
      select 1 from posts p join channels c on c.org_id = p.org_id
       where p.id = post_id and c.id = channel_id and is_org_member(p.org_id)
    )
  );

create policy "org members update post_targets" on post_targets
  for update
  using (exists (select 1 from posts p where p.id = post_id and is_org_member(p.org_id)))
  with check (
    exists (
      select 1 from posts p join channels c on c.org_id = p.org_id
       where p.id = post_id and c.id = channel_id and is_org_member(p.org_id)
    )
  );

create policy "org members delete post_targets" on post_targets
  for delete using (
    exists (select 1 from posts p where p.id = post_id and is_org_member(p.org_id))
  );

create or replace function post_targets_same_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from posts p join channels c on c.org_id = p.org_id
     where p.id = new.post_id and c.id = new.channel_id
  ) then
    raise exception 'post_targets: channel % is not in the same workspace as post %', new.channel_id, new.post_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function post_targets_same_org() from public, anon, authenticated;

drop trigger if exists post_targets_same_org on post_targets;
create trigger post_targets_same_org
  before insert or update of post_id, channel_id on post_targets
  for each row execute function post_targets_same_org();
