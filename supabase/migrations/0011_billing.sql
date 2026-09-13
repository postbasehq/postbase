-- Stripe billing fields on the org. `plan` already exists (default 'trial') and
-- holds the tier name (trial | creator | team | growth).
alter table orgs add column if not exists stripe_customer_id text;
alter table orgs add column if not exists stripe_subscription_id text;
alter table orgs add column if not exists subscription_status text; -- trialing | active | past_due | canceled | ...
alter table orgs add column if not exists current_period_end timestamptz;

create unique index if not exists orgs_stripe_customer_idx
  on orgs (stripe_customer_id)
  where stripe_customer_id is not null;
