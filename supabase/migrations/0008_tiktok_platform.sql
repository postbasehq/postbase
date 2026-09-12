-- Add TikTok to the platform enum so channels/posts can target it.
-- (ALTER TYPE ... ADD VALUE must run outside a transaction; psql runs it standalone.)
alter type platform add value if not exists 'tiktok';
