# MEMORY.md — Project 1: Fairview Compliance Intake Platform

Living state file. Update this at the end of every work session, regardless of how much or how little was done in that session. A new session starts by reading CLAUDE.md, then this file, before consulting anything else. Never rely on conversation history for project facts; if it is not written here, treat it as not known.

## CURRENT PHASE

Phase 0, foundation: complete.
Phase 1, architecture and shell: COMPLETE, 2026-09-28. The Master Vetting sub-agent, a fresh general purpose agent grounded in all project documents, independently verified all 11 PROCESS-RULES.md Phase 1 items with its own evidence. That included dev credentials rejected by staging, the live catalog, both suites run by it (Vitest 26 of 26 with 283 checks, Playwright 5 of 5), its own hand made cross tenant read and write with positive controls, its own SQL inserted operator rendering, a design token match, security spot checks, and the genericization grep. Evidence is in PHASE_1_COMPLETE.md. It could not see the staging project's creation date, and it did not compare staging key hashes, since no staging credentials are on this machine; the rejection probes stood in for that. Its observations, none failures: owner connection bypasses RLS (Phase 5 note), anonymous operator listing (SEC-P1-03, Phase 4), its hand probes were applicant level only, the Harbor Point test fixture has no program link, and this machine's clock is about 4 hours behind the database server.

Phase 2, financial ingestion: built; the first vetting found 3 failing items (PHASE_2_REWORK.md), which have been reworked, and the re-vet is next. See PHASE 2 VETTING AND REWORK at the end of this file. PHASE-2-SPEC.md was written 2026-09-28, after researching current primary sources: 24 CFR 5.609 as amended by HOTMA; HUD Notice PIH 2023-27 / H 2023-10, Attachments G.1 and G.19; Plaid webhook verification and recurring transactions documentation; Argyle webhook documentation; and the AWS Textract AnalyzeDocument documentation and set quotas.

Key decisions:
- Provider code runs in Supabase Edge Functions, so webhooks get public endpoints and provider secrets stay out of Next.js.
- Plaid Auth is not requested, so no full account numbers are ever received.
- Textract is synchronous only, one page, at most 15 queries. The needed Schedule C lines are all on page 1, so no S3 bucket is needed.
- AWS A2I human review is in maintenance mode as of July 2026, so review always goes to the platform's own queue.
- Recurring peer to peer transfers: software detects, the family states, a reviewer confirms, per HUD G.1.
- The raw Textract response is never stored; provider payloads are stored redacted.
PROCESS-RULES.md Phase 2 gained four gate items: shape identity, new table RLS, the recurring transfer rule, and no stored PII or raw responses.

User action status (2026-09-28):
- Plaid: done. PLAID_CLIENT_ID, PLAID_SECRET (Sandbox), and PLAID_ENV=sandbox are saved by the user in fairview-dev Edge Function secrets. They are not yet verified; they will be verified when plaid-link-token is first deployed.
- Argyle: account application under review by Argyle (typically within 24 hours). When approved, set ARGYLE_API_KEY_ID, ARGYLE_API_KEY_SECRET, ARGYLE_WEBHOOK_SECRET (generated with `openssl rand -hex 32 | clip`, never shown in chat), and ARGYLE_ENV=sandbox. If declined or slow, fall back to Pinwheel, which the listing allows ("Argyle (or Pinwheel)"); only the payroll functions and their webhook verification change.
- Build order adjusted for this: Textract, then Plaid, then Argyle (spec steps 5 and 6 swapped).
- AWS: done. The user's sign in issue was resolved. AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION=eu-west-1 are in Edge Function secrets, for an IAM user limited to textract:AnalyzeDocument in eu-west-1 with a billing alert. Textract Queries in eu-west-1 is confirmed by AWS's May 2023 announcement; a real call at build will prove it.
- Supabase access token: in .env.local as SUPABASE_ACCESS_TOKEN, verified by listing functions and secret names. Notepad saved the file with CRLF line endings, which corrupts values in shell use; the file was normalized to LF. Shell and PowerShell clipboard reads hung in this environment, so enter secrets through Notepad.

