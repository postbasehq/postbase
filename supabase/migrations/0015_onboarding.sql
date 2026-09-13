-- Track first-run onboarding completion per workspace.
-- Null means the owner hasn't finished (or skipped) the welcome wizard yet.
alter table orgs add column if not exists onboarded_at timestamptz;
