# PHASE_2_REWORK_2.md — Project 1: Fairview Compliance Intake Platform

This is the second Phase 2 gate result, from the re-vet after the rework in commit 09506a4. An independent Master Vetting sub-agent wrote it, starting 2026-09-29. The sub-agent built no part of Phase 2. Before running anything, it read CLAUDE.md, MEMORY.md, COLLABORATION-1.md, MASTER-VETTING-SKILL.md, PROCESS-RULES.md, PHASE-2-SPEC.md (including AS BUILT 1 to 16), PHASE_2_REWORK.md, RULES.md, SECURITY.md, MASTER-SPEC-1.md, TESTS.md, DESIGN.md's Income step, and the Phase 2 code and migrations. The builder's reports, commit message, MEMORY.md, and SECURITY.md were treated as leads only.

All evidence below was produced in this session. It was run against fairview-dev (ref mdatwozuqdiwioezalom), its deployed Edge Functions, the real Plaid Sandbox, and real AWS Textract (eu-west-1). Times are UTC. The database clock and this machine agreed to within 0.1 s (DB 16:58:17.771Z, local 16:58:17.873Z).

The session was interrupted by an API rate limit after the last probe (17:26Z on 2026-09-29) and resumed at 07:11Z on 2026-09-30. On resuming, I re-read the state of every probe rather than assume it. Cleanup and the after-baseline were done on 2026-09-30.

Deployed code equals the commit. I downloaded all six deployed functions (supabase functions download --use-api, into a scratch folder) and diffed each against HEAD 09506a4. Every index.ts and every _shared module is identical. The live catalog lists all 14 migrations, including 20260929001400.

## Gate result: NOT COMPLETE

- 11 items PASS.
- 1 item FAILS: item 5 (medium).
- None BLOCKED.

The rework fixed what the first vetting found. Distinct senders now produce distinct streams, and a different-amount gift is kept out. Items 8 and 10 now pass on my own probes.

Item 5 still fails. On real Plaid Sandbox data, one extra deposit from a regular sender either makes the whole regular stream disappear, or is counted into the stream. The first is the same harm as the first vetting's Defect B: a genuine recurring contribution is silently never surfaced. The second breaks the first vetting's "To pass" criterion, that an irregular one-off deposit is not folded into a stream's count.

Do not write PHASE_2_COMPLETE.md until item 5 is fixed and vetted again. The fix touches recurring.ts, which is shared by the webhook, retry, and sandbox paths. So the next vet should re-observe at least items 1, 5, 7, 8, and 10, plus the genericization check.

## FAILING ITEMS

### Item 5, FAIL, medium

[ ] Plaid transaction classification identifies recurring peer to peer income transfers in a sandbox account and produces a recurring transfer income source.

**What passed: my own main scenario, exact.** Applicant VA (cedar-row) linked a custom sandbox user through the deployed plaid-sandbox at 17:03:07Z. The link returned 200 with status awaiting_data. Four real Plaid-signed webhooks were processed, all with signature_valid true, between 17:03:13Z and 17:03:15Z: SYNC_UPDATES_AVAILABLE, INITIAL_UPDATE, HISTORICAL_UPDATE, SYNC_UPDATES_AVAILABLE.

The scenario, all on one checking account, deliberately unlike the test's:
- Cash App from Morgan Lee: 175.00 every 14 days, 13 deposits (173 to 5 days ago), plus a 600.00 one-off from the same sender 96 days ago.
- Cash App from Jordan Pike: 62.25 weekly, 10 deposits (65 to 2 days ago).
- Cash App from Grandma Ruth: one 300.00 gift, 40 days ago.
- Zelle from Priya Shah: 410.00 on the 1st and 15th, 11 deposits (2026-04-15 to 2026-09-15).
- Venmo from Sam Okafor: 95.40 monthly, 6 deposits.
- Payroll deposits and rent outflows as noise.

In the final state (read at 17:03:35Z and again at 17:04:42Z, after HISTORICAL_UPDATE was processed), there were exactly 4 income_sources, each with exactly 1 income_record, all status awaiting_family_statement:

