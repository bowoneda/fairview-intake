# PHASE_2_REWORK.md — Project 1: Fairview Compliance Intake Platform

This is the Phase 2 gate result. An independent Master Vetting sub-agent wrote it on 2026-09-29. The sub-agent did not build any part of Phase 2. It treated the builder's reports, MEMORY.md, SECURITY.md evidence, commit messages, and earlier test reports as leads only.

Every piece of evidence below was obtained by the sub-agent in this session against fairview-dev (project ref mdatwozuqdiwioezalom), its deployed Edge Functions, the real Plaid Sandbox, and real AWS Textract (eu-west-1). Timestamps are UTC. The database clock and this machine's clock agreed to within 1 second throughout (DB 10:32:28.8Z, local 10:32:28.3Z), so the 4 hour skew noted in Phase 1 is gone.

## Gate result: NOT COMPLETE

- 9 items PASS.
- 3 items FAIL: items 5, 8, and 10.
- None BLOCKED.

The two medium failures come first below. Do not write PHASE_2_COMPLETE.md until every failing item has been fixed and vetted again. Because the fixes touch shared code (the recurring detector and the income_sources guard), the re-vet must re-observe every item, not only these three.

## FAILING ITEMS

### Item 5, FAIL, medium

[ ] Plaid transaction classification identifies recurring peer to peer income transfers in a sandbox account and produces a recurring transfer income source.

What passed: detection works in the simple case, where each payment app has one sender. I linked my own custom sandbox user through plaid-sandbox at 10:48:33Z. Real Plaid-signed webhooks were then processed:
- INITIAL_UPDATE, HISTORICAL_UPDATE, and 2 SYNC_UPDATES_AVAILABLE, from 10:48:34Z to 10:48:36Z.

Those produced these income_sources rows, each with status awaiting_family_statement:
- Zelle, monthly, 310.00, 6 occurrences
- Cash App, weekly, 40.00, 8 occurrences
- Venmo, biweekly (see Defect A)

What failed: the classification is wrong on real Plaid Sandbox data once an account has more than one sender on the same app.

- **Defect A: a one-off gift was merged into a recurring stream.** The same account had:
  - six "Venmo from Casey Friend" deposits of 85.50, every 14 days (1 to 71 days ago)
  - one "Venmo from Birthday Gift" deposit of 500.00, 100 days ago

  The stored Venmo source showed:
  - occurrence_count 7
  - average_amount 144.71, which is exactly (6 × 85.50 + 500) / 7
  - first_seen 2026-06-21, which is the gift's date (100 days before 2026-09-29)

  So a life-event gift, which is excluded income under 5.609(b)(24), was folded into a regular stream. That inflates the typical amount shown to the family by 69 percent and moves the date range. The builder's unit test "keeps different senders and different accounts apart" passes on synthetic names, but the behavior does not hold on real Plaid data.
- **Defect B: two regular senders produced no stream at all.** At 10:58:30Z I linked a second custom user with:
  - "Venmo from Alex One": 100.00 monthly, 6 deposits
  - "Venmo from Blake Two": 50.00 biweekly, 6 deposits

  The design says this should give two streams. Result:
  - The connection reached ingested, and 4 signed webhooks were processed.
  - 0 income_sources were created.
  - I fired SYNC_UPDATES_AVAILABLE again at 10:58:57Z. It was processed with signature_valid true, and there were still 0 streams.

  Two genuine recurring contributions were silently missed. The family is never asked about them, and a reviewer never sees them.

- Likely cause, inferred from the observations and not confirmed against the raw Plaid payload: counterpartyKey() in supabase/functions/_shared/recurring.ts groups by `t.name ?? t.merchant_name`. For these transactions, Plaid's `name` appears to carry only the app, not the sender. So every inflow on one app and account falls into a single group, and a mixed group then fails, or distorts, the frequency band test.

To pass:
- On real Plaid Sandbox data, with at least the two scenarios above:
  - distinct senders on the same app produce distinct streams, or the design explicitly and safely handles a mixed group, for example by surfacing it for the family's statement rather than dropping it;
  - an irregular one-off deposit is not folded into a regular stream's count, average, or dates.
