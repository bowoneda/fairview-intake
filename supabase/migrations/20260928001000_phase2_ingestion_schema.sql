-- Phase 2 ingestion schema. PHASE-2-SPEC.md, DATA MODEL CHANGES.
-- Every new tenant scoped table gets tenant_id, composite foreign keys, RLS, and column grants here, in the
-- migration that creates it (RULES.md). Every new function revokes PUBLIC execute (migration 800's lesson).

-- Enums
create type public.provider_kind as enum ('plaid', 'argyle');
create type public.connection_status as enum
  ('link_started', 'exchanged', 'awaiting_data', 'ingested', 'reauth_required', 'error', 'revoked');
create type public.webhook_status as enum ('received', 'processing', 'processed', 'failed', 'ignored', 'rejected');
create type public.document_kind as enum ('paystub', 'w2', 'schedule_c', 'benefit_letter', 'other');
create type public.document_status as enum ('uploaded', 'processing', 'extracted', 'needs_review', 'failed');
create type public.income_source_status as enum
  ('detected', 'awaiting_family_statement', 'awaiting_review', 'confirmed_income', 'confirmed_excluded', 'dismissed');
create type public.family_statement as enum
  ('regular_contribution', 'gig_or_business_income', 'own_account_transfer', 'shared_expense_reimbursement',
   'life_event_gift', 'will_not_repeat');

-- Secret encryption for provider tokens: its own Vault key, distinct from pii_key, generated in the database.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'provider_token_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'provider_token_key',
                                'Encryption key for provider access tokens (Plaid)');
  end if;
end $$;

create function app.encrypt_secret(plaintext text) returns bytea
language sql volatile security definer set search_path = ''
as $$
  select extensions.pgp_sym_encrypt(
    plaintext, (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'provider_token_key'))
$$;

create function app.decrypt_secret(ciphertext bytea) returns text
language sql stable security definer set search_path = ''
as $$
  select extensions.pgp_sym_decrypt(
    ciphertext, (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'provider_token_key'))
$$;

revoke execute on function app.encrypt_secret(text), app.decrypt_secret(bytea) from public, anon, authenticated;
grant execute on function app.encrypt_secret(text), app.decrypt_secret(bytea) to service_role;

-- provider_connections: one per linked Plaid item or Argyle user.
create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  applicant_id uuid not null,
  household_member_id uuid not null,
  provider public.provider_kind not null,
  provider_ref text,
  access_token_encrypted bytea,
  status public.connection_status not null default 'link_started',
  last_event_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (applicant_id, tenant_id) references public.applicants (id, tenant_id),
  foreign key (household_member_id, applicant_id, tenant_id)
    references public.household_members (id, applicant_id, tenant_id),
  unique (provider, provider_ref),
  unique (id, tenant_id),
  unique (id, applicant_id, tenant_id)
);

-- Defined after the table exists.
-- The app schema is not exposed over the API, so Edge Functions reach these through public wrappers that
-- only the service role can execute.
create function public.store_provider_token(p_connection_id uuid, p_token text) returns void
language sql volatile security definer set search_path = ''
as $$ update public.provider_connections set access_token_encrypted = app.encrypt_secret(p_token),
      updated_at = now() where id = p_connection_id $$;
revoke execute on function public.store_provider_token(uuid, text) from public, anon, authenticated;
grant execute on function public.store_provider_token(uuid, text) to service_role;

create function public.read_provider_token(p_connection_id uuid) returns text
language sql stable security definer set search_path = ''
as $$ select app.decrypt_secret(c.access_token_encrypted) from public.provider_connections c where c.id = p_connection_id $$;
revoke execute on function public.read_provider_token(uuid) from public, anon, authenticated;
grant execute on function public.read_provider_token(uuid) to service_role;

alter table public.provider_connections enable row level security;
create policy provider_connections_select on public.provider_connections for select to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())));
-- No client write policy: the Edge Functions write after authenticating the caller themselves.

revoke all on public.provider_connections from anon, authenticated;
-- access_token_encrypted is excluded, so no client role can read it even in encrypted form.
grant select (id, tenant_id, applicant_id, household_member_id, provider, provider_ref, status, last_event_at,
              error_code, created_at, updated_at)
  on public.provider_connections to authenticated;

-- webhook_events: platform table, written before a tenant is known, so no PII and no payload.
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider public.provider_kind not null,
  event_id text not null,
  event_type text,
  provider_ref text,
  signature_valid boolean not null,
  status public.webhook_status not null default 'received',
  attempts smallint not null default 0,
  next_attempt_at timestamptz,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);
alter table public.webhook_events enable row level security;
-- No policies at all: no client role can read or write it.
revoke all on public.webhook_events from anon, authenticated;

-- applicant_documents: uploads for the Textract fallback.
create table public.applicant_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  applicant_id uuid not null,
  household_member_id uuid not null,
  document_kind public.document_kind not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  status public.document_status not null default 'uploaded',
  extracted_fields jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (applicant_id, tenant_id) references public.applicants (id, tenant_id),
  foreign key (household_member_id, applicant_id, tenant_id)
    references public.household_members (id, applicant_id, tenant_id),
  -- The object must live under this document's own tenant and applicant prefix.
  check (storage_path like tenant_id::text || '/' || applicant_id::text || '/%'),
  unique (id, tenant_id),
  unique (id, applicant_id, tenant_id)
);

