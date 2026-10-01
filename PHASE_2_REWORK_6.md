# PHASE_2_REWORK_6.md — Project 1: Fairview Compliance Intake Platform

This is the sixth Phase 2 gate result. It comes from the re-vet after rework 5, commit b43adf1. An independent Master Vetting sub-agent wrote it on 2026-10-01. It built no part of Phase 2.

Before running anything, it read these in full:
- CLAUDE.md, MEMORY.md, COLLABORATION-1.md, MASTER-VETTING-SKILL.md, and PROCESS-RULES.md;
- PHASE-2-SPEC.md, including the ITEM 5 ACCEPTANCE BAR and AS BUILT 1 to 24;
- PHASE_2_REWORK.md to PHASE_2_REWORK_5.md;
- RULES.md, SECURITY.md, MASTER-SPEC-1.md (data model and Milestone 2), TESTS.md, and DESIGN.md's upload control and Income, Assets, and Documents steps;
- the code: supabase/functions/_shared/ (recurring.ts at rule v4, plaid.ts, and the rest), every function's index.ts, the 16 migrations, components/ingestion/, app/[tenant]/apply/ingestion-actions.ts, playwright.config.ts, and every test.

The builder's reports, commit messages, MEMORY.md, SECURITY.md, and the AS BUILT claims were treated as leads only.

All evidence below was produced in this session, against fairview-dev (ref mdatwozuqdiwioezalom), its deployed Edge Functions, the real Plaid Sandbox, and real AWS Textract (eu-west-1). Times are UTC.

**Deployed code equals the commit.** I downloaded each of the six deployed functions with the repository's own Supabase CLI (functions download --use-api), each into its own scratch folder with its _shared bundle. I compared all 54 downloaded source and config files with the working tree at HEAD b43adf1, which was clean: 0 differ. Deployed versions: document-ingest 2, plaid-link-token 9, plaid-exchange 9, plaid-sandbox 13, plaid-webhook 12, ingestion-retry 10. The live catalog lists 16 migrations, the latest 20261001001600.

## Gate result: NOT COMPLETE

- 11 items PASS.
- 1 item FAILS: item 5 (medium).
- None BLOCKED.

Item 5 was judged against PHASE-2-SPEC.md's ITEM 5 ACCEPTANCE BAR, the user's decision of 2026-10-01, exactly as written. Most of the bar holds. On the real Plaid Sandbox, every one of the earlier families (A, B, C, E, F, G, I, P, V1, V2, M1, M2, X2, X2b, X3b, X4, X5, X15, X16, two misses, irregular), with my own names, amounts, and dates, was surfaced and flagged with the right reasons. Each stored stream listed every deposit from its sender, and nothing was silently left out of a surfaced stream. Twelve clean senders across all four frequencies were exact and unflagged.

Item 5 still fails, on two failures the bar names:
1. **A clean input whose figures are not exact.** A clean biweekly sender with exactly 4 deposits is stored as semi_monthly, unflagged. I saw it on the real Plaid Sandbox with two senders. Locally, the committed detector does the same for every 4-deposit biweekly sender at every as-of date in 2026 (365 of 365).
2. **A qualifying sender that is not surfaced.** A sender whose amount changed is dropped completely when the older amount is the majority, though it is still sending. Three examples on the real Plaid Sandbox: a monthly sender whose amount rose, one whose amount was cut, and one who moved from monthly to weekly. Each had at least 3 deposits in the amount band and a deposit in the last 1 to 21 days. None produced a source, a record, or a question for the family.

Everything else passes on my own probes. That covers separation of duties (item 10) and N1 as real users, the schedule_ambiguous reason through statement and decision, N21's stale removal, N22's concurrent claim, and N16, which I forced in a real browser.

Do not write PHASE_2_COMPLETE.md until item 5 meets the bar and is vetted again. The fix will touch recurring.ts again, which the webhook, retry, and sandbox paths share. So the next vet should re-observe at least items 1, 5, 7, 8, and 10, plus the genericization check.

## FAILING ITEMS

### Item 5, FAIL, medium

[ ] Plaid transaction classification identifies recurring peer to peer income transfers in a sandbox account and produces a recurring transfer income source.

**How I tested.**
- I designed four custom Plaid Sandbox users with 41 senders between them, one checking account each:
  - U1, 12 clean senders;
  - U2, 11 senders from the earlier families;
  - U3, 12 senders with missed payments and the fifth vetting's shapes;
  - U4, 6 hunts.
- Every account also held noise: 12 biweekly payroll deposits, 5 rent outflows, and 1 Venmo outflow. None produced a source.
- Before linking, I ran every account through the committed recurring.ts locally (Node, strip-types, as of 2026-10-01) to predict the result.
- I linked all four through the deployed plaid-sandbox with action "link", as cedar-row applicants VA1 to VA4, from 10:49:49Z to 10:49:55Z. Each link returned 200 awaiting_data.
- I polled every 4 s while Plaid delivered history in stages:
  - Sixteen real Plaid-signed webhooks (INITIAL_UPDATE, HISTORICAL_UPDATE, and two SYNC_UPDATES_AVAILABLE per item) were processed by 10:50:12Z, all with signature_valid true.
  - Sources grew from 0 to 3 to 12 (U1, U3) and 0 to 3 to 11 (U2); U4 showed its final 3 from the first poll.
  - At every poll the number of distinct provider_stream_ref values equaled the number of sources, and no source lacked its frequency and average. See N23 for a brief moment where a source had no record yet.
- I stopped after 75 s with no change and HISTORICAL_UPDATE processed on all four items. I read the final state at 10:52:13Z.
- I matched each stored source to my sender by recomputing its stream_ref from Plaid's account id, the app, and the sender.

**Results against my inputs and my prediction.**
- All 38 stored streams equal the local prediction exactly: frequency, average, count, first and last dates, missed_payments, and ambiguity. The three senders predicted to give no source gave none, and no stored source was unmatched.
- Every stored record has:
  - gross_pay equal to the average, and pay_frequency equal to the frequency;
  - pay_period_start, pay_period_end, and pay_date equal to the stream's dates;
  - provider_record_ref "stream:" plus the stream_ref;
  - raw_payload.rule "PHASE-2-SPEC recurring transfer rule v4 (AS BUILT 24)" and as_of 2026-10-01.
- **Deposit lists.** Every stored stream's deposits list equals my input for that sender in the lookback, matched by date and amount: 38 of 38. This is how I checked it, since Plaid's secret is not on this machine and I cannot list Plaid's own transactions:
  - Within each stream, transaction_ids plus excluded_transaction_ids equal the deposits' ids, with no duplicates.
  - Each deposit's in_stream mark agrees with transaction_ids.
  - The count, average, and first and last dates recompute from the in_stream deposits.
  - Across all streams of an account, the deposit ids are unique. Their totals (122, 101, 193, and 37) equal the number of payment app inflows I put in the lookback for the surfaced senders.

