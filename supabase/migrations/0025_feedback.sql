-- In-app feedback submissions. Written by a server action via the service-role
-- client (identity taken from the session), so RLS is enabled with no policies
-- and grants are revoked — only the admin client touches this table.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  user_id uuid,
  email text,
  category text not null default 'other',
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