| Stream | Frequency | Average | Count | First | Last | Excluded |
|---|---|---|---|---|---|---|
| Cash App (Morgan) | biweekly | 175.00 | 13 | 2026-04-09 | 2026-09-24 | 1 (the 600.00 gift) |
| Cash App (Jordan) | weekly | 62.25 | 10 | 2026-07-26 | 2026-09-27 | 0 |
| Zelle (Priya) | semi_monthly | 410.00 | 11 | 2026-04-15 | 2026-09-15 | 0 |
| Venmo (Sam) | monthly | 95.40 | 6 | 2026-04-20 | 2026-09-17 | 0 |

- Every figure equals my inputs.
- Neither gift is in any stream's count, average, or dates.
- Grandma Ruth's single gift produced no source.
- Each record had gross_pay equal to the average, needs_review true, and review reason awaiting_family_statement. The transaction_ids count in raw_payload.stream equals occurrence_count.

**What failed: my adversarial scenario.** Applicant VC (cedar-row) linked a second custom user at 17:03:14Z. Its 4 signed webhooks were processed by 17:03:25Z, and I read the final state at 17:04:35Z.

| Case | Input | Expected by the rule | Stored |
|---|---|---|---|
| A | Venmo from Alex Moss: 100.00 monthly, 6 deposits (150 to 3 days ago), plus one extra 100.00 from the same sender 45 days ago | a monthly stream of 6; the extra left out and listed | **no source at all** |
| B | Zelle from Blair Ng: 50.00 biweekly, 12 deposits (157 to 3 days ago), plus one extra 50.00 from the same sender 66 days ago | a biweekly stream of 12; the extra left out | **biweekly, count 13**; excluded_transaction_ids empty |
| C | Venmo from Chris Po: 80.00 monthly, 6 deposits, memo alternating "utilities" and "rent share" | a monthly stream of 6 | **no source at all** |
| D | Zelle from Kim Lo: 120.00 monthly, 6 deposits, a different reference number each time | a monthly stream of 6 | monthly, 120.00, count 6 (correct) |
| E | Cash App from Robin Ye: 250.00 monthly, 5 deposits, plus one 150.00 from the same sender mid-month | a monthly stream of 5; the 150.00 left out | **no source at all** |

A third custom user (VC, linked 17:26:09Z; HISTORICAL_UPDATE processed by 17:26:18Z; re-read at 07:11Z on 2026-09-30) tested case F:

| Case | Input | Expected by the rule | Stored |
|---|---|---|---|
| F | Venmo from Taylor Fox: 40.00 biweekly for 11 deposits, then weekly for the last 4 weeks | a stream (biweekly or weekly) | **0 sources** |

**The cause is the detector, not Plaid's staged delivery.** I ran the committed supabase/functions/_shared/recurring.ts directly (Node, strip-types) on the same transactions:
- It reproduced every result above: no stream for A, C, E, and F, and Blair at count 13.
- The controls, the same senders without the extra deposit, gave "Alex Control" monthly 6, "Robin Control" monthly 5, and a biweekly-only Taylor at 13.

So a single extra deposit is enough to remove a regular stream, or to be counted into one.

The mechanism, from recurring.ts:
- The amount filter removes only deposits more than 50 percent from the median. A same-amount extra (A, B), or a 150 against 250 (E, 40 percent off), stays in the group.
- It then breaks the rule that at least 75 percent of the gaps fall in one band. A has 4 of 6 gaps in the monthly band, E has 3 of 5, and F has 10 of 14 in the biweekly band. So the whole group is discarded, with nothing surfaced.
- For B, 11 of 13 gaps are still biweekly, so the extra is accepted into the stream and counted.
- C fails because the grouping key is the full original_description text, so a changing memo splits one sender into groups too small to qualify.

