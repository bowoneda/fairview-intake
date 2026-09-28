# SECURITY.md — Project 1: Fairview Compliance Intake Platform

Status: Phase 1 early pass (tenant isolation) performed 2026-09-28; findings are in PHASE 1 EARLY PASS FINDINGS at the end of this file. The full STRIDE pass is Phase 4. The requirements below are what each pass is checked against.

## WHY THIS PROJECT'S SECURITY BAR IS HIGHER THAN USUAL

This platform handles social security numbers, full bank account numbers, and complete financial transaction histories for applicants to a housing program. A data leak here is not a generic security incident, it is exposure of exactly the kind of data that enables identity theft and financial fraud against people applying for assistance. The security bar reflects that, not a generic checklist.

## THREAT MODEL, STRIDE

Spoofing: could an applicant or reviewer authenticate as someone else, or could a request be crafted to appear to come from a different tenant. Tampering: could a stored income record, asset record, or calculated determination be altered without appearing in the audit log. Repudiation: could a reviewer action (approval, exception override, unmasking a PII field) occur without a durable, attributable log entry. Information disclosure: could PII reach an unapproved endpoint, log, or a user of a different tenant. Denial of service: not the primary concern for a portfolio build, noted but not prioritized. Elevation of privilege: could an applicant role reach reviewer or admin functionality, or could a reviewer of one tenant reach another tenant's data or functionality.

## TENANT ISOLATION, THE PRIMARY REQUIREMENT

Row Level Security policies must be verified by actually attempting a cross tenant read and a cross tenant write as two distinct simulated tenant users, not by reading the policy definitions and inferring they work. This check happens twice: an early pass at the end of Phase 1 against the shell application, and again as part of the full Phase 4 audit against the more complete application, and again against the actually deployed environment in Phase 5, since RLS behavior in local development is not proof of RLS behavior in production.

## PII FIELD REQUIREMENTS

Social security numbers: encrypted at rest at the field level, never displayed unmasked by default anywhere in the reviewer dashboard, never included in any log line, error message, or third party service payload.

Full bank account numbers: same treatment as social security numbers.

Any unmasking action is an explicit, logged event: who unmasked, which field, which record, when, and ideally why, recorded in the audit_log table defined in MASTER-SPEC-1.md.

## ENCRYPTION REQUIREMENTS

Field level encryption for the fields named above, implemented with Supabase Vault or pgcrypto, verified by inspecting what is actually stored in the database, not by inspecting the schema definition or trusting that an encryption function was called somewhere in the code path.

## AUDIT TRAIL REQUIREMENTS

Every workflow_state transition, every reviewer action, and every PII unmasking event is appended to audit_log, never overwritten. The audit_log table itself should not be writable through any path that also allows deletion or modification of existing rows.

## THIRD PARTY DATA EXPOSURE

Plaid, Argyle, Textract, DocuSign or Dropbox Sign, and Twilio each receive only the minimum data required for their specific function. None of them should receive a field marked as requiring masking in the reviewer dashboard unless that specific field is the literal purpose of sending data to that provider, for example Plaid legitimately needs bank account linkage data to function at all. This is a case by case judgment the Security Skill's audit must make explicit for each integration, not a blanket rule.

## AUDIT SCHEDULE

Phase 1 close: tenant isolation only, early check.

Phase 4 close: full STRIDE pass across the completed application.

Phase 5 close: tenant isolation re-verified against the actually deployed environment.

Any high severity finding at any of these checkpoints blocks that phase's completion. It is not logged as a known issue to fix later.

## PHASE 1 EARLY PASS FINDINGS

Performed 2026-09-28 by the Security Skill, inline in the building session, against fairview-dev (project ref mdatwozuqdiwioezalom). Scope per the audit schedule: tenant isolation, plus any authorization path found on the way. This is not the Master Vetting Skill's verification. The vetting sub-agent re-checks the gate items independently.

Result: no high severity finding. One medium finding, fixed and covered by a permanent regression test. Nothing blocks the Phase 1 gate on security grounds.

### Evidence, probes beyond the isolation suite

