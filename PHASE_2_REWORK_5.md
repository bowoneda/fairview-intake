# PHASE_2_REWORK_5.md — Project 1: Fairview Compliance Intake Platform

This is the fifth Phase 2 gate result. It comes from the re-vet after rework 4, commit 4ca14f7. An independent Master Vetting sub-agent wrote it on 2026-10-01. It built no part of Phase 2.

Before running anything, it read these documents in full:
- CLAUDE.md, MEMORY.md, COLLABORATION-1.md, MASTER-VETTING-SKILL.md, and PROCESS-RULES.md;
- PHASE-2-SPEC.md, including AS BUILT 1 to 23;
- PHASE_2_REWORK.md, PHASE_2_REWORK_2.md, PHASE_2_REWORK_3.md, and PHASE_2_REWORK_4.md;
- RULES.md, SECURITY.md, MASTER-SPEC-1.md (data model and Milestone 2), TESTS.md, and DESIGN.md's upload control and Income, Assets, and Documents steps;
- the code: supabase/functions/_shared/ (recurring.ts at rule v3, plaid.ts, and the rest), every function's index.ts, the 16 migrations, components/ingestion/, app/[tenant]/apply/ingestion-actions.ts, playwright.config.ts, and every test.

The builder's reports, commit messages, MEMORY.md, SECURITY.md, and the AS BUILT claims were treated as leads only.

All evidence below was produced in this session. It was run against fairview-dev (ref mdatwozuqdiwioezalom), its deployed Edge Functions, the real Plaid Sandbox, and real AWS Textract (eu-west-1). Times are UTC. The database clock and this machine agreed to within 0.05 s (DB 05:53:48.248Z, local 05:53:48.200Z).

**Deployed code equals the commit.** I downloaded each of the six deployed functions into its own scratch folder (supabase functions download --use-api), so each came with its own _shared bundle. I diffed all 48 files against the working tree at HEAD 4ca14f7, which was clean. All 48 are identical. Deployed versions: document-ingest 1, plaid-link-token 8, plaid-exchange 8, plaid-sandbox 12, plaid-webhook 11, ingestion-retry 9. The live catalog lists 16 migrations, the latest 20261001001600, and the live confirm_income_source has migration 1600's new message.

## Gate result: NOT COMPLETE

- 11 items PASS.
- 1 item FAILS: item 5 (medium).
- None BLOCKED.

Rule v3 fixes the four shapes the fourth vetting found. I re-ran V1, V2, M1, and M2 with my own names, amounts, and dates on the real Plaid Sandbox, plus A, B, C, E, F, G, I, P, and a same-amount extra. All were right.

Item 5 still fails, on two shapes that rule v3 itself introduced or left open:
1. **A missed payment next to a one-off.** When a one-off deposit sits beside the gap a missed payment leaves, the one-off is the only deposit that can bridge the gap. So it either takes the place of a scheduled deposit or starts the stream, and the scheduled deposits are listed instead. That is G and P again, now with a missed payment: the one-off is in the count, the average, and the dates. I saw it on weekly, biweekly, and monthly senders, with the one-off before or after the gap.
2. **A weekly sender who misses only the latest week.** The weekly run counts as inactive, so the every-other-deposit biweekly run wins. It is stored as biweekly, with 12 genuine deposits listed. That is the M2 shape again, at the end of the run instead of the middle.

Everything else passes on my own probes. That includes separation of duties (item 10), N1, and N15 as real users, and the uploader's error and stall paths, which I forced in a real browser.

Do not write PHASE_2_COMPLETE.md until item 5 is fixed and vetted again. The fix will touch recurring.ts again, which the webhook, retry, and sandbox paths share. So the next vet should re-observe at least items 1, 5, 7, 8, and 10, plus the genericization check.

## FAILING ITEMS

### Item 5, FAIL, medium

[ ] Plaid transaction classification identifies recurring peer to peer income transfers in a sandbox account and produces a recurring transfer income source.

**How I tested.**
- I designed three custom Plaid Sandbox users with 34 senders between them: U1 had 13, U2 had 11, and U3 had 10. Each user had one checking account.
- Every account also held noise: 12 biweekly payroll deposits, 5 rent outflows, and 1 Venmo outflow. None produced a source.
- The as of date is the ingestion date, 2026-10-01. Before linking, I ran every sender through the committed recurring.ts locally (Node, strip-types, as of 2026-10-01) to predict the result, with every deposit named.
- I linked all three through the deployed plaid-sandbox with action "link", as three cedar-row applicants, VA1, VA2, and VA3, from 06:02:52Z to 06:03:07Z. Each link returned 200 awaiting_data.
- I polled every 3 s while Plaid delivered history in stages.
  - Twelve real Plaid-signed webhooks were processed, all with signature_valid true. Each item had INITIAL_UPDATE, HISTORICAL_UPDATE, and two SYNC_UPDATES_AVAILABLE. All were processed by 06:03:20Z.
  - Sources grew from 0 to 5 to 9 on U3, and from 5 to 10 to 11 on U2. U1 already showed all 13 at the first poll.
  - At every poll, the number of distinct provider_stream_ref values equaled the number of sources, and no source lacked its average or count.
- I stopped after 60 s with no change and HISTORICAL_UPDATE processed on all three items. I read the final state at 06:04:56Z.
- **All 33 stored streams equal the local prediction exactly**: frequency, average, count, first and last dates, missed_payments, and the number listed. The two senders predicted to give no source gave none. No stored source was unmatched.
- I matched each stored source to my sender by recomputing its stream_ref from Plaid's account id, the app, and the sender.
- Every stored record had these properties:
  - gross_pay equal to the average, and pay_frequency equal to the source's frequency;
  - pay_period_start and pay_period_end equal to first_seen and last_seen;
  - transaction_ids count equal to occurrence_count;
  - status awaiting_family_statement, with reasons ["awaiting_family_statement"], plus "irregular_pattern" for irregular senders;
  - raw_payload.rule "PHASE-2-SPEC recurring transfer rule v3 (AS BUILT 22)" and as_of 2026-10-01 (N13).

