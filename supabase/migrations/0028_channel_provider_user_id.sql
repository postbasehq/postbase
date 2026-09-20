-- Meta (Facebook) app-scoped user id, captured at connect so the deauthorize
-- and data-deletion callbacks can find and remove the right channels. Generic
-- enough to hold other providers' external user ids later.
alter table channels add column if not exists provider_user_id text;
create index if not exists channels_provider_user_id_idx on channels (provider_user_id);
