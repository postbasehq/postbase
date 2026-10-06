-- ── Threads waitlist ────────────────────────────────────────────────
-- Threads gets a "coming soon" card in Channels with the same "Notify me"
-- list as the networks in review. Additive: safe to apply before the deploy.
alter table platform_waitlist drop constraint if exists platform_waitlist_platform_check;
alter table platform_waitlist add constraint platform_waitlist_platform_check
  check (platform in ('instagram', 'facebook', 'threads', 'tiktok'));
