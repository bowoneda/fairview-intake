-- Provider references so Plaid ingestion is idempotent: re-running a sync updates the same rows instead of
-- adding duplicates. PHASE-2-SPEC.md, DATA MODEL CHANGES (asset_records filled from Plaid; recurring streams).

-- asset_records: which connection and which provider account a row came from.
alter table public.asset_records
  add column provider_connection_id uuid,
  add column provider_account_ref text,
  add column balance_as_of timestamptz,
  add foreign key (provider_connection_id, applicant_id, tenant_id)
    references public.provider_connections (id, applicant_id, tenant_id),
  add constraint asset_records_provider_account_unique unique (provider_connection_id, provider_account_ref);

-- income_sources: a stable key per detected recurring stream (payment app, counterparty text, frequency).
alter table public.income_sources
  add column provider_stream_ref text,
  add constraint income_sources_provider_stream_unique unique (provider_connection_id, provider_stream_ref);

-- Clients never write these columns: they are left out of every client column grant (see migrations 500
-- and 600, whose grants list explicit columns), so nothing more is needed here.
