-- Fix: every function in schema app was executable by PUBLIC, including app.encrypt_pii.
-- Postgres grants EXECUTE to PUBLIC on every new function by default. The schema scoped
-- "alter default privileges in schema app revoke ... from public" in the foundation migration could not
-- remove it, because schema scoped default privileges can only add to the global defaults, never subtract.
-- Found by querying pg_proc.proacl on fairview-dev after the first push, 2026-09-28.

-- Remove the global default for functions created by postgres. Supabase's public schema defaults still
-- grant EXECUTE on new public functions to anon, authenticated, and service_role explicitly, so API
-- functions keep working; every other schema now starts closed.
alter default privileges for role postgres revoke execute on functions from public;

revoke execute on all functions in schema app from public, anon, authenticated, service_role;

-- Re-grant exactly what policies and server code need.
grant execute on function app.tenant_id(), app.user_role(), app.is_staff() to anon, authenticated, service_role;
grant execute on function app.my_applicant_ids() to authenticated, service_role;
grant execute on function app.encrypt_pii(text) to service_role;
-- app.users_tenant_immutable() is a trigger function; triggers fire regardless of EXECUTE, so no grant.

-- The public functions were already locked down; revoke PUBLIC explicitly in case of the same default.
revoke execute on function public.custom_access_token_hook(jsonb) from public;
revoke execute on function public.handle_new_auth_user() from public;
revoke execute on function public.write_audit(text, text, uuid, jsonb, jsonb, text) from public;
