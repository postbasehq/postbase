-- ── Media library (R2) counts toward the plan's storage allowance ──────
-- The R2 media library had no plan or quota check, and members could insert
-- media_library rows straight through PostgREST with any key/size_bytes (or
-- repoint `key` with an update). Now:
--   • media_storage_bytes() = post-media bucket bytes + media_library bytes,
--     so one allowance covers both stores.
--   • Rows are only created by /api/media/upload/complete (service role), which
--     records the object's real size from R2. Members keep read/delete, and may
--     only update the display name and folder.

create or replace function media_storage_bytes(p_orgs uuid[])
returns bigint
language sql
stable
security invoker
set search_path = public, storage
as $$
  select
    coalesce((
      select sum((o.metadata->>'size')::bigint)
        from storage.objects o
       where o.bucket_id = 'post-media'
         and o.name ~ '^(uploads|agent|ai)/[0-9a-f-]{36}/'
         and (split_part(o.name, '/', 2))::uuid = any (p_orgs)
    ), 0)
    + coalesce((
      select sum(m.size_bytes)::bigint
        from media_library m
       where m.org_id = any (p_orgs)
    ), 0);
$$;
revoke all on function media_storage_bytes(uuid[]) from public, anon, authenticated;
grant execute on function media_storage_bytes(uuid[]) to service_role;

drop policy if exists "media_library org insert" on media_library;
revoke insert, update on media_library from anon, authenticated;
grant update (name, folder_id) on media_library to authenticated;