Phase 2 build progress (2026-09-28). Order of work step 2 is done: migration 1000.
- New tables provider_connections, webhook_events (platform, zero client access), and applicant_documents, plus the private applicant-documents bucket with tenant and applicant prefix storage policies.
- provider_token_key in Vault, with app.encrypt_secret and decrypt_secret and the store_provider_token and read_provider_token wrappers, all service role only.
- income_sources gains status, recurring transfer fields, and family_statement with a guard trigger; confirm_income_source is staff only, requires a reason, and is audited.
- income_records has the normalized columns; ytd_amount was renamed to ytd_gross.
- The live catalog was verified.
- The isolation suite was extended in the same change (T1 to T5): token column unreadable, webhook_events unreadable, no client connection writes, storage isolation (cross access returns "Object not found", so existence is not leaked), and the statement and confirmation flow. Result: 29 of 29 tests, 338 of 338 checks, with teardown back to the user's real data only.
Steps 3 and 4 done, 2026-09-28.
- Shared modules in supabase/functions/_shared/: normalized.ts (strict Zod schema, key set, column mapping), redact.ts (removes account and routing numbers, SSN, DOB, and addresses by field name and value pattern), textract.ts (query sets, answer reader that ignores raw text, strict parsers, record builder), documents.ts (file type sniffing and PDF page count, run before any AWS call), and auth.ts (getClaims verification, applicant role, RLS client plus service client).
- 87 unit tests (npm test). The redaction tests were confirmed meaningful by a mutation check.
- Fixtures come from scripts/make_document_fixtures.py, with expected.json as the answer key.
- document-ingest is deployed with `supabase functions deploy --use-api` (no Docker) and verify_jwt=false in config.toml. The gateway cannot verify this project's ES256 tokens, so each function verifies with getClaims.
- Integration test (npm run test:integration) against real Textract in eu-west-1 (this confirms Queries works there): 6 of 6 passed. The paystub, W-2, and Schedule C records exactly match the answer key. No SSN, person's name, or raw response is stored. The two page PDF is refused with 422 and no record is created. No token gives 401; another applicant's document gives 404. Each run makes 3 billable Textract calls.
Step 6, Plaid, done 2026-09-28.
- Deviation from the spec, recorded here and to be folded into PHASE-2-SPEC.md: recurring detection uses our own deterministic detector (supabase/functions/_shared/recurring.ts), not Plaid's /transactions/recurring/get. Plaid's documentation does not confirm its recurring endpoint works on Sandbox custom user data, and an auditor can re-run our rule. The criteria are the spec's (payment app inflows, at least 3 in 180 days, regular band, active), plus semi-monthly by day of month clustering.
- Functions: plaid-link-token, plaid-exchange, plaid-webhook (ES256, kid cache, 5 minute iat, constant time body hash, recorded once), and plaid-sandbox. plaid-sandbox is sandbox only and replaces the Link UI for tests; the Plaid secret never leaves Edge Function secrets.
- Migration 1100 adds provider references for idempotent upserts.
- Integration test against the real Plaid Sandbox (tests/integration/plaid.test.ts): 6 of 6. It caught and fixed two defects: Plaid's 90 day default history versus the needed 180 days, and forged webhook rejections colliding on one key.
- Unit tests: 99.
Also done 2026-09-28:
- Webhook verification is a pure module with 11 unit tests, covering stale and tampered cases.
- Retry: migration 1200 (pg_cron every 5 minutes, pg_net, Vault cron_secret, atomic claim_retry_events) and the ingestion-retry function. The dev functions_base_url is set in Vault; staging must set its own (PROCESS-RULES Phase 5).
- The Plaid integration suite is now 8 of 8, including retry and the end to end pg_net wiring.
- PHASE-2-SPEC.md has an AS BUILT section listing seven deviations with reasons.
Intake UI done 2026-09-28:
- Income step: bank connection through Plaid Link, detected transfer questions, and an income list.
- Assets step: balances with masks.
- Documents step: the real upload control with a signed upload URL straight to storage, then document-ingest.
- Server actions in app/[tenant]/apply/ingestion-actions.ts; lib/functions.ts calls Edge Functions with the applicant's token; lib/intake.ts loadIngestionView; step states are now real.
- Browser test tests/e2e/ingestion-ui.spec.ts (npm run test:e2e): 4 of 4. It covers a real upload read by Textract and stored ($1,480.00), the two page PDF refused on the page, a transfer answered through the real form (awaiting_review), and the assets empty state.
- Playwright now uses port 3100, because the user's other project, uplog, runs next start on port 3000.
Phase 2 Security Skill pass done 2026-09-28 (SECURITY.md, PHASE 2 PASS FINDINGS; Argyle excepted). No high or medium finding.
- All 6 functions refuse callers without credentials (401), and all refuse GET (405).
- A forged tenant token gives 401.
- Cross operator access through functions and storage is refused (404, RLS, check constraint, "Object not found").
- A 58 column database scan with a real W-2 present found no SSN, account like digits, or raw Textract output.
- The repository and the production bundle contain no secrets.
Fixed: SEC-P2-01, where failure reasons are now codes or class names only (safeReason); Plaid is still 8 of 8 after the fix.
Open for Phase 4: webhook write amplification, a retention decision for documents, upload and ingest rate limits, and the CSP must allow Plaid.
Open for Phase 5: plaid-sandbox must not be deployed to production (a new PROCESS-RULES item).
The "destination stream closed early" message is traced to React cancelling a render when the browser disconnects; benign (SEC-P2-07).
Remaining Phase 2: Argyle (awaiting approval; else Pinwheel); the Income, Assets, and Documents intake UI; re-running the isolation suite after migrations 1000 and 1100; the Security Skill pass; and the vetting sub-agent.

