-- Whether the connected account is verified on the platform (X today; others
-- as their APIs expose it). Drives the verified badge in previews.
alter table channels add column verified boolean not null default false;
