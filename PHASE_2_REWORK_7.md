# PHASE_2_REWORK_7.md — Project 1: Fairview Compliance Intake Platform

This is the seventh Phase 2 gate result. It comes from the re-vet after rework 6, commit 7e2c653. An independent Master Vetting sub-agent wrote it on 2026-10-01. It built no part of Phase 2.

Before running anything, it read these in full:
- CLAUDE.md, MEMORY.md, COLLABORATION-1.md, MASTER-VETTING-SKILL.md, and PROCESS-RULES.md;
- PHASE-2-SPEC.md, including the ITEM 5 ACCEPTANCE BAR and AS BUILT 1 to 25;
- PHASE_2_REWORK.md to PHASE_2_REWORK_6.md;
- RULES.md, the Phase 2 parts of SECURITY.md, MASTER-SPEC-1.md (data model and Milestone 2), TESTS.md, and DESIGN.md's Income and Documents steps;
- the code: supabase/functions/_shared/ (recurring.ts at rule v4.1, plaid.ts, plaid-verify.ts, and the rest), every function's index.ts, the migrations, components/ingestion/, app/[tenant]/apply/ingestion-actions.ts, playwright.config.ts, and the tests.

The builder's reports, commit messages, MEMORY.md, SECURITY.md, and the AS BUILT claims were treated as leads only.

All evidence below was produced in this session, against fairview-dev (ref mdatwozuqdiwioezalom), its deployed Edge Functions, the real Plaid Sandbox, and real AWS Textract (eu-west-1). Times are UTC, read from the database clock.

**Deployed code equals the commit.** I downloaded all six deployed functions with the repository's own Supabase CLI (functions download --use-api), each into its own scratch folder. I compared the 48 downloaded source files, including each function's _shared bundle, with HEAD 7e2c653: 0 differ. Every bundle that includes recurring.ts carries "rule v4.1 (AS BUILT 25)". Deployed versions: document-ingest 2, plaid-link-token 10, plaid-exchange 10, plaid-sandbox 14, plaid-webhook 13, ingestion-retry 11. The live catalog lists 16 migrations, the latest 20261001001600. Since b43adf1, nothing under components, app, lib, or supabase/migrations has changed (git diff is empty).

**Interruption.** An API usage limit stopped this vetting at about 16:50Z. It resumed at 20:01Z with its baseline and evidence intact. Just before the stop, the machine's network failed: a lookup of the database pooler host returned ENOTFOUND. Runs that the network cut off are counted as not run. They are listed under SUITES.

## Gate result: NOT COMPLETE

- 11 items PASS.
- 1 item FAILS: item 5 (medium).
- None BLOCKED.

I judged item 5 against PHASE-2-SPEC.md's ITEM 5 ACCEPTANCE BAR, exactly as written. Rule v4.1 fixed both of the sixth vetting's failures:
- A clean 4-deposit biweekly sender is now biweekly, exact, and unflagged, on the real Plaid Sandbox and at every as-of date I swept, except the documented February true tie.
- Senders whose amount changed (a raise, a cut, monthly to weekly) are now surfaced and flagged amount_changed, with every deposit listed.
- In 20,909 random qualifying senders, none was dropped, and every deposit list was complete.
- Every earlier family was surfaced and flagged with the right reasons.

Item 5 still fails, on clean semi-monthly inputs. I found three shapes, all reproduced on the real Plaid Sandbox:
1. **A clean semi-monthly sender with 3 deposits is never read as semi-monthly.** It is stored as biweekly with no flag, or as irregular with a flag. The detector only tests semi-monthly from 4 dates on. Rule v4 did the same: this failure predates rule v4.1, and earlier sweeps started at 4 deposits.
2. **A semi-monthly sender paid on the previous business day can be stored as biweekly, unflagged.** This is a regression in rule v4.1. Rule v4 read every one of these correctly.
3. **A 4-deposit biweekly sender whose next payment is 8 days overdue is stored as semi_monthly, unflagged.** The bar's documented limit for a missing latest payment requires a flag.

Everything else passes on my own probes. That includes separation of duties (item 10) and N1 as real users, forgeries, cross-tenant access, the PII scan, Textract, payroll, N16 in a real browser, N21, and N22.

Do not write PHASE_2_COMPLETE.md until item 5 meets the bar and is vetted again. The fix will touch recurring.ts again, which the webhook, retry, and sandbox paths share. So the next vet should re-observe at least items 1, 5, 7, 8, and 10, plus the genericization check.

## FAILING ITEMS

### Item 5, FAIL, medium

[ ] Plaid transaction classification identifies recurring peer to peer income transfers in a sandbox account and produces a recurring transfer income source.

**How I tested.**
- **Local sweeps of the committed recurring.ts** (Node 22, strip-types), at every as-of date from 2026-01-01 to 2027-03-31.
  - Clean inputs for each frequency:
    - weekly, 3 to 26 deposits;
    - biweekly, 3 to 13;
    - semi-monthly on 9 day pairs, 3 to 12 deposits, then on 71 day pairs;
    - monthly on 10 days of the month, including the 29th, the 30th, the 31st, and the last day.
  - Each series ended with the latest scheduled date on or before the as-of date, so no payment was missing.
  - Each was tested exact, and with weekend dates moved to the previous business day or to the next one.
  - I ran the same sweep against rule v4 (git show b43adf1) for comparison.
- **20,909 random qualifying senders**, by the bar's definition as widened by AS BUILT 25: random, stepped, amount-changed, and mixed-amount series.
- **Targeted attacks** on the tie-break and the second pass.
- **The real Plaid Sandbox.** Three custom users, one checking account each, with 54 senders: 20, 22, and 12. Each account also held noise: 12 biweekly payroll deposits, 5 rent outflows, and 1 Venmo outflow.
  - Before linking, I predicted every sender locally.
  - I linked them through the deployed plaid-sandbox (action "link") as cedar-row applicants VA1, VA2, and VA3, at 15:31:12Z, 15:31:18Z, and 15:31:23Z. Each returned 200 awaiting_data.
  - I polled every 4 s until all three items had HISTORICAL_UPDATE processed and nothing changed for 75 s. The final state came at 15:36:23Z, and I read it at 15:37:02Z.
  - 12 genuine Plaid-signed webhooks arrived, all with signature_valid true. VA2's HISTORICAL_UPDATE failed on its first attempt and was processed by the pg_cron retry at 15:35:07Z (attempt 2; see N28).
  - I matched each stored source to my sender by recomputing its stream_ref from Plaid's account id, the app, and the sender.

