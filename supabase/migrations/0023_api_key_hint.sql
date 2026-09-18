-- Store a non-sensitive masked preview of each API key (e.g. "pb_live_…a1b2")
-- so the developer surface can show which key is which without ever revealing
-- the secret (only the hash is stored; the full key is shown once at creation).
alter table public.api_keys add column if not exists key_hint text;
