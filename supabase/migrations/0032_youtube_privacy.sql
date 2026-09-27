-- Per-post YouTube visibility, chosen in the composer.
-- null = the server default (YOUTUBE_PRIVACY_STATUS, else public).
alter table public.posts
  add column if not exists youtube_privacy text
  check (youtube_privacy is null or youtube_privacy in ('public', 'unlisted', 'private'));