**Live results.**
- All 54 senders equal the local prediction exactly: frequency, average, count, first and last dates, missed payments, ambiguity, and deposit counts. The one sender predicted to give no source gave none, and no stored source was unmatched (53 sources: 20, 22, and 11).
- For every stored stream:
  - the deposit list equals my input in the lookback, by date and amount;
  - transaction_ids plus excluded_transaction_ids equal the deposits' ids;
  - the count, average, and first date recompute from the in-stream deposits.
- For every record:
  - gross_pay equals the average, and pay_frequency equals the frequency;
  - the period and pay dates equal the stream's dates;
  - provider_record_ref is "stream:" plus the stream_ref;
  - the rule label is "PHASE-2-SPEC recurring transfer rule v4.1 (AS BUILT 25)", with as_of 2026-10-01;
  - the review reasons equal the status reason, plus irregular_pattern and schedule_ambiguous where the ambiguity requires them.

**What failed (final read 15:37:02Z).**

| Case | My input | Bar | Stored |
|---|---|---|---|
| F1, semi-monthly, 15th and last day, 3 deposits | Zelle from Oda Pike, 240.00 on 08-31, 09-15, 09-30 | point 1: semi_monthly, exact, unflagged | **biweekly**, 240.00, count 3, ambiguity [], reasons ["awaiting_family_statement"] |
| F2, semi-monthly, 5th and 20th, 3 deposits | Venmo from Pam Quay, 180.00 on 08-20, 09-05, 09-20 | point 1 | **biweekly**, 180.00, count 3, unflagged |
| F3, semi-monthly, 2nd and 16th, 3 deposits | Cash App from Quin Rand, 260.00 on 08-16, 09-02, 09-16 | point 1 | **irregular**, flagged irregular_pattern (a clean input flagged; not a listed limit) |
| F4, semi-monthly, 5th and 20th, previous business day, 4 deposits | Zelle from Rex Sloan, 500.00 on 08-05, 08-20, 09-04 (the 5th was a Saturday), 09-18 (the 20th was a Sunday) | point 1 | **biweekly**, 500.00, count 4, unflagged |
| F5, biweekly, 4 deposits, next payment 8 days overdue | Cash App from Tia Udall, 85.00 every 14 days: 07-29, 08-12, 08-26, 09-09 (09-23 never came; 22 days before as-of) | point 4 (X4/X5 limit): flagged | **semi_monthly**, 85.00, count 4, unflagged |

Controls in the same account, all exact, unflagged, with every deposit in the stream:

| Case | Input | Stored |
|---|---|---|
| C1 | weekly 47.50, 26 Wednesdays 04-08 to 09-30 | weekly 47.50, count 26 |
| C2 | weekly 62.00, 4 deposits | weekly, count 4 |
| C3 | biweekly 88.00, 08-14 to 09-25, 4 deposits | biweekly, count 4 |
| C4 | biweekly 120.00, 08-07 to 09-18, 4 deposits | biweekly, count 4 |
| C5 | biweekly 95.25, 13 deposits | biweekly, count 13 |
| C6 | biweekly 70.00, 3 deposits | biweekly, count 3 |
| C7 | semi-monthly 300.00 on the 5th and 20th, 4 deposits | semi_monthly, count 4 |
| C8 | semi-monthly 275.00 on the 15th and last day, 4 deposits | semi_monthly, count 4 |
| C9 | semi-monthly 150.00 on the 10th and 25th, 12 deposits | semi_monthly, count 12 |
| C10 | monthly 410.00 at each month end, 04-30 to 09-30 | monthly, count 6 |
| C11 | monthly 333.33, 3 deposits | monthly, count 3 |
| C12 | monthly 199.99 on the 2nd, 5 deposits | monthly, count 5 |
| C13 | semi-monthly 215.00 on the 3rd and 18th, 4 deposits | semi_monthly, count 4 |
| C14 | semi-monthly 260.00 on the 5th and 20th, previous business day, 11 deposits | semi_monthly, count 11 |

T1, a semi-monthly sender on the 5th and 19th paid on the previous business day (08-05, 08-19, 09-04, 09-18), was stored semi_monthly and flagged frequency_ambiguous. I accept it as the true-tie limit; see N30.

**Breadth, from the local sweeps.**

| Clean input | v4.1 misread | v4 misread |
|---|---|---|
| semi-monthly, exact days, 3 deposits (9 pairs) | 4,095 of 4,095 | 4,095 of 4,095 |
| semi-monthly, exact days, 3 deposits (71 pairs) | 26,390 of 26,390: biweekly unflagged 15,962, irregular flagged 10,428 | (not run) |
| semi-monthly, previous business day, 4 deposits (9 pairs) | 330 of 3,211 (biweekly unflagged) | 0 |
| semi-monthly, previous business day, 5 deposits | 143 of 3,801 | 0 |
| semi-monthly, previous business day, 6 to 12 deposits | 85 of 11,520 | 0 |
| semi-monthly, previous business day, 71 pairs, 4 / 5 / 6 deposits | biweekly unflagged 1,730 / 564 / 375 | (not run) |
| semi-monthly, next business day, 4 / 5 / 6+ deposits | 492 / 201 / 637 (biweekly unflagged, or flagged) | 76 / 113 / 541 |
| biweekly, every alignment and length, exact or shifted | 0 (4 deposits: 449 + 95 + 144 flagged true ties in February windows) | 4 deposits all wrong; 5 and 6+ wrong in February windows (1,239 and 847 exact) |
| weekly and monthly, every alignment, exact or shifted | 0 | 0 |
| semi-monthly, exact days, 4 or more deposits | 0 (55 flagged true ties) | 0 |

- 98 misread semi-monthly inputs fall at the live as-of date, 2026-10-01 (pairs from the 1st/15th to the 16th/last day).
- F5's shape is wrong on exactly one day per alignment: a biweekly 4-deposit run whose last deposit is 22 days before the as-of date. Biweekly's activity window is 21 days (1.5 × 14), and semi-monthly's is 22.5. At 21 days the stream is biweekly; at 23 days it is irregular and flagged. A 6-deposit biweekly sender at 22 days is irregular and flagged, as the limit describes.

