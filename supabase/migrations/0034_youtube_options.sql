-- Per-post YouTube details chosen in the composer: a title (else the post's
-- first line), a custom thumbnail URL, and the audience ("made for kids").
-- Shape: { "title"?: string, "thumbnailUrl"?: string, "madeForKids"?: boolean }
alter table public.posts
  add column if not exists youtube_options jsonb;
