-- Turn feedback into a public feature board: ideas get a title + status, and
-- users can upvote them. Board reads/writes go through the service-role client
-- (identity from the session), so RLS stays on with no policies.
alter table public.feedback add column if not exists title text;
alter table public.feedback add column if not exists status text not null default 'open';
alter table public.feedback add column if not exists is_public boolean not null default false;

create table if not exists public.feedback_votes (
  feedback_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (feedback_id, user_id)
);

alter table public.feedback_votes enable row level security;
revoke all on public.feedback_votes from anon, authenticated;