**Why this is a gate failure and not an observation.**
- PHASE_2_REWORK.md's "To pass" required that "an irregular one-off deposit is not folded into a regular stream's count, average, or dates." Case B folds one into the count.
- It also asked that a mixed group be handled safely, "for example by surfacing it for the family's statement rather than dropping it." Cases A and E drop a regular contribution from a group that is mixed with one irregular deposit.
- The consequence is the first vetting's Defect B: regular income the family is never asked about and a reviewer never sees. For an income determination, that under-reports income.
- An extra payment from the same person, or a memo line, is ordinary behavior, not an exotic input.

**To pass:**
- On real Plaid Sandbox data, through the deployed functions, both of these hold:
  - A regular sender with one extra deposit, of the same amount (case A) and within the amount band (case E), still produces its stream. The extra is kept out of the stream's count, average, and dates, and is listed for the reviewer.
  - A same-amount off-schedule extra inside an otherwise regular series (case B) is kept out of the count.
- A group that does not classify cleanly is not silently discarded. Either it is surfaced for the family's statement, or the design documents in PHASE-2-SPEC.md AS BUILT why it is safe to drop, and a reviewer can see it.
- Decide and document how memo text in the description (case C) and a frequency change (case F) are handled.
- The integration test drives at least cases A, B, and E through plaid-sandbox.
- Also consider the code-read lead in new observation N4 (stream_ref includes the frequency) when changing the classification.

## PASSING ITEMS

[x] Plaid sandbox integration functional, produces a normalized income_records entry.

- VA's bank link (17:03:07Z) went from awaiting_data to ingested, driven by real Plaid-signed webhooks.
- It produced:
  - 1 asset_records row: "Vet Main Checking", last four digits only, account_number_encrypted null;
  - 4 income_sources;
  - 4 income_records, ingestion_method plaid.
- The stored bank record validates against the shared schema (item 8).
- The access token is stored encrypted: 117 bytes, with no plaintext "access-".

[x] Payroll sandbox integration (Plaid Payroll Income; Argyle or Pinwheel as the listing names, if later added) functional, produces a normalized income_records entry of identical shape to the bank pipeline's output.

- VA's plaid-sandbox link with product payroll_income (17:07:32Z to 17:07:39Z) returned 200: status ingested, 2 stubs.
- A real INCOME webhook for VA's Plaid user was received, signature_valid true, and processed.
- The connection has product payroll_income, a Plaid user reference, and an encrypted token (117 bytes).
- There are 2 income_records: ingestion_method plaid, source_type employment, source status detected, provider_record_ref set.
- The stored payroll row validates with the same 18-key set as the bank row (item 8).

[x] Textract Queries fallback pipeline functional against a sample scanned paystub, W-2, and Schedule C, each producing a normalized income_records entry of identical shape to the other two pipelines.

My own uploads, each going signed upload into VA's own folder, then an applicant_documents row, then document-ingest with VA's token:
- **Paystub** (17:07:40Z): 200, extracted, no review reasons.
  - Values: Fairview Parcel Services LLC, biweekly, rate 18.50, gross 1480.00, YTD 26640.00, period 2026-08-24 to 2026-09-06, pay date 2026-09-11, confidence 97.
  - Deductions total 276.02, which equals 1480.00 minus the fixture's net 1203.98.
- **W-2** (17:07:49Z): 200, needs_review (historical_annual). Gross 34120.50, annual, 2025-01-01 to 2025-12-31, confidence 99.
- **Schedule C** (17:07:55Z): 200, needs_review. self_employment, Sample Lawn Care, gross 24800.00, deduction schedule_c_line_28_total_expenses 7350.00, reason schedule_c_line_31:17450.00.
- All values equal tests/fixtures/documents/expected.json.
- **Two-page PDF** (17:08:01Z): 422 multi_page_pdf. The document status is failed, and no income record was created.
- **Re-ingest of the W-2** (17:08:03Z): 409 already_processed.
- The Textract paystub row validates with the same key set as the other two pipelines (item 8).

[x] Payroll ingestion captures gross pay, pay frequency, YTD earnings, and deductions.