- An integration test drives these scenarios through the deployed functions, not only through the unit test's synthetic transactions.

### Item 10, FAIL, medium

[ ] Recurring transfers follow PHASE-2-SPEC.md's rule: detected by software, stated by the family, confirmed by a reviewer; no transfer becomes income through software alone.

What passed. These are my own probes from 10:51:37Z to 10:51:57Z, as applicant VA (cedar-row), reviewer VR (cedar-row), and applicant VB (a second tenant, vet2-probe):
- Status after detection:
  - Detected transfers start at awaiting_family_statement.
  - No software path moved any of them further. After a real re-ingest webhook (processed at 10:51:47Z), all three statuses and statements were unchanged, and the counts were still 3 sources and 3 records.
- Applicant attempts:
  - VA updating status: 42501 "permission denied for table income_sources", with status unchanged.
  - VA stating its payroll source, which has status detected: 42501 "a statement can only be given while the source awaits one".
  - VA stating the Zelle source (control): 1 row, status awaiting_review, family_statement_at stamped.
  - VA calling confirm_income_source: 42501 "staff only".
- Other tenant:
  - VB updating VA's statement: 0 rows, unchanged.
  - VB calling confirm_income_source: 42501.
- Reviewer attempts on the Zelle source:
  - Empty reason: 22023 "a reason is required".
  - Outcome awaiting_review: 22023.
  - Direct update of status: 42501.
  - With a reason (control): status confirmed_income. audit_log went from 0 to 1 rows: actor VR, action confirm_income_source, before {status awaiting_review, family_statement regular_contribution}, after {status confirmed_income}, and the reason.

What failed: the "stated by the family" part of the rule is not enforced, and the family's statement can be written by someone other than the family.
- **Defect C: a reviewer can confirm a transfer the family never stated.** The Venmo source had status awaiting_family_statement and family_statement null. VR called confirm_income_source with a reason. The result was status confirmed_income, with family_statement still null. So a transfer became confirmed income with no family statement at all. It was audited, but the rule's middle step was skipped. confirm_income_source accepts any prior status.
- **Defect D: a reviewer can write the "family's" statement, with no audit record.** VR updated the Cash App source's family_statement to gig_or_business_income, and the update succeeded (1 row). The guard trigger stamped family_statement_at as if the family had answered, left the status at awaiting_family_statement, and wrote no audit_log row (still 2). VR then confirmed it. The confirmation's audit before_value records that statement as though it were the family's.

  The cause: family_statement is granted for update to all authenticated users, and the income_sources update policy admits staff. app.income_source_statement_guard only restricts the applicant role.

To pass:
- confirm_income_source refuses a recurring transfer that has no family statement. A reviewer override is fine if it is explicit and distinguishable, for example by requiring awaiting_review, or by a separate, audited override outcome that PHASE-2-SPEC.md documents.
- family_statement can be set only by the applicant who owns the source. Any staff change is refused, or goes through an audited function that records who wrote it.
- The isolation suite gains regression checks for both defects, with positive controls.

### Item 8, FAIL, low

[ ] Normalized income record shape identity test passes: one record from each pipeline validates against the single shared schema with an identical key set.

What I observed:
- **No such test exists.** A search of tests/ for a test that takes one record from each of the three pipelines (bank, payroll, Textract) and compares them finds none. The closest tests:
  - tests/unit/payroll.test.ts and tests/unit/textract.test.ts each compare their own record's keys with NORMALIZED_KEYS.
  - The bank pipeline's record is built inline in ingestItem (supabase/functions/_shared/plaid.ts). It has no key set assertion in any test, unit or integration.
  - The integration suites do not validate stored rows against the schema.
  - normalized.ts's comments refer to "the shape identity test", which does not exist.
