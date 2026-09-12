-- Postbase — media storage.
-- A public bucket for post images/video. Paths are unguessable UUIDs; social media
-- becomes public anyway. Authenticated users upload; anyone can read (needed so the
-- publish job and the platforms can fetch the file by URL).

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

drop policy if exists "post-media authenticated upload" on storage.objects;
create policy "post-media authenticated upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media');

drop policy if exists "post-media public read" on storage.objects;
create policy "post-media public read"
  on storage.objects for select
  using (bucket_id = 'post-media');

drop policy if exists "post-media authenticated delete" on storage.objects;
create policy "post-media authenticated delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-media');