VA's stored payroll rows:
- **Stub paid 2026-09-29:**
  - gross 2306.00, biweekly, rate 25.15;
  - YTD 2306.00 through 2026-09-28;
  - period 2026-09-14 to 2026-09-28;
  - deductions [taxes 1000.00].
- **Stub paid 2026-08-30:**
  - gross 2306.00, biweekly, YTD 2306.00 through 2026-08-29;
  - six itemized deductions: Social Security Tax 23.44, 401K 352.34, Medicare Tax 12.45, Dental Insurance 13.74, Federal Tax 612.91, State Tax 409.25.
- Both have needs_review true with the reason variable_earnings:bonus,overtime, deferred to Phase 3.
- The raw_payload keys are only deductions, document_id, earnings, employer, net_pay, pay_period_details, and source. employer holds {name} only.

[x] Webhook signature verification present and tested for every webhook provider in use (Plaid, which serves both bank and payroll; and Argyle if later added), even in sandbox mode.

- **Forgeries** (17:09:33Z to 17:09:37Z). Eight forged requests to plaid-webhook, naming my real item or my real payroll user, each returned 401 {"error":"invalid_signature"}:
  - no header
  - garbage
  - alg none
  - HS256
  - RS256
  - ES256 with no kid
  - ES256 signed by my own P-256 key with a real-looking kid and the correct body hash
  - ES256 with my key over an INCOME body naming my payroll user
- **What was recorded.** Exactly 8 new webhook_events rows, each with signature_valid false, status rejected, and no provider_ref: missing_signature, malformed_signature, wrong_algorithm (3), missing_key_id, bad_signature, and unknown_key. Events on my item and user stayed at 5, so nothing was processed.
- **Other method.** GET returned 405.
- **Valid path.** 13 real Plaid-signed events across my items and my payroll user were accepted (signature_valid true) and processed. They include the SYNC_UPDATES_AVAILABLE I fired at 17:06:43Z, processed at 17:06:47Z.
- **Unit coverage.** The stale-iat and tampered-body branches are covered by tests/unit/plaid-verify.test.ts, within my `npm test` run of 128 tests.
- Argyle is not in use.

[x] Integration test suite covering all three ingestion paths.

`npm run test:integration`, 17:01:45Z to 17:04:43Z, first attempt with no retry: "Test Files 3 passed (3)", "Tests 18 passed (18)". The three files:
- plaid.test.ts, 11 tests, including the rework item 5 scenario and payroll;
- textract.test.ts, 6 tests;
- shape-identity.test.ts, 1 test.

[x] Normalized income record shape identity test passes: one record from each pipeline validates against the single shared schema with an identical key set.

- **The test exists** (tests/integration/shape-identity.test.ts). It runs all three pipelines for real and validates one stored row from each with normalizedIncomeRecordSchema.
- **It passed in my runs:**
  - inside the full integration run above;
  - on its own at 17:23:46Z to 17:24:41Z: "Tests 1 passed (1)", with the check "one stored record from each pipeline rebuilds into the one schema with an identical key set".
- **By hand (17:08Z), with my own script.** I imported NORMALIZED_KEYS, normalizedIncomeRecordSchema, and toIncomeRecordRow from supabase/functions/_shared/normalized.ts.
  - NORMALIZED_KEYS has 18 keys. All 17 non-source_type keys are columns of income_records. The only income_records columns outside the mapping are id, created_at, and provider_record_ref.
  - I rebuilt one of VA's stored rows per pipeline from its own columns plus income_sources.source_type:
    - bank: Morgan's stream, 175.00 biweekly;
    - payroll: 2306.00 biweekly;
    - Textract: the 1480.00 paystub.
  - All three are valid, and all three key sets are identical to NORMALIZED_KEYS.
  - Negative control: each record with one extra key added was refused by the strict schema (false, false, false).

[x] New Phase 2 tables have tenant_id and RLS in the migration that creates them; isolation suite extended to them and to the private document storage bucket, and passing.

