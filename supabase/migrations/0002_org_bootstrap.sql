-- Postbase — org bootstrap (Phase 1)
-- Every user gets a personal org (workspace) + owner membership on sign-up.
-- Runs as SECURITY DEFINER so it can insert past RLS. Also backfills existing users.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org uuid;
  ws_name text;
begin
  ws_name := coalesce(nullif(split_part(new.email, '@', 1), ''), 'My workspace');
  insert into orgs (name) values (ws_name) returning id into new_org;
  insert into org_members (org_id, user_id, role) values (new_org, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill anyone who signed up before this trigger existed.
do $$
declare
  u record;
  new_org uuid;
begin
  for u in
    select usr.id, usr.email
    from auth.users usr
    where not exists (select 1 from org_members m where m.user_id = usr.id)
  loop
    insert into orgs (name)
      values (coalesce(nullif(split_part(u.email, '@', 1), ''), 'My workspace'))
      returning id into new_org;
    insert into org_members (org_id, user_id, role) values (new_org, u.id, 'owner');
  end loop;
end;
$$;
