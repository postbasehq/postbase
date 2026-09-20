-- Per-post TikTok Direct Post options required by TikTok's Content Sharing
-- Guidelines (interaction toggles + commercial-content disclosure). Privacy
-- level stays in tiktok_privacy_level (0010); this jsonb holds the rest:
--   { disableComment, disableDuet, disableStitch, brandOrganic, brandedContent }
alter table posts add column if not exists tiktok_options jsonb;
