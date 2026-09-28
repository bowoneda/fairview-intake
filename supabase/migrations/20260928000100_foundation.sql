-- Foundation: extensions, the private app schema, enums, and the JWT claim helpers.
-- See PHASE-1-SPEC.md, SCHEMA and TENANT AND ROLE CLAIMS.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- Private helper schema. Not in the API's exposed schemas, so nothing here is callable over REST.
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to anon, authenticated, service_role;
alter default privileges in schema app revoke execute on functions from public;

-- Enums
create type public.app_role as enum ('applicant', 'reviewer', 'admin');
create type public.application_status as enum ('in_progress', 'submitted', 'under_review', 'determined', 'closed');
create type public.member_relationship as enum ('head', 'spouse', 'co_head', 'dependent', 'other_adult');
create type public.program_type as enum ('affordable_housing', 'property_tax_relief', 'inclusionary_zoning');
create type public.income_source_type as enum ('employment', 'self_employment', 'benefit', 'recurring_transfer', 'other');
create type public.connection_method as enum ('argyle', 'plaid', 'manual_upload');
create type public.ingestion_method as enum ('argyle', 'plaid', 'textract', 'manual_entry');
create type public.pay_frequency as enum ('hourly', 'weekly', 'biweekly', 'semi_monthly', 'monthly', 'annual');
create type public.asset_type as enum ('checking', 'savings', 'investment', 'retirement', 'real_estate', 'other');
create type public.determination_status as enum ('draft', 'pending_review', 'approved');
create type public.document_type as enum ('FTIC', 'ACAEF');
create type public.signature_status as enum ('not_sent', 'sent', 'signed', 'declined');
create type public.workflow_stage as enum ('intake', 'ingestion', 'calculation', 'review', 'documents', 'signature', 'complete');

-- JWT claim helpers. Claims are set only by public.custom_access_token_hook from public.users,
-- never from user_metadata, which users can edit themselves.
create function app.tenant_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select nullif(auth.jwt() ->> 'tenant_id', '')::uuid $$;

create function app.user_role() returns public.app_role
language sql stable security definer set search_path = ''
as $$ select nullif(auth.jwt() ->> 'app_role', '')::public.app_role $$;

create function app.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(app.user_role() in ('reviewer', 'admin'), false) $$;

grant execute on function app.tenant_id(), app.user_role(), app.is_staff() to anon, authenticated, service_role;