- **The property itself holds, by my hand check (10:50:23Z).** I took one stored row from each pipeline, created by my own flows:
  - bank: the Zelle recurring transfer
  - payroll: the Plaid Payroll Income stub dated 2026-09-29
  - Textract: the W-2

  For each, I rebuilt the record from income_records plus income_sources.source_type and ran it through the shared normalize() (imported from supabase/functions/_shared/normalized.ts). Results:
  - All three are valid.
  - All three have identical 18-key sets, equal to NORMALIZED_KEYS.
  - Every normalized column is present in each stored row, and no row has any non-normalized column.

  The paystub and Schedule C rows I ran by hand at 10:56:17Z and 10:56:23Z also validated, with the same key set.

To pass: a test that does what the item says. It should take one real record from each pipeline, preferably the rows the integration suites store, validate each with normalize(), and assert the three key sets are identical. It must pass in a run the vetter performs.

## PASSING ITEMS (evidence for the re-vet; not a completion claim)

[x] Plaid sandbox integration functional, produces a normalized income_records entry.

- My bank link at 10:48:33Z returned HTTP 200 with status awaiting_data. Plaid's signed webhooks then drove ingestion, and by 10:49:30Z the connection was ingested.
- It produced:
  - 1 asset_records row: checking, "Vet Checking", last four digits only, balance 2310.55 (exactly my custom user's starting balance), account_number_encrypted null.
  - 3 income_sources rows.
  - 3 income_records rows with ingestion_method plaid, needs_review true, and review reason awaiting_family_statement.
- One of those records validated against the shared schema (see item 8).

[x] Payroll sandbox integration (Plaid Payroll Income; Argyle or Pinwheel as the listing names, if later added) functional, produces a normalized income_records entry of identical shape to the bank pipeline's output.

- plaid-sandbox link with product payroll_income at 10:48:49Z returned HTTP 200: status ingested, 2 stubs.
- A real Plaid-signed INCOME.USER_INCOME_VERIFICATION webhook was received at 10:48:48Z, with signature_valid true, and processed.
- There were 2 income_records rows (ingestion_method plaid, source_type employment, provider_record_ref set).
- The connection had product payroll_income and a Plaid user reference, with the token stored encrypted.
- Its key set is identical to the bank record's (see item 8, hand check).

[x] Textract Queries fallback pipeline functional against a sample scanned paystub, W-2, and Schedule C, each producing a normalized income_records entry of identical shape to the other two pipelines.

- **By hand.** Each upload went through a signed upload URL into my own folder, then an applicant_documents row, then document-ingest:
  - W-2 at 10:49:06Z: HTTP 200 needs_review (historical_annual). gross_pay 34120.50, annual, 2025-01-01 to 2025-12-31, confidence 99.
  - Paystub at 10:56:17Z: HTTP 200 extracted. biweekly, rate 18.50, gross 1480.00, YTD 26640.00, period 2026-08-24 to 2026-09-06, pay date 2026-09-11, deductions total 276.02.
  - Schedule C at 10:56:23Z: HTTP 200 needs_review. self_employment, gross 24800.00, a line 28 deduction of 7350.00, review reason with line 31 17450.00.
  - All values equal tests/fixtures/documents/expected.json.
  - All three validate with the same key set.
  - Re-ingesting the W-2 returned 409 already_processed.
- **Suite.** The Textract tests passed 6 of 6 inside my `npm run test:integration` run (see item 7).

[x] Payroll ingestion captures gross pay, pay frequency, YTD earnings, and deductions.

These are my stored rows, not the suite's. Two stubs:
- **Stub dated 2026-09-29:** gross 2306.00, biweekly, rate 25.15, YTD 2306.00, period 2026-09-14 to 2026-09-28, deductions [taxes 1000.00].
- **Stub dated 2026-08-30:**
  - gross 2306.00, biweekly, YTD 2306.00;
  - six itemized deductions: Social Security Tax 23.44, 401K 352.34, Medicare Tax 12.45, Dental Insurance 13.74, Federal Tax 612.91, State Tax 409.25.

Both stubs have needs_review true, with the reason variable_earnings:bonus,overtime. That is the Phase 3 question, correctly deferred.

[x] Webhook signature verification present and tested for every webhook provider in use (Plaid, which serves both bank and payroll; and Argyle if later added), even in sandbox mode.

- **Forged requests** (10:50:46Z to 10:50:50Z). My own requests to plaid-webhook, each with a body naming my real item. Every one returned HTTP 401 {"error":"invalid_signature"}:
  - no header
  - garbage
  - alg none
  - HS256
  - RS256
  - ES256 with no kid
  - an ES256 token signed by a P-256 key I generated, with the correct body hash
- **What was recorded.** Exactly 7 new webhook_events rows, all signature_valid false and status rejected, with types missing_signature, malformed_signature, wrong_algorithm (3), missing_key_id, and unknown_key. No event was recorded against my item, so nothing was processed.
- **Other method.** GET returned 405.
- **Valid path.** I observed 6 real Plaid-signed events, all signature_valid true and processed. That covers both products, including an INCOME event for payroll and a SYNC_UPDATES_AVAILABLE I triggered with fire_webhook at 10:51:46Z.
- **Unit coverage.** The stale-iat and tampered-body branches are covered by tests/unit/plaid-verify.test.ts, which ran in my unit run.
- Argyle is not in use.

[x] Integration test suite covering all three ingestion paths.

- **First run** (10:32:51Z to 10:34:42Z): 15 of 16. One test failed with a network ConnectTimeoutError (UND_ERR_CONNECT_TIMEOUT) to Supabase, not an assertion. I do not count that run.
- **Retry once** (10:34:49Z to 10:37:37Z): "Test Files 2 passed (2), Tests 16 passed (16)". That is:
  - plaid.test.ts, 10 tests: bank, recurring, signed webhook, retry, pg_net wiring, forged webhooks, payroll, and cross-applicant checks;
  - textract.test.ts, 6 tests: paystub, W-2, Schedule C, no-PII, two-page PDF refused, and cross-applicant checks.

[x] New Phase 2 tables have tenant_id and RLS in the migration that creates them; isolation suite extended to them and to the private document storage bucket, and passing.

- **Catalog** (10:55:33Z):
  - provider_connections: RLS on, tenant_id present, 1 SELECT policy.
  - applicant_documents: RLS on, tenant_id present, SELECT and INSERT policies.
  - webhook_events: RLS on, 0 policies, no tenant_id. This is the platform table by design; see Observations.
  - applicant-documents bucket: private, 10 MB limit, jpeg/png/pdf only, with storage.objects INSERT and SELECT policies.
  - Migration 20260928001000 creates each of these tables together with its RLS, grants, and policies.
- **Suite** (`npm run test:isolation`, 10:37:45Z to 10:39:53Z):
  - Vitest summary: "Tests 29 passed (29)", 1 file.
  - Newest report: tests/isolation/reports/isolation-2026-09-29T10-37-57-103Z.json. projectRef mdatwozuqdiwioezalom, total 338, passed 338, failed 0. I recounted the entries myself.
  - The report includes X, X4, and AP reads over provider_connections and applicant_documents (0 foreign rows), T1 to T5 (19 entries), and storage cross-download and cross-upload denials.
  - The summary and the report agree, so the SEC-P1-05 condition does not apply.
- **By hand** (10:52:43Z to 10:52:51Z), as VB of a second tenant:
  - Access to VA's resources:
    - document-ingest on VA's W-2: 404, and the document's status was unchanged.
    - Storage download of VA's W-2: "Object not found".
    - createSignedUrl for VA's W-2: "Object not found".
    - createSignedUploadUrl into VA's folder: RLS violation.
    - Direct upload into VA's folder: RLS violation.
    - Upload under VB's own tenant prefix but VA's applicant id: RLS violation.
    - Listing VA's folder: 0 objects.
  - Function calls naming VA's member or connections:
    - plaid-link-token with VA's household member (bank and payroll): 404.
    - plaid-sandbox link with VA's member: 404.
    - fire_webhook on VA's connection: 404.
    - plaid-exchange on VA's connection: 404.
  - A document row pointing at VA's object: check constraint 23514.
  - Selects by VA's applicant id on 5 tables: 0 rows.
  - Nothing was created for VB, and the only object in VA's folder was VA's own.
  - Controls:
    - VA downloaded its own W-2 (90232 bytes).
    - VB received a link-sandbox token for its own member.

[x] No raw Textract response, SSN, or full account number is stored anywhere, confirmed by query; raw provider payloads are stored redacted; Plaid access tokens are encrypted and unreadable by any client role.

Method: at 10:53:45Z, and again at 10:56:35Z once all three document kinds were stored, I scanned all 63 text, JSON, and array columns in 19 public tables. My W-2 (whose image shows the fixture's placeholder SSN and EIN) and my payroll and bank connections were present at the time. The patterns were:
- SSN
- EIN
- runs of 9 to 17 digits
- raw Textract keys (Blocks, BlockType, Geometry, DocumentMetadata, BoundingBox, Relationships)
- payroll employee strings (the sandbox employee's name and street, "employee", "taxpayer", download_url, distribution_breakdown)
- the W-2 person's name
- plaintext Plaid tokens

Results:
- **Pattern hits: 7, all hashes.** 2 are inside my 32-hex recurring stream_ref, and 5 are webhook_events.event_id values (4 SHA-256 hex and 1 rejected:uuid). None is a number, name, SSN, or raw key.
- **What is stored.**
  - W-2 extracted_fields and raw_payload hold only tax_year, box1_wages, employer_name, and box5_medicare_wages, each as text plus confidence.
  - The payroll raw_payload keys are source, net_pay, earnings, employer {name only}, deductions, document_id, and pay_period_details.
  - The bank raw_payload holds the rule, as_of, and stream (Plaid ids, dates, amounts).
- **Encrypted columns.** ssn_encrypted and account_number_encrypted non-null: 0 each. Every account_last_four is 4 digits.
- **Tokens.** Both stored tokens (117 bytes each) have no plaintext "access-" in their bytes, and each decrypts, as owner, to an access-sandbox token.
- **Client access to tokens.** Each of these returned 42501:
  - VA selecting access_token_encrypted, `*`, or provider_user_ref
  - VR (reviewer) selecting access_token_encrypted
  - anon selecting access_token_encrypted
  - VA or VR calling read_provider_token
  - VA calling store_provider_token

  Control: VA's permitted columns returned 2 rows. information_schema showed no column or table privilege on those columns for anon, authenticated, or public.

[x] Genericization check from RULES.md run, exact command as written there, no output.

Run at 10:55:43Z, from the repository root, at HEAD 521934e with a clean tree. I ran the exact git grep command written in RULES.md, section GENERICIZATION IS ENFORCED, NOT DECORATIVE, unmodified. It produced no output, exit code 1. It needs re-running after this file and any fixes are committed.

## Other suites run by the vetter

- `npm test` (10:31:01Z): 7 files, 124 of 124 passed.
- `npm run test:e2e` (10:40:32Z to 10:42:51Z; Playwright 1.60.0 unchanged; app on port 3100): 4 of 4 passed. That covers:
  - a real paystub upload read by Textract
  - the two-page PDF refused
  - a transfer answered through the form
  - the assets empty state
- `npm run test:theming` (10:42:56Z to 10:46:17Z): 9 of 9 passed, the 5 theming tests plus the 4 e2e tests. The server logged a React hydration warning (caret-color on the preview error input) and the known SEC-P2-07 "destination stream closed early".
- Port 3000 (the user's other project, pid 96) was not touched. Port 3100 was free before and after.

## On the Argyle to Plaid Payroll Income rewording

The decision is properly logged:
- MEMORY.md has the section PAYROLL PROVIDER, STACK DECISION 2026-09-29, with the reason and a pre-change sandbox probe.
- The CLAUDE.md stack line is updated.
- It is recorded as PHASE-2-SPEC.md AS BUILT 10.
- It is reflected in MASTER-SPEC-1.md scope and Milestone 2.

In my judgment the rewording preserves the requirement:
- The payroll items still demand verified payroll data with gross pay, frequency, YTD, and deductions, in the same normalized shape. I verified all of that on real sandbox data.
- The webhook item still requires verification for every provider in use.

Two accuracy notes:
- The PROCESS-RULES.md status line says "Two items were reworded", but git show 521934e shows three: payroll integration, payroll ingestion, and webhook verification. The third also preserves its requirement, but the status line should say three.
- COLLABORATION-1.md's stack line, DESIGN.md's Income step ("Connect your payroll (Argyle)"), and the body of PHASE-2-SPEC.md still name Argyle. AS BUILT overrides the spec body, but the other two documents should be brought in line.

## Observations (not checklist failures)

1. **Bank deposit records are not implemented.** PHASE-2-SPEC.md's mapping says bank payroll deposits become a record with gross_pay null and reason net_pay_only, as corroboration. The build writes bank records only for recurring transfers, and this is not listed in AS BUILT.
2. **Records ignore confirmed status.** A re-ingest deletes and re-inserts the income_records row of a confirmed recurring source, with review_reasons ["awaiting_family_statement"], even after the source is confirmed_income. The source status is right, but the record's reason is stale.
3. **Applicants can relabel sources.** An applicant can change source_type on any of their own income_sources, including Plaid-detected transfers and payroll sources. That is Phase 1's column grant; I observed recurring_transfer changed to employment, 1 row. Consider restricting it to sources the applicant created.
4. **webhook_events lacks tenant_id.** This is a fifth table without tenant_id, by design (PHASE-2-SPEC.md: written before a tenant is known, no payload, no client access). RULES.md still says only the four reference tables lack tenant_id, and should name this exception.
5. **Replay not tested end to end.** Replay of a genuine signed webhook could not be tested, because a genuine Plaid signature header cannot be captured from outside. Idempotency rests on unique (provider, event_id = SHA-256 of body) plus the 5-minute iat window, which I read in code and the migration. It is not exercised end to end.
6. **Integration teardown leaks a row.** tests/integration/plaid.test.ts's teardown leaves one "unknown item" webhook_events row per run: its provider_ref is altered, so the cleanup query misses it. Four such builder rows existed before I started. I removed the two my runs added.
7. **Sandbox items remain in Plaid.** The Plaid Sandbox items and users my flows created (3 items, 1 payroll user) remain on Plaid's side. The platform has no item removal path yet. Its data was deleted from fairview-dev.
8. **Later-phase items unchanged.** The known later-phase items in SECURITY.md are unchanged: SEC-P2-02 to -06 (rate limits, retention of uploaded documents, CSP, write amplification) and plaid-sandbox's production exclusion.

## Test data and cleanup

Baseline at 10:32:28Z, before anything I ran:
- tenants 1 (cedar-row), programs 3, program_rule_sets 3, ami_schedules 6
- theme_configs 1, properties 2, property_programs 3
- users 1, applicants 1, household_members 1, auth.users 1
- 0 in each of: income_sources, income_records, asset_records, provider_connections, applicant_documents, calculated_determinations, generated_documents, workflow_state, audit_log
- webhook_events 4 (the builder's leftovers)
- storage objects 0
- vault secrets cron_secret, functions_base_url, pii_key, provider_token_key; cron job ingestion-retry every 5 minutes
- the real applicant row hash 941abfca…, users table hash 997ecfa0…

After cleanup, at 11:00:30Z: identical on every count and both hashes. Test users matching vet2-, int-, iso-, and e2e- numbered 0. Tenants vet2-probe and harborpoint numbered 0. webhook_events was 4.

What I created and removed:
- tenant vet2-probe with its theme and property
- users VA, VR, and VB, with their 2 applicants and household members
- 4 provider_connections: VA's bank, payroll, and two-sender links, plus the link_started row from VB's control call
- 7 income_sources, 8 income_records, and 2 asset_records
- 3 applicant_documents and 3 storage objects
- 20 webhook_events rows: my 7 forgeries, the valid events for my items, and the 2 leftover rows from my integration runs

The suites' own fixtures were removed by their teardowns, and the counts above confirm it. The real applicant's data was read as counts and hashes only, and never modified. My temporary scripts and state file were deleted, and the working tree is clean apart from this file.
