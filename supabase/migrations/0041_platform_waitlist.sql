-- ── Platform waitlist ───────────────────────────────────────────────
-- People who asked to hear when a platform still in app review (Instagram,
-- Facebook, TikTok public posting) opens up. One row per user per platform;
-- the email is copied in so the launch email doesn't need to join auth.users.

create table if not exists platform_waitlist (
  user_id     uuid not null references auth.users (id) on delete cascade,
  platform    text not null check (platform in ('instagram', 'facebook', 'tiktok')),
  email       text,
  created_at  timestamptz not null default now(),
  notified_at timestamptz,
  primary key (user_id, platform)
);

alter table platform_waitlist enable row level security;
create policy "platform_waitlist own read" on platform_waitlist for select using (user_id = auth.uid());
create policy "platform_waitlist own insert" on platform_waitlist for insert with check (user_id = auth.uid());
create policy "platform_waitlist own delete" on platform_waitlist for delete using (user_id = auth.uid());
grant select, insert, delete on platform_waitlist to authenticated;
