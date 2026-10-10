-- ── Postbots: any job, set up by chat ──────────────────────────────
-- A bot no longer has a fixed type. "+" makes a blank "New Bot"; you tell it
-- what you want in chat, and it names itself and sets up the skills it needs
-- (listening, research, drafting). Its job lives in config.job.
-- Additive: safe to apply before the deploy (0063 is unreleased).
alter table bots drop constraint if exists bots_kind_check;
alter table bots alter column kind set default 'custom';
alter table bots alter column name set default 'New Bot';
