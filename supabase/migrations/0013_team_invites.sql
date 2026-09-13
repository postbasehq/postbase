-- Team invites: an owner/admin invites an email to their org with a role. The
-- invitee accepts via a token link, which adds them to org_members.
create table if not exists org_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs (id) on delete cascade,
  email       text not null,
  role        org_role not null default 'member',
  token       text not null unique,
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);
create index if not exists org_invites_org_idx on org_invites (org_id);
create index if not exists org_invites_token_idx on org_invites (token);

alter table org_invites enable row level security;
grant all on org_invites to authenticated, service_role;

-- Members may READ their org's pending invites (for the team page). All writes
-- (create/revoke/accept, add/remove members, role changes) go through server
-- actions using the service-role client with explicit owner/admin checks — the
-- invitee isn't a member yet when accepting, and role gating shouldn't live in RLS.
create policy "org members read invites" on org_invites
  for select using (is_org_member(org_id));
