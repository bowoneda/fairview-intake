# PHASE_2_REWORK_4.md — Project 1: Fairview Compliance Intake Platform

This is the fourth Phase 2 gate result. It comes from the re-vet after rework 3, commit d0fcf14. An independent Master Vetting sub-agent wrote it on 2026-09-30 and 2026-10-01. It built no part of Phase 2.

Before running anything, it read these documents in full:
- CLAUDE.md, MEMORY.md, COLLABORATION-1.md, MASTER-VETTING-SKILL.md, and PROCESS-RULES.md;
- PHASE-2-SPEC.md, including AS BUILT 1 to 21;
- PHASE_2_REWORK.md, PHASE_2_REWORK_2.md, and PHASE_2_REWORK_3.md;
- RULES.md, SECURITY.md, MASTER-SPEC-1.md (data model and Milestone 2), TESTS.md, and DESIGN.md's upload control and Income, Assets, and Documents steps;
- the code: supabase/functions/_shared/ (recurring.ts at rule v2.1), every function's index.ts, the 15 migrations, components/ingestion/document-uploader.tsx, app/[tenant]/apply/ingestion-actions.ts, and every test.

The builder's reports, commit messages, MEMORY.md, SECURITY.md, and the AS BUILT claims were treated as leads only.

All evidence below was produced in this session. It was run against fairview-dev (ref mdatwozuqdiwioezalom), its deployed Edge Functions, the real Plaid Sandbox, and real AWS Textract (eu-west-1). Times are UTC. The database clock and this machine agreed to within 0.5 s (DB 20:43:08.287Z, local 20:43:08.715Z).

The session was paused by an API usage limit between 21:40Z on 2026-09-30 and 05:03Z on 2026-10-01. On resuming I checked the state first: port 3100 was free, the generated types typechecked (tsc exit 0), and all of my test data was still in place. Nothing was cut off halfway; the full Playwright run in progress at the pause had finished and written its log.

**Deployed code equals the commit.** I downloaded the six deployed functions separately (supabase functions download --use-api, into a scratch folder), each with its own _shared bundle, and diffed all 42 files against the working tree at HEAD d0fcf14, which was clean. All 42 are identical. The live catalog lists 15 migrations, the latest 20260930001500.

## Gate result: NOT COMPLETE

- 11 items PASS.
- 1 item FAILS: item 5 (medium).
- None BLOCKED.

Rework 3 fixed the shapes the third vetting found. I re-ran G, I, and P with my own names, amounts, and dates on the real Plaid Sandbox, plus same-amount extras at the start, middle, and end of a run, and a sample of A, B, C, E, and F. All were right.

Item 5 still fails, on two new shapes that are ordinary behavior:
1. **A sender whose amounts vary.** A one-off a few days after a scheduled deposit takes that deposit's place whenever the one-off is closer to the sender's median amount. Rule v2.1 compares amounts before timing. This is the G and P failure again (the one-off in the average, and in the last date, and the wrong deposit listed), under a different amount condition.
2. **One missed payment.** A biweekly sender who misses one payment is stored as monthly, with half of its genuine deposits listed as exceptions. A weekly sender who misses one week is stored as biweekly, also with half listed. Phase 3 would annualize these at less than half of the real figure. AS BUILT 20 does not describe this outcome.

Everything else passes on my own probes, including separation of duties (item 10) and N1, observed as real users.

Do not write PHASE_2_COMPLETE.md until item 5 is fixed and vetted again. The fix will touch recurring.ts again, which the webhook, retry, and sandbox paths share. So the next vet should re-observe at least items 1, 5, 7, 8, and 10, plus the genericization check.

## FAILING ITEMS

### Item 5, FAIL, medium

[ ] Plaid transaction classification identifies recurring peer to peer income transfers in a sandbox account and produces a recurring transfer income source.

**How I tested.**
- I designed two custom Plaid Sandbox users with 24 senders between them (11 on VA1, 13 on VA2). Every sender is on one checking account per user.
- Both accounts also held noise: 13 biweekly payroll deposits, 6 rent outflows, and 2 Venmo outflows. None produced a source.
- I first ran every sender through the committed recurring.ts locally (Node, strip-types, as of 2026-09-30) to predict the result.
- I then linked both through the deployed plaid-sandbox with action "link", as two cedar-row applicants, VA1 and VA2, at 20:51:10Z. I polled income_sources every 3 s while Plaid delivered history in stages.
  - Both links returned 200 awaiting_data at 20:51:16Z.
  - Eight real Plaid-signed webhooks were processed, all with signature_valid true: INITIAL_UPDATE, HISTORICAL_UPDATE, and SYNC_UPDATES_AVAILABLE twice, per item. Both items were done by 20:51:33Z.
  - Sources grew from 1 to 5 to 11 (VA1), and from 1 to 4 to 9 to 13 (VA2). At every poll, the number of distinct provider_stream_ref values equaled the number of sources, and no source was ever half filled.
- I read the final state at 20:55:18Z. **All 24 stored streams equal the local prediction exactly**: frequency, average, count, first and last dates, and the number excluded.
- Every stored record had gross_pay equal to the average, pay_period_start and pay_period_end equal to first_seen and last_seen, needs_review true, and reasons ["awaiting_family_statement"] (plus "irregular_pattern" for irregular senders). Each record's transaction_ids count equals occurrence_count.

**How "which deposit is listed" was checked.** The stored payload holds only Plaid's transaction ids, and Plaid's secret is not on this machine, so I cannot fetch Plaid's own list of ids and dates. The identity of the excluded deposit is shown three ways:
- When the extra has a distinct amount, the stored average tells which amount was left out.
- When the extra is at the start or end of the run, first_seen or last_seen tells which date was kept.
- In every case, the stored result equals the local run of the committed detector, which names each excluded deposit.

