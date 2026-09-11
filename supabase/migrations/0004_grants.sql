-- Postbase — grant the app roles access to public tables.
-- RLS still governs which ROWS each user sees; these GRANTs are the table-level
-- privilege that must exist alongside RLS. Supabase usually applies them
-- automatically, but making them explicit keeps the schema self-contained
-- (important for self-hosting) and repairs projects where they're missing.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- Apply to tables/sequences/functions created in the future too.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
