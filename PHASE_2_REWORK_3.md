# PHASE_2_REWORK_3.md — Project 1: Fairview Compliance Intake Platform

This is the third Phase 2 gate result. It comes from the re-vet after rework 2, commit 024e3aa. An independent Master Vetting sub-agent wrote it on 2026-09-30, and it built no part of Phase 2.

Before running anything, it read these documents in full:
- CLAUDE.md, MEMORY.md, COLLABORATION-1.md, MASTER-VETTING-SKILL.md, and PROCESS-RULES.md;
- PHASE-2-SPEC.md, including AS BUILT 1 to 19;
- PHASE_2_REWORK.md and PHASE_2_REWORK_2.md;
- RULES.md, SECURITY.md, MASTER-SPEC-1.md, TESTS.md, and DESIGN.md's Income step;
- the Phase 2 code, the migrations (including 20260930001500), components/ingestion/transfer-question.tsx, and every test.

The builder's reports, commit messages, MEMORY.md, SECURITY.md, and the AS BUILT claims were treated as leads only.

All evidence below was produced in this session. It was run against fairview-dev (ref mdatwozuqdiwioezalom), its deployed Edge Functions, the real Plaid Sandbox, and real AWS Textract (eu-west-1). Times are UTC. The database clock and this machine agreed to within 0.2 s (DB 07:44:15.288Z, local 07:44:15.116Z).

**Deployed code equals the commit.** I downloaded each of the six deployed functions separately (supabase functions download --use-api, into a scratch folder), each with its own _shared bundle, and diffed them against HEAD 024e3aa. Every index.ts and every bundled _shared module is identical. The live catalog lists all 15 migrations, including 20260930001500.

## Gate result: NOT COMPLETE

- 11 items PASS.
- 1 item FAILS: item 5 (medium).
- None BLOCKED.

The rework fixed every shape the second vetting found. I re-ran cases A, B, C, E, and F with my own names, amounts, and dates on the real Plaid Sandbox, and all five were right.

Item 5 still fails, on a narrower shape: an extra deposit that lands a few days after a scheduled one takes that deposit's place in the stream. The one-off is then counted in the stream's average, and in one case in its last date, while the genuine scheduled deposit is listed for the reviewer as the thing left out. That breaks the criterion both earlier vettings set: an irregular one-off must not be folded into a regular stream's count, average, or dates.

Everything else passes on my own probes:
- N1 is fixed: review reasons change the moment the family states or a reviewer confirms, observed as real users.
- The separation of duties (item 10) holds.

Do not write PHASE_2_COMPLETE.md until item 5 is fixed and vetted again. The fix will again touch recurring.ts, which the webhook, retry, and sandbox paths share. So the next vet should re-observe at least items 1, 5, 7, 8, and 10, plus the genericization check.

## FAILING ITEMS

### Item 5, FAIL, medium

[ ] Plaid transaction classification identifies recurring peer to peer income transfers in a sandbox account and produces a recurring transfer income source.

**How I tested.** I designed two custom Plaid Sandbox users and ran every sender first through the committed recurring.ts locally (Node, strip-types), to predict. I then linked both through the deployed plaid-sandbox with action "link", as two cedar-row applicants, VA1 and VA2, at 07:51:11Z, and watched income_sources every 3 s for 150 s while Plaid delivered history in stages.
- Both links returned 200 awaiting_data at 07:51:15Z.
- Four real Plaid-signed webhooks per item were processed, all with signature_valid true: INITIAL_UPDATE, HISTORICAL_UPDATE, and SYNC_UPDATES_AVAILABLE twice. Both items were done by 07:51:27Z.
- I read the final state at 07:54:17Z. Every Plaid result matched the local prediction exactly.
- Each account also held payroll deposits (11 biweekly), rent outflows (5), and two Venmo outflows as noise. None produced a source.

**What passed: the prior failing shapes, with my own inputs (VA1).** Each row is one sender on one checking account; days are before 2026-09-30.

| Case | My input | Stored (final) | Result |
|---|---|---|---|
| A | Venmo from Lena Park, 140.00 monthly, 6 deposits (155 to 5 days ago), plus one extra 140.00 at 80 days | monthly, 140.00, count 6, 2026-04-28 to 2026-09-25, 1 excluded | correct |
| B | Zelle from Omar Diaz, 65.00 every 14 days, 12 deposits (160 to 6 days), plus an extra 65.00 at 99 days | biweekly, 65.00, count 12, 2026-04-23 to 2026-09-24, 1 excluded | correct |
| C | Venmo from Noor Haddad, 75.00 monthly, 6 deposits, memo alternating "groceries" and "phone bill" | monthly, 75.00, count 6, 2026-04-25 to 2026-09-22, 0 excluded | correct |
| E | Cash App from Ivy Chen, 300.00 monthly, 5 deposits, plus one 190.00 mid-month at 55 days | monthly, 300.00, count 5, 2026-05-23 to 2026-09-20, 1 excluded | correct |
| F (reversed) | Venmo from Theo Grant, 55.00 weekly for 10 weeks (170 to 107 days), then every 14 days, 7 deposits (93 to 9 days) | one source: biweekly, 55.00, count 12, 2026-04-20 to 2026-09-21, 5 listed | correct; one source, the active schedule |
| Gift | Venmo from Sara Quinn, 60.00 weekly, 20 deposits, plus a 400.00 gift from the same sender at 70 days | weekly, 60.00, count 20, 2026-05-10 to 2026-09-20, 1 excluded | correct |

