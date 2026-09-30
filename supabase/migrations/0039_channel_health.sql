-- Channel health: surface broken connections instead of letting posts fail quietly.
--   status        'active' | 'reconnect' (the platform stopped accepting our access)
--   status_error  the platform's error that flagged it, for the reconnect prompt
--   status_at     when it was flagged
--   reconnect_by  when the connection lapses and can't renew itself (e.g. LinkedIn's
--                 60-day tokens without a refresh token), for an early warning
alter table channels
  add column if not exists status_error text,
  add column if not exists status_at timestamptz,
  add column if not exists reconnect_by timestamptz;

-- New tokens (a reconnect or a successful refresh) mean the connection works again.
create or replace function channels_reset_health() returns trigger
language plpgsql as $$
begin
  if new.encrypted_tokens is distinct from old.encrypted_tokens then
    if new.status = 'reconnect' then
      new.status := 'active';
    end if;
    new.status_error := null;
    new.status_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists channels_reset_health on channels;
create trigger channels_reset_health
  before update on channels
  for each row execute function channels_reset_health();
