-- Postbase — security hardening (from the 2026-09-14 Supabase audit).

-- ── Storage: post-media bucket ──────────────────────────────────────
-- The bucket is public-read by design (social platforms fetch image URLs
-- server-side to publish them). But its RLS policies were too broad:
--   * "public read" let anon LIST every object path in the bucket
--   * "authenticated delete" let ANY signed-in user delete ANY file (cross-tenant)
-- Public URL serving does NOT rely on these policies — a public bucket serves
-- /storage/v1/object/public/... directly — so tightening them doesn't affect
-- publishing. Deletion moves to the service-role/admin client (bypasses RLS).
drop policy if exists "post-media public read" on storage.objects;
drop policy if exists "post-media authenticated delete" on storage.objects;

-- Uploads stay authenticated (the composer uploads from the browser), but the
-- bucket now caps size and allows only image/video types to curb abuse.
update storage.buckets
  set file_size_limit = 26214400, -- 25 MB
      allowed_mime_types = array[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/quicktime'
      ]
  where id = 'post-media';

-- ── Least-privilege table grants ────────────────────────────────────
-- RLS already blocks anon (is_org_member() is false without a session), but anon
-- has no reason to touch public tables at all, and TRUNCATE/REFERENCES/TRIGGER
-- are never needed by the app roles. Keep authenticated's RLS-gated CRUD.
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public
  revoke truncate, references, trigger on tables from authenticated;

-- ── Pin search_path on the remaining trigger function ───────────────
alter function public.set_updated_at() set search_path = public;