**What failed (final read 10:52:13Z).**

| Case | My input | Bar | Stored |
|---|---|---|---|
| CB4, clean biweekly, 4 deposits | Zelle from Gus Hale, 90.00 every 14 days: 08-19, 09-02, 09-16, 09-30 | point 1: biweekly, 90.00, count 4, unflagged | **semi_monthly**, 90.00, count 4, ambiguity [], reasons ["awaiting_family_statement"] |
| CB4b, clean biweekly, 4 deposits | Cash App from Hal Ives, 75.00 every 14 days: 08-11, 08-25, 09-08, 09-22 | point 1: biweekly, 75.00, count 4, unflagged | **semi_monthly**, 75.00, count 4, ambiguity [], reasons ["awaiting_family_statement"] |
| R1, monthly, amount raised | Zelle from Ida Joss, 200.00 on 04-14, 05-14, 06-14, 07-14, then 450.00 on 08-14 and 09-14 | point 2: surfaced and flagged, all 6 deposits listed | **not surfaced**: no source, no record |
| R3, monthly, amount cut | Cash App from Kip Lowe, 500.00 on 04-10 to 07-10 (4), then 200.00 on 08-10 and 09-10 | point 2: surfaced and flagged, all 6 listed | **not surfaced** |
| R4, monthly, then weekly | Venmo from Jem Kirk, 500.00 on 6 dates from 04-06 to 08-04, then 60.00 weekly on 09-02, 09-09, 09-16, 09-23, and 09-30 | point 2: surfaced and flagged, all 11 listed | **not surfaced** |

The controls passed in the same accounts: a 5-deposit biweekly sender (CB5, Venmo from Lia Nash) was biweekly and clean, and a 3-deposit weekly sender (CW3) was weekly and clean.

**Why each is a failure under the bar, as written.**
- CB4 and CB4b are clean inputs by point 1's definition. Each is one sender on one of the four frequencies, with every deposit on schedule, no missed payment, and no other deposit. Point 1 requires the stored frequency to be exact. It is not, and the stream carries no flag.
  - Annualized at 24 periods instead of 26, each understates by 7.7 percent: 2,160.00 instead of 2,340.00 for CB4.
  - The family is asked about deposits "twice a month".
  - If the software found the two readings ambiguous, the bar requires a flag, and there is none. So it fails either way.
- R1, R3, and R4 are qualifying senders by point 2's definition. Each has "at least 3 deposits in the amount band" (4, 4, and 6), and "a deposit in the last 45 days": the latest deposits are 17, 21, and 1 day before the as-of date. None is surfaced, which the bar names as a failure.
  - They are not the documented limit. That limit is "a sender who stopped (no active run, and no deposit in 45 days) ... not anticipated income", and these senders did not stop. R4 sent five deposits in the last 30 days.
  - AS BUILT 13 also says a deposit outside the amount band is "kept out of the stream and listed for the reviewer". Here nothing is listed anywhere.
  - Possible other reading: the bar's "a deposit in the last 45 days" could be meant as an in-band deposit, which is what the code checks. On that reading R1, R3, and R4 would not qualify, but they would still fall outside the documented "stopped" limit. Choosing that reading is the user's decision, not the builder's or mine. Failure 1 fails item 5 on its own, whichever reading is chosen.

**Cause, from the code (recurring.ts at b43adf1).**
- **CB4.** isSemiMonthly (lines 119 to 142) needs only 4 dates. Four biweekly dates fall two per "slot": each pair is 28 days apart, so their days of the month differ by only 2 or 3, which passes the "tight, within 3 days" test. The semi-monthly and biweekly runs both hold all 4 deposits. bestRegularRun (line 227) keeps the first frequency in PREFERENCE order on a length tie, and semi_monthly comes first (line 112). Timing is compared only within one frequency, never across frequencies, so exact 14-day gaps do not count.
  - My local sweep of clean inputs: 603 cases, covering weekly (3 to 26 deposits), biweekly (3 to 13), monthly on every day of the month (3 to 6), and semi-monthly on 9 day pairs with and without business-day shifts (4 to 12), each at every alignment ending within one interval of the as-of date. 589 were exact and unflagged. All 14 failures were the 14 alignments of a 4-deposit biweekly sender.
  - At as-of dates through 2026, the 4-deposit biweekly sender is semi_monthly 365 times of 365.
  - recurring.test.ts has no clean series with fewer than 5 deposits.
- **R1, R3, R4.** The amount band is the median of all the sender's deposits ±50 percent (lines 270 to 273). When the older amount is the majority, the median sits on it, so the recent deposits fall outside the band. Then:
  - Only in-band deposits are candidates for a run. Their last is 79, 83, and 58 days old, so no run is active (line 193), and regular is null.
  - The irregular path then drops the sender, because the last *candidate* is more than 45 days old (line 281). The recent out-of-band deposits are never looked at for recency.
  - In a random sweep of 170 qualifying senders by the bar's wording, 15 were not surfaced, and all 15 had this shape: the deposits in the last 45 days were outside the band.

I rate it medium, as before. Nothing becomes income without the family's statement and a reviewer's decision. But a clean input is misread without a flag, which the bar exists to prevent. And a sender with ongoing, regular deposits can vanish completely, so the family is never asked and the reviewer never sees it. Phase 3 relies on the opposite: an unflagged stream is exact, and every current sender is surfaced.

**To pass:**
- On real Plaid Sandbox data, through the deployed functions:
  - A clean biweekly sender with 4 deposits is stored as biweekly, exact and unflagged. More generally, no clean input is read at another of the four frequencies. One possible approach is to compare timing across frequencies on a length tie, or to require more dates before a series counts as semi-monthly. Either way, the 4-deposit semi-monthly case must stay semi-monthly. My control was "Venmo from X Y" on 08-15, 09-01, 09-15, and 09-30, which is semi_monthly today.
  - A sender with at least 3 deposits in the amount band and any deposit in the last 45 days is surfaced and flagged, with every deposit listed (R1, R3, R4). Alternatively, the user records in the bar that only in-band deposits count for recency, and adds amount-changed senders to the documented limits; that is the user's call.
  - Every earlier shape still meets the bar.
- The choice stays deterministic and is documented in PHASE-2-SPEC.md AS BUILT.
- The unit tests and the plaid-sandbox integration test drive a 4-deposit biweekly sender and at least one amount-changed sender (R1 or R4).