Next action: the user actions in PHASE-2-SPEC.md, USER ACTIONS: Plaid sandbox, Argyle sandbox, an AWS IAM user limited to Textract (billed per page; confirm cost), and a Supabase access token for function deploys. Then run the CONFIRM AT BUILD checks. Also confirm the qa-test-agent skill can produce TESTS.md shaped output, per CLAUDE.md.

Phase 1 build log, retained below for reference.
Phase 1 (build log): in progress, now closed. Steps 1 to 9 of PHASE-1-SPEC.md's order of work are done, and step 10's Security Skill early pass is done (2026-09-28, recorded in SECURITY.md, PHASE 1 EARLY PASS FINDINGS). It found no high severity issue. One medium finding was fixed: SEC-P1-01, where an applicant could set any application status. Migration 900 added a trigger allowing applicants only in_progress to submitted, and regression tests E1 to E4 were added. The isolation suite now has 26 tests and 283 checks, all passing on the final run. Next: the Master Vetting sub-agent for the Phase 1 gate. No PROCESS-RULES.md item is marked until it verifies. The ui-kit-designer skill was installed into .claude/skills/ from the user's THUB project, with its hardcoded kie.ai API key removed; CLAUDE.md records how it applies here.

Design system (2026-09-28): the UX and Interface Skill ran as a background sub-agent and wrote DESIGN.md's visual design system, screen specifications, and save and resume sections. Tenant tokens are exactly the three theme_configs colors, and accent is decoration only. Measured: Cedar Row contrast on primary is 9.15:1, and accent on white is 3.13:1, which fails as text. Focus rings use the text color, never a tenant color. It proposed no token additions.

Step 8 (2026-09-28): the shell covers proxy.ts session refresh, per request tenant resolution with Zod validated theme injection, the operator landing with property cards, email one time code sign in (the email is held in an httpOnly cookie, never in the URL), the application overview, five step pages (household is real and saves to the database; the others are scaffolds per DESIGN.md), the different property manager page, the neutral 404, and the theming preview with measured contrast. Typecheck and lint are clean.

Builder checks, run against a real dev server with real sessions from @supabase/ssr:
- Correct status codes and redirects on every route.
- A second operator inserted by SQL rendered its own theme and property, with no Cedar Row content. A SQL color change showed on the next request.
- A signed in applicant saw the start form, then the overview and household step.
- A tenant B session on cedar-row pages saw only the mismatch page, with no application data.

Browser round trip, 2026-09-28. The user set up custom SMTP in fairview-dev through Brevo (smtp-relay.brevo.com:587), because Supabase only allows editing email templates with custom SMTP. They edited the Magic link or OTP template to show {{ .Token }}. Two setup issues were found and fixed:
- Brevo's authorized IP restriction rejected Supabase's sends, and the user disabled it.
- The project's email OTP length is 8 digits, not 6, so the app now accepts 6 to 8 digit codes, with wording updated in the app and DESIGN.md.

The user then completed the flow in a real browser: send code, verify, overview, add the head of household, close, and resume with Household shown Complete. Database check afterwards:
- One auth user, confirmed, who signed up from cedar-row.
- public.users row in cedar-row with role applicant.
- One application for maple-court, owner matching the profile.
- One household member (head), tied to that application, tenant matching, ssn_encrypted empty.
- Nothing in any other table.

