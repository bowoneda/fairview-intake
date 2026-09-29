-- Retry of failed webhook processing (PHASE-2-SPEC.md, WEBHOOK INGESTION STATE MACHINE): pg_cron calls the
-- ingestion-retry Edge Function every 5 minutes through pg_net. The function is authenticated by a secret that
-- is generated here and kept in Vault; no person ever handles it.
--
-- Per environment: the function base URL differs between development and staging, so it is a Vault secret
-- (functions_base_url) set once per environment, not in this file. Until it is set, the job does nothing.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret',
                                'Authenticates pg_cron calls to the ingestion-retry Edge Function');
  end if;
end $$;

-- Service role only: the Edge Function checks the header it received against Vault.
create function public.check_cron_secret(p_secret text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(p_secret = (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'cron_secret'), false)
$$;
revoke execute on function public.check_cron_secret(text) from public, anon, authenticated;
grant execute on function public.check_cron_secret(text) to service_role;

-- Service role only: atomically claim due events, so two overlapping runs never process the same one.
create function public.claim_retry_events(p_limit integer) returns setof public.webhook_events
language sql volatile security definer set search_path = ''
as $$
  update public.webhook_events e
     set status = 'processing', attempts = e.attempts + 1
   where e.id in (select w.id from public.webhook_events w
                   where w.status = 'failed' and w.next_attempt_at is not null and w.next_attempt_at <= now()
                   order by w.next_attempt_at
                   limit p_limit
                   for update skip locked)
  returning e.*
$$;
revoke execute on function public.claim_retry_events(integer) from public, anon, authenticated;
grant execute on function public.claim_retry_events(integer) to service_role;

-- What the cron job runs. It reads the URL and secret from Vault at call time; nothing sensitive is in the job.
create function app.run_ingestion_retry() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_base text := (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'functions_base_url');
  v_secret text := (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'cron_secret');
begin
  if v_base is null or v_secret is null then
    return; -- not configured for this environment yet
  end if;
  perform net.http_post(
    url := v_base || '/ingestion-retry',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    timeout_milliseconds := 60000
  );
end $$;
revoke execute on function app.run_ingestion_retry() from public, anon, authenticated, service_role;

select cron.schedule('ingestion-retry', '*/5 * * * *', 'select app.run_ingestion_retry()');
