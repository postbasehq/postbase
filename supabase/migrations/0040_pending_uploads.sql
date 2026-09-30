-- A platform upload still processing when the cron run ended (e.g. an Instagram
-- Reel container). The next run checks it instead of uploading again, so slow
-- videos finish without re-uploading or double-posting.
--   pending_ref    the platform's in-progress id (Instagram container id)
--   pending_since  when it started, to give up on uploads that never finish
alter table post_targets
  add column if not exists pending_ref text,
  add column if not exists pending_since timestamptz;
