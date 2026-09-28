-- Platform reference tables: no tenant_id, RLS enabled, read only to every client role.
-- Written only by migrations and the seed script. See MASTER-SPEC-1.md, CORE DATA MODEL.

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
    check (slug not in ('api', 'auth', 'admin', 'static', '_next', 'favicon.ico', 'robots.txt', 'sitemap.xml')),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  regulator text not null,
  program_type public.program_type not null,
  required_documents public.document_type[] not null,
  created_at timestamptz not null default now()
);

create table public.program_rule_sets (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id),
  effective_from date not null,
  effective_to date,
  asset_imputation_threshold numeric(12,2) not null check (asset_imputation_threshold >= 0),
  passbook_rate numeric(6,5) not null check (passbook_rate >= 0 and passbook_rate < 1),
  variance_threshold numeric(5,4) not null check (variance_threshold >= 0 and variance_threshold < 1),
  tier_percentages smallint[] not null check (cardinality(tier_percentages) > 0),
  basis_note text not null,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from),
  unique (id, program_id),
  exclude using gist (
    program_id with =,
    daterange(effective_from, coalesce(effective_to, 'infinity'::date), '[)') with &&
  )
);

create table public.ami_schedules (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null,
  effective_year smallint not null,
  household_size smallint not null check (household_size between 1 and 8),
  area_median_income numeric(12,2) not null check (area_median_income > 0),
  created_at timestamptz not null default now(),
  unique (jurisdiction, effective_year, household_size)
);

alter table public.tenants enable row level security;
alter table public.programs enable row level security;
alter table public.program_rule_sets enable row level security;
alter table public.ami_schedules enable row level security;

-- tenants and programs are public identity; rule sets and AMI schedules need a session.
create policy tenants_select on public.tenants for select to anon, authenticated using (true);
create policy programs_select on public.programs for select to anon, authenticated using (true);
create policy program_rule_sets_select on public.program_rule_sets for select to authenticated using (true);
create policy ami_schedules_select on public.ami_schedules for select to authenticated using (true);

-- Defense in depth: no client write privilege at all, so a missing or wrong policy still fails closed.
revoke all on public.tenants, public.programs, public.program_rule_sets, public.ami_schedules
  from anon, authenticated;
grant select on public.tenants, public.programs to anon, authenticated;
grant select on public.program_rule_sets, public.ami_schedules to authenticated;
