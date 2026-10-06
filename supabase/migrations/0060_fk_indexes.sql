-- ── Indexes for the foreign keys that are looked up and cascaded on ────
-- media.post_id: every post load reads its media, and deleting a post
-- cascades to it (a full scan of media per post without this).
-- post_targets.channel_id: disconnecting a channel cascades to its targets,
-- and analytics/health read targets by channel.
create index if not exists media_post_idx on media (post_id);
create index if not exists post_targets_channel_idx on post_targets (channel_id);