**Why each is a failure under the bar, as written.**
- **F1, F2, F3.** Each is a clean input by point 1's definition: one sender on one of the four frequencies, every deposit on schedule, no missed payment, and no other deposit. The bar's qualifying minimum is 3 deposits, and a 3-deposit weekly sender (C2-like CW3 in the sixth vetting) and a 3-deposit biweekly sender (C6) are exact.
  - F1 and F2 are "a clean input whose figures are not exact": the frequency is wrong, with no flag. Annualized at 26 periods instead of 24, F1 would overstate by 8.3 percent (6,240.00 instead of 5,760.00).
  - F3 is "a clean input that is flagged". Its flag is not one of the listed limits: the true-tie limit covers "a series that fits two frequencies exactly", and semi-monthly is never even tested for 3 dates.
- **F4.** This is a clean input if a business-day shift counts as on schedule. The sixth vetting treated it that way: its clean set included CS (a 1st paid on the prior month's last day) and CH (a weekly sender with holiday shifts), and the builder's own unit sweep says "biweekly and clean". Under that reading, F4 is a clean input stored at the wrong frequency with no flag. If the user decides a shifted series is not clean, F4 is still a judgment between two frequencies that is not flagged. Either way, F1 to F3 fail item 5 on their own.
- **F5.** This is not a clean input, because a payment is missing. The bar's documented limit for that shape ("a sender whose latest payment is missing (X4, X5): flagged") requires a flag, and F5 has none. Software picked semi-monthly only because the biweekly reading had gone inactive, and that judgment is not flagged.

**Cause, from the code (recurring.ts at 7e2c653).**
- **F1 to F3.** semiMonthlyDays (line 131) returns false for fewer than 4 dates, so a 3-deposit semi-monthly series is never a semi-monthly candidate. Its gaps (14 to 16, or 15 and 15) fit biweekly's band, so it is stored as biweekly. With a 17-day gap it fits nothing, so it becomes irregular.
- **F4.** This comes from the new tie-break in bestRegularRun (lines 253 to 261).
  - It compares semiMonthlyDeviation against biweeklyDeviation. With business-day shifts, a semi-monthly run's days of the month spread (the deviation rises), while the shifted dates happen to sit exactly 14 days apart (the biweekly deviation is 0). Example: 08-05, 08-20, 09-04, 09-18 gives a semi-monthly deviation of 4 and a biweekly deviation of 2, so biweekly wins, unflagged.
  - Only an exact tie is flagged. Rule v4 broke the tie by preference (semi-monthly first), which is why v4 read all of these correctly.
- **F5.** The activity check (line 193) runs per frequency. At 22 days, the biweekly run is inactive and the semi-monthly run is active, so semi-monthly is the only valid candidate. There is no rival, so nothing is flagged.

I rate it medium, as before. Nothing becomes income without the family's statement and a reviewer's decision. But Phase 3 relies on an unflagged stream being exact, and these unflagged streams carry the wrong number of periods per year. A semi-monthly payer who has paid three times, or who is paid on the previous business day, is common.

**To pass:**
- On real Plaid Sandbox data, through the deployed functions, and in a local sweep:
  - A clean semi-monthly sender with 3 deposits is stored as semi-monthly, exact and unflagged. One possible approach is to test semi-monthly from 3 dates on, using the dates' days of the month. Alternatively, if the user decides 3 dates cannot tell semi-monthly from biweekly, the user records that in the bar as a documented limit, and the detector flags it frequency_ambiguous. That is the user's call.
  - A semi-monthly sender paid on the previous business day is stored as semi-monthly, or at least is flagged whenever the semi-monthly/biweekly tie-break decides the frequency (for example, flag every non-exact decision, or treat business-day shifts as on schedule). Rule v4's results on these series must not regress.
  - A stream whose frequency was chosen only because the other reading went inactive is flagged, so that F5's shape meets the X4/X5 limit.
  - Every clean input in the four frequencies, at 3 deposits and up, exact and with business-day shifts, stays exact and unflagged, apart from listed limits. Every earlier shape still meets the bar.
- The choice stays deterministic and is documented in PHASE-2-SPEC.md AS BUILT.
- The unit tests and the plaid-sandbox integration test drive a 3-deposit semi-monthly sender and a previous-business-day semi-monthly sender like F4.

**What met the bar, stored on the real Plaid Sandbox (final read 15:37:02Z).** Each was surfaced, with needs_review true and every deposit listed. Each regular flagged stream carries schedule_ambiguous, and each irregular one carries irregular_pattern.

| Case | My input | Stored (proposal) | Ambiguity |
|---|---|---|---|
| A | Venmo from Uli Vance, 140.00 every 30 days (6), plus 140.40 on 07-15 | monthly 140.00, count 6 | deposits_left_out |
| B | Zelle from Val Wynn, 66.00 every 14 days (13), plus 66.10 on 06-10 | biweekly 66.00, count 13 | deposits_left_out |
| E | Venmo from Wes Yale, 310.00 every 30 days (5), plus 190.00 | monthly 310.00, count 5 | deposits_left_out |
| F | Zelle from Xan Zorn, 45.00 biweekly to 06-19, then weekly (20) | weekly 45.00, count 16, missed 1, from 06-05 | deposits_left_out, missed_payment (N19) |
| G | Venmo from Yul Abbe, 420.00 every 30 days, plus 280.00 three days after one | monthly 420.00, count 6 | deposits_left_out |
| I | Zelle from Zoe Bard, 260.00 on the 6th and 21st (12), plus 170.00 | semi_monthly 260.00, count 12 | deposits_left_out |
| P | Cash App from Abe Cole, 540.00 every 30 days, last 09-27, plus 380.00 on 09-29 | monthly 540.00, count 6, last 09-27 | deposits_left_out |
| V1 | Venmo from Bea Dale, varying 170 to 255 on the 22nd, plus 215.00 | monthly 212.50, count 6 | deposits_left_out |
| V2 | Zelle from Cy Eads, varying 305 to 370 on the 26th, plus 335.00 on 09-29 | monthly 338.33, count 6, last 09-26 | deposits_left_out |
| Gift | Venmo from Di Fenn, 160.00 monthly, plus 850.00 | monthly 160.00, count 6 | deposits_left_out |
| M1 | Cash App from Ed Gale, 110.00 biweekly, 06-21 missed | biweekly, count 12, missed 1 | missed_payment |
| M2 | Venmo from Fay Hume, 39.00 weekly, 07-14 missed | weekly, count 25, missed 1 | missed_payment |
| X2 | Zelle from Gil Irby, 36.00 weekly, 07-03 missed, plus 36.20 on 06-30 | weekly 36.02, count 13, missed 1, from 06-30 | deposits_left_out, missed_payment |
| X3b | Cash App from Hy Jett, 155.00 biweekly, 05-26 missed, plus 100.00 on 05-15 | biweekly 149.50, count 10, missed 1, from 05-15 | deposits_left_out, missed_payment |
| X4 | Venmo from Ian Kirk, 54.00 weekly Saturdays to 09-19 (09-26 never came) | biweekly 54.00, count 13 | deposits_left_out |
| X5 | Venmo from Jo Lamb, 80.00 every 14 days to 09-09 (09-23 never came) | irregular, count 12 | irregular_pattern |
| X15 | Zelle from Kit Moon, 390.00 monthly, 05-17 missed, plus 255.00 on 04-20 | monthly 363.00, count 5, missed 1, from 04-20 | deposits_left_out, missed_payment |
| X16 | Cash App from Pat Rusk, 385.00 monthly, 07-10 missed, plus 260.00 on 08-07 | monthly 360.00, count 5, missed 1 | deposits_left_out, missed_payment |
| Two misses | Venmo from Liv Nunn, 92.00 biweekly, 05-23 and 08-15 missed | biweekly, count 8, missed 1, from 06-06 | deposits_left_out, missed_payment (N20) |
| Irregular | Zelle from Max Ode, 72.00 on 7 irregular dates | irregular, count 7 | irregular_pattern |
| LATE | Zelle from Ned Pratt, 52.00 weekly, 07-01 paid 07-04 | irregular, count 26 | irregular_pattern (N26) |
| R1, raise | Zelle from Ola Quist, 210.00 × 4, then 460.00 × 2, monthly | monthly 293.33, count 6 | amount_changed |
| R3, cut | Cash App from Pip Rowe, 520.00 × 4, then 210.00 × 2 | monthly 416.67, count 6 | amount_changed |
| R4, monthly to weekly | Venmo from Que Sams, 480.00 × 5, then 65.00 weekly × 5 | monthly 361.43, count 7 | deposits_left_out, amount_changed |
| Raise plus gift | Zelle from Ray Tobin, 220.00 × 4, 470.00 × 2, plus 1000.00 on 09-22 | monthly 303.33, count 6 | deposits_left_out, amount_changed |
| Raise long ago | Venmo from Sal Ueda, 190.00 × 2, then 430.00 × 4 | monthly 430.00, count 4 | deposits_left_out (first pass; correct) |
| Weekly to monthly | Cash App from Tab Ulm, 60.00 weekly × 8, then 500.00 × 2 | irregular, count 10 | irregular_pattern, amount_changed |
| Old amount returns | Zelle from Uri Voss, 200, 200, 450, 450, 200, 200 | irregular, count 4 | irregular_pattern, deposits_left_out |
| Three different amounts | Venmo from Vi Wolfe, 50, 300, 1200, monthly | monthly 516.67, count 3 | amount_changed |
| Stopped, one new | Venmo from Wil Xu, 100.00 × 4 to 07-05, then 300.00 on 09-25 | irregular, count 5 | irregular_pattern, amount_changed |
| Semi-monthly plus extra | Venmo from Zed Ames, 130.00 on the 5th/20th × 4, plus 130.00 on 09-08 | semi_monthly, count 4 | deposits_left_out |

- MEMO (Cash App from Ora Quill, 97.00 monthly, memo alternating) was one source, monthly 97.00, count 6, exact and unflagged.
- STOP (Cash App from Yan Zell, monthly to 08-03, 59 days before as-of) was not surfaced, which is the documented "stopped" limit.
- RIB (Zelle from Xia Yoon, 200.00 × 3, then 280.00 × 3) was stored clean (see N29).
- The second pass never caught a clean input: amount_changed appeared only where the banded pass found nothing. In my sweeps no clean input gained amount_changed.

## PASSING ITEMS

[x] Plaid sandbox integration functional, produces a normalized income_records entry.

- My three bank links (15:31:12Z to 15:31:23Z) went from awaiting_data to ingested, driven by 12 real Plaid-signed webhooks, all with signature_valid true.
- They produced:
  - 3 asset_records rows ("Vet Eight Checking VA1" to "VA3"), each with balance 2718.28 (my custom users' starting balance), a 4-digit mask, and account_number_encrypted null;
  - 53 income_sources and 53 income_records, ingestion_method plaid;
  - 0 sources from the 36 payroll deposits and 18 outflows.
- The rows match my inputs (item 5), validate against the shared schema (item 8), and their tokens are encrypted (item 11).

[x] Payroll sandbox integration (Plaid Payroll Income; Argyle or Pinwheel as the listing names, if later added) functional, produces a normalized income_records entry of identical shape to the bank pipeline's output.

- plaid-link-token with product payroll_income returned 200 with a link-sandbox token.
- VA2's plaid-sandbox link with product payroll_income (15:40:42Z) returned 200: ingested, 2 stubs.
- A real INCOME.USER_INCOME_VERIFICATION webhook arrived at 15:40:50Z, signature_valid true, matched by its item id, and was processed.
- The connection has product payroll_income, a Plaid user reference, and a 117-byte encrypted token with no plaintext.
- There are 2 income_records, ingestion_method plaid, source_type employment, source status detected, provider_record_ref set.
- Both pass the same strict schema as the bank and Textract rows. My PII and shape checks covered them; the integration suite's shape-identity test passed (item 8).

[x] Textract Queries fallback pipeline functional against a sample scanned paystub, W-2, and Schedule C, each producing a normalized income_records entry of identical shape to the other two pipelines.

These were my own uploads into VA4's own folder, as VA4: the paystub through a signed upload URL, as the UI does; the others directly. Each was followed by an applicant_documents row written as VA4, then document-ingest with VA4's token.
- **Paystub** (15:45:03Z): 200 extracted, no reasons.
  - Fairview Parcel Services LLC, biweekly, rate 18.50, gross 1480.00, YTD 26640.00.
  - Period 2026-08-24 to 2026-09-06, pay date 2026-09-11, confidence 97.
  - Deduction total_deductions 276.02, which is 1480.00 minus net 1203.98.
- **W-2** (15:45:12Z): 200 needs_review (historical_annual). Gross 34120.50, annual, 2025-01-01 to 2025-12-31, confidence 99.
- **Schedule C** (15:45:17Z): 200 needs_review.
  - self_employment, Sample Lawn Care, gross 24800.00.
  - Deduction schedule_c_line_28_total_expenses 7350.00.
  - Reasons self_employment_net_income_phase3 and schedule_c_line_31:17450.00.
- Every value equals tests/fixtures/documents/expected.json.
- Stored raw_payload keys are answers and document_kind only. extracted_fields hold 10, 4, and 5 query aliases. No Blocks or Geometry is stored.
- **Two-page PDF** (15:45:24Z): 422 multi_page_pdf. The document is failed with that reason, and no record exists.
- **A text file uploaded as image/png** (15:45:26Z): 422 unsupported_type, sniffed before any AWS call. Failed, no record.
- **W-2 read again**: 409 already_processed.
- **No token**: 401. **Same-tenant applicant VC**: 404.
- **N22 concurrency** (15:45:30Z to 15:45:45Z), on fresh documents: two calls at once gave 200 and 409; two again gave 200 and 409; three at once gave 200, 409, and 409. One record each time.

[x] Payroll ingestion captures gross pay, pay frequency, YTD earnings, and deductions.

VA2's stored payroll rows:
- **Paid 2026-10-01:**
  - gross 2306.00, semi_monthly, rate 25.15;
  - YTD 2306.00 through 2026-09-30;
  - period 2026-09-16 to 2026-09-30;
  - deductions [taxes 1000.00].
- **Paid 2026-09-01:**
  - gross 2306.00, biweekly, YTD 2306.00 through 2026-08-31;
  - Social Security Tax 23.44, 401K 352.34, Medicare Tax 12.45, Dental Insurance 13.74, Federal Tax 612.91, State Tax 409.25.
- Each frequency is Plaid's own value for that stub (SEMI_MONTHLY and BIWEEKLY in pay_period_details).
- Both have needs_review true with variable_earnings:bonus,overtime.
- raw_payload keys are only deductions, document_id, earnings, employer, net_pay, pay_period_details, and source. employer is {name: "Platypus LLC"}. No employee, taxpayer, distribution, download, account, or routing string appears.

[x] Webhook signature verification present and tested for every webhook provider in use (Plaid, which serves both bank and payroll; and Argyle if later added), even in sandbox mode.

- **Forgeries** (15:46:31Z to 15:46:50Z). 14 forged requests to plaid-webhook, each naming my real bank item or my real payroll item and user. Each returned 401 {"error":"invalid_signature"}:
  - no header
  - garbage
  - alg none
  - HS256 with the correct body hash
  - RS256 signed by my own key
  - ES256 with no kid
  - ES256 signed by my own P-256 key with a plausible kid and the correct body hash
  - the same with my public key embedded as a jwk header
  - an INCOME body naming my payroll user
  - an ITEM ERROR (ITEM_LOGIN_REQUIRED) body with an iat an hour old
  - a USER_PERMISSION_REVOKED body
  - a wrong body hash
  - an iat an hour in the future
  - alg "es256" in lower case
- **What was recorded.** Exactly 14 new webhook_events rows, each with signature_valid false, status rejected, provider_ref null, and a "rejected:" event id: missing_signature 1, malformed_signature 1, wrong_algorithm 4, missing_key_id 1, unknown_key 6, bad_signature 1.
- **Nothing was processed.** A snapshot of my four connections (status, error code, last event time, source and record counts, and the newest record time) was identical before and after. No connection moved to reauth_required or revoked.
- **Other method.** GET returned 405.
- **Valid path.** 16 genuine Plaid-signed events on my items were accepted and processed: 12 from the links, 3 that I fired, and the INCOME event.
- **Idempotency.** The catalog shows UNIQUE (provider, event_id). The stale-iat and tampered-body branches are unit tested in tests/unit/plaid-verify.test.ts, within my `npm test` run of 158.
- Argyle is not in use.

[x] Integration test suite covering all three ingestion paths.

`npm run test:integration`, 15:55:32Z to 15:59:38Z, first attempt with no retry: "Test Files 3 passed (3)", "Tests 23 passed (23)". The files are plaid.test.ts (bank, recurring cases including the rework 6 case, signed webhook, retry, pg_net, forgeries, payroll, cross-applicant), textract.test.ts, and shape-identity.test.ts. Afterwards, auth.users held no int-* user.

[x] Normalized income record shape identity test passes: one record from each pipeline validates against the single shared schema with an identical key set.

- The test (tests/integration/shape-identity.test.ts) passed inside my integration run.
- By hand, the stored rows from all three pipelines have the same normalized columns:
  - the bank streams, flagged and clean;
  - the 2 payroll stubs;
  - the 3 Textract documents.
- The only other keys in raw_payload are per pipeline, and they are redacted (item 11).
- The sixth vetting's strict-schema negative control is unaffected: normalized.ts is unchanged since b43adf1.

[x] New Phase 2 tables have tenant_id and RLS in the migration that creates them; isolation suite extended to them and to the private document storage bucket, and passing.

- **Catalog** (15:48:53Z):
  - All 20 public tables have RLS on.
  - Policies: provider_connections 1, applicant_documents 2, income_sources 3, income_records 1, asset_records 3, and webhook_events 0 (no tenant_id, grants only to postgres and service_role; the RULES.md exception).
  - The applicant-documents bucket is private, with a 10485760 byte limit and jpeg, png, and pdf only.
  - storage.objects has one INSERT and one SELECT policy, both for authenticated.
  - Both income_sources triggers are enabled.
- **Suite.** `npm run test:isolation`, 15:59:45Z to 16:01:42Z: "Test Files 1 passed (1)", "Tests 29 passed (29)".
  - Newest report, isolation-2026-10-01T15-59-56-136Z.json: projectRef mdatwozuqdiwioezalom, total 340, passed 340, failed 0.
  - My own recount is 340 entries, all with pass true, in 33 id groups including T1 to T5 (21 entries).
  - The summary and the report agree.
- **By hand** (15:47:46Z to 15:48:16Z), as VB (applicant, second tenant vet8-probe), VRB (reviewer, vet8-probe), and VC (another cedar-row applicant), against VA4's W-2 and VA2's resources. I checked each user's JWT claims first.
  - document-ingest: 404 for VB and VC, 403 for VRB.
  - Storage:
    - download and createSignedUrl: "Object not found";
    - list: 0 objects;
    - upload, signed upload URL, and upsert-overwrite: "new row violates row-level security policy";
    - remove: 0 objects.
  - Selects of VA4's and VA2's applicants, household_members, provider_connections, applicant_documents, income_sources, income_records, asset_records, and cedar-row's audit_log: 0 rows each.
  - These calls against VA2's member or connection returned 404 for VB and VC and 403 for VRB: plaid-link-token, plaid-sandbox link, fire_webhook, remove, and plaid-exchange.
  - VB inserting a document row in its own tenant pointing at VA4's object: 23514. VB inserting one in cedar-row: 42501.
  - VB uploading under its own tenant prefix with VA4's applicant id: RLS violation.
  - VB writing VA2's statements: 0 rows. VB inserting an income_record for VA2: 42501.
  - anon: download "Object not found", list 0, and 42501 on income_records and provider_connections.
  - VA4's folder (names and update times), the W-2 status, and the vet8-probe prefix (0 objects) were unchanged.
  - Controls:
    - VA4 and same-tenant reviewer VR each downloaded the W-2 (90232 bytes).
    - VR saw VA4's 6 records.
    - VB got a link token for its own member (200).

[x] Recurring transfers follow PHASE-2-SPEC.md's rule: detected by software, stated by the family, confirmed by a reviewer; no transfer becomes income through software alone.

My probes ran from 15:39:04Z to 15:39:22Z, as real users. Every JWT claim had the right role and tenant.
- **Reviewer on an unstated source** (VA2's irregular stream, awaiting_family_statement):
  - VR writing family_statement: 42501 "only the applicant can give the family's statement".
  - confirm_income_source with a reason, for confirmed_income, confirmed_excluded, and dismissed: 22023 "the family has not stated what this is yet", all three.
  - Direct updates of status, source_type, connection_method, family_statement_at, and average_amount: 42501.
  - The source was unchanged, and audit_log stayed at 0.
- **Applicant limits** (VA2, own source): updating status, source_type, connection_method, average_amount, or frequency: 42501. Calling confirm: 42501 "staff only".
- **Other users:**
  - VC and VB writing VA2's statement: 0 rows.
  - VB confirming: 42501. VRB confirming: P0002 "source not found". VRB writing the statement: 0 rows.
  - VRB selecting VA2's sources and records, and VC selecting VA2's sources: 0 rows. Control: VR saw VA2's 22 records.
- **Positive path:**
  - VA2 stated regular_contribution: 1 row, status awaiting_review, family_statement_at 15:39:12.928Z. The record read right after had ["awaiting_review","irregular_pattern"], needs_review true (N1).
  - VR's confirm with a blank reason: 22023 "a reason is required". With outcome awaiting_review: 22023.
  - VR writing the stated statement: 42501.
  - VR confirmed confirmed_income with a reason. The record then had [] and needs_review false.
  - audit_log went from 0 to 1 row: actor VR, action confirm_income_source, target income_sources, before {status awaiting_review, family_statement regular_contribution}, after {status confirmed_income}, and the reason.
  - A second confirm: 22023 "this source has already been decided". A confirm on unstated M1: "the family has not stated what this is yet".
  - VA2 re-stating: 42501 "a statement can only be given while the source awaits one".
- **Flagged streams through statement and decision:**
  - G (schedule_ambiguous): after VA2 stated life_event_gift, ["awaiting_review","schedule_ambiguous"]. After VR confirmed_excluded, [].
  - R1 (amount_changed): after VA3's statement, ["awaiting_review","schedule_ambiguous"], left undecided.
  - T1 (frequency_ambiguous): stated, then dismissed by VR, giving [].
  - F4: stated, giving ["awaiting_review"].
  - Three audit rows in all.
- **Re-ingest does not reset state.** I fired SYNC_UPDATES_AVAILABLE through plaid-sandbox on all three bank items. All three were recorded, signature_valid true, and processed by 15:40:07Z. I compared all 53 sources and their records before and after, on status, statement and its time, figures, reasons, needs_review, and raw_payload. **0 rows changed.**
- **Stale removal (N21)**, in the same read. Before firing, I inserted, as owner, three recurring_transfer sources with records on VA3's connection under stream references that Plaid's data does not contain:
  - the one awaiting the family's statement was removed with its record;
  - the stated one (awaiting_review) was kept with its record;
  - the confirmed one was kept with its record.
- **N3.** VA3 can still insert its own recurring_transfer/plaid source: status detected, provider_connection_id null. It cannot state it (42501), and it cannot be confirmed (22023).

[x] No raw Textract response, SSN, or full account number is stored anywhere, confirmed by query; raw provider payloads are stored redacted; Plaid access tokens are encrypted and unreadable by any client role.

- **Scan** (15:48:53Z to 15:54:26Z). Present at the time: 63 income_records, 8 documents including 4 W-2s, and 4 encrypted tokens. I scanned all 84 text, varchar, JSON, array, and enum columns in 20 public tables, with these patterns:
  - SSN and masked SSN
  - EIN
  - runs of 9 to 17 digits
  - raw Textract keys (Blocks, BlockType, Geometry, DocumentMetadata, BoundingBox, Relationships)
  - the fixture person's name and street
  - payroll employee strings, taxpayer, account_number, routing, distribution, and download_url
  - plaintext Plaid access, public, and link tokens
  - all 54 of my sender names
  - positive controls: "Platypus LLC" and "Sample Lawn"
- **Result.**
  - The controls matched where expected (employer_name, raw_payload, extracted_fields, and the payroll source key).
  - Every other pattern had 0 hits, except digit runs.
  - Digit runs: hits only in hashes and ids (provider_record_ref, provider_stream_ref, webhook event ids, and stream ids inside raw_payload). Outside the stream payload, 0 records match. Outside transaction_id, 0 deposit entries match.
- **What is stored:**
  - Deposit entries hold only amount, date, in_stream, and transaction_id.
  - The bank raw_payload is {as_of, rule, stream}.
  - Textract raw_payload is {answers, document_kind}.
- **Encrypted columns.** ssn_encrypted and account_number_encrypted non-null: 0 each. No account_last_four is anything but 4 digits.
- **Tokens.** All 4 are 117 bytes, contain no plaintext, and decrypt (as owner, through read_provider_token) to an access-sandbox token.
- **Client access** (15:54Z). VA2, VR, and anon each got 42501 on all of:
  - selecting access_token_encrypted, `*`, or provider_user_ref from provider_connections;
  - read_provider_token and store_provider_token;
  - updating provider_connections;
  - selecting webhook_events.

  Controls: the permitted columns returned VA2's 3 connections and VR's tenant's 5. anon got 42501 there too.
- **Catalog.**
  - authenticated's SELECT columns on provider_connections exclude access_token_encrypted and provider_user_ref.
  - authenticated's only UPDATE column on income_sources is family_statement.
  - EXECUTE on read_provider_token, store_provider_token, encrypt_secret, decrypt_secret, and encrypt_pii is held by postgres and service_role only.

[x] Genericization check from RULES.md run, exact command as written there, no output.

I ran it at 15:55:24Z on 2026-10-01, from the repository root, at HEAD 7e2c653 with a clean working tree. The command was read from RULES.md, section GENERICIZATION IS ENFORCED, NOT DECORATIVE (exactly one line matched) and run unmodified. It produced no output, exit code 1. I ran it again with this file present (untracked, so outside its scope): no output, exit 1. This file names none of the searched places.

## STATUS OF PRIOR OBSERVATIONS

### The 8 from PHASE_2_REWORK.md

1. **Bank deposit records not implemented.** Accepted as documented (AS BUILT 12). 36 payroll deposits produced no source.
2. **Records ignore confirmed status.** Addressed. 0 of 53 rows changed on re-ingest, and decided sources kept [].
3. **Applicants can relabel sources.** Addressed. The residual is N3.
4. **webhook_events lacks tenant_id.** Addressed. The catalog matches RULES.md.
5. **Replay not tested end to end.** Still open, and a documented limit. Idempotency rests on UNIQUE (provider, event_id), seen in the catalog.
6. **Integration teardown leaks a row.** Addressed. No int-* user, and no leftover events.
7. **Sandbox items remain in Plaid.** Addressed. My removes returned 200, and a later fire returned ITEM_NOT_FOUND.
8. **Later-phase items unchanged.** Accepted as documented.

### N1 to N27

- **N1.** Addressed, observed as real users. The reasons were ["awaiting_review","irregular_pattern"] right after the statement and [] right after the confirm.
- **N2.** Accepted as documented; normalized.ts is unchanged.
- **N3.** Accepted as documented (AS BUILT 19); observed again.
- **N4.** Addressed. Distinct stream refs equaled sources at every poll.
- **N5.** Addressed.
- **N6.** Superseded by N12.
- **N7.** Addressed (RS and X3b behave as documented).
- **N8.** Addressed. X5 was irregular with all 12 deposits.
- **N9.** Addressed; now a documented limit.
- **N10.** Addressed. The integration test confirms as a reviewer and passed.
- **N11. Plaid's key endpoint.** Still observed, informational. One forgery with an invented kid was recorded bad_signature, meaning Plaid returned a key for it; six others were unknown_key. All got 401.
- **N12.** Addressed. The uploader is unchanged since the fifth vetting; my clean Playwright runs used fresh production builds.
- **N13.** Addressed. All 53 stream payloads carry the v4.1 label.
- **N14.** Addressed. No int-* or e2e-* user remained after any suite run, including the network-failed runs.
- **N15.** Addressed. "this source has already been decided".
- **N16.** Addressed, forced again in a real browser.
  - Setup: my own production server on port 3100, signed in as VC with genuine @supabase/ssr cookies. Playwright held every server action request unanswered.
  - At 16:35:13Z, 3 s after the click, the button read "Connecting…", disabled, with 1 request held.
  - At 16:37:10Z, after 120.1 s, the alert read "We could not start the bank connection. Check your connection, then try again.", and "Connect your bank" was enabled again.
  - I stopped only my own server afterwards.
- **N17.** Addressed for 4 or more deposits: exact semi-monthly series spanning month ends were exact in every sweep. Not for 3 deposits (item 5).
- **N18.** Accepted as a documented limit; not re-probed.
- **N19.** Accepted as a documented limit, and flagged (F).
- **N20.** Accepted as a documented limit, and flagged (two misses recorded as 1).
- **N21.** Addressed. Forced through a real signed webhook: only the unanswered stale source was removed.
- **N22.** Addressed. In three concurrent trials, exactly one call succeeded each time.
- **N23. A source briefly visible without its record.** Still observed. At 15:31:29Z, VA1 had 11 sources and 10 records, and VA2 had 5 sources and 3 records. The final state was consistent. Open, low.
- **N24 and N25.** Now documented limits in the bar (out-of-band on-schedule deposits are not clean). Not re-probed.
- **N26.** Documented limit; observed again (LATE was irregular and flagged).
- **N27.** Confirmed again locally: X4 with its latest payment 10 days overdue is still active and clean. I moved the live X4 to 12 days, where it is flagged.

## NEW OBSERVATIONS (not checklist failures)

- **N28. A HISTORICAL_UPDATE failed once under concurrent processing.**
  - VA2's HISTORICAL_UPDATE (received 15:31:27Z) failed on its first attempt while three other events for the same item were processing.
  - The pg_cron retry processed it at 15:35:07Z (attempt 2), and VA2 went from 20 to 22 sources.
  - For about 3.5 minutes, the connection read "ingested" with two senders missing.
  - last_error was not kept after the successful retry, so the cause is not visible (the Management API's log query was unavailable to me).
  - The retry design worked as intended. Worth a look at concurrent ingestItem runs for one item.
- **N29. An amount change inside the band is clean and blended.**
  - RIB (200.00 × 3, then 280.00 × 3, monthly) is stored monthly 240.00, unflagged.
  - That is exact under the bar, which defines clean by schedule, but it understates the current rate by 14 percent.
  - The user may want amount_changed for in-band level shifts too.
- **N30. The true-tie wording.**
  - The bar's limit says "a series that fits two frequencies exactly". AS BUILT 25 flags an exact tie of the two deviation sums.
  - T1 (previous business day) tied at deviation 2 and 2. Neither reading is exact, but it is flagged frequency_ambiguous.
  - I accepted it as the limit. The user may want the bar's wording to match the rule.
- **N31. Rule v4 had more biweekly misreads than the sixth vetting saw.**
  - Locally, rule v4 also misread 5-deposit and longer biweekly series in windows spanning February (1,239 and 847 cases). The sixth vetting's sweep did not catch these.
  - Rule v4.1 reads all of them correctly. This is recorded for completeness.
- **N32. Environment.**
  - The network failed during my Playwright runs; see SUITES.
  - Port 3000's listener changed from pid 18248 (16:02Z) to pid 3136 (16:04Z) outside anything I ran. I never touched port 3000.

## SUITES RUN BY THE VETTER

- `npm test` (15:54:37Z to 15:55:17Z): "Test Files 7 passed (7)", "Tests 158 passed (158)".
- `npm run test:integration` (15:55:32Z to 15:59:38Z, first attempt, no retry): "Test Files 3 passed (3)", "Tests 23 passed (23)".
- `npm run test:isolation` (15:59:45Z to 16:01:42Z): "Test Files 1 passed (1)", "Tests 29 passed (29)". Report isolation-2026-10-01T15-59-56-136Z.json: total 340, passed 340, failed 0; my recount is 340 entries, all passing, in 33 groups. The two agree.
- Playwright 1.60.0, production build, app on port 3100, workers 1. Port 3100 was free before each run and after it.
  - `npm run test:e2e` (16:02:19Z to 16:04:45Z): "4 passed (2.2m)". BUILD_ID rewritten at 16:03:15Z.
  - `npm run test:theming`, full run 1 (16:04:56Z to 16:07:32Z): "9 passed (2.3m)". BUILD_ID rewritten at 16:05:44Z.
  - Full run 2 (16:07:38Z to 16:09:51Z) completed, but I captured only a log-line count, not its summary. Not counted.
  - Full runs 3, 4, and 5 (16:10Z, 16:14Z, and 16:27Z): test 1 timed out each time, so 3 tests did not run, and the 5 theming tests passed. Counted as not run, because the network failed:
    - The traces show the first page load taking 43.5 to 58 s and the server action 21 s. The browser's upload to Supabase Storage never completed.
    - At 16:27Z, simple requests to the project took 1.4 to 5.8 s each.
  - Full run 6 (16:37Z, reusing my own warm server) failed at setup on getaddrinfo ENOTFOUND for the pooler host. Not run.
  - After the network recovered:
    - Full run 7 (20:01:35Z to 20:03:46Z): "9 passed (2.1m)". BUILD_ID rewritten at 20:02:08Z.
    - Full run 8 (20:03:56Z to 20:06:09Z): "9 passed (2.1m)". BUILD_ID rewritten at 20:04:33Z.
  - Each passing run logged the known SEC-P2-07 "The destination stream closed early" once.
  - The app code is unchanged since b43adf1.

## TEST DATA AND CLEANUP

**Baseline** at 15:14:33Z, 2026-10-01, before anything I ran:
- tenants 1 (cedar-row), programs 3, program_rule_sets 3, ami_schedules 6
- theme_configs 1, properties 2, property_programs 3
- users 1, applicants 1, household_members 1, auth.users 1, auth.identities 1
- 0 in each of: income_sources, income_records, asset_records, provider_connections, applicant_documents, calculated_determinations, generated_documents, workflow_state, audit_log, webhook_events
- storage objects 0; buckets applicant-documents and tenant-branding
- Vault secrets cron_secret, functions_base_url, pii_key, provider_token_key; cron job ingestion-retry every 5 minutes, active
- 16 migrations, the latest 20261001001600
- MD5 hashes (rows as JSON, sorted): applicants f0b6ae3e…, users a63e4333…, household_members 4d409497…, tenants aa0a30b5…, theme_configs f2784002…, properties 1f60d071…, program_rule_sets 41b3ef6c…, property_programs 3f682d76…, ami_schedules 7e647fb5…, programs 337cc812…, auth.users (id and email) 4551537a…

The builder's report of 0 webhook_events and one real user matched.

**What I created:**
- tenant vet8-probe, with its theme, property, and program link
- 8 auth users: VA1 to VA4 and VC (cedar-row applicants), VR (cedar-row reviewer), VB (vet8-probe applicant), and VRB (vet8-probe reviewer), with 6 applicants and 6 household members
- 6 provider_connections: 3 bank links, VA2's payroll link, VA2's link_started row from the payroll link-token call (it held a Plaid user), and VB's link_started row
- 63 income_sources and 63 income_records, in total:
  - 53 streams;
  - 2 kept N21 fixtures (the third was removed by the function);
  - 1 payroll source with 2 records;
  - 6 document sources;
  - the N3 source with no record
- 3 asset_records, 8 applicant_documents, and 8 storage objects
- 3 audit_log rows
- 30 webhook_events: 16 genuine and 14 forgeries
- The suites cleaned up after themselves.

**Cleanup**, 20:06:36Z to 20:07:21Z:
- 5 removes through plaid-sandbox "remove" with the owning applicant's token, 200 each: the 3 bank items, the payroll item and user, and the Plaid user behind the link_started row. A fire_webhook on each bank and payroll item afterwards returned 502 ITEM_NOT_FOUND. VB's link_started row had nothing at Plaid.
- After a 15 s wait, I removed the 8 storage objects and deleted: audit_log 3, income_records 63, income_sources 63, asset_records 3, applicant_documents 8, provider_connections 6, household_members 6, applicants 6, webhook_events 30. Each count deleted equals the count created.
- The 8 auth users were deleted, and their public.users rows went with them. The vet8-probe tenant, theme, property, and program link were deleted.

**After cleanup**, re-checked after the late-webhook wait: all 38 compared values are identical to the baseline, with 0 differences. That covers every table count, auth.users and identities, storage objects and buckets, webhook_events 0, the Vault secret names, the cron job, the migration list, and all eleven hashes.

The real applicant's data was read only as counts and hashes, and never modified. No password, key, or secret was written to any file. My test users' passwords were derived in memory. One trace listing printed a short-lived signed upload URL for the e2e test's throwaway user to my session output only; that user and its object were deleted by the test's teardown.

My temporary scripts were in the session scratchpad, outside the repository, and are deleted. The working tree is clean apart from this file and the ignored artifacts the suites write (test-results, isolation reports, theming screenshots, .next). PHASE_2_REWORK.md to PHASE_2_REWORK_6.md are untouched. PROCESS-RULES.md was not marked.