- **Catalog** (17:00Z):
  - provider_connections: RLS on, tenant_id present, 1 policy.
  - applicant_documents: RLS on, tenant_id present, 2 policies.
  - webhook_events: RLS on, 0 policies, no tenant_id, no grant of any kind to anon, authenticated, or PUBLIC. It is the documented platform exception, now named in RULES.md.
  - The applicant-documents bucket is private, with a 10485760 byte limit and jpeg, png, and pdf only. storage.objects has one INSERT and one SELECT policy.
  - Migration 20260928001000 creates these tables with their RLS and grants.
- **Suite.** `npm run test:isolation`, 17:10:53Z to 17:12:57Z:
  - Vitest: "Tests 29 passed (29)".
  - Newest report, isolation-2026-09-29T17-11-06-343Z.json: projectRef mdatwozuqdiwioezalom, total 340, passed 340, failed 0. My own recount of the entries is 340 of 340 with pass true.
  - It includes T5.3b (a reviewer writing the statement gets 42501) and T5.3c (a reviewer confirming before a statement gets 22023), each with its control, T5.1 and T5.6.
  - The summary and the report agree, so SEC-P1-05 does not apply.
- **By hand** (17:10:18Z to 17:10:42Z), as three users against VA's resources: VB (applicant, second tenant vet3-probe), VRB (reviewer, second tenant), and VC (another applicant in VA's own tenant).
  - document-ingest on VA's W-2: 404 for VB and VC, and 403 wrong_role for VRB.
  - Storage, for each of the three:
    - download and createSignedUrl: "Object not found";
    - listing VA's folder: 0 objects;
    - upload, signed upload URL, and upsert-overwrite into VA's folder: RLS violation;
    - remove: 0 objects.
  - Selects of VA's provider_connections, applicant_documents, income_sources, income_records, asset_records, and tenant audit_log: 0 rows each, for each of the three.
  - plaid-link-token and plaid-sandbox link naming VA's member, and fire_webhook, remove, and plaid-exchange on VA's connection: 404 for VB and VC, 403 for VRB. VA's connection kept its token and stayed ingested.
  - VB inserting a document row pointing at VA's object: check constraint 23514.
  - VB uploading under its own tenant prefix with VA's applicant id: RLS violation.
  - anon download: "Object not found".
  - The W-2's status was unchanged (needs_review). VA's folder held only VA's 4 objects, and the second tenant's prefix held 0.
  - Controls:
    - VA downloaded its own W-2 (90232 bytes).
    - Same-tenant reviewer VR downloaded it (90232 bytes; staff read within tenant, by design).
    - VB got a link-sandbox token for its own member.

[x] Recurring transfers follow PHASE-2-SPEC.md's rule: detected by software, stated by the family, confirmed by a reviewer; no transfer becomes income through software alone.

My probes (17:06:10Z to 17:06:18Z). The users were VA (applicant) and VR (reviewer) in cedar-row, VC (another applicant in cedar-row), and VB (applicant) and VRB (reviewer) in vet3-probe. Their JWT claims were checked: applicant and reviewer roles, with the right tenant ids.

