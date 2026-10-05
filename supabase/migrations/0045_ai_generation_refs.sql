-- ── AI video jobs ───────────────────────────────────────────────────
-- Higgsfield only charges for successful generations (failed / NSFW-rejected
-- ones are free), so a video that fails gives the user's allowance back.
--   ref         the job's status URL, tying polls to the workspace that started it
--   result_url  where the finished video was saved, so repeat polls don't
--               download and store it again
alter table ai_generations
  add column if not exists ref text,
  add column if not exists result_url text;
create index if not exists ai_generations_org_ref_idx on ai_generations (org_id, ref) where ref is not null;
