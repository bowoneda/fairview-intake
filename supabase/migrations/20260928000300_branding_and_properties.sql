-- Tenant scoped public tables: theme, properties (building parameters), property programs.
-- Readable without authentication by design; written only by the owning tenant's admin.

create table public.theme_configs (
  tenant_id uuid primary key references public.tenants (id),
  logo_path text,
  -- Injected into CSS. The hex check is a security control: nothing but a color can reach the stylesheet.
  color_primary text not null check (color_primary ~ '^#[0-9a-fA-F]{6}$'),
  color_primary_contrast text not null check (color_primary_contrast ~ '^#[0-9a-fA-F]{6}$'),
  color_accent text not null check (color_accent ~ '^#[0-9a-fA-F]{6}$'),
  form_footer_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name text not null,
  address_line1 text not null,
  address_city text not null,
  address_state text not null,
  address_postal_code text not null,
  total_units integer not null check (total_units > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug),
  unique (id, tenant_id)
);

create table public.property_programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  property_id uuid not null,
  program_id uuid not null references public.programs (id),
  set_aside_units jsonb not null default '{}'::jsonb check (jsonb_typeof(set_aside_units) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (property_id, tenant_id) references public.properties (id, tenant_id),
  unique (property_id, program_id)
);

alter table public.theme_configs enable row level security;
alter table public.properties enable row level security;
alter table public.property_programs enable row level security;

create policy theme_configs_select on public.theme_configs for select to anon, authenticated using (true);
create policy theme_configs_insert on public.theme_configs for insert to authenticated
  with check (tenant_id = app.tenant_id() and app.user_role() = 'admin');
create policy theme_configs_update on public.theme_configs for update to authenticated
  using (tenant_id = app.tenant_id() and app.user_role() = 'admin')
  with check (tenant_id = app.tenant_id());

create policy properties_select on public.properties for select to anon, authenticated using (true);
create policy properties_insert on public.properties for insert to authenticated
  with check (tenant_id = app.tenant_id() and app.user_role() = 'admin');
create policy properties_update on public.properties for update to authenticated
  using (tenant_id = app.tenant_id() and app.user_role() = 'admin')
  with check (tenant_id = app.tenant_id());

create policy property_programs_select on public.property_programs for select to anon, authenticated using (true);
create policy property_programs_insert on public.property_programs for insert to authenticated
  with check (tenant_id = app.tenant_id() and app.user_role() = 'admin');
create policy property_programs_update on public.property_programs for update to authenticated
  using (tenant_id = app.tenant_id() and app.user_role() = 'admin')
  with check (tenant_id = app.tenant_id());

revoke all on public.theme_configs, public.properties, public.property_programs from anon, authenticated;
grant select on public.theme_configs, public.properties, public.property_programs to anon, authenticated;
grant insert, update on public.theme_configs, public.properties, public.property_programs to authenticated;

-- Public bucket for tenant logos. No client write policies in Phase 1.
insert into storage.buckets (id, name, public)
values ('tenant-branding', 'tenant-branding', true)
on conflict (id) do nothing;
