-- ── Channel profile data ────────────────────────────────────────────
-- Captured from each platform on connect (and via a backfill) so previews can
-- show the account's real display name and avatar instead of a monogram.

alter table channels
  add column display_name text,
  add column avatar_url text;