**What met the bar, stored on the real Plaid Sandbox (final read 10:52:13Z).**

Clean inputs (point 1). Each was exact, with ambiguity [] and reasons ["awaiting_family_statement"] only, and every deposit listed as in_stream.

| Case | My input | Stored |
|---|---|---|
| CW, weekly | Venmo from Ada Quill, 45.00 every Tuesday 04-07 to 09-29 | weekly 45.00, count 26, 04-07 to 09-29 |
| CH, weekly, holiday shifts | Venmo from Ike Jory, 60.00 Mondays 04-06 to 09-28, with 05-25 paid 05-26 and 09-07 paid 09-08 (gaps of 8 then 6 days) | weekly 60.00, count 26 |
| CW3, weekly, 3 deposits | Zelle from Moe Ortiz, 40.00 on 09-15, 09-22, 09-29 | weekly 40.00, count 3 |
| CB, biweekly | Zelle from Ben Ostrow, 130.00 every 14 days 04-10 to 09-25 | biweekly 130.00, count 13 |
| CB5, biweekly, 5 deposits | Venmo from Lia Nash, 65.00 every 14 days 07-28 to 09-22 | biweekly 65.00, count 5 |
| CS, semi-monthly, 1st paid on the prior month's last day | Cash App from Cora Lind, 225.00 on the 1st and 15th, with 05-01 paid 04-30 and 08-01 paid 07-31 (11 deposits) | semi_monthly 225.00, count 11, 04-15 to 09-15 (N17) |
| CS2, semi-monthly, 15th and last day | Zelle from Jo Kemp, 400.00, 04-15 to 09-30 (12) | semi_monthly 400.00, count 12 |
| CM, monthly, month-end drift | Venmo from Dov Pratt, 310.00 on 04-30, 05-31, 06-30, 07-31, 08-31, 09-30 | monthly 310.00, count 6 |
| CM2, monthly, cents | Zelle from Eda Fong, 515.25 on the 12th, 04-12 to 09-12 | monthly 515.25, count 6 |
| CV, monthly, varying amounts in band | Venmo from Fay Gunn, 180, 240, 205, 260, 190, 230 on the 20th | monthly 217.50, count 6 |
| C, memo varies | Cash App from Ned Oakes, 95.00 monthly, memo alternating "for groceries" and "phone bill" | one source, monthly 95.00, count 6 |
| CTRL, lookback edge | Cash App from Ned Pike, 260.00 on the 3rd, 04-03 to 09-03 (04-03 is one day before the lookback) | monthly 260.00, count 5, 05-03 to 09-03 |

February cannot be tested on the live path: the 180-day lookback from 2026-10-01 starts on 2026-04-04. My local sweep covers every day of the month for the months in the window.

Flagged inputs (point 2). Each was surfaced and flagged with the reasons shown, with needs_review true and every deposit listed.

| Case | My input | Stored (proposal) | Reasons; left out |
|---|---|---|---|
| A | Venmo from Lou Marsh, 120.00 every 30 days 05-01 to 09-28 (6), plus 120.55 on 07-12 | monthly 120.00, count 6 | deposits_left_out, schedule_ambiguous; 07-12 120.55 |
| B | Zelle from Mae Nolan, 70.00 every 14 days 04-08 to 09-23 (13), plus 70.30 on 06-11 | biweekly 70.00, count 13 | deposits_left_out; 06-11 70.30 |
| E | Venmo from Opal Price, 280.00 every 30 days 05-27 to 09-24 (5), plus 170.00 on 07-05 | monthly 280.00, count 5 | deposits_left_out; 07-05 170.00 |
| F | Zelle from Pia Quon, 55.00 every 14 days 04-09 to 06-18, then weekly 06-25 to 09-24 (20 deposits) | weekly 55.00, count 16, missed 1, 06-04 to 09-24 | deposits_left_out, missed_payment; the 4 earliest biweekly deposits (N19) |
| G | Venmo from Ray Soto, 450.00 every 30 days 04-26 to 09-23, plus 300.00 on 07-28 | monthly 450.00, count 6 | deposits_left_out; 07-28 300.00 |
| I | Zelle from Sal Tran, 240.00 on the 5th and 20th (12), plus 160.00 on 07-08 | semi_monthly 240.00, count 12 | deposits_left_out; 07-08 160.00 |
| P | Cash App from Tad Uhl, 520.00 every 30 days, last 09-26, plus 360.00 on 09-28 | monthly 520.00, count 6, last_seen 09-26 | deposits_left_out; 09-28 360.00 |
| V1 | Venmo from Una Vale, 160, 230, 195, 250, 185, 220 monthly, plus 210.00 on 07-23 | monthly 206.67, count 6 | deposits_left_out; 07-23 210.00 |
| V2 | Zelle from Val West, 330, 360, 345, 375, 350, 310 monthly (last 09-25), plus 340.00 on 09-28 | monthly 345.00, count 6, last_seen 09-25 | deposits_left_out; 09-28 340.00 |
| Gift | Venmo from Hy Ivers, 150.00 monthly (6), plus 900.00 on 06-05 | monthly 150.00, count 6 | deposits_left_out; 06-05 900.00 |
| M1 | Cash App from Wyn Xu, 105.00 every 14 days 04-11 to 09-26, 06-20 missed | biweekly 105.00, count 12, missed 1 | missed_payment |
| M2 | Venmo from Yan Yost, 42.00 weekly 04-08 to 09-30, 07-15 missed | weekly 42.00, count 25, missed 1 | missed_payment |
| X2 | Zelle from Zed Abel, 38.00 weekly 04-09 to 09-24, 07-02 missed, plus 38.25 on 06-29 | weekly 38.02, count 13, missed 1, 06-29 to 09-24 | deposits_left_out, missed_payment; the 12 deposits 04-09 to 06-25 |
| X2b | Venmo from Abe Birch, 33.00 weekly 04-07 to 09-29, 07-07 missed, plus 21.00 on 07-02 | weekly 32.52, count 25, missed 1 | deposits_left_out, missed_payment; 06-30 33.00 (a scheduled deposit) |
| X3b | Cash App from Bo Cain, 150.00 every 14 days 04-13 to 09-28, 05-25 missed, plus 105.00 on 05-14 | biweekly 145.50, count 10, missed 1, from 05-14 | deposits_left_out, missed_payment; 04-13, 04-27, 05-11 |
| X4 | Venmo from Dee Ruiz, 52.00 weekly 04-05 to 09-20 (25; 09-27 never came) | biweekly 52.00, count 13 | deposits_left_out; every other deposit (12) |
| X5 | Venmo from Kit Lam, 77.00 every 14 days 04-07 to 09-08 (12; 09-22 never came) | irregular, count 12 | irregular_pattern |
| X15 | Zelle from Di Eads, 380.00 monthly from 04-16, 05-16 missed, plus 250.00 on 04-19 | monthly 354.00, count 5, missed 1, from 04-19 | deposits_left_out, missed_payment; 04-16 380.00 |
| X16 | Cash App from Ev Faye, 380.00 monthly, 07-11 missed, plus 255.00 on 08-07 | monthly 355.00, count 5, missed 1 | deposits_left_out, missed_payment; 08-10 380.00 |
| Two misses | Venmo from Flo Gage, 88.00 every 14 days 04-10 to 09-25, 05-22 and 08-14 missed | biweekly 88.00, count 8, missed 1, from 06-05 | deposits_left_out, missed_payment; 04-10, 04-24, 05-08 (N20) |
| Irregular | Zelle from Gil Hart, 75.00 on 7 irregular dates, last 09-20 | irregular, count 7 | irregular_pattern |
| LATE | Zelle from Liv Moss, 50.00 weekly 04-08 to 09-30, with 07-01 paid 07-04 | irregular, count 26 | irregular_pattern |
| LOW | Venmo from Max Nye, 100.00 monthly on the 25th, with 06-25 paid 40.00 | monthly 100.00, count 5, missed 1 | deposits_left_out, missed_payment; 06-25 40.00 |

