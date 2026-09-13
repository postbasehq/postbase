-- Per-post TikTok privacy level (Public / Friends / Only me). Null falls back to
-- the server default; the publisher clamps it to what creator_info allows.
alter table posts add column if not exists tiktok_privacy_level text;
