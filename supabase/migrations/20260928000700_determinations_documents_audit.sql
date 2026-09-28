-- Determinations, generated documents, the workflow trail, and the audit log.
-- Engine behavior, immutability, and document generation are Phase 3; these tables exist now so their
-- isolation exists from day one. No client role writes determinations or documents.

create table public.calculated_determinations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  applicant_id uuid not null,
  program_id uuid not null references public.programs (id),
  rule_set_id uuid not null,
  calculation_version text not null,
  annualized_income numeric(12,2),
  imputed_asset_income numeric(12,2),
  total_annual_income numeric(12,2),
  ami_tier text,
  review_required boolean not null,
  -- RULES.md: a determination without a trace is not a valid determination.
  calculation_trace jsonb not null
    check (jsonb_typeof(calculation_trace) = 'object' and calculation_trace <> '{}'::jsonb),
  status public.determination_status not null default 'draft',
  calculated_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (applicant_id, tenant_id) references public.applicants (id, tenant_id),
  -- The rule set must belong to the determination's program.
  foreign key (rule_set_id, program_id) references public.program_rule_sets (id, program_id),
  unique (id, tenant_id),
  unique (id, applicant_id, tenant_id)
);

alter table public.calculated_determinations enable row level security;

create policy calculated_determinations_select on public.calculated_determinations for select to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())));

revoke all on public.calculated_determinations from anon, authenticated;
grant select on public.calculated_determinations to authenticated;

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  applicant_id uuid not null,
  determination_id uuid not null,
  document_type public.document_type not null,
  storage_path text not null,
  applicant_signature_status public.signature_status not null default 'not_sent',
  landlord_signature_status public.signature_status not null default 'not_sent',
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- The document's determination must be this applicant's, in this tenant.
  foreign key (determination_id, applicant_id, tenant_id)
    references public.calculated_determinations (id, applicant_id, tenant_id)
);

alter table public.generated_documents enable row level security;

create policy generated_documents_select on public.generated_documents for select to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())));

revoke all on public.generated_documents from anon, authenticated;
grant select on public.generated_documents to authenticated;

-- Append only. The newest row per applicant is the application's current stage.
create table public.workflow_state (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  applicant_id uuid not null,
  stage public.workflow_stage not null,
  assigned_reviewer_id uuid,
  action text not null,
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (applicant_id, tenant_id) references public.applicants (id, tenant_id),
  foreign key (assigned_reviewer_id, tenant_id) references public.users (id, tenant_id),
  foreign key (actor_id, tenant_id) references public.users (id, tenant_id)
);

alter table public.workflow_state enable row level security;

create policy workflow_state_select on public.workflow_state for select to authenticated
  using (tenant_id = app.tenant_id()
         and (app.is_staff() or applicant_id in (select app.my_applicant_ids())));
create policy workflow_state_insert on public.workflow_state for insert to authenticated
  with check (tenant_id = app.tenant_id() and app.is_staff() and actor_id = auth.uid());

-- No update or delete privilege for any API role, service role included. Only the database owner,
-- through a direct connection, can remove rows (test teardown).
revoke all on public.workflow_state from anon, authenticated, service_role;
grant select, insert on public.workflow_state to authenticated;
grant select, insert on public.workflow_state to service_role;

-- Append only. Clients write only through public.write_audit, which takes tenant and actor from the JWT.
create table public.audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id),
  actor_id uuid,
  action text not null,
  target_table text,
  target_id uuid,
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz not null default now(),
  foreign key (actor_id, tenant_id) references public.users (id, tenant_id)
);

alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log for select to authenticated
  using (tenant_id = app.tenant_id() and app.is_staff());

revoke all on public.audit_log from anon, authenticated, service_role;
grant select on public.audit_log to authenticated;
grant select, insert on public.audit_log to service_role;

create function public.write_audit(
  p_action text,
  p_target_table text,
  p_target_id uuid,
  p_before jsonb,
  p_after jsonb,
  p_reason text
) returns bigint
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_tenant_id uuid := app.tenant_id();
  v_id bigint;
begin
  if v_tenant_id is null or auth.uid() is null or not app.is_staff() then
    raise exception 'write_audit requires an authenticated staff session with a tenant' using errcode = '42501';
  end if;
  insert into public.audit_log (tenant_id, actor_id, action, target_table, target_id, before_value, after_value, reason)
  values (v_tenant_id, auth.uid(), p_action, p_target_table, p_target_id, p_before, p_after, p_reason)
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.write_audit(text, text, uuid, jsonb, jsonb, text) from public, anon;
grant execute on function public.write_audit(text, text, uuid, jsonb, jsonb, text) to authenticated;
