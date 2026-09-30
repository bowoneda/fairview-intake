-- Observation N1, Phase 2 re-vet (PHASE_2_REWORK_2.md): a detected stream's income_record kept the review reason
-- "awaiting_family_statement" after the family stated it or a reviewer confirmed it, until Plaid next sent data.
-- This trigger applies the ingestion code's rule (streamReviewReasons in supabase/functions/_shared/recurring.ts)
-- the moment the source's status changes: while undecided, the status reason plus any pattern reason
-- (irregular_pattern); once decided, none.

create or replace function app.sync_stream_record_reasons() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.income_records r
  set review_reasons = case
        when new.status in ('awaiting_family_statement', 'awaiting_review')
          then array[new.status::text]
               || array(select x from unnest(r.review_reasons) x where x not in ('awaiting_family_statement', 'awaiting_review'))
        else '{}'::text[]
      end
  where r.income_source_id = new.id
    and r.tenant_id = new.tenant_id
    and r.provider_record_ref like 'stream:%';
  update public.income_records r
  set needs_review = cardinality(r.review_reasons) > 0
  where r.income_source_id = new.id
    and r.tenant_id = new.tenant_id
    and r.provider_record_ref like 'stream:%';
  return null;
end $$;
revoke execute on function app.sync_stream_record_reasons() from public;

-- Not "update of status": the family's statement sets only family_statement, and the guard trigger moves the
-- status, which a column list would not see.
create trigger income_sources_sync_stream_record_reasons
  after update on public.income_sources
  for each row when (new.status is distinct from old.status and new.source_type = 'recurring_transfer')
  execute function app.sync_stream_record_reasons();