**What passed: the prior failing shapes, with my own inputs (VA1).**

| Case | My input | Stored (final) | Result |
|---|---|---|---|
| G | Zelle from Nadia Brook, 380.00 every 30 days from 2026-04-08 (6), plus 245.00 on 2026-07-10, 3 days after the 07-07 deposit | monthly, 380.00, count 6, 04-08 to 09-05, 1 excluded | correct; the 245.00 is out |
| I | Zelle from Pia Moreau, 325.00 on the 1st and 16th, 11 deposits (04-16 to 09-16), plus 210.00 on 06-04 | semi_monthly, 325.00, count 11, 04-16 to 09-16, 1 excluded | correct |
| P | Cash App from Quin Adler, 520.00 every 30 days, last on 09-25, plus 340.00 on 09-28 | monthly, 520.00, count 6, 04-28 to **09-25**, 1 excluded | correct; last_seen is the scheduled date |
| Same amount, at the end | Venmo from Rory Blake, 160.00 every 30 days, last on 09-26, plus 160.00 on 09-29 | monthly, 160.00, count 6, 04-29 to **09-26** | correct; the extra is the one listed |
| Same amount, at the start | Zelle from Sam Ortiz, 140.00 every 30 days from 04-05, plus 140.00 on 04-08 | monthly, 140.00, count 6, **04-05** to 09-02 | correct; the extra is the one listed |
| Same amount, mid-run | Venmo from Owen Pratt, 180.00 every 30 days, plus 180.00 on 07-13 (4 days after 07-09) | monthly, 180.00, count 6, 1 excluded | correct by prediction (the figures cannot tell) |
| A | Venmo from Tess Lowry, 125.00 monthly (6), plus 125.00 on 06-25, mid-month | monthly, 125.00, count 6, 1 excluded | correct |
| B | Zelle from Uri Voss, 70.00 every 14 days (12), plus 70.00 on 07-03 | biweekly, 70.00, count 12, 1 excluded | correct |
| C | Venmo from Val Ng, 95.00 monthly (6), memo alternating "for groceries" and "phone bill" | monthly, 95.00, count 6, 0 excluded | correct; one source |
| E | Cash App from Wyn Hart, 280.00 monthly (5), plus 175.00 on 07-28 | monthly, 280.00, count 5, 1 excluded | correct |
| F | Venmo from Xan Cole, 60.00 every 14 days (6, to 06-17), then weekly (14, 06-24 to 09-23) | one source: weekly, 60.00, count 15, 06-17 to 09-23, 5 listed | correct; one source, the active schedule |

**What passed: attacks on rule v2.1 (VA2).**

| Attack | My input | Stored | Classification |
|---|---|---|---|
| Extra 3 days **before** a scheduled date | Zelle from Abe Rowe, 180.00 every 30 days, plus 120.00 on 07-05 (scheduled 07-08) | monthly, 180.00, count 6, 1 excluded | correct |
| Extra equidistant between two scheduled dates | Cash App from Bo Tran, 300.00 every 30 days, plus 300.00 on 06-25, 15 days after 06-10 | monthly, 300.00, count 6, 1 excluded | correct |
| Two extras near one scheduled date | Zelle from Cy Dunn, 200.00 every 30 days, plus 200.00 at +2 days and 160.00 at +5 days after 07-12 | monthly, 200.00, count 6, 2 excluded | correct |
| Larger in-band extra (1.4 times) | Venmo from Di Park, 100.00 every 30 days, plus 140.00 on 08-17, 3 days after 08-14 | monthly, 100.00, count 6, 1 excluded | correct |
| Semi-monthly, same-amount extra after the 16th | Zelle from Ida Paz, 275.00 on the 1st and 16th (11), plus 275.00 on 08-19 | semi_monthly, 275.00, count 11, 1 excluded | correct |
| Restart, current schedule more than half | Zelle from Gus Pena, 90.00: 04-04 and 05-04, a pause, then 06-20 to 09-18 every 30 days (4) | monthly, 90.00, count 4, 06-20 to 09-18, 2 listed | accepted as documented (AS BUILT 20) |
| Restart, current schedule less than half | Zelle from Hal Ito, 95.00: 4 deposits 28 days apart from 04-04, then 3 deposits 25 days apart from 08-10 | irregular, 95.00, count 7, all seven | accepted as documented (AS BUILT 20); surfaced |
| Chance rhythm among irregular deposits | Venmo from Kit Lam, 65.00 on 8 irregular dates | irregular, 65.00, count 8, reasons [..., "irregular_pattern"] | correct (N8 fixed) |
| Monthly, one month missed | Cash App from Fay Orr, 150.00 every 30 days with the 5th of 6 missing | irregular, 150.00, count 5 | accepted as documented (AS BUILT 20); surfaced |

**What failed (VA2), stored on the real Plaid Sandbox at 20:55:18Z.**

