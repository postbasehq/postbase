-- 1. Comped workspaces: full access without a Stripe subscription (the team's
--    own workspaces, partners). Access is otherwise derived from
--    subscription_status once billing is configured — see lib/billing-guard.ts.
alter table orgs add column if not exists comped boolean not null default false;

-- 2. Per-target publish claims. The cron claims each target atomically
--    (status -> publishing, claimed_at = now()) right before sending it. A target
--    still `publishing` long after its claim was interrupted mid-send; it may or
--    may not have gone out, so it is failed for the user to check + retry rather
--    than republished automatically (which double-posted).
alter table post_targets add column if not exists claimed_at timestamptz;

-- Targets left `publishing` by the previous runner have no claim time; stamp
-- them so the interrupted sweep handles them like any other stranded claim.
update post_targets set claimed_at = now() where status = 'publishing' and claimed_at is null;

create index if not exists post_targets_claimed_idx
  on post_targets (claimed_at)
  where status = 'publishing';
create index if not exists post_targets_pending_idx
  on post_targets (post_id)
  where status = 'scheduled';
