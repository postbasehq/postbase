-- Postbase — threads.
-- A post's first tweet stays in posts.body; any additional tweets (a thread) go in
-- thread_tail, in order. Empty array = a normal single post (backward compatible).

alter table posts
  add column thread_tail text[] not null default '{}';