Two findings from the dev server log, both fixed:
1. Next 16's dev server logs every Server Function's arguments, which printed the applicant's email. It is now disabled with logging.serverFunctions: false in next.config.ts, and the local log was masked.
2. A network failure reaching Supabase ("fetch failed", on this machine's slow connection) surfaced to the user as a raw crash. Error pages were added: app/error.tsx, neutral, catching layout failures such as the tenant lookup, and app/[tenant]/error.tsx, themed, catching page failures. Neither shows internal error text.

Open items for step 8:
1. Closed: the email template and browser round trip, above.
2. Closed 2026-09-28: the Playwright theming check is built in tests/theming/ (npm run test:theming). @playwright/test is pinned to exactly 1.60.0, matching the machine's global Playwright, so it reuses the cached chromium-1223 in %LOCALAPPDATA%\ms-playwright with no browser download. Install it with PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1. Changing the version would trigger a large download. Builder run: 5 of 5 passed, on computed --color-primary and header background for both operators, own properties only, a live SQL color change, preview contrast 9.15:1 and 9.74:1, and a neutral 404. Both landing screenshots were inspected and match DESIGN.md. The isolation suite was re-run afterwards: 274 of 274.
3. Not built in Phase 1: removing a household member (no delete policy exists), and the unsaved changes prompt from DESIGN.md.

Step 7 (2026-09-28): isolation suite built in tests/isolation/ and run twice against fairview-dev. Final run: 24 test groups, 274 of 274 recorded checks passed. This is a builder run, not vetting evidence. On review of the first run's report, one check (Y1.1) had passed for the wrong reason. It was rejected by a duplicate program enrollment rather than by tenant isolation. It was fixed to use a program tenant B's property is not enrolled in, and now fails on the composite tenant foreign key as intended. Teardown was confirmed to leave the database exactly at seed state. PHASE-1-SPEC.md was clarified: the cross tenant read tests cover the ten private tables, because theme_configs, properties, and property_programs are public by design. Setup adds A3, an applicant with no application, and AA, a tenant A admin.

Step 5 (2026-09-28): the user enabled the Custom Access Token Hook (public.custom_access_token_hook) in the fairview-dev dashboard. Builder check: a real password sign-in with the publishable key produced top level claims tenant_id = the cedar-row tenant id and app_role = applicant. After the user wrote a forged tenant_id and app_role = admin into their own user_metadata and refreshed, the top level claims were unchanged; the forged values appeared only inside user_metadata. The throwaway user was deleted.

Step 3 (2026-09-28): Next.js 16.3.6 scaffold with Supabase JS/SSR, Zod, React Hook Form, Vitest 5, and Supabase CLI 2.118.0. @types/node is pinned to ^22 to match the Node 22.14 runtime, because Vitest 5 rejects ^20. Committed as 7025674. The npm registry is very slow from this machine (about 28 KB/s). Use --fetch-timeout and --fetch-retries on installs, and don't use --prefer-offline, which served a stale package listing.

Steps 4 and 6 (2026-09-28): eight migrations applied to fairview-dev through the session pooler with `supabase db push --db-url ... --include-seed`, plus the seed. Builder checks against the live catalog, which are not vetting evidence:
- All 17 public tables have RLS enabled. tenant_id is on all 13 tenant scoped tables and absent only on the 4 reference tables.
- anon holds SELECT on exactly the 5 public tables.
- No client role can write the encrypted columns.
- The reference tables are writable only by service_role.
- The Vault pii_key exists.
- Seed counts: 1 tenant, 3 programs, 3 rule sets, 6 AMI rows, 1 theme, 2 properties, 3 property programs.
- A real sign-up smoke test created an applicant in cedar-row through the trigger. The throwaway user was then deleted.
Finding fixed in migration 800: every app schema function, including encrypt_pii, was executable by PUBLIC. Postgres grants that by default, and a schema scoped default privilege cannot remove it. Every future function outside public must revoke PUBLIC execute explicitly. The global default for the postgres role has been removed.

## WHAT ACTUALLY EXISTS RIGHT NOW

COLLABORATION-1.md: exists. Defines the nine skill roster and the phase map.
MASTER-SPEC-1.md: exists. Architecture decisions, data model, five milestone plan with acceptance criteria.
CALC-SPEC-1.md: exists. Full income determination methodology, nine worked test cases with expected outputs, built on the current HOTMA rule rather than the outdated five thousand dollar threshold referenced in the job posting this project was inspired by.
CLAUDE.md, DESIGN.md, RULES.md, SECURITY.md, TESTS.md, PROCESS-RULES.md: exist, produced as the standard seven file handoff package.
MASTER-VETTING-SKILL.md, COMPLIANCE-VERIFICATION-SKILL.md: exist.

PHASE-1-SPEC.md: exists, written 2026-09-28 from the corrected MASTER-SPEC-1.md. It covers the environments, the column level schema, the JWT claim hook, the RLS pattern and per table access, tenant resolution and theming, the design system deliverable, the literal cross tenant test procedure with positive controls, the second tenant render check, and the gate evidence for the vetting sub-agent.

PHASE-2-SPEC.md: exists (2026-09-28), with an AS BUILT section. PHASE-3-SPEC.md through PHASE-5-SPEC.md: do not exist yet. An earlier version of this file claimed all five phase specs existed with full content. That was false: they were described in a chat session but never saved to the project folder. Found and corrected 2026-09-28 by checking the folder directly. Until a phase spec is written, MASTER-SPEC-1.md and PROCESS-RULES.md govern that phase. DESIGN.md's visual design system section is also still pending; it is Phase 1 work for the UX and Interface Skill.

Superseded 2026-09-29: the application exists (Phase 1 complete; Phase 2 built), on fairview-dev, with Edge Functions deployed. The sentences above describe the state before Phase 1 and are kept as history.

## SKILL TEAM RESOLUTION, DECIDED

The open question about whether the nine COLLABORATION-1.md skills get built as formal files is resolved, split three ways rather than answered as a single yes or no.

Already existing, reuse directly, do not rebuild: the QA Test Agent Skill role is served by the existing qa-test-agent-skill already in the library (Playwright, axe-core, ffmpeg based, four modes including API/workflow-scenario-to-test-plan and repo test-coverage-gap analysis). When Phase 2 or Phase 3 work begins, read that skill's actual current SKILL.md and confirm it can produce a coverage report shaped to match TESTS.md's nine required calculation cases; extend it lightly for that output shape if needed, do not build a parallel skill from scratch.

Genuinely reusable across future projects, built now as standalone formal skill files: MASTER-VETTING-SKILL.md and COMPLIANCE-VERIFICATION-SKILL.md, both exist. The Master Vetting Skill generalizes the no-self-report-trusted discipline beyond this project. The Compliance Verification Skill generalizes the research-specification-independent-verification pattern beyond HUD Part 5 specifically, so any future project (Logistics, Real Estate, Healthcare, or beyond) with regulatory or domain specific logic can invoke it fresh.

Specific to this project, followed inline rather than formalized as separate skill files for now: Project Architect, Financial API Integration, UX and Interface, Full Stack Engineering, Security, and Deployment. Their playbooks are MASTER-SPEC-1.md, SECURITY.md, and the phase specifications (PHASE-1-SPEC.md so far). If any of these proves reusable after Logistics or Real Estate the way cybersecurity-skill and software-engineer-pretester-skill did, formalize it then, not preemptively now.

Master Vetting is run by a fresh sub-agent, decided by the user 2026-09-28. Not by the building session, and not by Claude web as COLLABORATION-1.md originally said. The sub-agent reads the project documents in full before verifying, so the vetting is deeply grounded and not a quick blitz. It is given the checklist items to verify, never the builder's conclusions to confirm. CLAUDE.md, COLLABORATION-1.md, and PROCESS-RULES.md are updated to match.

## DOCUMENT CORRECTIONS, 2026-09-28

A full cross read of all twelve documents before Phase 1 found and fixed the following. Recorded here so the reason for each change is not lost.

Read order in CLAUDE.md expanded to cover every document, with PROCESS-RULES.md read before building. COLLABORATION-1.md no longer claims to be read before MEMORY.md.
COLLABORATION-1.md's "every skill must be built fresh as its own file" replaced with a pointer to the SKILL TEAM RESOLUTION above, and its "unless changed later" jurisdiction wording made permanent.
Data model in MASTER-SPEC-1.md: tenant_id added to every table except tenants (it was missing from income_sources, income_records, asset_records, calculated_determinations, generated_documents, and workflow_state, which RULES.md required). Composite foreign keys keep child and parent tenant consistent. New household_members table, since household size drives AMI tier matching and SSNs belong to individual members. Encrypted SSN and full account number fields added, since SECURITY.md required encrypting fields the model never defined. asset_records gains an income determinable flag, which imputation depends on. Determination status gains pending_review, which CALC-SPEC-1.md case 2.2 requires. generated_documents links to the exact determination it came from. tenants and theme_configs get a deliberate unauthenticated read, since the theme must render before sign in.
URL form fixed to a path slug (platform.example/fairview/apply). MASTER-SPEC-1.md's example had shown a subdomain.
Genericization check in RULES.md: the original "grep returns nothing" could never pass, since the governance documents that state the rule must name the forbidden places. Now an exact git grep command that excludes exactly those four documents and covers tracked files only.
PROCESS-RULES.md: Phase 1 gains the environment separation item. Every phase from 1 to 5 gains the genericization check item, which RULES.md already required at every gate.
MASTER-SPEC-1.md open decisions now list three items to settle before Phase 3: income above the highest AMI tier (CALC-SPEC-1.md is silent), the effective year of the HOTMA threshold and passbook rate (both are periodically adjusted), and DocuSign versus Dropbox Sign.
CALC-SPEC-1.md: not edited. All nine worked examples and the full AMI table were independently recomputed and are arithmetically correct.
While writing PHASE-1-SPEC.md, applicants gained user_id in MASTER-SPEC-1.md. Without it, RLS keyed only on tenant_id would let one applicant read another applicant's household inside the same tenant. users.id is now defined as the Supabase Auth user id.

## WHAT DOES NOT YET EXIST

As of 2026-09-29: PHASE-3-SPEC.md to PHASE-5-SPEC.md; the calculation engine, PDF generation, e-signature, and SMS (Phases 3 and 4); the staging deployment (Phase 5); Argyle or Pinwheel as a payroll adapter (optional, see the stack decision). The environments, the design system, and Phases 1 and 2 exist.

## DECISIONS LOCKED SO FAR

Stack: Next.js, Tailwind, React Hook Form, Zod, Supabase, Plaid (bank and payroll; payroll moved from Argyle on 2026-09-29, see PAYROLL PROVIDER below), Textract, pdf-lib, DocuSign or Dropbox Sign, Twilio, Vercel. Not to be changed without logging a reason here.

Multi tenant approach: single project, single schema, RLS keyed on tenant_id. Not per-tenant databases or schemas.

Fictional jurisdiction: State of Meridian, Ashland County, City of Fairview, agency FHA-Meridian, forms FTIC and ACAEF. Permanent, not a placeholder to be replaced later.

Asset imputation rule: current HOTMA rule, fifty thousand dollar threshold, roughly zero point four percent passbook rate, actual plus imputed on the undetermined portion. Explicitly not the five thousand dollar pre-HOTMA rule the original inspiring job posting assumed.

Variance threshold for annualized run rate versus YTD extrapolation: ten percent, a project convention documented in CALC-SPEC-1.md since federal guidance leaves this to administrator discretion.

Environments, decided by the user 2026-09-28: development runs on a hosted Supabase project, fairview-dev, not a local Docker stack. Staging is a second hosted project, fairview-staging, created in Phase 1 but left empty until Phase 5. Reason: no Docker dependency on this Windows machine, and development is the same kind of environment as staging, so isolation results in development are more meaningful. Development keys live only in the gitignored .env.local. Staging keys stay off this machine until they go into Vercel in Phase 5.

Phase 1 is governed by PHASE-1-SPEC.md, decided by the user 2026-09-28.

Built to the Upwork listing, decided by the user 2026-09-28. Scope, stack, and milestone deliverables follow Upwork job ~022097416197562470917. It is read through the Upwork MCP tool, because direct fetches of Upwork pages return HTTP 403. MASTER-SPEC-1.md's SCOPE section is the genericized restatement the build is checked against. The listing text is never committed, since it names real places.

Tenant model, decided by the user 2026-09-28: tenants are operators (multifamily developers and property managers), per the listing, not the housing authority. FHA-Meridian and the Ashland County Assessor are regulators. They define programs and receive the FTIC and ACAEF filings. The configured operator is Cedar Row Residential (slug cedar-row), with properties Maple Court and Linden Terrace. The dummy test operator is Harbor Point Communities (slug harborpoint). New tables: properties and property_programs (tenant scoped), plus programs, program_rule_sets, and ami_schedules (platform reference, read only to clients). Seventeen tables in total.

Asset rule, decided by the user 2026-09-28: the current HOTMA fifty thousand dollar threshold, stored per program in program_rule_sets, so a different value is a data change. This deliberately departs from the listing's five thousand dollar pre-HOTMA figure.

Production environment, noted by the user 2026-09-28: the Supabase free tier allows only two projects, and both are in use. Deferred to Phase 5 as an open decision in MASTER-SPEC-1.md: either pause development to create production, or use staging plus a promotion runbook.

Listing scope added to later phases, recorded in MASTER-SPEC-1.md and PROCESS-RULES.md:
- Phase 2: Plaid recurring peer to peer transfer classification, Argyle deductions, Textract Queries on W-2 and Schedule C forms.
- Phase 3: 100 percent engine code coverage, AMI schedules and thresholds held as data, landlord co-signing.
- Phase 4: Twilio SMS.
- Phase 5: repository handoff.
Open calculation gaps for the Regulatory Compliance Verification Skill before Phase 3: self employment income, income above the highest tier, recurring transfer income, and per program tier sets.

## NEXT ACTION

Documents are corrected and consistent, and PHASE-1-SPEC.md is written, as of 2026-09-28. Phase 1 has started, following PHASE-1-SPEC.md's ORDER OF WORK. Step 1 is done: the git repository was initialized on 2026-09-28 on branch main, with .gitignore (every .env file except .env.example), .gitattributes (LF line endings), and .env.example. Initial commit 527262f. The genericization check from RULES.md ran clean on that commit: no output, exit 1. Step 2, 2026-09-28: the user created fairview-dev (ref mdatwozuqdiwioezalom) and fairview-staging (ref sfjgzcqvqinnfdoapnim), both in eu-west-1. .env.local holds dev values only. The dev API answered with the publishable key, and the dev database was reached through the session pooler (see PHASE-1-SPEC.md, ENVIRONMENTS; the direct host is IPv6 only and unreachable from this machine). Refs and publishable keys differ between the two projects.

RESOLVED 2026-09-28: both projects were first created with the same database password. The user reset the fairview-staging password. Builder check, not vetting evidence: first twelve SHA-256 hex characters, dev versus staging, all distinct. Project ref 4eea4a3dcf20 vs 92ed0f63bc17. Publishable key a793f2e7e438 vs 66caa2ff8fbf. Secret key dcb248d64d1e vs 68eafb568b19. Database password ea8c87e7a0bb vs 9b88f5e8eb8f. No staging key or password appears in any project file; only the staging project ref, which is public, appears in this file. The staging values were shared in chat and are therefore in the local session transcript. Rotating the staging secret key before Phase 5 is optional, at the user's discretion. The dev secret key is in .env.local and was verified against the Auth admin endpoint (HTTP 200). The staging secret key was shared in chat but is deliberately not written to any file.

The original step 2 instruction, kept for reference: create the fairview-dev and fairview-staging projects in Supabase and fill in .env.local for development only. Then the schema goes in table by table, each table's RLS in the same migration that creates it, while the UX and Interface Skill's design system work runs in parallel. Invoke MASTER-VETTING-SKILL.md at the close of every phase from here forward, without exception.

## PAYROLL PROVIDER, STACK DECISION 2026-09-29

Decision by the user: use Plaid Payroll Income for payroll instead of waiting for Argyle ("I don't want us slowing down"). Logged here as CLAUDE.md requires for any stack change.
Reason: the listing names Argyle or Pinwheel. Argyle's sandbox application was still under review, and Pinwheel's own documentation routes sandbox access through a Client Success Manager, so both named vendors gate sandbox access behind sales approval. Plaid Payroll Income gives the same required data. The Plaid sandbox access was already working. It reuses the tested Plaid token, webhook, and retry machinery.
Verified before any design change: a real sandbox probe of /credit/payroll_income/get returned gross earnings, pay frequency, YTD, itemized deductions, pay period and pay date, employer, and rate and hours per earnings line (plus W-2 data). The probe action was then removed from plaid-sandbox.
Built:
- migration 1300 (provider_connections.product and provider_user_ref; income_records.provider_record_ref for idempotency);
- supabase/functions/_shared/payroll.ts, a pure mapping. It drops the employee, taxpayer id mask, distribution, and download link, and flags bonus and overtime for Phase 3;
- a product option on plaid-link-token and plaid-sandbox; INCOME webhooks routed by Plaid user id; ingestion-retry handles INCOME events;
- "Connect your payroll" in the Income step.
Tests:
- unit: 124;
- Plaid integration: 10 of 10, including payroll records from real sandbox data, no employee data stored, and a no duplicate re-read through the retry path;
- browser: 4 of 4. It caught a real bug: the second Plaid widget stayed disabled because the shared script's load callback fired once; fixed by checking readiness on use.
Argyle can still be added later as another adapter. Pinwheel facts, if ever needed: webhook header x-pinwheel-signature = "v2=" plus hex HMAC-SHA256 of "v2:{x-timestamp}:" plus the raw body, keyed with the API secret; sandbox login user_good / pass_good.
Documents updated for this decision: CLAUDE.md (stack line), MASTER-SPEC-1.md (scope and Milestone 2), PROCESS-RULES.md (three Phase 2 items reworded from Argyle to payroll, with the reason in the status line; first written here as two, corrected after the vetter counted three), RULES.md, TESTS.md, SECURITY.md, and PHASE-2-SPEC.md (as built 10 and 11).
Next: the Master Vetting sub-agent for Phase 2.

## PHASE 2 VETTING AND REWORK, 2026-09-29

First vetting: the Master Vetting sub-agent (fresh, grounded in every project document) ran against fairview-dev, the real Plaid Sandbox, and real Textract. Result: NOT COMPLETE, with 9 PASS and 3 FAIL, recorded in PHASE_2_REWORK.md.
- Item 5 (medium): on real Plaid data, recurring detection merged senders. Plaid's name field is "Venmo" for every deposit, and the sender is only in original_description. A one-off $500 gift was folded into a stream, and two regular senders produced no stream at all.
- Item 10 (medium): a reviewer could confirm with no family statement, and could write the family's statement.
- Item 8 (low): no three pipeline shape identity test existed (the property itself held by hand).

Rework, done 2026-09-29:
- Detector groups by sender (original_description, requested with include_original_description), and keeps amount outliers (more than 50 percent from the group median) out of a stream, listed for the reviewer. Confirmed on a sandbox diagnostic before the fix; a mutation check showed the new unit test fails under the old grouping.
- Migration 20260929001400 statement separation (SEC-P2-08).
- Atomic stream upsert, and review reasons that follow the source status (SEC-P2-09; vetter observation 2).
- tests/integration/shape-identity.test.ts runs all three pipelines for real and validates one stored row from each with the shared schema.
- Integration scenario for item 5 through the deployed functions (Alex monthly $100, Blake biweekly $50, Casey biweekly $85.50, plus a $500 gift from another sender): exactly three streams, each with 6 occurrences, and the gift in none. The test waits for Plaid's HISTORICAL_UPDATE, because Plaid delivers recent transactions first.
- plaid-sandbox remove action: test teardown removes its items at Plaid, so no late webhooks land after cleanup. The 12 orphan webhook_events rows in dev (including the 4 the vetter found at baseline) were deleted; dev webhook_events is now 0, and stays 0 after a full run.
- Docs: RULES.md names webhook_events as the fifth table without tenant_id; COLLABORATION-1.md and DESIGN.md no longer name Argyle as in use; the PROCESS-RULES status line says three reworded items; PHASE-2-SPEC.md AS BUILT 12 to 16.

Builder runs after the rework (not vetting evidence):
- unit: 128 of 128;
- integration: 18 of 18, run twice;
- isolation: 29 of 29 (Vitest summary and JSON report agree);
- e2e: 4 of 4;
- full Playwright: 9 of 9. One earlier full run had 1 failure (a toBeVisible timeout) that did not reproduce in two reruns. It is reported to the vetter as a possible flake.

Next action: re-launch the Master Vetting sub-agent for Phase 2. It must re-observe every item, not only 5, 8, and 10. Write PHASE_2_COMPLETE.md only if all pass.
After that, Phase 3:
- fold the CALC-SPEC draft (session scratchpad, calc-spec-phase3-draft.md; move it into the repository before the session ends) into CALC-SPEC-1.md and TESTS.md. The draft covers the 2026 imputation threshold $52,787 (the seed's $50,000 is wrong), passbook 0.40%, and cases 3.3, 5.3, 6.1, 7.1, and 8.1.
- add a migration correcting program_rule_sets.
- write PHASE-3-SPEC.md.
Two project conventions await the user's sign-off: a Schedule C loss counts as zero, and confirmed reimbursements are not income.

## PHASE 2 SECOND VETTING AND REWORK 2, 2026-09-30

Second vetting (fresh sub-agent; interrupted once by an API rate limit, then resumed with its baseline intact): NOT COMPLETE, 11 PASS and 1 FAIL, recorded in PHASE_2_REWORK_2.md.
- Item 5 (medium): one extra deposit from a regular sender removed the whole stream (cases A and E), or was counted into it (case B). A memo that varied split the sender (case C). A switch in schedule lost the stream (case F).
- Items 8 and 10 now pass on the vetter's own probes. Dev was returned to baseline with 0 differences.

Rework 2, done 2026-09-30:
- Detector rule v2 (PHASE-2-SPEC.md AS BUILT 17): the longest regular run per sender, with the rest listed; irregular senders surfaced; sender = two words after "from"; stream key without frequency (N4).
- Migration 20260930001500: record review reasons follow status at once (N1, AS BUILT 18).
- UI says "at irregular times" when there is no frequency.
- N5 fixed (COLLABORATION-1.md). N3 left for Phase 3 (AS BUILT 19).

Builder runs, not vetting evidence:
- unit: 137;
- integration: 19, including cases A, B, C, E, F and an irregular sender through plaid-sandbox, plus N1;
- isolation: 29, with the report at 340 of 340;
- Playwright: 9;
- dev leftovers: 0.

Next action: re-launch the Master Vetting sub-agent for Phase 2. Per PHASE_2_REWORK_2.md it must re-observe at least items 1, 5, 7, 8, and 10, plus the genericization check; a full re-observation is preferred.

## PHASE 2 THIRD VETTING AND REWORK 3, 2026-09-30

Third vetting: NOT COMPLETE, 11 PASS and 1 FAIL, recorded in PHASE_2_REWORK_3.md.
- Item 5 (medium): a one-off landing a few days after a scheduled deposit took that deposit's place (cases G, I, P). The averages were 3.4 to 5.8 percent low, and the wrong deposit was listed for the reviewer.
- Observations N7 to N11.

Rework 3, done 2026-09-30 (the user paused it once mid-way for battery, then resumed):
- Rule v2.1 (PHASE-2-SPEC.md AS BUILT 20): a scored tie-break (length, then amount, then timing, then earlier); active runs only (N7); RUN_SHARE 0.5 (N8).
- AS BUILT 17's merged-sender wording corrected (N9).
- The integration test confirms as a real reviewer (N10).
- AS BUILT 21: removed the router.refresh() calls that raced revalidatePath. That race was the cause of the browser test failure seen three times ("Your documents" never appeared). It reproduced in 2 full runs before the fix, and 3 full runs after the fix were clean.

Builder runs, not vetting evidence:
- unit: 144 (the old detector fails 5 of the new tests);
- integration: 20;
- isolation: 29, with the report at 340 of 340;
- Playwright: 9, three times;
- dev leftovers: 0.

Next action: re-launch the Master Vetting sub-agent for Phase 2 (a fourth vetting), with a full re-observation.