**How "which deposit is listed" was checked.** Plaid's secret is not on this machine, so I cannot fetch Plaid's own list of transaction ids and dates. The stored payload holds only Plaid's ids. I identified the listed deposits three ways:
- **By sum.** I gave the one-offs distinct amounts, or distinct cents for the near-same-amount cases (110.37, 65.41, 85.40, 35.40). The amount left out equals the total of my inputs minus average times count, give or take 0.03 of rounding. The table shows this sum.
- **By dates.** When a one-off is at the start or end of the run, first_seen or last_seen shows which date was kept.
- **By prediction.** In every case, the stored result equals the local run of the committed detector, which names each excluded deposit.

**What failed, stored on the real Plaid Sandbox (final read 06:04:56Z).**

| Case | My input | Expected | Stored | Out of the stream (by sum) |
|---|---|---|---|---|
| X15, monthly, one missed, one-off after the first deposit | Zelle from Elle Varga, 400.00 on 04-14, 06-13, 07-13, 08-12, and 09-11 (05-14 missed); plus 260.00 on 04-17 | monthly 400.00, count 5, missed 1, 04-14 to 09-11; the 260.00 listed | **monthly 372.00**, count 5, missed 1, **first_seen 04-17** (the one-off's date) | **400.00**: the scheduled 04-14 deposit, since first_seen is 04-17 |
| X16, monthly, one missed, one-off before the gap's far side | Cash App from Ford Ames, 400.00 on 04-14, 05-14, 06-13, 08-12, and 09-11 (07-13 missed); plus 270.00 on 08-09 | monthly 400.00, count 5, missed 1; the 270.00 listed | **monthly 374.00**, count 5, missed 1, 04-14 to 09-11 | **400.00**: a scheduled deposit, the 08-12 one by prediction |
| X3b, biweekly, one missed, one-off after the deposit before the gap | Cash App from Drew Mott, 140.00 every 14 days 04-14 to 09-29 (05-26 missed, 12 deposits); plus 98.00 on 05-15 | biweekly 140.00, count 12, missed 1; the 98.00 listed | **biweekly 135.80, count 10**, missed 1, **first_seen 05-15** (the one-off) | **420.00 = 3 × 140.00**: the genuine 04-14, 04-28, and 05-12 deposits |
| X2b, weekly, one missed, one-off after the deposit before the gap | Venmo from Bree Tolan, 35.00 weekly 04-12 to 09-27 (07-05 missed, 24 deposits); plus 22.00 on 06-30 | weekly 35.00, count 24, missed 1; the 22.00 listed | **weekly 34.46**, count 24, missed 1 | **34.96, about 35.00**: the scheduled 06-28 deposit; the 22.00 is in the stream |
| X2, weekly, one missed, extra inside the gap | Venmo from Cole Hayes, 35.00 weekly 04-12 to 09-27 (07-05 missed, 24 deposits); plus 35.40 on 07-02 | weekly with all 24 and the extra listed; or, reading 07-02 as the missed week paid early, weekly with all 25; or irregular with all 25 | **weekly 35.03, count 13**, missed 1, **first_seen 07-02** (the extra), 04-12 to 06-28 all listed | **420.01 = 12 × 35.00**: every genuine deposit before the gap |
| X4, weekly, latest week missed | Zelle from Eve Stone, 50.00 weekly 04-05 to 09-20, 25 deposits; the 09-27 deposit never came | weekly (missed or ended), or irregular with all 25, or not surfaced as ended; never a coarser frequency | **biweekly**, 50.00, **count 13**, 04-05 to 09-20 | **600.00 = 12 × 50.00**: every other genuine deposit |

The stored figures are exactly the shapes described:
- X15: 372.00 = (260 + 4 × 400) / 5. X16: 374.00 = (270 + 4 × 400) / 5. X3b: 135.80 = (98 + 9 × 140) / 10. X2b: 34.46 = (22 + 23 × 35) / 24.
- X2: the stream is the extra plus the 12 deposits after the gap.
- X4: the 13 kept are every other deposit, 14 days apart.

**Cause, from the code.**
- **X2b, X3b, X15, X16.** A missed payment may be bridged only between two consecutive in-band deposits (recurring.ts line 160, `i === j + 1`). When a one-off sits beside the gap, the scheduled deposit on the far side of it is no longer consecutive with the deposit across the gap. So the only run that can step over the gap goes through the one-off. That run is longer, and length is compared before timing (`better()`, line 135), so the one-off wins.
  - When the one-off is a few days after the deposit before the gap (X2b, X15), the run uses the one-off in that deposit's place. The step before it is in the band, and the step after it is a doubled gap.
  - When it is a few days before the deposit after the gap (X16), the run steps from the deposit before the gap to the one-off as a doubled gap, then on to the next deposit, skipping the scheduled one.
  - In X3b, the longest active run starts at the one-off.
- **X2.** The extra is 4 days after a scheduled deposit and 10 days before the next one. Ten days counts as a "doubled" weekly gap, because the doubled band is 2 × 5 to 2 × 9 days. So the extra bridges to the next deposit, while the run before the gap cannot bridge. Only active runs count, so the stream is the extra plus the 12 deposits after the gap, which is more than half of 25.
- **X4.** The weekly run's last deposit is 11 days before the as of date, beyond 1.5 × 7 days, so the weekly run is inactive (line 174). The biweekly run of every other deposit is still active (11 days is within 21). It holds 13 of 25 deposits, a strict majority, so it wins. The missed-payment bridge cannot help, because the miss comes after the last deposit. With 24 deposits, exactly half, the same sender is surfaced as irregular (my control X5 on a biweekly sender shows the same: 12 deposits, irregular), so the outcome depends on whether the count is odd or even.
- recurring.test.ts has no case that combines a missed payment with a one-off, and no case with a miss at the end of a run.

**Why this is a gate failure and not an observation.**
- PHASE_2_REWORK.md, PHASE_2_REWORK_2.md, and PHASE_2_REWORK_3.md require that a one-off be kept out of a stream's count, average, and dates, and that it be the deposit listed. X2b, X3b, X15, and X16 put the one-off into the average, X3b and X15 into first_seen, and list scheduled deposits instead.
- PHASE_2_REWORK_4.md's "To pass" says a weekly sender with one missed week is "never stored at a coarser frequency with genuine deposits listed as exceptions". X4 is exactly that, with the miss at the end. A missed latest payment is a missed payment.
- X2 lists 12 genuine deposits and counts the extra. Neither reading of the extra (a one-off, or the missed week paid early) supports that.
- None of these inputs is truly ambiguous in the way that matters here. I considered the other readings: a one-off a few days off the schedule might be a late or early payment, and a sender whose latest payment is late might have stopped. No reading of the deposits supports listing scheduled deposits while counting the one-off, or calling a weekly sender biweekly.
- The stored gross_pay and frequency are what Phase 3 will annualize (average amount times frequency periods, PHASE-2-SPEC.md):
  - X15: 4,464.00 instead of 4,800.00 (−7.0 percent);
  - X16: 4,488.00 instead of 4,800.00 (−6.5 percent);
  - X3b: 3,530.80 instead of 3,640.00 (−3.0 percent);
  - X2b: 1,791.92 instead of 1,820.00 (−1.5 percent);
  - X2: 1,821.56 instead of 1,820.00, but with 12 genuine deposits listed as exceptions and a count of 13 instead of 24;
  - X4: 1,300.00 instead of 2,600.00 (−50 percent).
- These are ordinary inputs. Rule v3 now accepts a missed payment as normal, and an extra payment is the same class of input as A, E, G, and P. The two together is the first attack the gate brief named.

I rate it medium, as before. Every stream is surfaced for the family's statement, nothing regular was silently dropped, and a reviewer confirms before anything becomes income. But named criteria from three earlier gate results fail again, X4 would under-report regular income by half, and the reviewer is pointed at the wrong deposits.

**To pass:**
- On real Plaid Sandbox data, through the deployed functions:
  - **A missed payment next to a one-off.** A one-off a few days before or after a scheduled deposit beside a missed payment's gap is kept out of the count, average, and dates, and is the deposit listed. The stream keeps every scheduled deposit and records the miss. Alternatively, the sender is surfaced as irregular with all its deposits, as AS BUILT 22 already does when the one-off sits farther inside the gap (my X3, below). This must hold for weekly, biweekly, and monthly senders, with the one-off on either side of the gap (X2b, X3b, X15, X16).
  - **An extra inside a weekly gap (X2).** Genuine scheduled deposits are never listed as exceptions because of the extra. The extra is either kept out and listed, or counted as the missed week's payment, or the sender is surfaced as irregular with all its deposits. One possible cause to address is that a 10-day gap counts as a "doubled" weekly gap.
  - **A miss at the end of the run (X4).** A sender whose latest payment is missing is never stored at a coarser frequency with every other genuine deposit listed. For example, do not accept a coarser run that is every other deposit of a longer finer run that went inactive by one interval. Instead keep the finer frequency with the miss recorded, or surface the sender as irregular with all its deposits, or treat it as ended per the spec's is_active, documented.
  - Every earlier shape must still pass: A, B, C, E, F, G, I, P, V1, V2, M1, M2, and the same-amount extras.
- The choice stays deterministic and is documented in PHASE-2-SPEC.md AS BUILT.
- The unit tests and the plaid-sandbox integration test drive X2b, X15 (or X16), and X4, or equivalent shapes, alongside the earlier ones.

**What passed: re-runs of V1, V2, M1, and M2 with my own inputs, and the earlier families (U1).**

| Case | My input | Stored (final) | Out (by sum) | Result |
|---|---|---|---|---|
| V1 | Zelle from Lena Ortiz, monthly: 175.00 (04-26), 240.00, 205.00, 260.00, 190.00 (08-24), 230.00 (09-23); plus 215.00 on 08-27, 3 days after 08-24 | monthly 216.67, count 6, 04-26 to 09-23, 1 listed | 214.98, about 215.00 | correct; the one-off is out |
| V2 | Venmo from Omar Reid, monthly: 360.00 (04-27), 345.00, 380.00, 355.00, 370.00, 300.00 (09-24); plus 360.00 on 09-27 | monthly 351.67, count 6, **last_seen 09-24**, 1 listed | 359.98, about 360.00 | correct; last_seen is the scheduled date |
| M1 | Cash App from Tara Quinn, 95.00 every 14 days 04-12 to 09-27, 07-05 missed (12 deposits) | biweekly 95.00, count 12, missed 1, 04-12 to 09-27, 0 listed | 0 | correct |
| M2 | Zelle from Ivan Lutz, 55.00 weekly 04-10 to 09-25, 06-26 missed (24 deposits) | weekly 55.00, count 24, missed 1, 04-10 to 09-25, 0 listed | 0 | correct |
| A | Venmo from Gail Hurst, 110.00 every 30 days 05-03 to 09-30 (6); plus 110.37 on 07-17 | monthly 110.00, count 6, 1 listed | 110.37 | correct |
| B | Zelle from Noel Park, 65.00 every 14 days 04-21 to 09-22 (12); plus 65.41 on 06-21 | biweekly 65.00, count 12, 1 listed | 65.41 | correct |
| C | Cash App from Rhea Dunn, 70.00 every 30 days (6), memo alternating "for gas" and "internet bill" | monthly 70.00, count 6, one source | 0 | correct |
| E | Venmo from Seth Moyo, 300.00 every 30 days (5); plus 190.00 on 08-04 | monthly 300.00, count 5, 1 listed | 190.00 | correct |
| F | Zelle from Uma Cross, 45.00 every 14 days (6, 04-13 to 06-22), then weekly (14, 06-29 to 09-28) | one source: weekly 45.00, count 16, missed 1, 06-08 to 09-28, 4 listed | 180.00 = 4 × 45.00 | correct as one source on the current schedule; see N19 |
| G | Venmo from Kara Bell, 420.00 every 30 days 04-24 to 09-21; plus 275.00 on 07-26, 3 days after 07-23 | monthly 420.00, count 6, 1 listed | 275.00 | correct |
| I | Zelle from Theo Marsh, 260.00 on the 1st and 16th, 04-16 to 09-16 (11); plus 180.00 on 07-04 | semi_monthly 260.00, count 11, 1 listed | 180.00 | correct |
| P | Cash App from Lia Fenn, 610.00 every 30 days, last 09-25; plus 395.00 on 09-28 | monthly 610.00, count 6, **last_seen 09-25**, 1 listed | 395.00 | correct |
| Same amount, mid-run | Venmo from Jon Akers, 150.00 every 30 days 04-19 to 09-16; plus 150.00 on 06-22, 4 days after 06-18 | monthly 150.00, count 6, 1 listed | 150.00 | correct by prediction (the figures cannot tell) |

**What passed or was accepted: other attacks on rule v3 (U2 and U3).**

| Case | My input | Stored | Classification |
|---|---|---|---|
| X1, missed payment plus a one-off elsewhere | Zelle from Abby Lane, 85.00 every 14 days 04-14 to 09-29 (06-23 missed); plus 85.40 on 05-31 | biweekly 85.00, count 12, missed 1, 1 listed (85.40 by sum) | correct |
| X6, missed at the start | Cash App from Gil Roy, 90.00 every 14 days from 04-12 (04-26 missed) to 09-27 | biweekly 90.00, count 12, missed 1, first_seen 04-12 | correct |
| X9, semi-monthly, one date missed | Venmo from Kim Fox, 210.00 on the 5th and 20th, 04-05 to 09-20 (07-20 missed) | semi_monthly 210.00, count 11, missed 1 | correct |
| X10, varying amounts, extra 3 days **before** a scheduled date | Cash App from Liv Grant, monthly 150.00, 215.00, 180.00, 240.00 (07-24), 165.00, 205.00; plus 190.00 on 07-21 (the median amount) | monthly 192.50, count 6, 1 listed (190.00 by sum) | correct |
| X12a, month-end dates | Zelle from Max Bauer, 330.00 on 04-30, 05-31, 06-30, 07-31, 08-31, 09-30 | monthly 330.00, count 6 | correct |
| X13a, exactly half on a schedule | Zelle from Ola Dean, 125.00: 3 irregular dates, then 3 monthly | irregular, count 6 | correct (AS BUILT 22: exactly half is irregular) |
| X13b, more than half | Venmo from Pat Lowe, 135.00 on 7 dates; 6 of them fit a monthly schedule | monthly 135.00, count 6, 1 listed | correct |
| X3, missed payment with an extra 8 days into the gap | Cash App from Dina Moss, 140.00 every 14 days 04-14 to 09-29 (07-07 missed); plus 140.60 on 07-01 | irregular, 140.05, count 13 (all) | accepted as documented (AS BUILT 22: no bridge when the sender sent something in between, then irregular with all); surfaced |
| X5, biweekly, latest payment missed, 12 deposits | Venmo from Finn Ward, 75.00 every 14 days, last 09-08 | irregular, count 12 (all) | accepted as documented; surfaced |
| X7a, two missed payments | Zelle from Hana Pope, 115.00 every 14 days 04-12 to 09-27, with 05-24 and 08-16 missed | biweekly 115.00, count 8, missed 1, 06-07 to 09-27, 3 listed (the first three) | observation N20: right frequency and average |
| X7b, two missed weeks | Venmo from Ivy Shaw, 30.00 weekly 04-12 to 09-27, with 05-17 and 07-26 missed | weekly 30.00, count 18, missed 1, 05-24 to 09-27, 5 listed | observation N20 |
| X8a, every 60 days, last 40 days ago | Zelle from Jay Vance, 500.00 on 04-24, 06-23, 08-22 | irregular, count 3, surfaced | accepted (no 60-day frequency in the spec); N18 |
| X8b, every 60 days, last 50 days ago | Venmo from Kai Moreno, 450.00 on 04-14, 06-13, 08-12 | no source | accepted as documented (AS BUILT 17's 45-day rule); N18 |
| X14, monthly, latest payment missed (last 50 days ago) | Zelle from Rosa Kent, 220.00 monthly to 08-12 | no source | accepted as documented (the spec's is_active) |
| X12b, the 1st sometimes paid on the previous month's last day | Venmo from Nia Ford, 180.00 on the 1st and 16th, with 06-01 paid 05-31 and 09-01 paid 08-31 | **biweekly** 180.00, count 11 (all) | observation N17 (frequency +8.3 percent when annualized; nothing listed) |
| X12c, every 28 days | Cash App from Quin Hart, 260.00 every 28 days, 7 deposits | monthly 260.00, count 7 | observation N18 (no four-weekly frequency in the spec) |

## PASSING ITEMS

[x] Plaid sandbox integration functional, produces a normalized income_records entry.

- My three bank links (06:02:52Z to 06:03:07Z) went from awaiting_data to ingested, driven by 12 real Plaid-signed webhooks, all signature_valid true, processed by 06:03:20Z.
- They produced:
  - 3 asset_records rows ("Vet Six Checking U1", mask 3212; "U2", mask 6827; "U3", mask 6123), each with balance 2275.50, exactly my custom users' starting balance, and account_number_encrypted null;
  - 33 income_sources and 33 income_records, ingestion_method plaid;
  - 0 sources from the 36 payroll deposits and 18 outflows.
- Stored bank rows validate against the shared schema (item 8).
- Tokens are stored encrypted: 117 bytes each, with no plaintext "access-" in the bytes (item 11).
- A re-read through three real signed webhooks I fired (06:07:05Z to 06:07:17Z) was recorded and processed, and changed none of the 33 source and record rows (item 10).

[x] Payroll sandbox integration (Plaid Payroll Income; Argyle or Pinwheel as the listing names, if later added) functional, produces a normalized income_records entry of identical shape to the bank pipeline's output.

- VA2's plaid-sandbox link with product payroll_income (06:08:25Z to 06:08:31Z) returned 200: status ingested, 2 stubs.
- A real INCOME.USER_INCOME_VERIFICATION webhook was received at 06:08:30.495Z, signature_valid true, and processed at 06:08:32.197Z.
- The connection has product payroll_income, a Plaid user reference, and a 117-byte encrypted token with no plaintext.
- There are 2 income_records, each with ingestion_method plaid, source_type employment, source status detected, and provider_record_ref set.
- The stored payroll row validates with the same 18-key set as the bank and Textract rows (item 8).

[x] Textract Queries fallback pipeline functional against a sample scanned paystub, W-2, and Schedule C, each producing a normalized income_records entry of identical shape to the other two pipelines.

These are my own uploads into VA2's own folder, each followed by an applicant_documents row written as VA2, and document-ingest with VA2's token. The paystub went through a signed upload URL, as the UI does; the others were direct uploads.
- **Paystub** (06:08:43Z to 06:08:50Z): 200 extracted, no reasons.
  - Fairview Parcel Services LLC, biweekly, rate 18.50, gross 1480.00, YTD 26640.00.
  - Period 2026-08-24 to 2026-09-06, pay date 2026-09-11, confidence 97.
  - Deduction total_deductions 276.02, which is 1480.00 minus the fixture's net 1203.98.
- **W-2** (06:08:54Z): 200 needs_review (historical_annual). Employer Fairview Parcel Services LLC, gross 34120.50, annual, 2025-01-01 to 2025-12-31, confidence 99.
- **Schedule C** (06:09:01Z): 200 needs_review.
  - self_employment, Sample Lawn Care, gross 24800.00, annual, confidence 99.
  - Deduction schedule_c_line_28_total_expenses 7350.00.
  - Reasons self_employment_net_income_phase3 and schedule_c_line_31:17450.00.
- Every value equals tests/fixtures/documents/expected.json.
- **Two-page PDF** (06:09:14Z): 422 multi_page_pdf. The document is failed with reason multi_page_pdf, and no income record exists for it.
- **W-2 read again** (06:09:17Z): 409 already_processed.
- **The same new W-2 document ingested twice at once** (06:09:18Z): one 200 and one 409, and exactly one record. See N22 for the code read.
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
- Each pay frequency is Plaid's own value for that stub (SEMI_MONTHLY and BIWEEKLY in the stored pay_period_details), mapped by payroll.ts.
- Both have needs_review true with the reason variable_earnings:bonus,overtime, deferred to Phase 3.
- The raw_payload keys are only deductions, document_id, earnings, employer, net_pay, pay_period_details, and source. employer holds {name: "Platypus LLC"} only.

[x] Webhook signature verification present and tested for every webhook provider in use (Plaid, which serves both bank and payroll; and Argyle if later added), even in sandbox mode.

- **Forgeries** (06:10:26Z to 06:10:37Z). Twelve forged requests to plaid-webhook, naming my real bank item or my real payroll user. Each returned 401 {"error":"invalid_signature"}:
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
- **Nothing was processed.** No valid event arrived in that window. A snapshot of my four connections (status, error code, last event time) and of all my sources and records was identical before and after. VA1's connection stayed ingested, not reauth_required.
- **Other method.** GET returned 405.
- **Valid path.** 16 genuine Plaid-signed events on my four items were accepted (signature_valid true) and processed. They are the 12 from the links, the 3 I fired, and the INCOME event.
- **Idempotency.** The catalog shows UNIQUE (provider, event_id) on webhook_events. The stale-iat and tampered-body branches are unit tested in tests/unit/plaid-verify.test.ts, within my `npm test` run of 150.
- Argyle is not in use.

[x] Integration test suite covering all three ingestion paths.

`npm run test:integration`, 06:22:57Z to 06:26:51Z, first attempt with no retry: "Test Files 3 passed (3)", "Tests 21 passed (21)". The files are:
- plaid.test.ts: bank; recurring, with the earlier cases and V1, V2, M1, and M2; the signed webhook; retry; pg_net; forgeries; payroll; and cross-applicant checks;
- textract.test.ts;
- shape-identity.test.ts.

Afterwards, auth.users held no int-* user, and all 28 webhook_events rows in dev were mine (N14, and observation 6 of the first vetting).

[x] Normalized income record shape identity test passes: one record from each pipeline validates against the single shared schema with an identical key set.

- **The test** (tests/integration/shape-identity.test.ts) passed inside my full integration run.
- **By hand (06:43Z), with my own script.** I imported NORMALIZED_KEYS and normalizedIncomeRecordSchema from supabase/functions/_shared/normalized.ts.
  - NORMALIZED_KEYS has 18 keys.
  - Every key except source_type is a column of income_records. The only other columns are id, tenant_id, applicant_id, income_source_id, provider_connection_id, document_id, provider_record_ref, raw_payload, and created_at.
  - I rebuilt six stored rows from their own columns plus income_sources.source_type:
    - bank: V1's stream, monthly 216.67;
    - bank: X8a's irregular stream, frequency null;
    - payroll: 2306.00 semi_monthly;
    - Textract: the 1480.00 paystub, the 34120.50 W-2, and the 24800.00 Schedule C.
  - All six are valid, and all six key sets are identical to NORMALIZED_KEYS.
  - Negative control: each record with one extra key was refused by the strict schema, 6 of 6.

[x] New Phase 2 tables have tenant_id and RLS in the migration that creates them; isolation suite extended to them and to the private document storage bucket, and passing.

- **Catalog** (06:43Z):

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
- **Suite.** `npm run test:isolation`, 06:27:12Z to 06:29:34Z:
  - Vitest: "Test Files 1 passed (1)", "Tests 29 passed (29)".
  - Newest report, isolation-2026-10-01T06-27-22-762Z.json: projectRef mdatwozuqdiwioezalom, total 340, passed 340, failed 0. My own recount is 340 entries, all with pass true, in 33 groups including T1 to T5.
  - The summary and the report agree, so SEC-P1-05 does not apply.
- **By hand** (06:12:01Z to 06:12:32Z), as three users against VA2's resources: VB (applicant, second tenant vet6-probe), VRB (reviewer, vet6-probe), and VC (another cedar-row applicant). I checked each user's JWT claims first.
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
  - Afterwards VA2's folder, the W-2's status, and VA2's connection were unchanged, and the vet6-probe prefix held 0 objects.
  - Controls:
    - VA2 downloaded its own W-2 (90232 bytes).
    - Same-tenant reviewer VR downloaded it (90232 bytes) and saw VA2's 17 records.
    - VB got a link-sandbox token for its own member.

[x] Recurring transfers follow PHASE-2-SPEC.md's rule: detected by software, stated by the family, confirmed by a reviewer; no transfer becomes income through software alone.

My probes (06:06:26Z to 06:06:36Z). The users were VA1, VA2, and VA3 (cedar-row applicants), VR (cedar-row reviewer), VC (cedar-row applicant), and VB and VRB (vet6-probe applicant and reviewer). Their JWT claims had the right roles and tenants.

- **Reviewer on an unstated source** (X8a's irregular stream, VA3's, awaiting_family_statement):
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
  - VRB selecting VA3's sources and records, and VC selecting VA3's sources: 0 rows. Control: VR saw VA3's 9 records.
  - The source was still unchanged.
- **Positive path, as real users:**
  - VA3 stated X8a regular_contribution: 1 row, status awaiting_review, family_statement_at stamped (06:06:33.093Z).
  - VR's confirm with a blank reason: 22023 "a reason is required". With outcome awaiting_review: 22023.
  - VR writing the now-stated statement: 42501.
  - VR confirmed X8a as confirmed_income with a reason. audit_log went from 0 to 1 row: actor VR, action confirm_income_source, target income_sources, before_value {status awaiting_review, family_statement regular_contribution}, after_value {status confirmed_income}, and the reason.
  - A second confirm: 22023 "this source has already been decided" (N15). A confirm on an unstated source (M1) still says "the family has not stated what this is yet".
  - VA3 re-stating the confirmed source: 42501 "a statement can only be given while the source awaits one".
  - VA1 stated G life_event_gift, and VR confirmed it confirmed_excluded. VA1 stated SAME will_not_repeat, and VR dismissed it. These are the second and third audit rows, with the same shape.
  - VA2 stated X4 shared_expense_reimbursement and left it undecided.
- **Re-ingest does not reset state.** I fired SYNC_UPDATES_AVAILABLE through plaid-sandbox on VA1's item at 06:07:05Z, and twice on VA3's at 06:07:11Z and 06:07:17Z. All three were recorded as new events and processed (signature_valid true) by 06:07:25Z. I compared all 33 sources and their records before and after, on status, statement and its time, figures, reasons, and the stored stream. **0 rows changed**:
  - X8a: confirmed_income / regular_contribution, reasons [].
  - G: confirmed_excluded / life_event_gift, reasons [].
  - SAME: dismissed / will_not_repeat, reasons [].
  - X4 (stated, undecided): awaiting_review / shared_expense_reimbursement, reasons ["awaiting_review"].
- **Applicant-inserted source (N3).** VA3 can still insert its own source labeled recurring_transfer / plaid, which gets status detected and provider_connection_id null. It cannot then state it (42501) or have it confirmed (22023).

[x] No raw Textract response, SSN, or full account number is stored anywhere, confirmed by query; raw provider payloads are stored redacted; Plaid access tokens are encrypted and unreadable by any client role.

- **Scan** (06:13:31Z). Present at the time: 39 income_records, 5 documents including two W-2s, and 4 encrypted tokens. I scanned all 86 text, varchar, JSON, array, and enum columns in 20 public tables, with these patterns:
  - SSN, and a masked SSN
  - EIN
  - runs of 9 to 17 digits
  - raw Textract keys (Blocks, BlockType, Geometry, DocumentMetadata, BoundingBox, Relationships)
  - the fixture person's name and street
  - payroll employee strings, taxpayer, account_number, routing, distribution, and download link
  - plaintext Plaid public and access tokens
  - the 34 sender names in my custom users
  - positive controls: "Platypus LLC" and "Sample Lawn"
- **Result.**
  - The controls matched where expected (employer_name, raw_payload, extracted_fields).
  - SSN, masked SSN, EIN, Textract keys, person, payroll employee strings, tokens, and sender names: 0 hits each. No sender name is stored anywhere.
  - Digit runs: all are hashes or ids. They are 32-hex stream refs (in provider_stream_ref, provider_record_ref, and raw_payload), 64-hex webhook event ids, and the millisecond timestamp in my own storage paths. With the stream ref and Plaid's ids removed from raw_payload, 0 rows still match.
- **What is stored:**
  - Textract raw_payload keys are answers and document_kind only.
  - extracted_fields hold only the query aliases: 10 for the paystub, 4 for the W-2, 5 for the Schedule C.
  - The bank raw_payload is {as_of, rule, stream}. stream holds account_id, app, average_amount, excluded_transaction_ids, first_seen, frequency, last_seen, missed_payments, occurrence_count, pattern, stream_ref, and transaction_ids.
  - The payroll raw_payload is as listed under item 4.
- **Encrypted columns.** ssn_encrypted and account_number_encrypted non-null: 0 each. Every account_last_four is 4 digits (6827, 3212, 6123).
- **Tokens.** All 4 are 117 bytes, contain no plaintext "access-", and decrypt (as owner, via public.read_provider_token) to an access-sandbox token.
- **Client access** (06:15Z). VA2, VR, and anon each got 42501 on all of:
  - selecting access_token_encrypted, `*`, or provider_user_ref from provider_connections;
  - read_provider_token and store_provider_token;
  - updating provider_connections;
  - selecting webhook_events.

  Controls: the permitted columns returned VA2's 2 connections and VR's tenant's 4. anon got 42501 there too. The catalog shows:
  - authenticated's column grants on provider_connections exclude access_token_encrypted and provider_user_ref;
  - authenticated's only UPDATE column on income_sources is family_statement;
  - EXECUTE on read_provider_token, store_provider_token, encrypt_secret, decrypt_secret, and encrypt_pii is held by postgres and service_role only.

[x] Genericization check from RULES.md run, exact command as written there, no output.

Run at about 06:43Z on 2026-10-01, from the repository root, at HEAD 4ca14f7 with a clean working tree. I read the command from RULES.md, section GENERICIZATION IS ENFORCED, NOT DECORATIVE: exactly one line matched, and it ran unmodified. It produced no output, exit code 1. It needs re-running once this file and the item 5 fix are committed.

## STATUS OF PRIOR OBSERVATIONS

### The 8 from PHASE_2_REWORK.md

1. **Bank deposit records not implemented.** Accepted as documented (AS BUILT 12). My three accounts each had 12 payroll deposits, and none produced a source or record (0 non-transfer sources on all three bank connections).
2. **Records ignore confirmed status.** Addressed. After my re-ingest, the confirmed, excluded, and dismissed sources' records kept reasons [], and 0 of 33 rows changed.
3. **Applicants can relabel sources.** Addressed. VA3 and VR each got 42501 on source_type and connection_method, and the catalog grants authenticated UPDATE on family_statement only. The residual is N3.
4. **webhook_events lacks tenant_id.** Addressed. RULES.md names it, and the catalog matches: RLS on, 0 policies, no client grant.
5. **Replay not tested end to end.** Still open, unchanged, and not closable from outside, since a genuine Plaid signature cannot be captured. Idempotency rests on UNIQUE (provider, event_id = SHA-256 of the body), which I saw in the catalog, plus the 5-minute iat window in plaid-verify.ts.
6. **Integration teardown leaks a row.** Addressed. After my integration run, no int-* auth user remained, and all 28 webhook_events rows in dev were mine (16 genuine events on my items, and my 12 forgeries).
7. **Sandbox items remain in Plaid.** Addressed, as far as I can observe. I removed my 4 items (including the payroll user) with plaid-sandbox "remove", 200 each (06:45:27Z to 06:45:33Z). A fire_webhook on each removed item then returned 502 ITEM_ERROR/ITEM_NOT_FOUND (06:45:34Z to 06:45:38Z).
8. **Later-phase items unchanged.** Accepted as documented. SECURITY.md still lists SEC-P2-02 to -06 for Phases 4 and 5, and PROCESS-RULES.md Phase 5 has the plaid-sandbox production exclusion.

### N1 to N15

- **N1. Review reasons lag the status.** Addressed, observed as real users through the real paths:
  - VA3's statement stamped at 06:06:33.093Z; the record read right after already had ["awaiting_review","irregular_pattern"], needs_review true.
  - Right after VR's confirm (06:06:34Z), the record had [] and needs_review false. The same held for G and SAME.
- **N2. The shape identity test's key-set line holds by construction.** Accepted as documented, unchanged. My strict-schema negative control (6 of 6 refused) is what makes the check meaningful.
- **N3. Applicant-inserted sources can carry any label.** Accepted as documented (AS BUILT 19, for Phase 3). Observed again: inserted with status detected, cannot be stated (42501), cannot be confirmed (22023).
- **N4. stream_ref included the frequency.** Addressed. No source was duplicated across Plaid's staged delivery, and case F gave one source.
- **N5. Stale Argyle mention in COLLABORATION-1.md.** Addressed: the QA mandate reads "integration tests against the Plaid sandbox responses (bank and payroll)".
- **N6. Browser runs.** Superseded by N12.
- **N7. A restarted sender becomes irregular with old deposits counted.** Addressed (AS BUILT 20 and 22). The same mechanism now also lists the deposits before the first of two missed payments; see N20.
- **N8. A chance run makes an irregular sender regular.** Addressed. X13a (three irregular deposits, then three monthly ones, exactly half) was stored as irregular with all 6.
- **N9. AS BUILT 17's wording on merged senders.** Addressed; the wording is unchanged since the fourth vetting confirmed it.
- **N10. The integration test's N1 step confirmed as the owner.** Addressed. plaid.test.ts confirms through a reviewer's client and checks the audit row, and it passed in my run.
- **N11. Plaid's key endpoint.** Still observed, informational. My forgery with the kid an earlier vetting used ("6c5516e1-...-0001") was again recorded as bad_signature, meaning Plaid returned a key for it. Five others were unknown_key. All were rejected with 401.
- **N12. The uploader could hang.** Addressed for the uploader; see N16 for the bank connection.
  - Code: handle() wraps the upload in try/catch, and each of the three steps (ticket, storage PUT, ingest) races a 120 s timeout. Every failure sets an error state with role alert, and both buttons are enabled again.
  - Forced in a real browser, without changing any file. I used the production build on port 3100, signed in as VC, with Playwright request routing (06:39:33Z to 06:42:12Z):
    - a server action that throws (request aborted): after 0.1 s, "Something went wrong while sending your document. Check your connection, then try again.";
    - the storage PUT answering 500: after 8.6 s, "The upload did not finish. Check your connection and try again.";
    - the storage PUT connection failing: after 4.6 s, the first message;
    - a server action that never answers: "Reading paystub.png" was shown, then after 120.6 s, "This is taking too long. Check your connection, then try again. If the document was saved, it will show in your list."
    - In all four, "Take a photo" and "Choose a file" were enabled again.
  - Browser tests now run on a production build: in each of my three Playwright runs, .next/BUILD_ID was rewritten during the run (06:30:46Z, 06:33:56Z, 06:36:35Z). All three runs were clean (see SUITES).
- **N13. The stored rule label is stale.** Addressed. All 33 stream payloads say "PHASE-2-SPEC recurring transfer rule v3 (AS BUILT 22)".
- **N14. The integration teardown left one auth user.** Addressed. tests/isolation/env.ts has deleteUserOrThrow, which retries and throws if the user remains, and every integration and e2e teardown uses it. After my integration run, 0 int-* users remained.
- **N15. A misleading message.** Addressed. A second confirm now returns 22023 "this source has already been decided". An unstated source still returns "the family has not stated what this is yet".

## NEW OBSERVATIONS (not checklist failures)

- **N16. The bank connection has no stall timeout.** AS BUILT 23 says the uploader and the bank connection both end "a step that does not answer within 120 s" in a message. In components/ingestion/bank-connect.tsx, startBankConnection and finishBankConnection each have a .catch, so a thrown request ends in a message. But neither is raced against a timeout. A server action that never answers leaves the button on "Connecting…" and disabled for good. This is a code read; I did not force it. Either add the timeout or correct AS BUILT 23.
- **N17. Semi-monthly read as biweekly across a month end (X12b).** isSemiMonthly clusters days of the month on a straight line. So a "1st" paid on the 31st of the previous month breaks the cluster, and the sender falls through to biweekly, whose band (12 to 16 days) also fits 15- and 16-day gaps. Count, average, and dates were right, and nothing was listed, but annualizing at 26 periods instead of 24 overstates by 8.3 percent. Consider treating the day of the month as circular.
- **N18. Cadences outside the four frequencies.**
  - A sender every 28 days was stored as monthly (12 periods instead of 13, −7.7 percent).
  - A sender every 60 days was surfaced as irregular when its last deposit was 40 days ago, and not surfaced at all at 50 days ago. That follows AS BUILT 17's 45-day rule, so about a quarter of the time such a sender is not asked about.
  - The spec's detection names only weekly, biweekly, semi-monthly, and monthly, so these are documented limits. Flag them for the Regulatory Compliance Verification Skill before Phase 3 annualizes anything.
- **N19. A schedule switch counted as a missed payment (F).** The last 14-day gap of the old biweekly schedule was taken as a missed weekly payment. The weekly stream therefore starts two biweekly-era deposits early (count 16, missed_payments 1). The frequency and average are right. The reviewer will see a miss that did not happen.
- **N20. Two missed payments (X7a, X7b).** AS BUILT 22 says two misses are not bridged. In practice the later miss is bridged, and the deposits before the earlier miss are listed as if the sender restarted. The frequency and average were right in both cases, but missed_payments says 1 when 2 were missed. Consider documenting this outcome, or recording both misses.
- **N21. A stream that stops qualifying on a later read is never removed.** This is a code read of plaid.ts ingestItem: it only upserts the streams detected now. A source written at an early stage of Plaid's staged delivery, whose sender no longer qualifies once the full history arrives, keeps its early figures and its stored stream. In my data every stored source matched the final prediction and none was stale, so this was not observed.
- **N22. document-ingest's "already read" check is not atomic.** This is a code read: the status is checked, then set to processing, in separate statements. My concurrent double call got 200 and 409 and one record, so it was not reproduced. Consider a conditional update (status in uploaded or failed, returning the row) as the claim.

## SUITES RUN BY THE VETTER

- `npm test` (05:57:25Z to 05:57:49Z): "Test Files 7 passed (7)", "Tests 150 passed (150)".
- `npm run test:integration` (06:22:57Z to 06:26:51Z, first attempt, no retry): "Test Files 3 passed (3)", "Tests 21 passed (21)".
- `npm run test:isolation` (06:27:12Z to 06:29:34Z): "Test Files 1 passed (1)", "Tests 29 passed (29)". Report isolation-2026-10-01T06-27-22-762Z.json: total 340, passed 340, failed 0. The two agree.
- Playwright 1.60.0, production build, app on port 3100, workers 1:
  - `npm run test:e2e` (06:30:04Z to 06:32:49Z): "4 passed (2.6m)".
  - `npm run test:theming`, full run 1 (06:33:16Z to 06:35:48Z): "9 passed (2.4m)".
  - `npm run test:theming`, full run 2 (06:35:59Z to 06:38:22Z): "9 passed (2.2m)".
  - Each run logged the known SEC-P2-07 "The destination stream closed early" once from the web server.
- Port 3000 (the user's other project, pid 19508) was listening before and after, and was not touched. Port 3100 was free before each Playwright run and after it. For the N12 probe I started my own production server on 3100 (pid 10992) and stopped only that process afterwards; 3100 was then free.

## TEST DATA AND CLEANUP

**Baseline** at 05:53:48Z, 2026-10-01, before anything I ran:
- tenants 1 (cedar-row), programs 3, program_rule_sets 3, ami_schedules 6
- theme_configs 1, properties 2, property_programs 3
- users 1, applicants 1, household_members 1, auth.users 1
- 0 in each of: income_sources, income_records, asset_records, provider_connections, applicant_documents, calculated_determinations, generated_documents, workflow_state, audit_log, webhook_events
- storage objects 0; storage buckets 2
- Vault secrets cron_secret, functions_base_url, pii_key, provider_token_key; cron job ingestion-retry every 5 minutes, active
- 16 migrations, the latest 20261001001600
- MD5 hashes, by my own method (rows as JSON, sorted): applicants c323ca67…, users 0451e736…, household_members 4eac1c40…, auth.users (id and email) 4551537a…, tenants 6471601a…, theme_configs 43394d20…, properties 2e0f6ee6…, program_rule_sets d513899f…, property_programs ae398004…, ami_schedules 7d995156…, programs b00ee8e8…

The builder's report of 0 webhook_events and one real user matched.

**What I created:**
- tenant vet6-probe, with its theme, property, and program link
- 7 auth users: VA1, VA2, VA3, and VC (cedar-row applicants), VR (cedar-row reviewer), VB (vet6-probe applicant), and VRB (vet6-probe reviewer), with 5 applicants and 5 household members
- 5 provider_connections: three bank links, VA2's payroll link, and VB's link_started row from a control call
- 39 income_sources and 39 income_records: 33 detected streams, 1 payroll source with 2 records, 4 documents, and 1 N3 source with no record
- 3 asset_records, 5 applicant_documents, and 5 storage objects
- 3 audit_log rows
- 28 webhook_events: 16 genuine events on my items, and my 12 forgeries
- no other rows: the uploader probe created none, and the suites cleaned up after themselves

**Cleanup**, 06:45:20Z to 06:47:07Z:
- The 4 Plaid items (including the payroll user) were removed through plaid-sandbox "remove", with the owning applicant's token, and confirmed by ITEM_NOT_FOUND. The link_started row had nothing at Plaid.
- I waited 15 s, then removed the 5 storage objects and deleted every row above: audit_log 3, income_records 39, income_sources 39, asset_records 3, applicant_documents 5, provider_connections 5, household_members 5, applicants 5, and webhook_events 28 (16 + 12). The counts deleted were exactly the counts created.
- The 7 auth users were deleted, and their public.users rows went with them.
- The vet6-probe tenant, theme, property, and program link were deleted.

**After cleanup**, at 06:47:24Z, after a further 60 s wait for late webhooks: all 38 compared values are identical to the baseline, with 0 differences. That covers every table count, auth.users 1, storage objects 0 and buckets 2, webhook_events 0, the Vault secret names, the cron job, the migration list, and all eleven hashes.

The real applicant's data was read only as counts and hashes, and never modified. No password, key, or token was printed or written: my test users' passwords were derived in memory for each script.

My temporary scripts are in the session scratchpad, outside the repository, and are deleted. The working tree is clean apart from this file and the ignored artifacts the suites write (test-results, isolation reports, theming screenshots, .next). PHASE_2_REWORK.md to PHASE_2_REWORK_4.md are untouched. PROCESS-RULES.md was not marked.