- **Reviewer on an unstated source** (Jordan's weekly stream, awaiting_family_statement):
  - VR writing family_statement: 42501 "only the applicant can give the family's statement".
  - confirm_income_source with a reason, for confirmed_income, confirmed_excluded, and dismissed: 22023 "the family has not stated what this is yet", each time.
  - Direct updates of status, source_type, connection_method, and family_statement_at: 42501 "permission denied for table income_sources".
  - The source stayed unchanged (awaiting_family_statement, statement null, not stamped), and audit_log stayed at 0.
- **Applicant column limits**, on Morgan's stream:
  - VA updating source_type, connection_method, status, or average_amount: 42501.
  - VA calling confirm: 42501 "staff only".
  - Unchanged.
- **Other users:**
  - VC (same tenant) and VB (other tenant) writing VA's statement: 0 rows.
  - VB confirming: 42501.
  - VRB confirming: P0002 "source not found".
  - VRB writing the statement: 0 rows.
  - VRB selecting VA's sources: 0 rows.
- **Positive controls:**
  - VA stated Sam's stream regular_contribution: 1 row, status awaiting_review, family_statement_at stamped.
  - VA stated Priya's stream life_event_gift: 1 row.
  - VR confirming Sam with a blank reason, or with outcome awaiting_review: 22023.
  - VR writing Sam's (now stated) statement: 42501.
  - VR confirmed Sam as confirmed_income with a reason. audit_log went from 0 to 1 row: actor VR, action confirm_income_source, target income_sources, before {status awaiting_review, family_statement regular_contribution}, after {status confirmed_income}, and the reason.
  - A second confirm on Sam: 22023. VA re-stating the confirmed source: 42501.
- **Re-ingest does not reset state.** I fired SYNC_UPDATES_AVAILABLE through plaid-sandbox at 17:06:43Z. It was processed at 17:06:47Z with signature_valid true. Afterwards:
  - Every source kept its status, statement, and statement timestamp: Sam confirmed_income / regular_contribution / 17:06:16.270; Priya awaiting_review / life_event_gift / 17:06:16.623.
  - Counts, averages, and record ids were unchanged, with 4 sources and 4 records before and after.
  - The records' review reasons followed the status: Sam needs_review false with reasons []; Priya ["awaiting_review"]; the two unstated streams ["awaiting_family_statement"].
- **Spoofed source.** An applicant can still insert its own source labeled recurring_transfer / plaid (status detected). It cannot then state it (42501) or have it confirmed (22023). See N3.

[x] No raw Textract response, SSN, or full account number is stored anywhere, confirmed by query; raw provider payloads are stored redacted; Plaid access tokens are encrypted and unreadable by any client role.

- **Scan** (17:14:11Z). Present at the time: 11 income_records, 4 documents including my W-2, and 3 encrypted tokens. I scanned all 84 text, JSON, array, and enum columns in 20 public tables. The patterns were:
  - SSN, and a masked SSN
  - EIN
  - runs of 9 to 17 digits
  - raw Textract keys (Blocks, BlockType, Geometry, DocumentMetadata, BoundingBox, Relationships)
  - the fixture person's name and street
  - payroll employee strings, account_number, and routing
  - plaintext Plaid public and access tokens
- **3 hits, all one hash.** VC's Zelle stream_ref, a 32-hex SHA-256 prefix containing a 13-digit run, appears in income_sources.provider_stream_ref, income_records.provider_record_ref ("stream:" plus the hash), and raw_payload.stream.stream_ref. With that key removed, the payload has no digit run. None is a number, name, SSN, or raw key.
- **What is stored:**
  - Textract raw_payload keys are answers and document_kind. extracted_fields hold only the query aliases: 10 for the paystub, 4 for the W-2, 5 for the Schedule C.
  - The bank raw_payload is {rule, as_of, stream}, where stream holds Plaid ids, dates, and amounts.
  - The payroll raw_payload is as listed under item 4.
- **Encrypted columns.** ssn_encrypted and account_number_encrypted non-null: 0 each. Every account_last_four is 4 digits.
- **Tokens.** All 3 are 117 bytes, contain no plaintext "access-", and decrypt (as owner, via read_provider_token) to an access-sandbox token.
- **Client access.** VA, VR, and anon each got 42501 on all of:
  - selecting access_token_encrypted, `*`, or provider_user_ref from provider_connections;
  - read_provider_token and store_provider_token;
  - updating provider_connections;
  - selecting webhook_events.

  Control: VA's permitted columns returned 2 rows. The catalog shows no column grant on access_token_encrypted or provider_user_ref for anon or authenticated. EXECUTE on the token functions is held by postgres and service_role only.

[x] Genericization check from RULES.md run, exact command as written there, no output.

Run at 17:24:51Z on 2026-09-29, from the repository root, at HEAD 09506a4. The only untracked content was my temporary folder, and git grep covers tracked files only. I ran the exact command from RULES.md, section GENERICIZATION IS ENFORCED, NOT DECORATIVE, read from the file unmodified. It produced no output, exit code 1. It needs re-running once this file and the item 5 fix are committed.

## THE 8 OBSERVATIONS FROM PHASE_2_REWORK.md

1. **Bank deposit records not implemented.** Accepted as documented: PHASE-2-SPEC.md AS BUILT 12 records the decision and its reason. I saw no net_pay_only record from the payroll deposits in my main scenario, which matches.
2. **Records ignore confirmed status.** Addressed.
   - After my re-ingest at 17:06:47Z, the confirmed source's record had needs_review false and reasons [], and the stated source's had ["awaiting_review"].
   - The record ids were unchanged, and the source and record counts were equal (4 and 4), so the upsert neither duplicated nor dropped anything.
   - Residual: see N1.
3. **Applicants can relabel sources.** Addressed.
   - The catalog shows authenticated holds UPDATE on income_sources.family_statement only.
   - VA's updates of source_type and connection_method got 42501, and so did VR's.
   - Residual: see N3.
4. **webhook_events lacks tenant_id.** Addressed: RULES.md now names it as the fifth table without tenant_id, with the reason. The catalog matches (RLS on, no policy, no grant).
5. **Replay not tested end to end.** Still open, unchanged. A genuine Plaid signature cannot be captured from outside. Idempotency still rests on unique (provider, event_id = SHA-256 of body) plus the 5-minute iat window, which I read in plaid-webhook/index.ts and plaid-verify.ts. I did not exercise it.
6. **Integration teardown leaks a row.** Addressed. My integration run ended at 17:04:43Z. At 17:25:23Z, all 18 webhook_events rows in dev were my own (10 on my items, 8 of my forgeries), and 0 were anyone else's. The baseline had been 0.
7. **Sandbox items remain in Plaid.** Addressed, as far as I can observe.
   - plaid-sandbox has a remove action.
   - I removed my 3 bank items and 1 payroll item/user with it (4 times 200, 07:12:44Z to 07:12:50Z on 2026-09-30).
   - A fire_webhook on a removed item then failed at Plaid with ITEM_ERROR/ITEM_NOT_FOUND (07:13:24Z).
   - The suites' teardowns call remove (read in code). I cannot list Plaid's side to confirm their items are gone.
8. **Later-phase items unchanged.** Accepted as documented.
   - SECURITY.md still lists SEC-P2-02 to -06 for Phases 4 and 5.
   - PROCESS-RULES.md Phase 5 has the plaid-sandbox production exclusion.
   - The first vetting's document notes are fixed: the status line says "Three items were reworded", and DESIGN.md's Income step names Plaid Payroll Income. See N5 for one leftover.

## NEW OBSERVATIONS (not checklist failures)

- **N1. Review reasons lag the status until the next read.** Between VA's statement or VR's confirmation (17:06:16Z to 17:06:17Z) and the next ingestion (17:06:47Z), the records still said ["awaiting_family_statement"] while their sources were awaiting_review or confirmed_income. They catch up only when Plaid next sends data. Phase 3 and 4 should read the status from income_sources, or the statement and confirmation paths should refresh the record.
- **N2. The shape identity test's key-set assertion holds by construction.** fromRow() always builds the same 18 keys, so the informative part of the test is the schema validation. My negative control confirms the strict schema would refuse an extra key. No action needed. Noted so no one reads more into the key-set line than it checks.
- **N3. Applicant-inserted sources can carry any label.** The Phase 1 insert grant still lets an applicant create a source with source_type recurring_transfer and connection_method plaid, observed at 17:25:23Z, status detected. It cannot enter the statement and confirmation flow, so the rule holds. But connection_method on a source is not proof of provenance; provider_connection_id is. Consider restricting what an applicant may insert, or have Phase 3 key on provider_connection_id.
- **N4. Code-read lead, not observed:** stream_ref hashes the account, app, sender key, and frequency. If a sender's classified frequency changes between reads, for example when history arrives in stages or a pattern shifts (case F), a new source would be created and the old one left in place with its figures frozen. It would be worth covering when item 5 is reworked.
- **N5. One stale Argyle mention.** COLLABORATION-1.md, QA Test Agent Skill mandate, still says "integration tests against the Plaid and Argyle sandbox responses".
- **N6. Browser runs.** The builder reported an unreproduced toBeVisible flake. I did not reproduce it in 2 runs: 4 of 4, then 9 of 9. Both runs logged the known SEC-P2-07 "The destination stream closed early". The theming run also logged a server ErrorBoundary/RedirectErrorBoundary trace during tests 7 to 8, which did not fail any test.

## SUITES RUN BY THE VETTER

- `npm test` (17:01:09Z to 17:01:35Z): "Test Files 7 passed (7)", "Tests 128 passed (128)".
- `npm run test:integration` (17:01:45Z to 17:04:43Z, no retry needed): "Test Files 3 passed (3)", "Tests 18 passed (18)".
- shape-identity alone (17:23:46Z to 17:24:41Z): "Tests 1 passed (1)".
- `npm run test:isolation` (17:10:53Z to 17:12:57Z): "Tests 29 passed (29)". Report total 340, passed 340, failed 0, and the two agree.
- `npm run test:e2e` (17:17:28Z to 17:20:09Z; Playwright 1.60.0; app on port 3100): "4 passed (2.5m)".
- `npm run test:theming` (17:20:18Z to 17:23:34Z): "9 passed (3.0m)", the 4 e2e tests plus the 5 theming tests.
- Port 3000 (the user's other project) was listening throughout and was not touched. Port 3100 was free before the Playwright runs.

## TEST DATA AND CLEANUP

**Baseline** at 16:58:17Z on 2026-09-29, before anything I ran:
- tenants 1 (cedar-row), programs 3, program_rule_sets 3, ami_schedules 6
- theme_configs 1, properties 2, property_programs 3
- users 1, applicants 1, household_members 1, auth.users 1
- 0 in each of: income_sources, income_records, asset_records, provider_connections, applicant_documents, calculated_determinations, generated_documents, workflow_state, audit_log, webhook_events
- storage objects 0, in applicant-documents and in total
- Vault secrets cron_secret, functions_base_url, pii_key, provider_token_key; cron job ingestion-retry every 5 minutes
- Hashes: applicants 941abfca…, users 997ecfa0…, household_members a02f3299…, auth.users (id and email) 4551537a…

**What I created:**
- tenant vet3-probe, with its theme and property
- users VA, VC (cedar-row applicants), VR (cedar-row reviewer), VB (vet3-probe applicant), and VRB (vet3-probe reviewer), with 3 applicants and 3 household members
- 5 provider_connections: VA bank, VA payroll, VC adversarial, VC frequency switch, and VB's link_started from the control call
- 11 income_sources, including the one spoofed-label source for N3
- 11 income_records, 3 asset_records, 4 applicant_documents, and 4 storage objects
- 1 audit_log row
- 22 webhook_events: 14 from my items and payroll user, and my 8 forgeries

**Cleanup**, on 2026-09-30, 07:12:44Z to 07:14:14Z:
- The 4 Plaid items and payroll user were removed through plaid-sandbox "remove", confirmed by ITEM_NOT_FOUND.
- I waited 15 s, then removed the 4 storage objects and deleted all the rows above.
- webhook_events: deleted every row received since my baseline of 0. That was 22, all mine.
- The 5 auth users were deleted, and their public.users rows went with them.
- The vet3-probe tenant, theme, and property were deleted.

**After cleanup**, at 07:15:14Z on 2026-09-30, after a further 60 s wait for late webhooks: all 29 baseline values are identical, with 0 differences. That includes every table count, auth.users 1, storage 0, webhook_events 0, the Vault secret names, the cron job, and all four hashes. The real applicant's data was read only as counts and hashes, and never modified.

My temporary scripts and state file were deleted. The working tree is clean apart from this file. PHASE_2_REWORK.md is untouched.
