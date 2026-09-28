-- Applications, household members, and field level PII encryption.
-- Encrypted columns are never writable by a client role: they are left out of every column grant,
-- so the only way a value reaches them is app.encrypt_pii, and no plaintext storage path exists.

create table public.applicants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  user_id uuid not null,
  property_id uuid not null,
  contact_email text,
  contact_phone text,
  address_line1 text,
  address_line2 text,
  address_city text,
  address_state text,
  address_postal_code text,
  application_status public.application_status not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, tenant_id) references public.users (id, tenant_id),
  foreign key (property_id, tenant_id) references public.properties (id, tenant_id),
  unique (id, tenant_id),
  unique (tenant_id, user_id)
);

-- The caller's own applications. Security definer so applicants' own policy can use it without recursion.
create function app.my_applicant_ids() returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select a.id from public.applicants a
  where a.user_id = auth.uid() and a.tenant_id = app.tenant_id()
$$;
grant execute on function app.my_applicant_ids() to authenticated, service_role;

alter table public.applicants enable row level security;

create policy applicants_select on public.applicants for select to authenticated
  using (tenant_id = app.tenant_id() and (app.is_staff() or user_id = auth.uid()));
create policy applicants_insert on public.applicants for insert to authenticated
  with check (tenant_id = app.tenant_id() and app.user_role() = 'applicant' and user_id = auth.uid());
create policy applicants_update on public.applicants for update to authenticated
  using (tenant_id = app.tenant_id() and (app.is_staff() or user_id = auth.uid()))
  with check (tenant_id = app.tenant_id() and (app.is_staff() or user_id = auth.uid()));

revoke all on public.applicants from anon, authenticated;
grant select on public.applicants to authenticated;
grant insert (tenant_id, user_id, property_id, contact_email, contact_phone, address_line1, address_line2,
              address_city, address_state, address_postal_code)
  on public.applicants to authenticated;
grant update (contact_email, contact_phone, address_line1, address_line2, address_city, address_state,
              address_postal_code, application_status, updated_at)
  on public.applicants to authenticated;

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  applicant_id uuid not null,
  full_name text not null,
  relationship public.member_relationship not null,
  date_of_birth date,
  ssn_encrypted bytea,
  ssn_last_four char(4) check (ssn_last_four ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now(),
  foreign key (applicant_id, tenant_id) references public.applicants (id, tenant_id),
  unique (id, tenant_id),
  unique (id, applicant_id, tenant_id)
);

alter table public.household_members enable row level security;

create policy household_members_select on public.household_members for select to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())));
create policy household_members_insert on public.household_members for insert to authenticated
  with check (tenant_id = app.tenant_id() and app.user_role() = 'applicant'
              and applicant_id in (select app.my_applicant_ids()));
create policy household_members_update on public.household_members for update to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())))
  with check (tenant_id = app.tenant_id());

revoke all on public.household_members from anon, authenticated;
grant select on public.household_members to authenticated;
grant insert (tenant_id, applicant_id, full_name, relationship, date_of_birth)
  on public.household_members to authenticated;
grant update (full_name, relationship, date_of_birth) on public.household_members to authenticated;

-- PII key: generated inside the database at migration time and held in Vault. It never appears in
-- this file, in application code, or in any environment variable.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'pii_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'pii_key',
                                'Field level PII encryption key (SSNs, account numbers)');
  end if;
end $$;

create function app.encrypt_pii(plaintext text) returns bytea
language sql volatile security definer set search_path = ''
as $$
  select extensions.pgp_sym_encrypt(
    plaintext,
    (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'pii_key')
  )
$$;

-- Phase 1: server side only. The audit logged reveal path (decrypt) is Phase 4 and does not exist yet.
grant execute on function app.encrypt_pii(text) to service_role;
