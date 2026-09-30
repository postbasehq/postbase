-- ── Workspaces included in a plan ───────────────────────────────────
-- A plan now covers several workspaces (Creator 1, Team 3, Pro 5, Agency 20)
-- that share its channel, seat and AI allowances. The subscription stays on
-- the workspace that bought it (the "billing workspace"); workspaces created
-- from it point back to it here and take their plan and access from it.
-- Null = a workspace that pays for itself (every workspace until now).
--
-- If the billing workspace is ever deleted, its linked workspaces become
-- standalone with no plan, rather than disappearing.

alter table orgs
  add column if not exists billing_org_id uuid references orgs (id) on delete set null;

create index if not exists orgs_billing_org_idx on orgs (billing_org_id);

-- A linked workspace can't itself be a billing workspace for others (one level).
alter table orgs
  add constraint orgs_billing_not_self check (billing_org_id is null or billing_org_id <> id);