- Each figure the bar allows to be off is a proposal from the documented limits: X2, X2b, X3b, X15, and X16 count a one-off; X4 is proposed at a coarser frequency; F records a miss that did not happen; and two misses record 1.
- schedule_ambiguous appears on every flagged regular stream, and irregular_pattern on every irregular one.
- One boundary case was unflagged, correctly under the bar: X4a, Zelle from Cy Dorn, 55.00 weekly to 09-21. Its next payment (09-28) is 3 days late, but the run is still active (10 days is within 1.5 weeks). Nothing was left out or bridged, so no judgment was made. It was stored as weekly 55.00, count 25, exact.

## PASSING ITEMS

[x] Plaid sandbox integration functional, produces a normalized income_records entry.

- My four bank links (10:49:49Z to 10:49:55Z) went from awaiting_data to ingested, driven by 16 real Plaid-signed webhooks (signature_valid true), processed by 10:50:12Z.
- They produced:
  - 4 asset_records rows ("Vet Seven Checking VA1" to "VA4"), each with balance 3105.75, exactly my custom users' starting balance, a 4-digit mask, and account_number_encrypted null;
  - 38 income_sources and 38 income_records, ingestion_method plaid;
  - 0 sources from the 48 payroll deposits and 24 outflows.
- The stored bank rows validate against the shared schema (item 8).
- Tokens are stored encrypted (item 11).
- A re-read through four real signed webhooks I fired (10:54:03Z to 10:54:08Z) was processed and changed none of the 38 source and record rows (item 10).

[x] Payroll sandbox integration (Plaid Payroll Income; Argyle or Pinwheel as the listing names, if later added) functional, produces a normalized income_records entry of identical shape to the bank pipeline's output.

- VA2's plaid-sandbox link with product payroll_income (10:55:50Z to 10:55:56Z) returned 200: status ingested, 2 stubs.
- A real INCOME.USER_INCOME_VERIFICATION webhook was received, signature_valid true, and processed.
- The connection has product payroll_income, a Plaid user reference, and a 117-byte encrypted token with no plaintext.
- There are 2 income_records, each with ingestion_method plaid, source_type employment, source status detected, and provider_record_ref set.
- The stored payroll row validates with the same 18-key set as the bank and Textract rows (item 8).

[x] Textract Queries fallback pipeline functional against a sample scanned paystub, W-2, and Schedule C, each producing a normalized income_records entry of identical shape to the other two pipelines.

These are my own uploads into VA2's own folder, each followed by an applicant_documents row written as VA2, and then document-ingest with VA2's token. The paystub went through a signed upload URL, as the UI does; the others were direct uploads.
- **Paystub** (10:55:04Z): 200 extracted, no reasons.
  - Fairview Parcel Services LLC, biweekly, rate 18.50, gross 1480.00, YTD 26640.00.
  - Period 2026-08-24 to 2026-09-06, pay date 2026-09-11, confidence 97.
  - Deduction total_deductions 276.02, which is 1480.00 minus the fixture's net 1203.98.
- **W-2** (10:55:10Z): 200 needs_review (historical_annual). Employer Fairview Parcel Services LLC, gross 34120.50, annual, 2025-01-01 to 2025-12-31, confidence 99.
- **Schedule C** (10:55:18Z): 200 needs_review.
  - self_employment, Sample Lawn Care, gross 24800.00, annual, confidence 99.
  - Deduction schedule_c_line_28_total_expenses 7350.00.
  - Reasons self_employment_net_income_phase3 and schedule_c_line_31:17450.00.
- Every value equals tests/fixtures/documents/expected.json.
- **Two-page PDF** (10:55:28Z): 422 multi_page_pdf. The document is failed with reason multi_page_pdf, and no income record exists for it.
- **W-2 read again** (10:55:29Z): 409 already_processed.
- **Concurrent calls on fresh documents** (N22), 10:55:30Z to 10:55:44Z:
  - two calls at once: 200 and 409, one record;
  - two calls at once again: 200 and 409, one record;
  - three calls at once: 200, 409, and 409, one record.
- The paystub, W-2, and Schedule C rows validate with the same key set as the other two pipelines (item 8).

[x] Payroll ingestion captures gross pay, pay frequency, YTD earnings, and deductions.

VA2's stored payroll rows:
- **Stub paid 2026-10-01:**
  - gross 2306.00, semi_monthly, rate 25.15;
  - YTD 2306.00 through 2026-09-30;
  - period 2026-09-16 to 2026-09-30;
  - deductions [taxes 1000.00].
- **Stub paid 2026-09-01:**
  - gross 2306.00, biweekly, YTD 2306.00 through 2026-08-31;
  - six itemized deductions: Social Security Tax 23.44, 401K 352.34, Medicare Tax 12.45, Dental Insurance 13.74, Federal Tax 612.91, State Tax 409.25.
- Each frequency is Plaid's own value for that stub (SEMI_MONTHLY and BIWEEKLY in the stored pay_period_details).
- Both have needs_review true with variable_earnings:bonus,overtime, deferred to Phase 3.
- The raw_payload keys are only deductions, document_id, earnings, employer, net_pay, pay_period_details, and source. employer holds {name: "Platypus LLC"} only.

[x] Webhook signature verification present and tested for every webhook provider in use (Plaid, which serves both bank and payroll; and Argyle if later added), even in sandbox mode.

