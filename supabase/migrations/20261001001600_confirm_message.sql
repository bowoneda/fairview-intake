-- Observation N15, fourth Phase 2 vetting (PHASE_2_REWORK_4.md): a second confirm on an already decided source
-- was refused correctly, but with the message "the family has not stated what this is yet", which is untrue for a
-- source the family did state. Same rules, same error code (22023), an accurate message per case.

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
  if v_before ->> 'status' in ('confirmed_income', 'confirmed_excluded', 'dismissed') then
    raise exception 'this source has already been decided' using errcode = '22023';
  end if;
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

