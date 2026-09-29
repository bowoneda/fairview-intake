-- Fix, Phase 2 vetting (PHASE_2_REWORK.md item 10): keep "the family states, a reviewer confirms" separate.
-- Found by the vetting sub-agent: (1) a reviewer could confirm a transfer the family never explained; (2) a
-- reviewer could write the family's statement directly, stamped as the family's answer with no audit entry.
-- Also closes an observation: applicants could still change source_type / connection_method on sources the
-- system detected, through a Phase 1 column grant from before sources were system derived.

create or replace function app.income_source_statement_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.family_statement is distinct from old.family_statement then
    -- Only the family (the applicant) states what a transfer is. Staff record their decision through
    -- confirm_income_source, which is audited; they never write the family's words.
    if app.user_role() is distinct from 'applicant' and app.user_role() is not null then
      raise exception 'only the applicant can give the family''s statement' using errcode = '42501';
    end if;
    if app.user_role() = 'applicant' and old.status not in ('awaiting_family_statement', 'awaiting_review') then
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

create or replace function public.confirm_income_source(p_source_id uuid, p_outcome public.income_source_status, p_reason text)
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
  -- A reviewer decides only after the family has stated what the transfer is.
  if v_before ->> 'status' <> 'awaiting_review' or v_before ->> 'family_statement' is null then
    raise exception 'the family has not stated what this is yet' using errcode = '22023';
  end if;
  update public.income_sources set status = p_outcome where id = p_source_id and tenant_id = app.tenant_id();
  perform public.write_audit('confirm_income_source', 'income_sources', p_source_id,
                             jsonb_build_object('status', v_before ->> 'status', 'family_statement', v_before ->> 'family_statement'),
                             jsonb_build_object('status', p_outcome), p_reason);
end $$;
revoke execute on function public.confirm_income_source(uuid, public.income_source_status, text) from public, anon;
grant execute on function public.confirm_income_source(uuid, public.income_source_status, text) to authenticated;

-- Sources are system derived since Phase 2; no client role edits what kind of source one is.
revoke update (source_type, connection_method) on public.income_sources from authenticated;