- **Forgeries** (10:57:42Z to 10:57:53Z). Twelve forged requests to plaid-webhook, naming my real bank item or my real payroll user. Each returned 401 {"error":"invalid_signature"}:
  - no header
  - garbage
  - alg none
  - HS256 with the correct body hash
  - RS256 signed by my own key
  - ES256 with no kid
  - ES256 signed by my own P-256 key, with a plausible kid and the correct body hash
  - the same, with my public key embedded as a jwk header
  - the same, over an INCOME body naming my payroll user
  - the same, over an ITEM ERROR body (ITEM_LOGIN_REQUIRED) with an iat an hour old
  - ES256 signed by my own key, with a wrong body hash
  - ES256 signed by my own key, with the kid an earlier vetting had used
- **What was recorded.** Exactly 12 new webhook_events rows, each with signature_valid false, status rejected, provider_ref null, and a "rejected:" event id. Their types were:
  - missing_signature, malformed_signature, missing_key_id, and bad_signature (1 each);
  - wrong_algorithm (3);
  - unknown_key (5).
- **Nothing was processed.** A snapshot of my five connections (status, error code, last event time) and of all their sources and record counts was identical before and after. VA1's connection stayed ingested, not reauth_required.
- **Other method.** GET returned 405.
- **Valid path.** 21 genuine Plaid-signed events on my items were accepted and processed: 16 from the links, the 4 I fired, and the INCOME event.
- **Idempotency.** The catalog shows UNIQUE (provider, event_id) on webhook_events. The stale-iat and tampered-body branches are unit tested in tests/unit/plaid-verify.test.ts, within my `npm test` run of 155.
- Argyle is not in use.

[x] Integration test suite covering all three ingestion paths.

`npm run test:integration`, 11:02:54Z to 11:07:16Z, first attempt with no retry: "Test Files 3 passed (3)", "Tests 22 passed (22)". The files are:
- plaid.test.ts: bank; recurring, with the earlier cases and the ITEM 5 ACCEPTANCE BAR case; the signed webhook; retry; pg_net; forgeries; payroll; and cross-applicant checks;
- textract.test.ts;
- shape-identity.test.ts.

Afterwards, auth.users held no int-* user, and all 33 webhook_events rows in dev were mine (N14, and observation 6 of the first vetting).

[x] Normalized income record shape identity test passes: one record from each pipeline validates against the single shared schema with an identical key set.

- **The test** (tests/integration/shape-identity.test.ts) passed inside my full integration run.
- **By hand (11:13Z), with my own script.** I imported NORMALIZED_KEYS and normalizedIncomeRecordSchema from supabase/functions/_shared/normalized.ts.
  - NORMALIZED_KEYS has 18 keys.
  - Every key except source_type is a column of income_records. The only other columns are id, tenant_id, applicant_id, income_source_id, provider_connection_id, document_id, provider_record_ref, raw_payload, and created_at.
  - I rebuilt seven stored rows from their own columns plus income_sources.source_type:
    - bank: CB's clean stream, biweekly 130.00;
    - bank: the irregular stream, frequency null;
    - bank: X15's flagged stream, monthly 354.00;
    - payroll: 2306.00 semi_monthly;
    - Textract: the 1480.00 paystub, the 34120.50 W-2, and the 24800.00 Schedule C.
  - All seven are valid, and all seven key sets are identical to NORMALIZED_KEYS.
  - Negative control: each record with one extra key was refused by the strict schema, 7 of 7.

[x] New Phase 2 tables have tenant_id and RLS in the migration that creates them; isolation suite extended to them and to the private document storage bucket, and passing.

- **Catalog** (10:59:59Z):

  | Table | RLS | Policies | tenant_id |
  |---|---|---|---|
  | provider_connections | on | 1 | yes |
  | applicant_documents | on | 2 | yes |
  | income_sources | on | 3 | yes |
  | income_records | on | 1 | yes |
  | asset_records | on | 3 | yes |
  | webhook_events | on | 0 | no |

  - All 20 public tables have RLS on.
  - webhook_events has grants only to postgres and service_role. It is the documented platform exception in RULES.md.
  - The applicant-documents bucket is private, with a 10485760 byte limit and jpeg, png, and pdf only.
  - storage.objects has one INSERT and one SELECT policy, both for authenticated.
  - The triggers income_sources_statement_guard and income_sources_sync_stream_record_reasons are enabled.
- **Suite.** `npm run test:isolation`, 11:07:45Z to 11:09:44Z:
  - Vitest: "Test Files 1 passed (1)", "Tests 29 passed (29)".
  - Newest report, isolation-2026-10-01T11-07-54-215Z.json: projectRef mdatwozuqdiwioezalom, total 340, passed 340, failed 0. My own recount is 340 entries, all with pass true, in 33 groups including T1 to T5.
  - The summary and the report agree, so SEC-P1-05 does not apply.
- **By hand** (10:58:47Z to 10:59:12Z), as three users against VA2's resources: VB (applicant, second tenant vet7-probe), VRB (reviewer, vet7-probe), and VC (another cedar-row applicant). I checked each user's JWT claims first.
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
  - anon: download "Object not found", a listing of 0 objects, and a select of income_records 42501.
  - Afterwards VA2's folder, the W-2's status, and VA2's connection were unchanged, and the vet7-probe prefix held 0 objects.
  - Controls:
    - VA2 downloaded its own W-2 (90232 bytes).
    - Same-tenant reviewer VR downloaded it (90232 bytes) and saw VA2's 19 records.
    - VB got a link-sandbox token for its own member.

[x] Recurring transfers follow PHASE-2-SPEC.md's rule: detected by software, stated by the family, confirmed by a reviewer; no transfer becomes income through software alone.

My probes (10:53:17Z to 10:53:29Z). The users were VA1, VA2, and VA3 (cedar-row applicants), VR (cedar-row reviewer), VC (cedar-row applicant), and VB and VRB (vet7-probe applicant and reviewer). Their JWT claims had the right roles and tenants.