Every record had gross_pay equal to the average, needs_review true, and reasons ["awaiting_family_statement"]. Each record's transaction_ids count equals occurrence_count. The stored rule text is "PHASE-2-SPEC recurring transfer rule v2 (AS BUILT 17)".

**What failed: an extra landing a few days after a scheduled date (VA2).**

| Case | My input | Expected by the rule | Stored |
|---|---|---|---|
| G | Zelle from Rosa Vega, 400.00 monthly on 2026-05-01, 05-31, 06-30, 07-30, 08-29, 09-28, plus one 260.00 on 2026-09-01 (3 days after the 08-29 deposit) | monthly, 400.00, count 6; the 260.00 left out | **monthly, 376.67**, count 6, 2026-05-01 to 2026-09-28, 1 excluded |
| I | Zelle from June Alvarez, 350.00 on the 1st and 16th, 11 deposits (2026-04-16 to 2026-09-16), plus one 220.00 on 2026-07-04 | semi-monthly, 350.00, count 11; the 220.00 left out | **semi_monthly, 338.18**, count 11, 1 excluded |
| P | Cash App from Hugo Bell, 500.00 monthly on 2026-04-30, 05-30, 06-29, 07-29, 08-28, 09-26, plus one 330.00 on 2026-09-28 | monthly, 500.00, count 6, last 2026-09-26; the 330.00 left out | **monthly, 471.67**, count 6, **last_seen 2026-09-28** (the extra's date), 1 excluded |

The stored averages are exactly the one-off swapped in for a scheduled deposit:
- 376.67 = (5 × 400 + 260) / 6
- 338.18 = (10 × 350 + 220) / 11
- 471.67 = (5 × 500 + 330) / 6

In each case the single excluded transaction is a genuine scheduled deposit, not the one-off. The local run of the committed detector on the same dates names it:
- G: the 400.00 of 2026-08-29;
- I: the 350.00 of 2026-07-01;
- P: the 500.00 of 2026-09-26.

So the reviewer is shown the wrong deposit as the anomaly.

**Cause, confirmed by a local control.** In recurring.ts, longestRun() breaks ties in favor of the later deposit, in two places:
- when choosing a predecessor, `len[j] + 1 >= len[i]` keeps the latest j;
- when choosing the run's end, `len[i] >= len[end]` keeps the latest i.

A monthly band of 26 to 35 days (semi-monthly 10 to 20) lets an in-band deposit a few days after a scheduled one replace it at the same run length. The amount filter does not stop it, because 260 against 400, 220 against 350, and 330 against 500 are all within 50 percent of the median.

My control, with the committed detector on G's dates:

| Input | Result |
|---|---|
| No extra | 400.00 |
| Extra 3 days before the scheduled date | 400.00; the extra is excluded |
| Extra 3 days after | 376.67; the scheduled deposit is excluded |
| Same-amount extra 3 days after | average 400.00, but the scheduled deposit is still the one excluded |

**Why this is a gate failure and not an observation.**
- PHASE_2_REWORK.md's "To pass" required that "an irregular one-off deposit is not folded into a regular stream's count, average, or dates". PHASE_2_REWORK_2.md required that the extra be "kept out of the stream's count, average, and dates, and ... listed for the reviewer". G, I, and P fold a one-off into the average, and P into the dates, and list the wrong deposit.
- The stored gross_pay (the average) is what Phase 3 will annualize (average amount times frequency periods, PHASE-2-SPEC.md). G would annualize to 4,520.04 instead of 4,800.00, I to 8,116.32 instead of 8,400.00, and P to 5,660.04 instead of 6,000.00.
- A second, smaller payment a few days after the usual one is ordinary behavior, the same class of input as cases A and E.

It is narrower than the second vetting's failure:
- the stream is surfaced;
- the frequency and count are right;
- the averages are 3.4 to 5.8 percent low.

I rate it medium, not low, because it is the named criterion, the figure feeds the Phase 3 calculation, and the reviewer is pointed at the wrong deposit.

**To pass:**
- On real Plaid Sandbox data, through the deployed functions: a one-off inside the amount band that lands a few days after a scheduled deposit is kept out of the stream's count, average, and dates, and is the deposit listed in excluded_transaction_ids. This must hold for the scheduled deposit in the middle of the run (G), in a semi-monthly run (I), and at the end of the run (P).
- Also cover a same-amount extra a few days after a scheduled date. Its figures already come out right, but the listed deposit must be the extra, not the scheduled one.
- The choice between competing deposits must stay deterministic, and be documented in PHASE-2-SPEC.md AS BUILT. For example: prefer the deposit whose amount is closest to the sender's median, then the one whose gap is closest to the frequency's interval, then the earlier one.
- The unit tests and the plaid-sandbox integration test drive shapes G, I, and P.

**Other attacks on rule v2, and how I classified them.** On VA2, alongside G, I, and P:

| Case | My input | Stored | Classification |
|---|---|---|---|
| H, two extras | Cash App from Malik Stone, 120.00 every 14 days, 11 deposits, plus two extra 120.00 at 110 and 40 days | biweekly, 120.00, count 11, 2 excluded | correct |
| K, irregular, recent | Venmo from Zoe Kim, 45.00 at 171, 139, 118, 77, 52, 33, and 12 days | frequency null, pattern irregular, 45.00, count 7, reasons ["awaiting_family_statement","irregular_pattern"] | correct |
| L, irregular, last deposit 51 days ago | Cash App from Ada Lowe, 110.00 at 175, 150, 132, 101, 73, and 51 days | no source | accepted as documented (AS BUILT 17: not anticipated income) |
| J, stopped and restarted | Venmo from Paul Reyes, 90.00 monthly: 4 deposits at 172 to 94 days (26-day gaps), a 38-day pause, then 56, 30, and 4 days | irregular, 90.00, count 7 (all seven), 2026-04-11 to 2026-09-26 | surfaced, so not silent; see N7 |
| K2, irregular with a chance run | Venmo from Eli Moss, 70.00 at 166, 131, 127, 88, 70, 39, 25, and 12 days | **biweekly**, 70.00, count 3 (2026-08-22 to 2026-09-18), 5 listed | surfaced; see N8 |
| M, two senders, same first two words | Zelle from Maria Santos Cruz, 210.00 monthly ×5, and Maria Santos Lima, 180.00 monthly ×5, a fortnight apart | one source: semi_monthly, 195.00, count 10, 0 excluded | accepted as documented (AS BUILT 17 names this limit); see N9 for the wording |
| N, no "from" | "Zelle payment Kai Brooks rent" and "... utilities", 85.00 monthly ×6, alternating | two sources, each irregular, 85.00, count 3 | accepted as documented (AS BUILT 17: grouped by full text); surfaced, not silent |

None of these silently drops regular income that is still being paid. L is the documented exclusion of a sender who stopped more than 45 days ago.

**Stream key across staged delivery.** No source was ever duplicated in any poll:
- VA1 showed 1 source at 07:51:22Z (Sara, weekly, count 3). At 07:51:25Z it had 6 sources, with Sara on the same stream ref at count 20.
- VA2 went from 1 source (07:51:19Z) to 7 (07:51:22Z) to 10 (07:51:26Z).

At every read, the number of distinct provider_stream_ref values equaled the number of sources. After the final re-ingest (item 10), there were 16 detected sources and 16 stream records, the same as before.

**The family-facing wording for an irregular source.** components/ingestion/transfer-question.tsx renders `source.frequency ? FREQ[source.frequency] : "at irregular times"`. For Zoe's source that reads "We found 7 deposits from Venmo of about $45.00 at irregular times, from 2026-04-12 to 2026-09-18. What are these payments?", followed by the six statement options.

Every irregular record I stored (K, J, and both N sources) carried the irregular_pattern reason alongside the status reason, and raw_payload.stream.pattern "irregular". I checked this in code and the stored rows. I did not render the page for these users, because sign-in is by emailed code; the e2e suite renders the Income step's question form for a regular stream.

## PASSING ITEMS

[x] Plaid sandbox integration functional, produces a normalized income_records entry.

- VA1's and VA2's bank links (07:51:11Z) went from awaiting_data to ingested, driven by real Plaid-signed webhooks (8 events, all signature_valid true, processed by 07:51:27Z).
- They produced:
  - 2 asset_records rows ("Vet Four Checking One" 2114 and "... Two" 6255, balance 2750.80 each, exactly my custom users' starting balance), with account_number_encrypted null;
  - 16 income_sources;
  - 16 income_records, ingestion_method plaid.
- Stored bank rows validate against the shared schema (item 8).
- The tokens are stored encrypted: 117 bytes each, with no plaintext "access-" in the bytes.

[x] Payroll sandbox integration (Plaid Payroll Income; Argyle or Pinwheel as the listing names, if later added) functional, produces a normalized income_records entry of identical shape to the bank pipeline's output.

- VA2's plaid-sandbox link with product payroll_income (07:57:47Z to 07:57:54Z) returned 200: status ingested, 2 stubs.
- A real INCOME.USER_INCOME_VERIFICATION webhook was received at 07:57:53Z, signature_valid true, and processed at 07:57:56Z. It is keyed by the item id.
- The connection has product payroll_income, a Plaid user reference, and a 117-byte encrypted token with no plaintext.
- There are 2 income_records, each with ingestion_method plaid, source_type employment, source status detected, and provider_record_ref set.
- The stored payroll row validates with the same 18-key set as the bank rows (item 8).

[x] Textract Queries fallback pipeline functional against a sample scanned paystub, W-2, and Schedule C, each producing a normalized income_records entry of identical shape to the other two pipelines.

These are my own uploads into VA2's own folder, each followed by an applicant_documents row and document-ingest with VA2's token. The paystub went through a signed upload URL, as the UI does; the others were direct uploads.
- **Paystub** (07:57:55Z): 200 extracted, no reasons.
  - Fairview Parcel Services LLC, biweekly, rate 18.50, gross 1480.00, YTD 26640.00.
  - Period 2026-08-24 to 2026-09-06, pay date 2026-09-11, confidence 97.
  - Deduction total_deductions 276.02, which is 1480.00 minus the fixture's net 1203.98.
- **W-2** (07:58:01Z): 200 needs_review (historical_annual). Gross 34120.50, annual, 2025-01-01 to 2025-12-31, confidence 99.
- **Schedule C** (07:58:07Z): 200 needs_review.
  - self_employment, Sample Lawn Care, gross 24800.00, confidence 99.
  - Deduction schedule_c_line_28_total_expenses 7350.00.
  - Reasons self_employment_net_income_phase3 and schedule_c_line_31:17450.00.
- Every value equals tests/fixtures/documents/expected.json.
- **Two-page PDF** (07:58:14Z): 422 multi_page_pdf. The document is failed with reason multi_page_pdf, and no income record exists for it.
- **W-2 read again** (07:58:15Z): 409 already_processed.
- The paystub and Schedule C rows validate with the same key set as the other two pipelines (item 8).

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
- The raw_payload keys are only source, net_pay, earnings, employer, deductions, document_id, and pay_period_details. employer holds {name: "Platypus LLC"} only.

[x] Webhook signature verification present and tested for every webhook provider in use (Plaid, which serves both bank and payroll; and Argyle if later added), even in sandbox mode.

- **Forgeries** (07:59:32Z to 07:59:37Z). Nine forged requests to plaid-webhook, naming my real bank item or my real payroll user. Each returned 401 {"error":"invalid_signature"}:
  - no header
  - garbage
  - alg none
  - HS256 with the correct body hash
  - RS256 signed by my own key
  - ES256 with no kid
  - ES256 signed by my own P-256 key, with a plausible kid and the correct body hash
  - the same, over an INCOME body naming my payroll user
  - the same, over an ITEM ERROR body (ITEM_LOGIN_REQUIRED) with an iat an hour old
- **What was recorded.** Exactly 9 new webhook_events rows, each with signature_valid false, status rejected, provider_ref null, and a rejected: event id. Their types were:
  - missing_signature, malformed_signature, and missing_key_id;
  - wrong_algorithm (3);
  - bad_signature (1);
  - unknown_key (2).
- **Nothing was processed.** Events on my item stayed at 5, my connection stayed ingested (not reauth_required), and VA1's sources were unchanged.
- **Other method.** GET returned 405.
- **Valid path.** 11 genuine Plaid-signed events on my three items were accepted (signature_valid true) and processed. They include the two SYNC_UPDATES_AVAILABLE events I fired through plaid-sandbox at 07:56:40Z and 07:56:42Z, processed at 07:56:46Z and 07:56:51Z.
- **Idempotency.** The catalog shows UNIQUE (provider, event_id) on webhook_events. The stale-iat and tampered-body branches are unit tested in tests/unit/plaid-verify.test.ts, within my `npm test` run of 137.
- Argyle is not in use.

[x] Integration test suite covering all three ingestion paths.

`npm run test:integration`, 08:06:07Z to 08:09:23Z, first attempt with no retry: "Test Files 3 passed (3)", "Tests 19 passed (19)". The files are:
- plaid.test.ts, 12 tests: bank, recurring including cases A, B, C, E, F and an irregular sender, the signed webhook, retry, pg_net, forgeries, payroll, and cross-applicant checks;
- textract.test.ts, 6 tests;
- shape-identity.test.ts, 1 test.

Afterwards, auth users matching the suites' prefixes numbered 0, and every webhook_events row in dev was one of mine.

[x] Normalized income record shape identity test passes: one record from each pipeline validates against the single shared schema with an identical key set.

- **The test** (tests/integration/shape-identity.test.ts) passed inside my full integration run.
- **By hand (08:01Z), with my own script.** I imported NORMALIZED_KEYS and normalizedIncomeRecordSchema from supabase/functions/_shared/normalized.ts.
  - NORMALIZED_KEYS has 18 keys.
  - Every key except source_type is a column of income_records. The only other columns are ids, ownership, raw_payload, created_at, and provider_record_ref.
  - I rebuilt five stored rows from their own columns plus income_sources.source_type:
    - bank: Rosa's stream, monthly 376.67;
    - bank: Zoe's irregular stream, frequency null;
    - payroll: 2306.00 biweekly;
    - Textract: the 1480.00 paystub;
    - Textract: the Schedule C, 24800.00 annual.
  - All five are valid, and all five key sets are identical to NORMALIZED_KEYS.
  - Negative control: each record with one extra key was refused by the strict schema, 5 of 5.

[x] New Phase 2 tables have tenant_id and RLS in the migration that creates them; isolation suite extended to them and to the private document storage bucket, and passing.

- **Catalog** (08:02:40Z):

  | Table | RLS | Policies | tenant_id |
  |---|---|---|---|
  | provider_connections | on | 1 | yes |
  | applicant_documents | on | 2 | yes |
  | income_sources | on | 3 | yes |
  | income_records | on | 1 | yes |
  | asset_records | on | 3 | yes |
  | webhook_events | on | 0 | no |

  - webhook_events has no grant to anon, authenticated, or PUBLIC. It is the documented platform exception in RULES.md.
  - The applicant-documents bucket is private, with a 10485760 byte limit and jpeg, png, and pdf only.
  - storage.objects has one INSERT and one SELECT policy.
  - The new trigger income_sources_sync_stream_record_reasons is enabled. Its function app.sync_stream_record_reasons is executable only by postgres.
- **Suite.** `npm run test:isolation`, 08:09:33Z to 08:11:31Z:
  - Vitest: "Test Files 1 passed (1)", "Tests 29 passed (29)".
  - Newest report, isolation-2026-09-30T08-09-47-632Z.json: projectRef mdatwozuqdiwioezalom, total 340, passed 340, failed 0. My own recount of the entries is 340 entries, all with pass true, in 33 groups including T1 to T5 (with T5.3b and T5.3c).
  - The summary and the report agree, so SEC-P1-05 does not apply.
- **By hand** (08:00:35Z to 08:01:02Z), as three users against VA2's resources: VB (applicant, second tenant vet4-probe), VRB (reviewer, vet4-probe), and VC (another cedar-row applicant).
  - document-ingest on VA2's W-2: 404 for VB and VC, and 403 for VRB.
  - Storage, for each of the three:
    - download and createSignedUrl: "Object not found";
    - listing VA2's folder: 0 objects;
    - upload, signed upload URL, and upsert-overwrite of the W-2: "new row violates row-level security policy";
    - remove: 0 objects.
  - Selects of VA2's provider_connections, applicant_documents, income_sources, income_records, and asset_records, and of cedar-row's audit_log: 0 rows each, for each of the three.
  - These calls, against VA2's member or connection, returned 404 for VB and VC and 403 for VRB:
    - plaid-link-token and plaid-sandbox link;
    - fire_webhook and remove;
    - plaid-exchange.
  - VB inserting a document row that points at VA2's object: 23514 (check constraint).
  - VB uploading under its own tenant prefix with VA2's applicant id: RLS violation.
  - anon: download "Object not found", and a select of income_records 42501.
  - Afterwards the W-2 was still needs_review. VA2's folder held its 4 objects, the vet4-probe prefix held 0, and VA2's connection was still ingested with its token.
  - Controls:
    - VA2 downloaded its own W-2 (90232 bytes).
    - Same-tenant reviewer VR downloaded it (90232 bytes) and saw VA2's 15 records.
    - VB got a link-sandbox token for its own member.

[x] Recurring transfers follow PHASE-2-SPEC.md's rule: detected by software, stated by the family, confirmed by a reviewer; no transfer becomes income through software alone.

My probes (07:55:59Z to 07:56:10Z). The users were VA1 and VA2 (cedar-row applicants), VR (cedar-row reviewer), VC (cedar-row applicant), and VB and VRB (vet4-probe applicant and reviewer). I first checked their JWT claims: the right roles and tenants.

- **Reviewer on an unstated source** (Zoe's irregular stream, awaiting_family_statement):
  - VR writing family_statement: 42501 "only the applicant can give the family's statement".
  - confirm_income_source with a reason, for confirmed_income, confirmed_excluded, and dismissed: 22023 "the family has not stated what this is yet", all three.
  - Direct updates of status, source_type, connection_method, and family_statement_at: 42501 "permission denied for table income_sources".
  - The source stayed unchanged, and audit_log stayed at 0.
- **Applicant limits**, on VA2's own source:
  - Updating status, source_type, connection_method, or average_amount: 42501.
  - Calling confirm: 42501 "staff only".
- **Other users:**
  - VC (same tenant) and VB (other tenant) writing VA2's statement: 0 rows.
  - VB confirming: 42501.
  - VRB confirming: P0002 "source not found".
  - VRB writing the statement: 0 rows.
  - VRB selecting VA2's sources and records: 0 rows.
  - The source was still unchanged.
- **Positive path, as real users:**
  - VA2 stated Zoe's source regular_contribution: 1 row, status awaiting_review, family_statement_at stamped (07:56:06.023Z).
  - VR's confirm with a blank reason: 22023 "a reason is required". With outcome awaiting_review: 22023.
  - VR writing the now-stated statement: 42501.
  - VR confirmed Zoe as confirmed_income with a reason. audit_log went from 0 to 1 row: actor VR, action confirm_income_source, target income_sources, before {status awaiting_review, family_statement regular_contribution}, after {status confirmed_income}, and the reason.
  - A second confirm: 22023. VA2 re-stating the confirmed source: 42501 "a statement can only be given while the source awaits one".
  - VA1 stated Lena's source life_event_gift, and VR confirmed it confirmed_excluded: the second audit row, with the same shape.
- **Re-ingest does not reset state.** I fired SYNC_UPDATES_AVAILABLE on both bank items through plaid-sandbox at 07:56:40Z and 07:56:42Z. Both were processed (signature_valid true) by 07:56:51Z. Comparing a full snapshot of 17 sources and their records before and after, **0 rows changed**:
  - Zoe: confirmed_income / regular_contribution / 07:56:06.023, reasons [].
  - Lena: confirmed_excluded / life_event_gift, reasons [].
  - Sara (stated, undecided): awaiting_review / shared_expense_reimbursement, reasons ["awaiting_review"].
  - Rosa (unstated): ["awaiting_family_statement"].
  - Record counts stayed 6 for VA1 and 10 for VA2.
- **Applicant-inserted source (N3).** VA2 can still insert its own source labeled recurring_transfer / plaid, which gets status detected and provider_connection_id null. It cannot then state it (42501) or have it confirmed (22023).

[x] No raw Textract response, SSN, or full account number is stored anywhere, confirmed by query; raw provider payloads are stored redacted; Plaid access tokens are encrypted and unreadable by any client role.

- **Scan** (08:02:40Z to 08:04:43Z). Present at the time: 21 income_records, 4 documents including my W-2, and 3 encrypted tokens. I scanned all 84 text, varchar, JSON, array, and enum columns in 20 public tables, for 9 patterns:
  - SSN, and a masked SSN
  - EIN
  - runs of 9 to 17 digits
  - raw Textract keys (Blocks, BlockType, Geometry, DocumentMetadata, BoundingBox, Relationships)
  - the fixture person's name and street
  - payroll employee strings, account_number, and routing
  - plaintext Plaid public and access tokens
  - the 17 sender names in my custom users
- **7 hits, all hashes.** Two stream refs (32-hex SHA-256 prefixes containing a digit run) each appear in income_sources.provider_stream_ref, income_records.provider_record_ref, and raw_payload.stream.stream_ref. One is a webhook_events.event_id (a SHA-256 of a genuine event body).
  - With stream_ref removed, 0 of the 2 raw_payload hits still match.
  - No sender name is stored anywhere.
- **What is stored:**
  - Textract raw_payload keys are answers and document_kind only.
  - extracted_fields hold only the query aliases: 10 for the paystub, 4 for the W-2, 5 for the Schedule C.
  - The bank raw_payload is {rule, as_of, stream}. stream holds account_id, app, average_amount, excluded_transaction_ids, first_seen, frequency, last_seen, occurrence_count, pattern, stream_ref, and transaction_ids.
  - The payroll raw_payload is as listed under item 4.
- **Encrypted columns.** ssn_encrypted and account_number_encrypted non-null: 0 each. Every account_last_four is 4 digits (2114, 6255).
- **Tokens.** All 3 are 117 bytes, contain no plaintext "access-", and decrypt (as owner, via read_provider_token) to an access-sandbox token.
- **Client access.** VA2, VR, and anon each got 42501 on all of:
  - selecting access_token_encrypted, `*`, or provider_user_ref from provider_connections;
  - read_provider_token and store_provider_token;
  - updating provider_connections;
  - selecting webhook_events.

  Controls: the permitted columns returned VA2's 2 connections, and VR's tenant's 3. anon got 42501 there too. The catalog shows:
  - authenticated's column grants on provider_connections exclude access_token_encrypted and provider_user_ref;
  - authenticated's only UPDATE column on income_sources is family_statement;
  - EXECUTE on read_provider_token, store_provider_token, encrypt_secret, and decrypt_secret is held by postgres and service_role only.

[x] Genericization check from RULES.md run, exact command as written there, no output.

Run at 08:19:03Z, from the repository root, at HEAD 024e3aa. I read the command from RULES.md, section GENERICIZATION IS ENFORCED, NOT DECORATIVE: exactly one line matched, and it ran unmodified. It produced no output, exit code 1.

The only untracked files at the time were my own dot-prefixed temporary scripts, and git grep covers tracked files only. It needs re-running once this file and the item 5 fix are committed.

## STATUS OF PRIOR OBSERVATIONS

### The 8 from PHASE_2_REWORK.md

1. **Bank deposit records not implemented.** Accepted as documented (AS BUILT 12). My two accounts each had 11 payroll deposits, and neither produced a record.
2. **Records ignore confirmed status.** Addressed. After my re-ingest, the confirmed and excluded sources' records kept reasons [], and 0 rows changed.
3. **Applicants can relabel sources.** Addressed. VA2 and VR each got 42501 on source_type and connection_method, and the catalog grants authenticated UPDATE on family_statement only. The residual is N3.
4. **webhook_events lacks tenant_id.** Addressed. RULES.md names it, and the catalog matches: RLS on, 0 policies, no client grant.
5. **Replay not tested end to end.** Still open, unchanged, and not closable from outside, since a genuine Plaid signature cannot be captured. Idempotency rests on UNIQUE (provider, event_id = SHA-256 of the body), which I saw in the catalog, plus the 5-minute iat window, which I read in plaid-verify.ts.
6. **Integration teardown leaks a row.** Addressed. After my integration, isolation, and browser runs, all 20 webhook_events rows in dev were mine: 11 genuine events on my 3 items, and my 9 forgeries. The baseline was 0.
7. **Sandbox items remain in Plaid.** Addressed, as far as I can observe. I removed my 3 items (including the payroll user) with plaid-sandbox "remove", 200 each (08:20:41Z to 08:20:45Z). A fire_webhook on a removed item then returned 502 ITEM_ERROR/ITEM_NOT_FOUND (08:20:47Z).
8. **Later-phase items unchanged.** Accepted as documented. SECURITY.md still lists SEC-P2-02 to -06 for Phases 4 and 5, and PROCESS-RULES.md Phase 5 has the plaid-sandbox production exclusion.

### N1 to N6 from PHASE_2_REWORK_2.md

- **N1. Review reasons lag the status.** Addressed, observed as real users through the real paths:
  - VA2's statement at 07:56:06.023Z; the record read at 07:56:06.062Z already had ["awaiting_review","irregular_pattern"], needs_review true.
  - VR's confirm_income_source at 07:56:07.13Z; the record read at 07:56:07.41Z had [] and needs_review false.
  - The same on a regular source: ["awaiting_review"] right after VA1's statement, [] right after VR's confirmed_excluded.
  - This comes from migration 20260930001500's trigger, which I found enabled in the catalog.
- **N2. The shape identity test's key-set line holds by construction.** Accepted as documented, unchanged. fromRow() still builds the key set. My strict-schema negative control (5 of 5 refused) is what makes the check meaningful.
- **N3. Applicant-inserted sources can carry any label.** Accepted as documented (AS BUILT 19, for Phase 3). Observed again at 07:56:09Z: the source is inserted with status detected, cannot be stated (42501), and cannot be confirmed (22023).
- **N4. stream_ref included the frequency.** Addressed.
  - In code, the key is SHA-256 of account, app, and sender, with no frequency.
  - Observed: no duplicate source across Plaid's staged delivery. Sara's stream kept one ref from count 3 to 20, and after a re-ingest there were 16 detected sources and 16 records, the same as before.
  - Case F (reversed) gave one source.
- **N5. Stale Argyle mention in COLLABORATION-1.md.** Addressed: the QA mandate now reads "integration tests against the Plaid sandbox responses (bank and payroll)".
- **N6. Browser runs.** No failure reproduced in 2 runs (4 of 4, then 9 of 9). Both logged the known SEC-P2-07 "The destination stream closed early". The full run also logged the ErrorBoundary and RedirectErrorBoundary server trace seen last time, which failed no test.

## NEW OBSERVATIONS (not checklist failures)

- **N7. A restarted regular sender becomes "irregular", with its old deposits counted (case J).**
  - What happens: bestRegularRun() takes only the longest run per frequency. If that run has ended (J's first 4 monthly deposits), the frequency is skipped, even when a shorter run is active (J's last 3).
  - What was stored: the sender is surfaced as irregular, count 7, 2026-04-11 to 2026-09-26. The family is asked about "7 deposits ... at irregular times", including 4 from before the pause.
  - It is surfaced, so it is not a gate failure. Consider testing each frequency's longest active run, not only its longest run.
- **N8. A chance run makes an irregular sender "regular" (case K2).**
  - Eli Moss's 8 irregular deposits contain three about a fortnight apart (39, 25, and 12 days ago). With deposits allowed to be skipped and a minimum of 3, that run wins: the source is biweekly, count 3, with 5 deposits listed.
  - The family is shown "3 deposits ... every two weeks", and Phase 3 would annualize 70.00 × 26.
  - The irregular pattern (AS BUILT 17) was meant for exactly this sender. Consider requiring the run to cover most of the sender's deposits, or a longer minimum run when deposits are skipped.
- **N9. AS BUILT 17's wording on merged senders is inaccurate for one shape (case M).** It says the longer schedule wins, "with the rest listed". Two monthly senders sharing a two-word prefix a fortnight apart instead merge into one semi_monthly stream of 10, with a blended average of 195.00 and nothing listed. The limit itself is documented; the description of its effect should match.
- **N10. The integration test's N1 step confirms as the database owner** (`update ... set status = 'confirmed_income'`), not through confirm_income_source as a reviewer. My own probe covered the real path. The test would be stronger if it used a reviewer and the function.
- **N11. Plaid's key endpoint.** One forged ES256 token, with a made-up kid, was recorded as bad_signature, meaning a key was returned for that kid. Two others were recorded as unknown_key. All three were rejected with 401, so this is not a defect. It is noted only so a later reader does not read bad_signature as "a real key was used".

## SUITES RUN BY THE VETTER

- `npm test` (08:05:24Z to 08:05:57Z): "Test Files 7 passed (7)", "Tests 137 passed (137)".
- `npm run test:integration` (08:06:07Z to 08:09:23Z, first attempt, no retry): "Test Files 3 passed (3)", "Tests 19 passed (19)".
- `npm run test:isolation` (08:09:33Z to 08:11:31Z): "Test Files 1 passed (1)", "Tests 29 passed (29)". Report isolation-2026-09-30T08-09-47-632Z.json: total 340, passed 340, failed 0. The two agree.
- `npm run test:e2e` (08:12:13Z to 08:15:34Z; Playwright 1.60.0; app on port 3100): "4 passed (3.1m)".
- `npm run test:theming` (08:15:44Z to 08:18:50Z): "9 passed (2.9m)", the 4 e2e tests plus the 5 theming tests.
- Port 3000 (the user's other project, pid 17092) was listening before and after, and was not touched. Port 3100 was free before the Playwright runs.

## TEST DATA AND CLEANUP

**Baseline** at 07:44:15Z, before anything I ran:
- tenants 1 (cedar-row), programs 3, program_rule_sets 3, ami_schedules 6
- theme_configs 1, properties 2, property_programs 3
- users 1, applicants 1, household_members 1, auth.users 1
- 0 in each of: income_sources, income_records, asset_records, provider_connections, applicant_documents, calculated_determinations, generated_documents, workflow_state, audit_log, webhook_events
- storage objects 0 (total, and in applicant-documents); storage buckets 2
- Vault secrets cron_secret, functions_base_url, pii_key, provider_token_key; cron job ingestion-retry every 5 minutes, active
- 15 migrations
- Hashes: applicants 941abfca…, users 997ecfa0…, household_members a02f3299…, auth.users (id and email) 4551537a…, tenants b83641bb…, theme_configs 65257375…, properties eb0a1291…, program_rule_sets f6a10c3b…

The first four hashes equal the second vetting's.

**What I created:**
- tenant vet4-probe, with its theme and property
- users VA1, VA2, VC (cedar-row applicants), VR (cedar-row reviewer), VB (vet4-probe applicant), and VRB (vet4-probe reviewer), with 4 applicants and 4 household members
- 4 provider_connections: VA1 bank, VA2 bank, VA2 payroll, and VB's link_started row from a control call
- 21 income_sources (16 detected streams, 1 payroll, 3 documents, 1 N3 spoof) and 21 income_records
- 2 asset_records, 4 applicant_documents, and 4 storage objects
- 2 audit_log rows
- 20 webhook_events: 11 genuine events on my items, and my 9 forgeries

**Cleanup**, 08:20:41Z to 08:21:28Z:
- The 3 Plaid items (including the payroll user) were removed through plaid-sandbox "remove", confirmed by ITEM_NOT_FOUND. The link_started row had nothing at Plaid.
- I waited 15 s, then removed the 4 storage objects and deleted every row above. The counts deleted were exactly the counts created.
- webhook_events: deleted every row received since my baseline of 0. That was 20, all mine.
- The 6 auth users were deleted, and their public.users rows went with them (0 left).
- The vet4-probe tenant, theme, and property were deleted.

**After cleanup**, at 08:22:57Z, after a further 60 s wait for late webhooks: all 35 compared values are identical to the baseline, with 0 differences. That covers:
- every table count, auth.users 1, storage 0, and webhook_events 0;
- the Vault secret names, the cron job, and the migration list;
- all eight hashes.

The real applicant's data was read only as counts and hashes, and never modified.

My temporary scripts and state files were deleted. The working tree is clean apart from this file. PHASE_2_REWORK.md and PHASE_2_REWORK_2.md are untouched. PROCESS-RULES.md was not marked.
