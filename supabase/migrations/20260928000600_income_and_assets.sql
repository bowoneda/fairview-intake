-- Income sources, income records, and asset records.
-- income_records and asset writes beyond what is granted here come server side from Phase 2 onward.

create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  applicant_id uuid not null,
  household_member_id uuid not null,
  source_type public.income_source_type not null,
  connection_method public.connection_method not null,
  provider_reference text,
  created_at timestamptz not null default now(),
  foreign key (applicant_id, tenant_id) references public.applicants (id, tenant_id),
  -- The earner must be a member of the same household, in the same tenant.
  foreign key (household_member_id, applicant_id, tenant_id)
    references public.household_members (id, applicant_id, tenant_id),
  unique (id, tenant_id),
  unique (id, applicant_id, tenant_id)
);

alter table public.income_sources enable row level security;

create policy income_sources_select on public.income_sources for select to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())));
create policy income_sources_insert on public.income_sources for insert to authenticated
  with check (tenant_id = app.tenant_id() and app.user_role() = 'applicant'
              and applicant_id in (select app.my_applicant_ids()));
create policy income_sources_update on public.income_sources for update to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())))
  with check (tenant_id = app.tenant_id());

revoke all on public.income_sources from anon, authenticated;
grant select on public.income_sources to authenticated;
grant insert (tenant_id, applicant_id, household_member_id, source_type, connection_method)
  on public.income_sources to authenticated;
grant update (source_type, connection_method) on public.income_sources to authenticated;

-- applicant_id is carried directly (like tenant_id) so the applicant ownership check needs no join,
-- and the composite key keeps it consistent with the income source's own applicant.
create table public.income_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  applicant_id uuid not null,
  income_source_id uuid not null,
  ingestion_method public.ingestion_method not null,
  raw_payload jsonb not null,
  pay_rate numeric(12,2),
  pay_frequency public.pay_frequency,
  deductions jsonb,
  expected_annual_hours numeric(7,2),
  ytd_amount numeric(12,2),
  earnings_year_start date,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (income_source_id, applicant_id, tenant_id)
    references public.income_sources (id, applicant_id, tenant_id)
);

alter table public.income_records enable row level security;

create policy income_records_select on public.income_records for select to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())));

revoke all on public.income_records from anon, authenticated;
grant select on public.income_records to authenticated;

create table public.asset_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  applicant_id uuid not null,
  household_member_id uuid,
  asset_type public.asset_type not null,
  institution_name text,
  account_number_encrypted bytea,
  account_last_four char(4) check (account_last_four ~ '^[0-9]{4}$'),
  current_balance numeric(12,2) not null,
  actual_income numeric(12,2),
  income_determinable boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (applicant_id, tenant_id) references public.applicants (id, tenant_id),
  -- Null for jointly held assets; otherwise a member of the same household.
  foreign key (household_member_id, applicant_id, tenant_id)
    references public.household_members (id, applicant_id, tenant_id)
);

alter table public.asset_records enable row level security;

create policy asset_records_select on public.asset_records for select to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())));
create policy asset_records_insert on public.asset_records for insert to authenticated
  with check (tenant_id = app.tenant_id() and app.user_role() = 'applicant'
              and applicant_id in (select app.my_applicant_ids()));
create policy asset_records_update on public.asset_records for update to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())))
  with check (tenant_id = app.tenant_id());

revoke all on public.asset_records from anon, authenticated;
grant select on public.asset_records to authenticated;
-- account_number_encrypted is deliberately absent from both grants.
grant insert (tenant_id, applicant_id, household_member_id, asset_type, institution_name, current_balance)
  on public.asset_records to authenticated;
grant update (asset_type, institution_name, current_balance) on public.asset_records to authenticated;