alter table public.applicant_documents enable row level security;
create policy applicant_documents_select on public.applicant_documents for select to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())));
create policy applicant_documents_insert on public.applicant_documents for insert to authenticated
  with check (tenant_id = app.tenant_id() and app.user_role() = 'applicant'
              and applicant_id in (select app.my_applicant_ids()));

revoke all on public.applicant_documents from anon, authenticated;
grant select on public.applicant_documents to authenticated;
-- status, extracted_fields, and failure_reason are set only by the document-ingest function.
grant insert (tenant_id, applicant_id, household_member_id, document_kind, storage_path, mime_type, byte_size)
  on public.applicant_documents to authenticated;

-- Private bucket for applicant documents. Objects live under tenant_id/applicant_id/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('applicant-documents', 'applicant-documents', false, 10485760,
        array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

create policy applicant_documents_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'applicant-documents'
              and app.user_role() = 'applicant'
              and (storage.foldername(name))[1] = app.tenant_id()::text
              and (storage.foldername(name))[2] in (select a::text from app.my_applicant_ids() a));
create policy applicant_documents_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'applicant-documents'
         and (storage.foldername(name))[1] = app.tenant_id()::text
         and (app.is_staff() or (storage.foldername(name))[2] in (select a::text from app.my_applicant_ids() a)));
-- No update or delete policy for clients: a document, once uploaded, is not replaced in place.

-- income_sources: recurring transfer and provenance fields.
alter table public.income_sources
  add column status public.income_source_status not null default 'detected',
  add column provider_connection_id uuid,
  add column document_id uuid,
  add column counterparty_label text,
  add column frequency public.pay_frequency,
  add column average_amount numeric(12,2),
  add column occurrence_count integer,
  add column first_seen date,
  add column last_seen date,
  add column family_statement public.family_statement,
  add column family_statement_at timestamptz,
  add foreign key (provider_connection_id, applicant_id, tenant_id)
    references public.provider_connections (id, applicant_id, tenant_id),
  add foreign key (document_id, applicant_id, tenant_id)
    references public.applicant_documents (id, applicant_id, tenant_id);

-- The family states what a detected transfer is; the trigger stamps it and moves it to review.
-- Applicants can set family_statement only; status is never client writable.
grant update (family_statement) on public.income_sources to authenticated;

create function app.income_source_statement_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.family_statement is distinct from old.family_statement then
    if app.user_role() = 'applicant'
       and old.status not in ('awaiting_family_statement', 'awaiting_review') then
      raise exception 'a statement can only be given while the source awaits one' using errcode = '42501';
    end if;
    new.family_statement_at := now();
    if app.user_role() = 'applicant' then
      new.status := 'awaiting_review';
    end if;
  end if;
  return new;
end $$;
revoke execute on function app.income_source_statement_guard() from public;
create trigger income_sources_statement_guard before update on public.income_sources
  for each row execute function app.income_source_statement_guard();

-- Reviewer confirmation: staff only, written to the audit log with a reason, never by software alone.
create function public.confirm_income_source(p_source_id uuid, p_outcome public.income_source_status, p_reason text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_before jsonb;
begin
  if not app.is_staff() or app.tenant_id() is null then
    raise exception 'staff only' using errcode = '42501';
  end if;
  if p_outcome not in ('confirmed_income', 'confirmed_excluded', 'dismissed') then
    raise exception 'outcome must be confirmed_income, confirmed_excluded, or dismissed' using errcode = '22023';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  select to_jsonb(s) - 'counterparty_label' into v_before
  from public.income_sources s where s.id = p_source_id and s.tenant_id = app.tenant_id();
  if v_before is null then
    raise exception 'source not found' using errcode = 'P0002';
  end if;
  update public.income_sources set status = p_outcome where id = p_source_id and tenant_id = app.tenant_id();
  perform public.write_audit('confirm_income_source', 'income_sources', p_source_id,
                             jsonb_build_object('status', v_before ->> 'status', 'family_statement', v_before ->> 'family_statement'),
                             jsonb_build_object('status', p_outcome), p_reason);
end $$;
revoke execute on function public.confirm_income_source(uuid, public.income_source_status, text) from public, anon;
grant execute on function public.confirm_income_source(uuid, public.income_source_status, text) to authenticated;

-- income_records: the normalized shape (PHASE-2-SPEC.md, THE NORMALIZED INCOME RECORD).
alter table public.income_records rename column ytd_amount to ytd_gross;
alter table public.income_records
  add column provider_connection_id uuid,
  add column document_id uuid,
  add column employer_name text,
  add column gross_pay numeric(12,2),
  add column pay_period_start date,
  add column pay_period_end date,
  add column pay_date date,
  add column ytd_through_date date,
  add column source_confidence numeric(5,2) check (source_confidence between 0 and 100),
  add column needs_review boolean not null default false,
  add column review_reasons text[] not null default '{}',
  add foreign key (provider_connection_id, applicant_id, tenant_id)
    references public.provider_connections (id, applicant_id, tenant_id),
  add foreign key (document_id, applicant_id, tenant_id)
    references public.applicant_documents (id, applicant_id, tenant_id);
alter table public.income_records
  add constraint income_records_deductions_is_array check (deductions is null or jsonb_typeof(deductions) = 'array');
