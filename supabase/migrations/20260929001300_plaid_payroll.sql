-- Payroll through Plaid Payroll Income (stack decision 2026-09-29, recorded in MEMORY.md: the listing's named
-- payroll vendors gate sandbox access behind sales approval). A Plaid connection is now for one product; payroll
-- data is read by the Plaid user id, which is an identifier, not a secret.

alter table public.provider_connections
  add column product text not null default 'transactions' check (product in ('transactions', 'payroll_income')),
  add column provider_user_ref text;

create unique index provider_connections_provider_user_ref_key
  on public.provider_connections (provider, provider_user_ref) where provider_user_ref is not null;

-- Clients may see which product a connection is for (it is shown in the Income step); provider_user_ref stays
-- server side, like the token.
grant select (product) on public.provider_connections to authenticated;

-- Pay stubs are keyed by Plaid's document id so a re-read updates instead of duplicating.
alter table public.income_records
  add column provider_record_ref text,
  add constraint income_records_provider_record_unique unique (provider_connection_id, provider_record_ref);
