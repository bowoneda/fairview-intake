-- Fix, Security Skill Phase 1 early pass finding SEC-P1-01: an applicant could set their own application to
-- any status (under_review, determined, closed) because the applicant column grant includes
-- application_status. Status drives the workflow, so this is a tampering path (STRIDE: Tampering).
--
-- Rule: an applicant may only submit their own application (in_progress -> submitted). Every other status
-- change comes from staff or server side code. Enforced in the database, where the client cannot reach it.

create function app.applicant_status_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.application_status is distinct from old.application_status
     and app.user_role() = 'applicant'
     and not (old.application_status = 'in_progress' and new.application_status = 'submitted') then
    raise exception 'applicants may only submit an in progress application' using errcode = '42501';
  end if;
  return new;
end $$;

-- Trigger function: fires regardless of EXECUTE, so no grant (and none to PUBLIC, per migration 800).
revoke execute on function app.applicant_status_guard() from public;

create trigger applicants_status_guard before update on public.applicants
  for each row execute function app.applicant_status_guard();
