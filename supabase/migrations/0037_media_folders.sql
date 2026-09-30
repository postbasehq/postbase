-- ── Media library folders ───────────────────────────────────────────
-- Workspace folders for organising library files (a client, a campaign, brand
-- assets). One level, no nesting. A file sits in at most one folder; deleting a
-- folder leaves its files in the library, unfiled.
--
-- Also adds the UPDATE policy media_library never had: 0017 granted UPDATE but
-- defined no policy, so RLS silently blocked every rename. Moving a file into a
-- folder is an update too.

create table media_folders (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
-- No two folders with the same name (ignoring case) in a workspace.
create unique index media_folders_org_name_idx on media_folders (org_id, lower(name));

alter table media_folders enable row level security;
create policy "media_folders org read" on media_folders for select using (is_org_member(org_id));
create policy "media_folders org insert" on media_folders for insert with check (is_org_member(org_id));
create policy "media_folders org update" on media_folders for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "media_folders org delete" on media_folders for delete using (is_org_member(org_id));
grant select, insert, update, delete on media_folders to authenticated;

alter table media_library
  add column if not exists folder_id uuid references media_folders (id) on delete set null;
create index if not exists media_library_org_folder_idx on media_library (org_id, folder_id);

create policy "media_library org update" on media_library
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
