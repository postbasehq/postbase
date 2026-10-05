-- ── post-media upload lockdown ──────────────────────────────────────
-- post-media is a public bucket. Until now any signed-in user (even with no
-- plan) could upload unlimited 25MB files straight into it: free file hosting
-- on our storage and egress. Now:
--   * Browsers can't upload directly. The app hands out a one-time signed
--     upload URL (app/(app)/upload-actions.ts) only to workspaces with an
--     active plan or trial, under the plan's storage allowance, at a path
--     scoped to the workspace: uploads/<org_id>/<uuid>.<ext>.
--   * A daily job deletes files nothing references after 48 hours
--     (app/api/cron/cleanup-media/route.ts).
-- Bucket limits (25MB, image/video types) still apply to signed uploads.

drop policy if exists "post-media authenticated upload" on storage.objects;

-- Bytes stored in post-media by these workspaces (their scoped paths).
create or replace function media_storage_bytes(p_orgs uuid[])
returns bigint
language sql
stable
security invoker
set search_path = public, storage
as $$
  select coalesce(sum((o.metadata->>'size')::bigint), 0)
    from storage.objects o
   where o.bucket_id = 'post-media'
     and o.name ~ '^(uploads|agent|ai)/[0-9a-f-]{36}/'
     and (split_part(o.name, '/', 2))::uuid = any (p_orgs);
$$;

-- post-media files older than p_min_age (and created after p_created_after)
-- that nothing references: no post's media, no YouTube thumbnail, no agent
-- chat image or proposal.
create or replace function orphan_media(p_min_age interval, p_limit integer, p_created_after timestamptz)
returns setof text
language sql
stable
security invoker
set search_path = public, storage
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'post-media'
     and o.created_at < now() - p_min_age
     and o.created_at >= p_created_after
     and not exists (select 1 from media m where m.storage_url like '%/post-media/' || o.name)
     and not exists (select 1 from posts p where p.youtube_options->>'thumbnailUrl' like '%/post-media/' || o.name)
     and not exists (
       select 1 from agent_chat_messages a
        where a.proposal::text like '%/post-media/' || o.name || '%'
           or exists (select 1 from unnest(a.images) i where i like '%/post-media/' || o.name)
     )
   order by o.created_at
   limit p_limit;
$$;

revoke all on function media_storage_bytes(uuid[]) from public, anon, authenticated;
revoke all on function orphan_media(interval, integer, timestamptz) from public, anon, authenticated;
grant execute on function media_storage_bytes(uuid[]) to service_role;
grant execute on function orphan_media(interval, integer, timestamptz) to service_role;
