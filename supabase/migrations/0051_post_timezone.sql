-- ── Repeating posts keep their local time across DST ──────────────────
-- Repeats were stepped in UTC, so "every week at 09:00" in London moved to
-- 10:00 when the clocks went back. The composer now stores the author's IANA
-- timezone on the post; the publisher steps repeats on that local calendar.
-- Null (older posts, API-created posts) keeps stepping in UTC.

alter table posts
  add column if not exists timezone text
  check (timezone is null or timezone ~ '^[A-Za-z0-9+._/-]{1,64}$');