| Case | My input | Expected by the rule | Stored |
|---|---|---|---|
| V1, amounts vary, extra mid-run | Zelle from Vic Hale, monthly: 240.00 (04-17), 310.00 (05-17), 265.00 (06-16), 330.00 (07-16), 225.00 (08-15), 290.00 (09-14); plus 280.00 on 08-18, 3 days after 08-15 | monthly, 276.67, count 6; the 280.00 listed | **monthly, 285.83**, count 6, 04-17 to 09-14, 1 excluded: **the 225.00 of 08-15** |
| V2, amounts vary, extra at the end | Venmo from Wes Ford, monthly: 410.00, 395.00, 400.00, 405.00, 390.00 (04-06 to 08-04), 350.00 on 09-03; plus 400.00 on 09-06 | monthly, 391.67, count 6, last 09-03; the 400.00 listed | **monthly, 400.00**, count 6, **last_seen 2026-09-06** (the extra's date), 1 excluded: **the 350.00 of 09-03** |
| M1, biweekly, one payment missed | Zelle from Bea Lund, 120.00 every 14 days from 04-10, 12 deposits, with 08-28 missing (last deposit 09-25) | biweekly, 120.00, all 12; or, per AS BUILT 20, irregular with all 12 | **monthly**, 120.00, **count 6**, 04-24 to 09-11, **6 genuine deposits listed, including the latest (09-25)** |
| M2, weekly, one week missed | Venmo from Dee Moor, 40.00 every 7 days from 04-06, 24 deposits, with 08-31 missing | weekly, 40.00, all 24; or irregular with all 24 | **biweekly**, 40.00, **count 13**, 04-06 to 09-21, **11 genuine deposits listed** |

The stored figures are exactly the shapes described:
- V1: 285.83 = (240 + 310 + 265 + 330 + 280 + 290) / 6. The one-off 280.00 is counted and the scheduled 225.00 is excluded.
- V2: 400.00 = (410 + 395 + 400 + 405 + 390 + 400) / 6, and last_seen is the one-off's date. This is case P again.
- M1: the 6 kept are every other deposit, 28 days apart, which fits the monthly band (26 to 35 days). The biweekly run is broken by the 28-day gap, and only 2 biweekly deposits follow it.
- M2: the same, with the 14-day gap breaking the weekly run and every other deposit fitting the biweekly band.

**Cause, from the code and a local control.**
- V1 and V2: bestRun() scores runs by length, then the sum of each deposit's distance from the sender's median amount, and only then by timing. When the scheduled amounts vary, the one-off can be closer to the median than the scheduled deposit beside it, and it wins regardless of timing. With identical scheduled amounts (G, I, P), timing decides, which is why those pass. The ordering follows the example in PHASE_2_REWORK_3.md's "To pass", which did not anticipate varying amounts.
- M1 and M2: a missed payment leaves a gap of two intervals, which is outside the frequency's band, so the run at the true frequency stops at the gap. Only runs still active count (AS BUILT 20), so the long run before the gap is ignored. A coarser frequency (monthly for biweekly deposits, biweekly for weekly ones) can step over the gap using every other deposit, holds exactly half the deposits, and so meets RUN_SHARE 0.5. I ran the same inputs through rule v2 (commit 024e3aa) locally: V1, V2, M1, and M2 come out the same, so these are older defects that the earlier vettings did not probe, not regressions from rework 3.
- recurring.test.ts has no case with varying amounts and no case with a missed payment.

**Why this is a gate failure and not an observation.**
- PHASE_2_REWORK_3.md's "To pass": "a one-off inside the amount band that lands a few days after a scheduled deposit is kept out of the stream's count, average, and dates, and is the deposit listed in excluded_transaction_ids." V1 and V2 are exactly that input, and neither holds. V2 also moves last_seen to the one-off's date.
- PHASE_2_REWORK.md and PHASE_2_REWORK_2.md: a one-off is not folded into a stream's count, average, or dates. V1 and V2 fold it into the average, and V2 into the dates.
- M1 and M2 store a false frequency and list genuine scheduled deposits as exceptions. That is the wrong deposits listed, and a wrong count. AS BUILT 20 says a sender whose current schedule holds less than half of its deposits is surfaced as irregular with all of them. M1's current biweekly schedule is 2 deposits, but the sender is stored as monthly instead, which AS BUILT does not describe.
- The stored gross_pay and frequency are what Phase 3 will annualize (average times periods, PHASE-2-SPEC.md):
  - V1: 3,429.96 instead of 3,320.00;
  - V2: 4,800.00 instead of 4,700.00;
  - M1: 1,440.00 instead of 3,120.00 (46 percent);
  - M2: 1,040.00 instead of 2,080.00 (50 percent).
- Both inputs are ordinary. People who share bills send varying amounts, and a single missed payment is the same class of input as the extra payments in cases A and E.

I rate it medium. Every stream is still surfaced for the family's statement, nothing is silently dropped, and a reviewer confirms before anything becomes income. But two of the named criteria fail, and M1 and M2 would under-report regular income by about half.

**To pass:**
- On real Plaid Sandbox data, through the deployed functions:
  - **Varying amounts.** A one-off inside the amount band that lands a few days after a scheduled deposit is kept out of the count, average, and dates, and is the deposit listed. This must hold when the scheduled amounts themselves vary and the one-off is closer to the median than the scheduled deposit beside it, both mid-run (V1) and at the end of the run (V2). G, I, P, and the same-amount cases must still pass. For example, timing could decide between two in-band deposits a few days apart before amount does.
  - **One missed payment.** A biweekly sender with one missed payment, and a weekly sender with one missed week, are never stored at a coarser frequency with genuine deposits listed as exceptions. Either the stream keeps its frequency with all its deposits, for example by allowing a single gap of two intervals inside a run, or the sender is surfaced as irregular with all its deposits, as AS BUILT 20 already says for a restart under half.
- The choice stays deterministic and is documented in PHASE-2-SPEC.md AS BUILT. That includes how a missed payment is treated.
- The unit tests and the plaid-sandbox integration test drive V1, V2, M1, and M2, alongside G, I, and P.
- Also update the stored rule label (new observation N13).

## PASSING ITEMS

[x] Plaid sandbox integration functional, produces a normalized income_records entry.

- VA1's and VA2's bank links (20:51:10Z) went from awaiting_data to ingested, driven by 8 real Plaid-signed webhooks, all signature_valid true, processed by 20:51:33Z.
- They produced:
  - 2 asset_records rows ("Vet Five Checking One", mask 9759, and "Vet Five Checking Two", mask 7143), each with balance 3120.45, exactly my custom users' starting balance, and account_number_encrypted null;
  - 24 income_sources;
  - 24 income_records, ingestion_method plaid.
- Stored bank rows validate against the shared schema (item 8).
- The tokens are stored encrypted: 117 bytes each, with no plaintext "access-" in the bytes (item 11).

[x] Payroll sandbox integration (Plaid Payroll Income; Argyle or Pinwheel as the listing names, if later added) functional, produces a normalized income_records entry of identical shape to the bank pipeline's output.

- VA2's plaid-sandbox link with product payroll_income (20:58:26Z to 20:58:33Z) returned 200: status ingested, 2 stubs.
- A real INCOME.USER_INCOME_VERIFICATION webhook was received at 20:58:32.590Z, signature_valid true, and processed at 20:58:34.767Z.
- The connection has product payroll_income, a Plaid user reference, and a 117-byte encrypted token with no plaintext.
- There are 2 income_records, each with ingestion_method plaid, source_type employment, source status detected, and provider_record_ref set.
- The stored payroll row validates with the same 18-key set as the bank and Textract rows (item 8).

[x] Textract Queries fallback pipeline functional against a sample scanned paystub, W-2, and Schedule C, each producing a normalized income_records entry of identical shape to the other two pipelines.

These are my own uploads into VA2's own folder, each followed by an applicant_documents row and document-ingest with VA2's token. The paystub went through a signed upload URL, as the UI does; the others were direct uploads.
- **Paystub** (20:58:45Z): 200 extracted, no reasons.
  - Fairview Parcel Services LLC, biweekly, rate 18.50, gross 1480.00, YTD 26640.00.
  - Period 2026-08-24 to 2026-09-06, pay date 2026-09-11, confidence 97.
  - Deduction total_deductions 276.02, which is 1480.00 minus the fixture's net 1203.98.
- **W-2** (20:58:58Z): 200 needs_review (historical_annual). Employer Fairview Parcel Services LLC, gross 34120.50, annual, 2025-01-01 to 2025-12-31, confidence 99.
- **Schedule C** (20:59:04Z): 200 needs_review.
  - self_employment, Sample Lawn Care, gross 24800.00, annual, confidence 99.
  - Deduction schedule_c_line_28_total_expenses 7350.00.
  - Reasons self_employment_net_income_phase3 and schedule_c_line_31:17450.00.
- Every value equals tests/fixtures/documents/expected.json.
- **Two-page PDF** (20:59:10Z): 422 multi_page_pdf. The document is failed with reason multi_page_pdf, and no income record exists for it.
- **W-2 read again** (20:59:15Z): 409 already_processed.
- The paystub, W-2, and Schedule C rows validate with the same key set as the other two pipelines (item 8).

[x] Payroll ingestion captures gross pay, pay frequency, YTD earnings, and deductions.

VA2's stored payroll rows:
- **Stub paid 2026-09-30:**
  - gross 2306.00, biweekly, rate 25.15;
  - YTD 2306.00 through 2026-09-29;
  - period 2026-09-15 to 2026-09-29;
  - deductions [taxes 1000.00].
- **Stub paid 2026-08-31:**
  - gross 2306.00, biweekly, YTD 2306.00 through 2026-08-30;
  - six itemized deductions: Social Security Tax 23.44, 401K 352.34, Medicare Tax 12.45, Dental Insurance 13.74, Federal Tax 612.91, State Tax 409.25.
- Both have needs_review true with the reason variable_earnings:bonus,overtime, deferred to Phase 3.
- The raw_payload keys are only deductions, document_id, earnings, employer, net_pay, pay_period_details, and source. employer holds {name: "Platypus LLC"} only.

[x] Webhook signature verification present and tested for every webhook provider in use (Plaid, which serves both bank and payroll; and Argyle if later added), even in sandbox mode.

- **Forgeries** (21:01:21Z to 21:01:32Z). Ten forged requests to plaid-webhook, naming my real bank item or my real payroll user. Each returned 401 {"error":"invalid_signature"}:
  - no header
  - garbage
  - alg none
  - HS256 with the correct body hash
  - RS256 signed by my own key
  - ES256 with no kid
  - ES256 signed by my own P-256 key, with a plausible kid and the correct body hash
  - the same, over an INCOME body naming my payroll user
  - the same, over an ITEM ERROR body (ITEM_LOGIN_REQUIRED) with an iat an hour old
  - ES256 signed by my own key, with a wrong body hash
- **What was recorded.** Exactly 10 new webhook_events rows, each with signature_valid false, status rejected, provider_ref null, and a "rejected:" event id. Their types were:
  - missing_signature, malformed_signature, and missing_key_id (1 each);
  - wrong_algorithm (3);
  - bad_signature (2);
  - unknown_key (2).
- **Nothing was processed.** A snapshot of my three connections (status, error code, last event time) and of all my sources was identical before and after. VA1's connection stayed ingested, not reauth_required.
- **Other method.** GET returned 405.
- **Valid path.** 11 genuine Plaid-signed events on my three items were accepted (signature_valid true) and processed. They include the two SYNC_UPDATES_AVAILABLE events I fired through plaid-sandbox at 20:57:30Z and 20:57:31Z, processed at 20:57:42Z and 20:57:43Z.
- **Idempotency.** The catalog shows UNIQUE (provider, event_id) on webhook_events. The stale-iat and tampered-body branches are unit tested in tests/unit/plaid-verify.test.ts, within my `npm test` run of 144.
- Argyle is not in use.

[x] Integration test suite covering all three ingestion paths.

`npm run test:integration`, 21:16:05Z to 21:24:17Z, first attempt with no retry: "Test Files 3 passed (3)", "Tests 20 passed (20)". The files are plaid.test.ts (bank, recurring including the earlier cases and G, I, and P, the signed webhook, retry, pg_net, forgeries, payroll, and cross-applicant checks), textract.test.ts, and shape-identity.test.ts.

The suite left one of its auth users behind (new observation N14). It left no webhook_events row: all 21 rows in dev at cleanup were mine.

[x] Normalized income record shape identity test passes: one record from each pipeline validates against the single shared schema with an identical key set.

- **The test** (tests/integration/shape-identity.test.ts) passed inside my full integration run.
- **By hand (21:00Z), with my own script.** I imported NORMALIZED_KEYS and normalizedIncomeRecordSchema from supabase/functions/_shared/normalized.ts.
  - NORMALIZED_KEYS has 18 keys.
  - Every key except source_type is a column of income_records. The only other columns are id, tenant_id, applicant_id, income_source_id, provider_connection_id, document_id, provider_record_ref, raw_payload, and created_at.
  - I rebuilt six stored rows from their own columns plus income_sources.source_type:
    - bank: Vic Hale's stream, monthly 285.83;
    - bank: Kit Lam's irregular stream, frequency null;
    - payroll: 2306.00 biweekly;
    - Textract: the 1480.00 paystub, the 24800.00 Schedule C, and the 34120.50 W-2.
  - All six are valid, and all six key sets are identical to NORMALIZED_KEYS.
  - Negative control: each record with one extra key was refused by the strict schema, 6 of 6.

[x] New Phase 2 tables have tenant_id and RLS in the migration that creates them; isolation suite extended to them and to the private document storage bucket, and passing.

- **Catalog** (21:12Z):

  | Table | RLS | Policies | tenant_id |
  |---|---|---|---|
  | provider_connections | on | 1 | yes |
  | applicant_documents | on | 2 | yes |
  | income_sources | on | 3 | yes |
  | income_records | on | 1 | yes |
  | asset_records | on | 3 | yes |
  | webhook_events | on | 0 | no |

  - webhook_events has grants only to postgres and service_role. It is the documented platform exception in RULES.md.
  - The applicant-documents bucket is private, with a 10485760 byte limit and jpeg, png, and pdf only.
  - storage.objects has one INSERT and one SELECT policy.
  - The triggers income_sources_statement_guard and income_sources_sync_stream_record_reasons are enabled. app.sync_stream_record_reasons is executable only by postgres.
- **Suite.** `npm run test:isolation`, 21:24:29Z to 21:30:22Z:
  - Vitest: "Test Files 1 passed (1)", "Tests 29 passed (29)".
  - Newest report, isolation-2026-09-30T21-24-38-177Z.json: projectRef mdatwozuqdiwioezalom, total 340, passed 340, failed 0. My own recount is 340 entries, all with pass true, in 33 groups including T1 to T5.
  - The summary and the report agree, so SEC-P1-05 does not apply.
- **By hand** (21:02:37Z to 21:04:19Z), as three users against VA2's resources: VB (applicant, second tenant vet5-probe), VRB (reviewer, vet5-probe), and VC (another cedar-row applicant). I checked each user's JWT claims first.
  - document-ingest on VA2's W-2: 404 for VB and VC, and 403 for VRB.
  - Storage, for each of the three:
    - download and createSignedUrl: "Object not found";
    - listing VA2's folder: 0 objects;
    - upload, signed upload URL, and upsert-overwrite of the W-2: "new row violates row-level security policy";
    - remove: 0 objects.
  - Selects of VA2's applicants, household_members, provider_connections, applicant_documents, income_sources, income_records, and asset_records, and of cedar-row's audit_log: 0 rows each, for each of the three.
  - These calls, against VA2's member or connection, returned 404 for VB and VC and 403 for VRB:
    - plaid-link-token and plaid-sandbox link;
    - fire_webhook and remove;
    - plaid-exchange with VA2's connection id.
  - VB inserting a document row in its own tenant that points at VA2's object: 23514 (check constraint). VB inserting a document row in tenant cedar-row: 42501 (RLS).
  - VB uploading under its own tenant prefix with VA2's applicant id: RLS violation.
  - anon: download "Object not found", and a select of income_records 42501.
  - Afterwards the W-2 was still needs_review. VA2's folder held its 4 objects, the vet5-probe prefix held 0, and VA2's connection was still ingested with its token.
  - Controls:
    - VA2 downloaded its own W-2 (90232 bytes).
    - Same-tenant reviewer VR downloaded it (90232 bytes) and saw VA2's 18 records.
    - VB got a link-sandbox token for its own member.

[x] Recurring transfers follow PHASE-2-SPEC.md's rule: detected by software, stated by the family, confirmed by a reviewer; no transfer becomes income through software alone.

My probes (20:56:33Z to 20:57:43Z). The users were VA1 and VA2 (cedar-row applicants), VR (cedar-row reviewer), VC (cedar-row applicant), and VB and VRB (vet5-probe applicant and reviewer). Their JWT claims had the right roles and tenants.

- **Reviewer on an unstated source** (Kit Lam's irregular stream, awaiting_family_statement):
  - VR writing family_statement: 42501 "only the applicant can give the family's statement".
  - confirm_income_source with a reason, for confirmed_income, confirmed_excluded, and dismissed: 22023 "the family has not stated what this is yet", all three.
  - Direct updates of status, source_type, connection_method, and family_statement_at: 42501 "permission denied for table income_sources".
  - The source stayed unchanged, and audit_log stayed at 0.
- **Applicant limits**, on VA2's own source:
  - Updating status, source_type, connection_method, or average_amount: 42501.
  - Calling confirm: 42501 "staff only".
- **Other users:**
  - VC (same tenant) and VB (other tenant) writing VA2's statement: 0 rows.
  - VB confirming: 42501 "staff only".
  - VRB confirming: P0002 "source not found".
  - VRB writing the statement: 0 rows.
  - VRB selecting VA2's sources and records: 0 rows. Control: VR saw VA2's 13 records at that point.
  - The source was still unchanged.
- **Positive path, as real users:**
  - VA2 stated Kit's source regular_contribution: 1 row, status awaiting_review, family_statement_at stamped (20:56:41.406Z).
  - VR's confirm with a blank reason: 22023 "a reason is required". With outcome awaiting_review: 22023.
  - VR writing the now-stated statement: 42501.
  - VR confirmed Kit as confirmed_income with a reason. audit_log went from 0 to 1 row: actor VR, action confirm_income_source, target income_sources, before_value {status awaiting_review, family_statement regular_contribution}, after_value {status confirmed_income}, and the reason.
  - A second confirm: 22023 (see N15 on its message). VA2 re-stating the confirmed source: 42501 "a statement can only be given while the source awaits one".
  - VA1 stated Nadia Brook's source life_event_gift, and VR confirmed it confirmed_excluded: the second audit row, with the same shape.
  - VA2 stated Vic Hale's source shared_expense_reimbursement and left it undecided.
- **Re-ingest does not reset state.** I fired SYNC_UPDATES_AVAILABLE on both bank items through plaid-sandbox at 20:57:30Z and 20:57:31Z. Both were processed (signature_valid true) by 20:57:43Z. Comparing a full snapshot of 25 sources and their records before and after, **0 rows changed**:
  - Kit: confirmed_income / regular_contribution, reasons [].
  - Nadia: confirmed_excluded / life_event_gift, reasons [].
  - Vic (stated, undecided): awaiting_review / shared_expense_reimbursement, reasons ["awaiting_review"].
- **Applicant-inserted source (N3).** VA2 can still insert its own source labeled recurring_transfer / plaid, which gets status detected and provider_connection_id null. It cannot then state it (42501) or have it confirmed (22023).

[x] No raw Textract response, SSN, or full account number is stored anywhere, confirmed by query; raw provider payloads are stored redacted; Plaid access tokens are encrypted and unreadable by any client role.

- **Scan** (21:11:17Z). Present at the time: 29 income_records, 4 documents including my W-2, and 3 encrypted tokens. I scanned all 84 text, varchar, JSON, array, and enum columns in 20 public tables, with these patterns:
  - SSN, and a masked SSN
  - EIN
  - runs of 9 to 17 digits
  - raw Textract keys (Blocks, BlockType, Geometry, DocumentMetadata, BoundingBox, Relationships)
  - the fixture person's name and street
  - payroll employee strings, taxpayer id, account_number, routing, distribution, and download link
  - plaintext Plaid public and access tokens
  - the 24 sender names in my custom users
  - positive controls: "Platypus LLC" and "Sample Lawn"
- A first attempt was invalid: an escaping slip in my own script turned the digit patterns into letters, so its "0 hits" meant nothing. I fixed the patterns and added the positive controls before taking this result.
- **Result.**
  - The controls matched where expected (employer_name, raw_payload, extracted_fields).
  - SSN, masked SSN, EIN, Textract keys, person, payroll employee strings, tokens, and sender names: 0 hits each. No sender name is stored anywhere.
  - Digit runs: 9 hits, all hashes or random ids. One 32-hex stream ref appears in income_sources.provider_stream_ref, income_records.provider_record_ref, and raw_payload.stream.stream_ref. Five 64-hex webhook event ids are SHA-256 of genuine event bodies, and one is a "rejected:" UUID. With stream_ref removed from raw_payload, 0 rows still match.
- **What is stored:**
  - Textract raw_payload keys are answers and document_kind only.
  - extracted_fields hold only the query aliases: 10 for the paystub, 4 for the W-2, 5 for the Schedule C.
  - The bank raw_payload is {as_of, rule, stream}. stream holds account_id, app, average_amount, excluded_transaction_ids, first_seen, frequency, last_seen, occurrence_count, pattern, stream_ref, and transaction_ids.
  - The payroll raw_payload is as listed under item 4.
- **Encrypted columns.** ssn_encrypted and account_number_encrypted non-null: 0 each. Every account_last_four is 4 digits (9759, 7143).
- **Tokens.** All 3 are 117 bytes, contain no plaintext "access-", and decrypt (as owner, via public.read_provider_token) to an access-sandbox token.
- **Client access** (21:15:04Z to 21:15:14Z). VA2, VR, and anon each got 42501 on all of:
  - selecting access_token_encrypted, `*`, or provider_user_ref from provider_connections;
  - read_provider_token and store_provider_token;
  - updating provider_connections;
  - selecting webhook_events.

  Controls: the permitted columns returned VA2's 2 connections and VR's tenant's 3. anon got 42501 there too. The catalog shows:
  - authenticated's column grants on provider_connections exclude access_token_encrypted and provider_user_ref;
  - authenticated's only UPDATE column on income_sources is family_statement;
  - EXECUTE on read_provider_token, store_provider_token, encrypt_secret, and decrypt_secret is held by postgres and service_role only.

[x] Genericization check from RULES.md run, exact command as written there, no output.

Run at 21:15Z on 2026-09-30, from the repository root, at HEAD d0fcf14 with a clean working tree. I read the command from RULES.md, section GENERICIZATION IS ENFORCED, NOT DECORATIVE: exactly one line matched, and it ran unmodified. It produced no output, exit code 1. It needs re-running once this file and the item 5 fix are committed.

## STATUS OF PRIOR OBSERVATIONS

### The 8 from PHASE_2_REWORK.md

1. **Bank deposit records not implemented.** Accepted as documented (AS BUILT 12). My two accounts each had 13 payroll deposits, and neither produced a source or record (0 non-transfer sources on both bank connections).
2. **Records ignore confirmed status.** Addressed. After my re-ingest, the confirmed and excluded sources' records kept reasons [], and 0 of 25 rows changed.
3. **Applicants can relabel sources.** Addressed. VA2 and VR each got 42501 on source_type and connection_method, and the catalog grants authenticated UPDATE on family_statement only. The residual is N3.
4. **webhook_events lacks tenant_id.** Addressed. RULES.md names it, and the catalog matches: RLS on, 0 policies, no client grant.
5. **Replay not tested end to end.** Still open, unchanged, and not closable from outside, since a genuine Plaid signature cannot be captured. Idempotency rests on UNIQUE (provider, event_id = SHA-256 of the body), which I saw in the catalog, plus the 5-minute iat window in plaid-verify.ts.
6. **Integration teardown leaks a row.** The webhook_events leak is addressed: after my integration, isolation, and browser runs, all 21 rows in dev were mine (11 genuine events on my 3 items, and my 10 forgeries). A different teardown leak appeared this time; see N14.
7. **Sandbox items remain in Plaid.** Addressed, as far as I can observe. I removed my 3 items (including the payroll user) with plaid-sandbox "remove", 200 each (05:12:56Z to 05:13:00Z on 2026-10-01). A fire_webhook on a removed item then returned 502 ITEM_ERROR/ITEM_NOT_FOUND (05:13:17Z).
8. **Later-phase items unchanged.** Accepted as documented. SECURITY.md still lists SEC-P2-02 to -06 for Phases 4 and 5, and PROCESS-RULES.md Phase 5 has the plaid-sandbox production exclusion.

### N1 to N6 from PHASE_2_REWORK_2.md

- **N1. Review reasons lag the status.** Addressed, observed as real users through the real paths:
  - VA2's statement at 20:56:41.406Z; the record read at 20:56:41.618Z already had ["awaiting_review","irregular_pattern"], needs_review true.
  - VR's confirm at 20:56:43.04Z; the record read at 20:56:43.377Z had [] and needs_review false.
  - The same on a regular source: ["awaiting_review"] right after VA1's statement, [] right after VR's confirmed_excluded.
- **N2. The shape identity test's key-set line holds by construction.** Accepted as documented, unchanged. My strict-schema negative control (6 of 6 refused) is what makes the check meaningful.
- **N3. Applicant-inserted sources can carry any label.** Accepted as documented (AS BUILT 19, for Phase 3). Observed again: inserted with status detected, cannot be stated (42501), cannot be confirmed (22023).
- **N4. stream_ref included the frequency.** Addressed. No source was duplicated across Plaid's staged delivery, and case F gave one source.
- **N5. Stale Argyle mention in COLLABORATION-1.md.** Addressed: the QA mandate reads "integration tests against the Plaid sandbox responses (bank and payroll)".
- **N6. Browser runs.** Superseded by N12 below: the upload test failed again, in a different way.

### N7 to N11 from PHASE_2_REWORK_3.md

- **N7. A restarted sender becomes irregular with old deposits counted.** Addressed. Gus Pena (current schedule more than half) was stored as monthly, count 4, with the 2 old deposits listed. Hal Ito (less than half) was stored as irregular with all 7, as AS BUILT 20 documents. The related missed-payment shape is the new item 5 failure (M1, M2).
- **N8. A chance run makes an irregular sender regular.** Addressed. Kit Lam's 8 irregular deposits, three of them about a fortnight apart, were stored as irregular, count 8.
- **N9. AS BUILT 17's wording on merged senders.** Addressed. AS BUILT 17 now says such senders "become one blended stream", naming case M.
- **N10. The integration test's N1 step confirmed as the owner.** Addressed. tests/integration/plaid.test.ts now makes a reviewer and calls confirm_income_source through the reviewer's client, and checks the audit row.
- **N11. Plaid's key endpoint.** Still observed, informational. My forgery with a made-up kid ("6c5516e1-...-0001") was again recorded as bad_signature, meaning a key was returned for that kid. Two others were unknown_key. All were rejected with 401.

## NEW OBSERVATIONS (not checklist failures)

- **N12. AS BUILT 21 is not reproduced as fixed: the upload tests still fail at times, now by a server action that never returns.**
  - Runs: 2 of my 5 Playwright runs had a failure in the Documents step tests; the other 3 were clean (see SUITES).
  - First failure (e2e run 1, 21:30:59Z): "a pay stub uploaded through the real control is read and stored". The trace shows the page GET (28.9 s), the ticket action (13.7 s), and the storage PUT (200) all completed, then the ingest server action POST at 21:32:25Z never got a response before the 90 s wait expired. The page still read "Reading paystub.png. This can take a few seconds."
  - Second failure (full run 1, 21:35:03Z): "a multi page PDF is refused in the page with a plain message". The page GET took 35.4 s, then the first server action POST (21:37:51Z) never got a response within 60 s. The page read "Reading two-page.pdf". The two tests after it did not run.
  - In both, the uploader stays in its "uploading" state for good. handle() in components/ingestion/document-uploader.tsx has no try/catch and no timeout, so an action that throws or never answers leaves the applicant with no error, no "Try again", and both buttons disabled. DESIGN.md's upload control expects an error state saying what happened and what to do.
  - I could not tell whether the hang is the dev server on this machine (page loads took 29 to 35 s) or a defect in the action path. It is not a checklist item, so it is recorded here. Consider an error path and a timeout in the uploader (and in bank-connect.tsx), and find out why the action did not answer.
- **N13. The stored rule label is stale.** Every bank raw_payload says "PHASE-2-SPEC recurring transfer rule v2 (AS BUILT 17)", but the code is rule v2.1 (AS BUILT 20). The label exists so an auditor can tell which rule produced a stream, so it should name the version that ran.
- **N14. The integration teardown left one auth user.** After my integration run, auth.users held one extra user, int-plaid-rework5b (created 21:17:42Z), with a public.users row and no applicant row. The test passed, so the user was tracked. The teardown does not check deleteUser's result, so a failed delete goes unnoticed. I deleted it during cleanup without error, so the cause was probably transient. Consider checking the result and failing the teardown when a user is left behind.
- **N15. A misleading message.** A second confirm_income_source on an already confirmed source returns 22023 "the family has not stated what this is yet". The refusal is right; the message is not, because the family did state it.

## SUITES RUN BY THE VETTER

- `npm test` (21:15:32Z to 21:15:56Z): "Test Files 7 passed (7)", "Tests 144 passed (144)".
- `npm run test:integration` (21:16:05Z to 21:24:17Z, first attempt, no retry): "Test Files 3 passed (3)", "Tests 20 passed (20)".
- `npm run test:isolation` (21:24:29Z to 21:30:22Z): "Test Files 1 passed (1)", "Tests 29 passed (29)". Report isolation-2026-09-30T21-24-38-177Z.json: total 340, passed 340, failed 0. The two agree.
- Playwright 1.60.0, app on port 3100, workers 1:
  - `npm run test:e2e`, run 1 (21:30:59Z to 21:33:55Z): "1 failed", the pay stub upload test (N12). I captured only the summary line for this run.
  - `npm run test:theming`, full run 1 (21:35:03Z to 21:39:40Z): "1 failed", "2 did not run", "6 passed (4.5m)". The pay stub test passed (1.7m); the multi page PDF test failed (N12).
  - `npm run test:theming`, full run 2 (05:04:09Z to 05:06:37Z, 2026-10-01): "9 passed (2.3m)". It logged the known SEC-P2-07 "The destination stream closed early" once.
  - `npm run test:theming`, full run 3 (05:06:45Z to 05:09:10Z): "9 passed (2.3m)".
  - `npm run test:e2e`, run 2 (05:09:18Z to 05:11:28Z): "4 passed (2.0m)".
  - Full run 1 also logged the server ErrorBoundary/RedirectErrorBoundary trace seen in earlier vettings.
- Port 3000 (the user's other project, pid 19508) was listening before and after, and was not touched. Port 3100 was free before the Playwright runs and after them.
- `npx tsc --noEmit` after resuming: exit 0, so .next/dev/types was not corrupted.

## TEST DATA AND CLEANUP

**Baseline** at 20:43:08Z, 2026-09-30, before anything I ran:
- tenants 1 (cedar-row), programs 3, program_rule_sets 3, ami_schedules 6
- theme_configs 1, properties 2, property_programs 3
- users 1, applicants 1, household_members 1, auth.users 1
- 0 in each of: income_sources, income_records, asset_records, provider_connections, applicant_documents, calculated_determinations, generated_documents, workflow_state, audit_log, webhook_events
- storage objects 0; storage buckets 2
- Vault secrets cron_secret, functions_base_url, pii_key, provider_token_key; cron job ingestion-retry every 5 minutes, active
- 15 migrations, the latest 20260930001500
- Hashes: applicants 941abfca…, users 997ecfa0…, household_members a02f3299…, auth.users (id and email) 4551537a…, tenants b83641bb…, theme_configs 65257375…, properties eb0a1291…, program_rule_sets f6a10c3b…

The first four hashes equal the second and third vettings'.

**What I created:**
- tenant vet5-probe, with its theme and property
- users VA1, VA2, VC (cedar-row applicants), VR (cedar-row reviewer), VB (vet5-probe applicant), and VRB (vet5-probe reviewer), with 4 applicants and 4 household members
- 4 provider_connections: VA1 bank, VA2 bank, VA2 payroll, and VB's link_started row from a control call
- 29 income_sources (24 detected streams, 1 payroll, 3 documents, 1 N3 spoof) and 29 income_records
- 2 asset_records, 4 applicant_documents, and 4 storage objects
- 2 audit_log rows
- 21 webhook_events: 11 genuine events on my items, and my 10 forgeries
- one leftover auth user from my integration run (N14)

**Cleanup**, 05:12:56Z to 05:13:26Z on 2026-10-01:
- The 3 Plaid items (including the payroll user) were removed through plaid-sandbox "remove", with the owning applicant's token, confirmed by ITEM_NOT_FOUND. The link_started row had nothing at Plaid.
- I waited 15 s, then removed the 4 storage objects and deleted every row above: audit_log 2, income_records 29, income_sources 29, asset_records 2, applicant_documents 4, provider_connections 4, household_members 4, applicants 4, and webhook_events 21. The counts deleted were exactly the counts created.
- The 6 auth users and the leftover integration user were deleted; their public.users rows went with them.
- The vet5-probe tenant, theme, and property were deleted.

**After cleanup**, at 05:14:46Z, after a further 60 s wait for late webhooks: all 34 compared values are identical to the baseline, with 0 differences. That covers every table count, auth.users 1, storage objects 0 and buckets 2, webhook_events 0, the Vault secret names, the cron job, the migration list, and all eight hashes.

The real applicant's data was read only as counts and hashes, and never modified.

My temporary scripts are in the session scratchpad, outside the repository, and are deleted. The working tree is clean apart from this file and the ignored artifacts the suites write (test-results, isolation reports, theming screenshots, .next). PHASE_2_REWORK.md, PHASE_2_REWORK_2.md, and PHASE_2_REWORK_3.md are untouched. PROCESS-RULES.md was not marked.
