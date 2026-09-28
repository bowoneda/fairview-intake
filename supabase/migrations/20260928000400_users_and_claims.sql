-- Users, the applicant sign up trigger, and the Custom Access Token Hook that sets tenant_id and app_role.
-- See PHASE-1-SPEC.md, TENANT AND ROLE CLAIMS.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id),
  role public.app_role not null default 'applicant',
  created_at timestamptz not null default now(),
  unique (id, tenant_id)
);

-- tenant_id is fixed for life, for every role including the service role.
create function app.users_tenant_immutable() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'users.tenant_id cannot change' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger users_tenant_immutable before update on public.users
  for each row execute function app.users_tenant_immutable();

alter table public.users enable row level security;

create policy users_select on public.users for select to authenticated
  using (tenant_id = app.tenant_id() and (id = auth.uid() or app.is_staff()));
create policy users_update on public.users for update to authenticated
  using (tenant_id = app.tenant_id() and app.user_role() = 'admin')
  with check (tenant_id = app.tenant_id());

-- The token hook runs as supabase_auth_admin and must read users.
create policy users_select_auth_admin on public.users for select to supabase_auth_admin using (true);

revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;
grant update (role) on public.users to authenticated;
grant select on public.users to supabase_auth_admin;

-- Applicant sign up. The tenant comes from the slug of the page the person signed up on; the role is
-- always applicant. Staff rows are never created here. An unknown or missing slug creates no row, and
-- a user with no row gets no claims, so RLS shows them nothing.
create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  select t.id into v_tenant_id
  from public.tenants t
  where t.slug = new.raw_user_meta_data ->> 'tenant_slug';

  if v_tenant_id is not null then
    insert into public.users (id, tenant_id, role) values (new.id, v_tenant_id, 'applicant');
  end if;
  return new;
end $$;

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Custom Access Token Hook. Claims come only from public.users, never from user_metadata.
create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_claims jsonb := event -> 'claims';
  v_tenant_id uuid;
  v_role public.app_role;
begin
  select u.tenant_id, u.role into v_tenant_id, v_role
  from public.users u
  where u.id = (event ->> 'user_id')::uuid;

  -- Strip any claim of the same name first, whatever its source.
  v_claims := v_claims - 'tenant_id' - 'app_role';
  if v_tenant_id is not null then
    v_claims := v_claims
      || jsonb_build_object('tenant_id', v_tenant_id::text, 'app_role', v_role::text);
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
