-- One ingestion at a time per connection (PHASE_2_REWORK_8.md, failure 2; PHASE-2-SPEC.md AS BUILT 27).
--
-- Every Plaid webhook used to start its own ingestion. Plaid sends several within seconds of a link, so runs on
-- one connection overlapped, and a run that had fetched only Plaid's first 30 days could finish after a run that
-- had fetched all 180: it deleted senders the fuller run had written, or overwrote their figures with 30 days' worth.
--
-- Now a run holds a lease on its connection. A request that arrives while a run holds it is recorded, not run;
-- the holder runs again when it finishes, so the last run always fetches after the last request, and the stored
-- state is the newest read. A lease that is never released (a killed function) expires after 3 minutes, and the
-- 5 minute retry job runs any request left behind.
--
-- No client role can see or change these columns: provider_connections has no table grant for anon or
-- authenticated, only explicit column grants (migrations 1000 and 1300), which these columns are not part of.

alter table public.provider_connections
  add column ingest_lease_until timestamptz,
  add column ingest_requested boolean not null default false;

-- Record a request, then take the lease if it is free. True: the caller runs the ingestion. False: a run holds it,
-- and the request stays recorded for that run (or the retry job) to pick up. Concurrent callers are serialized by
-- the row lock: the second update re-checks the lease after the first commits, so only one caller gets it.
create function public.begin_ingest(p_connection_id uuid) returns boolean
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_got boolean;
begin
  update public.provider_connections set ingest_requested = true where id = p_connection_id;
  update public.provider_connections
     set ingest_lease_until = now() + interval '3 minutes', ingest_requested = false
   where id = p_connection_id and (ingest_lease_until is null or ingest_lease_until < now())
  returning true into v_got;
  return coalesce(v_got, false);
end $$;

-- After a run. True: a request arrived during it, so the caller keeps the lease (renewed) and runs again.
-- False: nothing is waiting, and the lease is released.
create function public.end_ingest(p_connection_id uuid) returns boolean
language sql volatile security definer set search_path = ''
as $$
  update public.provider_connections
     set ingest_lease_until = case when ingest_requested then now() + interval '3 minutes' else null end,
         ingest_requested = false
   where id = p_connection_id
  returning ingest_lease_until is not null
$$;

-- After a failed run, or when the holder stops re-running: release the lease and leave a request behind, so the
-- next retry job run reads the connection again.
create function public.release_ingest(p_connection_id uuid) returns void
language sql volatile security definer set search_path = ''
as $$
  update public.provider_connections set ingest_lease_until = null, ingest_requested = true where id = p_connection_id
$$;

-- For the retry job: connections with a request that no run holds (a holder that failed or was killed). A
-- connection that needs the person (revoked, reauth_required) or was given up on (error) is skipped.
create function public.pending_ingest_requests(p_limit integer)
returns table (id uuid, tenant_id uuid, applicant_id uuid, household_member_id uuid, product text, provider_user_ref text)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.tenant_id, c.applicant_id, c.household_member_id, c.product::text, c.provider_user_ref
    from public.provider_connections c
   where c.ingest_requested and (c.ingest_lease_until is null or c.ingest_lease_until < now())
     and c.status not in ('revoked', 'reauth_required', 'error')
   order by c.updated_at
   limit p_limit
$$;

-- Every function outside the client API revokes PUBLIC execute explicitly (migration 800).
revoke execute on function public.begin_ingest(uuid) from public, anon, authenticated;
revoke execute on function public.end_ingest(uuid) from public, anon, authenticated;
revoke execute on function public.release_ingest(uuid) from public, anon, authenticated;
revoke execute on function public.pending_ingest_requests(integer) from public, anon, authenticated;
grant execute on function public.begin_ingest(uuid) to service_role;
grant execute on function public.end_ingest(uuid) to service_role;
grant execute on function public.release_ingest(uuid) to service_role;
grant execute on function public.pending_ingest_requests(integer) to service_role;