S1. RLS status read from the live catalog (pg_tables.rowsecurity), not from migrations: 17 of 17 public tables have RLS enabled.
S1b. No table uses FORCE ROW LEVEL SECURITY, so the table owner (postgres) bypasses RLS. That role is used only by migrations and test fixtures through the database password, which never reaches application code or the client (see SEC-P1-04).
S2. Sign up with user_metadata role = admin and app_role = admin produced a profile with role applicant. The trigger ignores metadata except tenant_slug.
S3. Access tokens are signed ES256 with an asymmetric key id. There is no shared HMAC secret to guess.
S4. A real token with its payload edited (tenant_id changed, app_role = admin) and the original signature kept: 401 PGRST301.
S5. alg = none token: 401 PGRST301.
S6. HS256 token signed with a guessed default secret: 401 PGRST301.
S7. Control: the untampered token returned 200.
S8. Anonymous raw GET, publishable key only, on every public table: 200 on exactly tenants, programs, theme_configs, properties, property_programs; 401 on the other 12.
S9. The private app schema is not exposed (406 PGRST106 on app.encrypt_pii). custom_access_token_hook is not callable by an applicant (403, 42501). write_audit is not callable by anon (401, 42501).
S10. GraphQL is not enabled on the project (pg_graphql extension not enabled).
S11. Uploads to the public tenant-branding bucket are rejected for anon and for an applicant (storage RLS).
S12. A non hex theme color containing markup is rejected even for the table owner (check constraint 23514). CSS injection through the theme is blocked in the database, before the Zod check in the app.
S13. Anonymous REST can list every operator's slug and display name (see SEC-P1-03).
S14. Production build (next build) client bundle, .next/static, 17 files, 650 KB. It contains 0 occurrences of the secret key value, the database password, the names SUPABASE_SECRET_KEY and SUPABASE_DB_PASSWORD, and the prefix sb_secret_. A positive control confirmed the scan finds known client strings. No file under app/, lib/, components/, or proxy.ts reads either secret. The client bundle does not even contain the publishable key, because every Supabase call runs on the server.
E1 to E4. See SEC-P1-01; now permanent tests in the isolation suite.
Isolation suite, run by the Security Skill after the fix: 26 of 26 tests, 283 of 283 recorded checks.

### Findings

SEC-P1-01, Medium, fixed. Tampering: an applicant could set their own application_status to any value (under_review, determined, closed), because the applicant column grant on applicants includes application_status. It was confirmed by probe: all four transitions were accepted and stored. It is not a cross tenant leak, but status drives the workflow and the review step's completion. Fixed by migration 900 (app.applicant_status_guard, a before update trigger): an applicant may only move in_progress to submitted, and every other status change is rejected with 42501. Staff and server side changes are unaffected. Regression tests E4 cover four rejections and two controls (submit, reviewer moves to under_review). The same probe confirmed E1 (a reviewer cannot promote themselves), E2 (an admin cannot change another tenant's user), and E3 (an admin can manage their own tenant's staff, the control).

SEC-P1-02, Low, fixed. Information disclosure in logs: Next.js 16's development server logs every Server Function's arguments and return values by default. During the browser round trip, it printed an applicant's email address to the terminal. Fixed with logging.serverFunctions = false in next.config.ts. The local log was masked. Production servers do not log this, but RULES.md forbids PII in any log.

SEC-P1-03, Low, accepted for Phase 1. Information disclosure: anonymous REST lists all operators (slug and display name), and all properties with their programs, although the platform root page never lists them. These are public identity and building information shown on each operator's own public pages, so no private data is exposed. Revisit in Phase 4: replace the anonymous table read with a function that resolves a single slug, so the API cannot enumerate operators.

SEC-P1-04, Informational. The database owner role bypasses RLS (no FORCE RLS). This is intended. The owner connection (database password) is used only by migrations and tests, it is never available to application code, and S14 confirms it is not in the client bundle. Phase 5 must keep the staging and production database passwords out of Vercel's application environment unless a specific server task requires them.

SEC-P1-05, Informational, process. During one isolation run, a request hung past Vitest's 60 second test timeout (network). The request later completed and recorded a passing entry, so the JSON report showed all checks passing while Vitest reported the test as failed. Anyone reading the evidence, the vetting sub-agent included, must check both the Vitest summary and the report, and treat a Vitest failure as a failure regardless of the report.

SEC-P1-06, Informational, outside this repository. The ui-kit-designer skill in the user's THUB project hardcodes a live kie.ai API key in references/gemini-image-gen.md. The copy installed in this repository has it removed (it reads KIE_API_KEY from the environment), so no credential entered this repository. The user was advised to rotate the key if THUB is in any shared or public repository.

### Not in scope of this early pass, for Phase 4

Security headers (Content Security Policy and others), rate limiting beyond Supabase Auth's built in limits, the PII reveal path and its audit logging (not built yet), and a full STRIDE review of every role and table.