- **Reviewer on an unstated source** (the irregular stream, VA3's, awaiting_family_statement):
  - VR writing family_statement: 42501 "only the applicant can give the family's statement".
  - confirm_income_source with a reason, for confirmed_income, confirmed_excluded, and dismissed: 22023 "the family has not stated what this is yet", all three.
  - Direct updates of status, source_type, connection_method, family_statement_at, and average_amount: 42501 "permission denied for table income_sources".
  - The source stayed unchanged, and audit_log stayed at 0.
- **Applicant limits**, on VA3's own source:
  - Updating status, source_type, connection_method, average_amount, or frequency: 42501.
  - Calling confirm: 42501 "staff only".
- **Other users:**
  - VC (same tenant) and VB (other tenant) writing VA3's statement: 0 rows.
  - VB confirming: 42501 "staff only".
  - VRB confirming: P0002 "source not found".
  - VRB writing the statement: 0 rows.
  - VRB selecting VA3's sources and records, and VC selecting VA3's sources: 0 rows. Control: VR saw VA3's 12 records.
- **Positive path, as real users:**
  - VA3 stated the irregular stream regular_contribution: 1 row, status awaiting_review, family_statement_at stamped (10:53:24.924Z). The record read right after had ["awaiting_review","irregular_pattern"], needs_review true (N1).
  - VR's confirm with a blank reason: 22023 "a reason is required". With outcome awaiting_review: 22023.
  - VR writing the now-stated statement: 42501.
  - VR confirmed it confirmed_income with a reason. The record then had [] and needs_review false. audit_log went from 0 to 1 row: actor VR, action confirm_income_source, target income_sources, before_value {status awaiting_review, family_statement regular_contribution}, after_value {status confirmed_income}, and the reason.
  - A second confirm: 22023 "this source has already been decided" (N15). A confirm on an unstated source (M1) still says "the family has not stated what this is yet".
  - VA3 re-stating the confirmed source: 42501 "a statement can only be given while the source awaits one".
- **A flagged stream through statement and decision** (rule v4). G's record had ["awaiting_family_statement","schedule_ambiguous"].
  - After VA2 stated it life_event_gift: ["awaiting_review","schedule_ambiguous"], needs_review true. Migration 1500's trigger keeps the flag.
  - After VR confirmed it confirmed_excluded: [], needs_review false.
  - VA2 stated A will_not_repeat, and VR dismissed it: [].
  - VA1 stated CB4 shared_expense_reimbursement and left it undecided: ["awaiting_review"].
  - Three audit rows in all.
- **Re-ingest does not reset state.** I fired SYNC_UPDATES_AVAILABLE through plaid-sandbox on all four bank items (10:54:03Z to 10:54:08Z). All four were recorded as new events and processed (signature_valid true) by 10:54:15Z. I compared all 38 sources and their records before and after, on status, statement and its time, figures, reasons, needs_review, and the stored stream. **0 rows changed.**
- **Stale removal (N21)**, in the same read. Before firing, I inserted, as the database owner, three recurring_transfer sources with records on VA4's connection, under stream references that Plaid's data does not contain:
  - the one awaiting the family's statement was removed with its record;
  - the stated one (awaiting_review) was kept with its record;
  - the confirmed one (confirmed_income) was kept with its record.
- **Applicant-inserted source (N3).** VA3 can still insert its own source labeled recurring_transfer / plaid, which gets status detected and provider_connection_id null. It cannot then state it (42501) or have it confirmed (22023).

[x] No raw Textract response, SSN, or full account number is stored anywhere, confirmed by query; raw provider payloads are stored redacted; Plaid access tokens are encrypted and unreadable by any client role.

- **Scan** (11:00:01Z). Present at the time: 48 income_records, 7 documents including four W-2s, and 5 encrypted tokens. I scanned all 84 text, varchar, JSON, array, and enum columns in 20 public tables, with these patterns:
  - SSN, and a masked SSN
  - EIN
  - runs of 9 to 17 digits
  - raw Textract keys (Blocks, BlockType, Geometry, DocumentMetadata, BoundingBox, Relationships)
  - the fixture person's name and street
  - payroll employee strings, taxpayer, account_number, routing, distribution, and download link
  - plaintext Plaid public and access tokens
  - the 41 sender names in my custom users
  - positive controls: "Platypus LLC" and "Sample Lawn"
- **Result.**
  - The controls matched where expected (employer_name, raw_payload, extracted_fields, and the payroll source key).
  - SSN, masked SSN, EIN, Textract keys, person, payroll employee strings, tokens, and sender names: 0 hits each. No sender name is stored anywhere, although every stream's deposit list is stored.
  - Digit runs: 26 hits, all hashes or ids, in raw_payload, provider_record_ref, provider_stream_ref, webhook event ids, and my storage paths. Outside the stream payload, 0 records match. Outside transaction_id, 0 deposit entries match.
- **What is stored:**
  - Textract raw_payload keys are answers and document_kind only.
  - extracted_fields hold only the query aliases: 10 for the paystub, 4 for the W-2, 5 for the Schedule C.
  - The bank raw_payload is {as_of, rule, stream}. stream holds account_id, ambiguity, app, average_amount, deposits, excluded_transaction_ids, first_seen, frequency, last_seen, missed_payments, occurrence_count, pattern, stream_ref, and transaction_ids. Each deposit entry has only amount, date, in_stream, and transaction_id.
  - The payroll raw_payload is as listed under item 4.
- **Encrypted columns.** ssn_encrypted and account_number_encrypted non-null: 0 each. Every account_last_four is 4 digits.
- **Tokens.** All 5 are 117 bytes, contain no plaintext "access-", and decrypt (as owner, via public.read_provider_token) to an access-sandbox token.
- **Client access** (11:02:24Z). VA2, VR, and anon each got 42501 on all of:
  - selecting access_token_encrypted, `*`, or provider_user_ref from provider_connections;
  - read_provider_token and store_provider_token;
  - updating provider_connections;
  - selecting webhook_events.

  Controls: the permitted columns returned VA2's 2 connections and VR's tenant's 5. anon got 42501 there too. The catalog shows:
  - authenticated's column grants on provider_connections exclude access_token_encrypted and provider_user_ref;
  - authenticated's only UPDATE column on income_sources is family_statement;
  - EXECUTE on read_provider_token, store_provider_token, encrypt_secret, decrypt_secret, and encrypt_pii is held by postgres and service_role only.

[x] Genericization check from RULES.md run, exact command as written there, no output.

Run at 11:03:01Z on 2026-10-01, from the repository root, at HEAD b43adf1 with a clean working tree. I read the command from RULES.md, section GENERICIZATION IS ENFORCED, NOT DECORATIVE: exactly one line matched, and it ran unmodified. It produced no output, exit code 1. It needs re-running once this file and the item 5 fix are committed.

## STATUS OF PRIOR OBSERVATIONS

### The 8 from PHASE_2_REWORK.md

1. **Bank deposit records not implemented.** Accepted as documented (AS BUILT 12). My four accounts each had 12 payroll deposits, and none produced a source or record: every one of the 38 sources matched one of my payment app senders.
2. **Records ignore confirmed status.** Addressed. After my re-ingest, the confirmed, excluded, and dismissed sources' records kept reasons [], and 0 of 38 rows changed.
3. **Applicants can relabel sources.** Addressed. VA3 and VR each got 42501 on source_type and connection_method, and the catalog grants authenticated UPDATE on family_statement only. The residual is N3.
4. **webhook_events lacks tenant_id.** Addressed. RULES.md names it, and the catalog matches: RLS on, 0 policies, no client grant.
5. **Replay not tested end to end.** Still open, unchanged, and not closable from outside, since a genuine Plaid signature cannot be captured. It is a documented limit in the ITEM 5 ACCEPTANCE BAR. Idempotency rests on UNIQUE (provider, event_id = SHA-256 of the body), which I saw in the catalog, plus the 5-minute iat window, which is unit tested.
6. **Integration teardown leaks a row.** Addressed. After my integration run, no int-* auth user remained, and all 33 webhook_events rows in dev were mine (21 genuine events on my items and my 12 forgeries).
7. **Sandbox items remain in Plaid.** Addressed, as far as I can observe; see TEST DATA AND CLEANUP.
8. **Later-phase items unchanged.** Accepted as documented. SECURITY.md still lists SEC-P2-02 to -06 for Phases 4 and 5, and PROCESS-RULES.md Phase 5 has the plaid-sandbox production exclusion.

### N1 to N22

- **N1. Review reasons lag the status.** Addressed, observed as real users through the real paths. Right after the statement, the irregular stream's record had ["awaiting_review","irregular_pattern"]; right after the confirm, []. A flagged stream keeps schedule_ambiguous through the statement and loses it on the decision (G).
- **N2. The shape identity test's key-set line holds by construction.** Accepted as documented, unchanged. My strict-schema negative control (7 of 7 refused) is what makes the check meaningful.
- **N3. Applicant-inserted sources can carry any label.** Accepted as documented (AS BUILT 19, for Phase 3). Observed again: inserted with status detected, cannot be stated (42501), cannot be confirmed (22023).
- **N4. stream_ref included the frequency.** Addressed. At every poll during Plaid's staged delivery, distinct stream refs equaled sources, and case F gave one source.
- **N5. Stale Argyle mention in COLLABORATION-1.md.** Addressed: the QA mandate reads "integration tests against the Plaid sandbox responses (bank and payroll)".
- **N6. Browser runs.** Superseded by N12.
- **N7. A restarted sender becomes irregular with old deposits counted.** Addressed (AS BUILT 20 and 22). The same mechanism lists the deposits before the first of two missed payments; see N20.
- **N8. A chance run makes an irregular sender regular.** Addressed. X5 (12 biweekly deposits, the latest missing, exactly half on the every-other-week run) was stored as irregular with all 12, and flagged.
- **N9. AS BUILT 17's wording on merged senders.** Addressed; it is now also a documented limit in the bar.
- **N10. The integration test's N1 step confirmed as the owner.** Addressed. plaid.test.ts confirms through a reviewer's client and checks the audit row, and it passed in my run.
- **N11. Plaid's key endpoint.** Still observed, informational. My forgery with the kid an earlier vetting used was again recorded as bad_signature, meaning Plaid returned a key for it. Five others were unknown_key. All were rejected with 401.
- **N12. The uploader could hang.** Addressed; components/ingestion/document-uploader.tsx is unchanged since the fifth vetting forced its four failure paths in a real browser. In my runs the browser tests ran on a production build: .next/BUILD_ID was rewritten during each run (see SUITES).
- **N13. The stored rule label is stale.** Addressed. All 38 stream payloads say "PHASE-2-SPEC recurring transfer rule v4 (AS BUILT 24)".
- **N14. The integration teardown left one auth user.** Addressed. After my integration run, 0 int-* users remained.
- **N15. A misleading message.** Addressed. A second confirm returns 22023 "this source has already been decided"; an unstated source still returns "the family has not stated what this is yet".
- **N16. The bank connection has no stall timeout.** Addressed.
  - Code: bank-connect.tsx races both server steps (startBankConnection, and finishBankConnection in Plaid's onSuccess) against a 120 s stallGuard, and each ends in a message with the button usable again.
  - Forced in a real browser for the first step, without changing any file. I used my own production server on port 3100, signed in as VC with genuine @supabase/ssr session cookies, and Playwright held every server action request unanswered (11:17:29Z to 11:19:31Z).
  - After 3 s the button read "Connecting…" and was disabled, with 1 request held. After 121.8 s the alert "We could not start the bank connection. Check your connection, then try again." appeared, and "Connect your bank" was enabled again.
  - The finish step needs Plaid Link's own sign-in window to reach onSuccess, so I checked it by code reading only: it uses the same guard.
- **N17. Semi-monthly read as biweekly across a month end.** Addressed. CS (the 1st paid on the prior month's last day twice) was semi_monthly, count 11, exact and unflagged. My local sweep of semi-monthly pairs, including business-day shifts, was exact in every case.
- **N18. Cadences outside the four frequencies.** Accepted as a documented limit in the bar; not re-probed.
- **N19. A schedule switch counted as a missed payment (F).** Accepted as a documented limit, and flagged. Observed again: F is weekly, count 16, missed 1, starting 06-04, two biweekly-era deposits early, with deposits_left_out and missed_payment, and the 4 earliest deposits listed.
- **N20. Two missed payments.** Accepted as a documented limit, and flagged. Observed again: biweekly 88.00, count 8, missed 1, with the three deposits before the first miss listed.
- **N21. A stream that stops qualifying on a later read is never removed.** Addressed. In plaid.ts, ingestItem deletes, after a read that has transactions, only sources still at awaiting_family_statement whose stream is not in the current read, with their records. I forced it through the deployed function and a real signed webhook (item 10): the unanswered source was removed, and the stated and confirmed ones were kept. I did not observe a natural early-stage stream being removed. Plaid delivered each item's history within seconds, and the hunt case built to qualify only on early data (R4) never appeared in my 4-second polls.
- **N22. document-ingest's claim is not atomic.** Addressed. The claim is now one conditional update (status in uploaded or failed, returning the row). Three concurrent trials gave exactly one 200, the rest 409, and one record each (item 3).

## NEW OBSERVATIONS (not checklist failures)

- **N23. A source is briefly visible without its record.** During Plaid's staged delivery, the polls at 10:49:59Z and 10:50:03Z each found one source on VA1, VA2, or VA3 that had no income_records row yet. The source upsert and the record upsert are two statements (plaid.ts lines 126 to 155). Figures were never half filled, and the final state was consistent. A reader at that moment (the Income step, or later the reviewer dashboard) would see a source with no record. Consider writing both in one transaction or one database function.
- **N24. An on-schedule deposit of a different amount is recorded as a missed payment.** LOW (monthly 100.00 on the 25th, with 06-25 paid 40.00): the 40.00 is outside the amount band, so it is left out, and the 61-day gap it leaves is bridged as a missed payment. The stream is flagged and lists the 40.00, so it meets the bar. But the reviewer is told a payment was missed when it was paid. This is the same class as N19.
- **N25. The clean definition and the amount band.** Point 1 defines a clean input by its schedule only. I treated an on-schedule sender with one amount outside the band (LOW) as not clean, because point 2 makes the amount band part of the bar, and flagging it errs toward review. If the user means "clean" to cover on-schedule senders whatever their amounts, LOW is a clean input that is flagged. The user should say which.
- **N26. One late payment makes a weekly sender irregular.** LATE (weekly, with one payment 3 days late) is proposed as irregular with all 26 deposits and flagged, so it meets the bar. The reviewer must supply the frequency for a sender who was otherwise exactly weekly for 26 weeks.
- **N27. A payment a few days overdue is not a missing payment.** X4a's latest payment was 3 days overdue, but its run is still active (within 1.5 intervals), so it is stored as clean weekly. That is right under the bar, since software made no judgment. The documented limit for X4 and X5 applies only once the run has gone inactive.

## SUITES RUN BY THE VETTER

- `npm test` (10:40:14Z to 10:40:43Z): "Test Files 7 passed (7)", "Tests 155 passed (155)".
- `npm run test:integration` (11:02:54Z to 11:07:16Z, first attempt, no retry): "Test Files 3 passed (3)", "Tests 22 passed (22)".
- `npm run test:isolation` (11:07:45Z to 11:09:44Z): "Test Files 1 passed (1)", "Tests 29 passed (29)". Report isolation-2026-10-01T11-07-54-215Z.json: total 340, passed 340, failed 0; my recount is 340 entries, all passing, in 33 groups. The two agree.
- Playwright 1.60.0, production build, app on port 3100, workers 1:
  - `npm run test:e2e` (11:10:03Z to 11:11:58Z): "4 passed (1.8m)". .next/BUILD_ID was rewritten at 11:10:38Z.
  - `npm run test:theming`, full run 1 (11:11:59Z to 11:14:07Z): "9 passed (2.0m)". BUILD_ID rewritten at 11:12:34Z.
  - `npm run test:theming`, full run 2 (11:14:08Z to 11:16:26Z): "9 passed (2.1m)". BUILD_ID rewritten at 11:14:53Z.
  - Each run logged the known SEC-P2-07 "The destination stream closed early" once from the web server.
- Ports:
  - Port 3100 was free before each Playwright run and after it.
  - For the N16 probe I started my own production server on 3100 (pid 24184) and stopped only that process afterwards; 3100 was then free.
  - Port 3000 belongs to the user's other project, and I never started, stopped, or called anything on it. Its listener was pid 23344 at 10:32Z and pid 21856 at 11:16Z. At 11:20Z nothing was listening on 3000, with recent local client connections in TIME_WAIT. Both changes happened outside anything I ran; the user may want to check that project.

## TEST DATA AND CLEANUP

**Baseline** at 10:32:52Z, 2026-10-01, before anything I ran:
- tenants 1 (cedar-row), programs 3, program_rule_sets 3, ami_schedules 6
- theme_configs 1, properties 2, property_programs 3
- users 1, applicants 1, household_members 1, auth.users 1
- 0 in each of: income_sources, income_records, asset_records, provider_connections, applicant_documents, calculated_determinations, generated_documents, workflow_state, audit_log, webhook_events
- storage objects 0; storage buckets 2
- Vault secrets cron_secret, functions_base_url, pii_key, provider_token_key; cron job ingestion-retry every 5 minutes, active
- 16 migrations, the latest 20261001001600
- MD5 hashes, by my own method (rows as JSON, sorted): applicants f0b6ae3e…, users a63e4333…, household_members 4d409497…, auth.users (id and email) f074758b…, tenants aa0a30b5…, theme_configs f2784002…, properties 1f60d071…, program_rule_sets 41b3ef6c…, property_programs 3f682d76…, ami_schedules 7e647fb5…, programs 337cc812…

The builder's report of 0 webhook_events and one real user matched.

**What I created:**
- tenant vet7-probe, with its theme, property, and program link
- 8 auth users: VA1, VA2, VA3, VA4, and VC (cedar-row applicants), VR (cedar-row reviewer), VB (vet7-probe applicant), and VRB (vet7-probe reviewer), with 6 applicants and 6 household members
- 6 provider_connections: four bank links, VA2's payroll link, and VB's link_started row from a control call
- 48 income_sources and 48 income_records:
  - 38 detected streams;
  - 2 of my 3 N21 fixtures (the third was removed by the function itself);
  - 1 payroll source with 2 records;
  - 6 documents;
  - 1 N3 source with no record
- 4 asset_records, 7 applicant_documents, and 7 storage objects
- 3 audit_log rows
- 33 webhook_events: 21 genuine events on my items, and my 12 forgeries
- no other rows: the suites cleaned up after themselves

**Cleanup**, 11:20:14Z to 11:21:03Z:
- The 5 Plaid items, including the payroll user, were removed through plaid-sandbox "remove" with the owning applicant's token, 200 each. A fire_webhook on each then returned 502 ITEM_ERROR/ITEM_NOT_FOUND. The link_started row had nothing at Plaid.
- I waited 15 s, then removed the 7 storage objects and deleted every row above: audit_log 3, income_records 48, income_sources 48, asset_records 4, applicant_documents 7, provider_connections 6, household_members 6, applicants 6, and webhook_events 33. The counts deleted were exactly the counts created.
- The 8 auth users were deleted, and their public.users rows went with them.
- The vet7-probe tenant, theme, property, and program link were deleted.

**After cleanup**, at 11:22:36Z, after a further 60 s wait for late webhooks: all 38 compared values are identical to the baseline, with 0 differences. That covers every table count, auth.users 1, storage objects 0 and buckets 2, webhook_events 0, the Vault secret names, the cron job, the migration list, and all eleven hashes.

The real applicant's data was read only as counts and hashes, and never modified. No password, key, or token was printed or written: my test users' passwords were derived in memory for each script.

My temporary scripts were in the session scratchpad, outside the repository, and are deleted. The working tree is clean apart from this file and the ignored artifacts the suites write (test-results, isolation reports, theming screenshots, .next). PHASE_2_REWORK.md to PHASE_2_REWORK_5.md are untouched. PROCESS-RULES.md was not marked. The genericization check from RULES.md, run again with this file present (untracked, so outside its scope), still gave no output and exit code 1, and this file has no match for the names it searches.
