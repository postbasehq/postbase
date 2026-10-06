-- ── Two-factor sign-in: workspace data needs a verified session ──────
-- Users can turn on TOTP 2FA (Supabase Auth MFA). The app holds a session that
-- hasn't entered its code yet (aal1) at /login/verify, but that session's JWT
-- still works against PostgREST directly. Every org-scoped policy goes through
-- is_org_member / is_org_manager, so both now also require aal2 when the user
-- has a verified factor. Users without 2FA are unaffected; the service role
-- (API keys, MCP, cron) bypasses RLS as before.

create or replace function mfa_satisfied()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;
revoke all on function mfa_satisfied() from public, anon;
grant execute on function mfa_satisfied() to authenticated, service_role;

create or replace function is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  ) and mfa_satisfied();
$$;

create or replace function is_org_manager(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members m
    where m.org_id = target_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  ) and mfa_satisfied();
$$;
