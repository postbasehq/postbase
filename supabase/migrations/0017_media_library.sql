-- Postbase — media library (Phase: standalone reusable assets).
-- Org-scoped rows pointing at objects in the Cloudflare R2 bucket. Files are
-- uploaded from the browser via presigned S3 multipart; deletion removes both
-- the row and the R2 object (server-side, see media-actions.ts).

create table media_library (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs (id) on delete cascade,
  key         text not null,          -- R2 object key
  url         text not null,          -- public URL (R2_PUBLIC_URL/key)
  name        text not null,          -- original filename
  type        text not null,          -- MIME type
  size_bytes  bigint not null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index media_library_org_created_idx on media_library (org_id, created_at desc);

alter table media_library enable row level security;

-- Members of the owning org can read / add / remove their library assets.
create policy "media_library org read"
  on media_library for select
  using (is_org_member(org_id));

create policy "media_library org insert"
  on media_library for insert
  with check (is_org_member(org_id));

create policy "media_library org delete"
  on media_library for delete
  using (is_org_member(org_id));

-- 0016 revoked anon and trimmed authenticated; grant the CRUD the app needs
-- (RLS above still scopes every row to the caller's org).
grant select, insert, delete on media_library to authenticated;
