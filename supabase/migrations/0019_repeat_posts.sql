-- ── Repeating posts ─────────────────────────────────────────────────
-- A scheduled post can repeat on a fixed cadence. When the poller
-- publishes a repeating post it spawns the next occurrence (same body,
-- channels and media) one step ahead — so a repeat runs indefinitely,
-- one materialised post at a time, until the user deletes the pending
-- occurrence or clears the cadence.

alter table posts
  add column repeat_every text
    check (
      repeat_every is null
      or repeat_every in (
        'day', '2_days', '3_days', '4_days', '5_days', '6_days',
        'week', '2_weeks', 'month'
      )
    ),
  -- Guards the spawn: flipped true (atomically) the moment we create the
  -- next occurrence, so a repeating post is never cloned twice.
  add column repeat_next_spawned boolean not null default false;
