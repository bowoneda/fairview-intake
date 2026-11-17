# PHASE_2_REWORK_8.md — Project 1: Fairview Compliance Intake Platform

This is the eighth Phase 2 gate result. It comes from the re-vet after rework 7, commit 35e2cf4. An independent Master Vetting sub-agent wrote it on 2026-10-02. It built no part of Phase 2.

Before running anything, it read these in full:
- CLAUDE.md, MEMORY.md, COLLABORATION-1.md, MASTER-VETTING-SKILL.md, and PROCESS-RULES.md;
- PHASE-2-SPEC.md, including the ITEM 5 ACCEPTANCE BAR and AS BUILT 1 to 26;
- PHASE_2_REWORK.md to PHASE_2_REWORK_7.md;
- RULES.md, the Phase 2 parts of SECURITY.md, MASTER-SPEC-1.md (data model and Milestone 2), TESTS.md, and DESIGN.md's Income and Documents steps;
- the code: supabase/functions/_shared/ (recurring.ts at rule v4.2, plaid.ts, plaid-verify.ts, normalized.ts, and the rest), every function's index.ts, the 16 migrations, components/ingestion/, app/[tenant]/apply/ingestion-actions.ts, playwright.config.ts, and the tests.

The builder's reports, commit messages, MEMORY.md, SECURITY.md, and the AS BUILT claims were treated as leads only.

All evidence below was produced in this session, against fairview-dev (ref mdatwozuqdiwioezalom), its deployed Edge Functions, the real Plaid Sandbox, and real AWS Textract (eu-west-1). Times are UTC, read from the database clock.

**Deployed code equals the commit.** I downloaded all six deployed functions with the repository's own Supabase CLI (functions download --use-api), each into its own scratch folder. I compared the 48 downloaded source files, including each function's _shared bundle, with HEAD 35e2cf4: 0 differ. Every bundle that includes recurring.ts carries "rule v4.2 (AS BUILT 26)". Deployed versions: document-ingest 2, plaid-link-token 11, plaid-exchange 11, plaid-sandbox 15, plaid-webhook 14, ingestion-retry 12. The live catalog lists 16 migrations, the latest 20261001001600. Since 7e2c653, nothing under components, app, lib, supabase/migrations, or normalized.ts has changed (git diff is empty). The working tree was clean.

**Interruption.** This machine slept from about 21:24Z on 2026-10-01 to 05:41Z on 2026-10-02, during my first integration run. That run is counted as not run (see SUITES), and I cleaned up what its stalled teardown left (see N33). All Plaid bank evidence for item 5 was produced and read before the interruption, at the as-of date 2026-10-01.

## Gate result: NOT COMPLETE

- 11 items PASS.
- 1 item FAILS: item 5 (medium).
- None BLOCKED.

I judged item 5 against PHASE-2-SPEC.md's ITEM 5 ACCEPTANCE BAR, exactly as written. Rule v4.2 fixed what it set out to fix:
- The seventh vetting's F1 to F5 shapes, on my own values, are now surfaced and flagged frequency_ambiguous, as the short-series limit describes. So is a 5-deposit semi-monthly sender.
- Every clean weekly, biweekly, monthly, and exact-day semi-monthly input I swept is exact and unflagged at 6 or more deposits (weekly and monthly from 3).
- Every earlier family, including amount changes, was surfaced live with the right flags and a complete deposit list.
- In 28,903 random senders run locally (two seeded runs), none that qualified was dropped and every deposit list was complete.

Item 5 still fails, for two reasons:
1. **Clean semi-monthly senders with 6 or more deposits, paid on the previous or next business day, can be stored as biweekly with no flag.** The short-series limit covers fewer than 6 deposits only. Rule v4.1 introduced this, rule v4.2 left it unchanged, and the seventh vetting's "To pass" asked for it. I reproduced it on the real Plaid Sandbox.
2. **On the real Plaid Sandbox, two qualifying senders went missing after every webhook had been processed.** Nothing failed, and nothing was due to retry. For 10 minutes the connection read "ingested" without them, until I fired another webhook myself. The documented N28 limit covers only an update that fails and is then retried.

Everything else passes on my own probes. That includes item 10 and N1 as real users, 14 forgeries, cross-tenant access, the PII scan and token grants, Textract, payroll, N16 in a real browser, N21, and N22.

Do not write PHASE_2_COMPLETE.md until item 5 meets the bar and is vetted again. The fix will touch recurring.ts and probably plaid.ts's ingestItem, which the webhook, retry, and sandbox paths share. So the next vet should re-observe at least items 1, 5, 7, 8, and 10, plus the genericization check.

## FAILING ITEMS

### Item 5, FAIL, medium

[ ] Plaid transaction classification identifies recurring peer to peer income transfers in a sandbox account and produces a recurring transfer income source.

**How I tested.**
- **Local sweeps of the committed recurring.ts** (Node 22, strip-types), at every as-of date from 2026-01-01 to 2027-03-31, ending each series on the latest scheduled date (so no payment was missing):
  - weekly on each weekday (3, 4, 5, 8, 13, 20, 26 deposits);
  - biweekly at 14 alignments (3 to 13 deposits);
  - semi-monthly on 80 day pairs, each pair 13 to 17 days apart, with "last day" for 29 and over (3 to 12 deposits);
  - monthly on the 1st, 2nd, 5th, 10th, 15th, 20th, 25th, 28th, 29th, 30th, and 31st (clamped to the month end) (3 to 6 deposits).
  - Each was run exact, and with weekend dates moved to the previous business day or to the next one. I then ran a holiday-aware version (US federal holidays) at the live as-of date.
  - For the shifted long semi-monthly series, I ran rule v4 (b43adf1) and rule v4.1 (7e2c653) on the same inputs for comparison.
- **Random hunts**: 28,903 senders in two seeded runs (seeds 7 and 99), plus two shorter runs (seeds 3 and 5) for examples, each built from a schedule, then given a missed payment, an extra deposit, a late deposit, an amount change, or a stop. I checked for drops, incomplete deposit lists, and unflagged streams whose frequency or count was wrong.
- **The real Plaid Sandbox.** Three custom users, one checking account each, with 57 senders: 20, 23, and 14. Each account also held noise: 12 biweekly payroll deposits, 5 rent outflows, and 1 Venmo outflow.
  - Before linking, I predicted every sender locally (prediction file written before the link).
  - I linked them through the deployed plaid-sandbox (action "link") as cedar-row applicants VA1, VA2, and VA3, at 20:57:13.8Z, 20:57:13.9Z, and 20:57:14.1Z. Each returned 200 awaiting_data.
  - I polled every 4 s until every item had HISTORICAL_UPDATE processed and nothing changed for 75 s. Then I waited for VA1's failed event to be retried (see N28) and read the final state at 21:00:24Z.
  - I repeated VA2's account exactly as VA5 (linked 21:01:15Z, final read 21:03:17Z).
  - Every stored source was matched to my sender by recomputing its stream_ref from Plaid's account id, the app, and the sender.

**Live results (VA1 and VA3 read 21:00:24Z; VA5 read 21:03:17Z).**
- VA1 (20 senders), VA3 (14 senders), and VA5 (VA2's 23 senders) equal the local prediction exactly: frequency, average, count, first and last dates, missed payments, ambiguity, and deposit count. That is 57 of 57 checks. No stored source was unmatched.
- For every stored stream:
  - the deposit list equals my input in the lookback, by date and amount;
  - transaction_ids plus excluded_transaction_ids equal the deposits' ids, and the in_stream flags agree;
  - the count and average recompute from the in-stream deposits.
- For every record:
  - gross_pay equals the average, and pay_frequency equals the frequency;
  - the period and pay dates equal the stream's dates;
  - provider_record_ref is "stream:" plus the stream_ref;
  - the rule label is "PHASE-2-SPEC recurring transfer rule v4.2 (AS BUILT 26)", with as_of 2026-10-01;
  - the review reasons equal the status reason, plus irregular_pattern and schedule_ambiguous where the ambiguity requires them.
- VA2 differed from the prediction in exactly two senders; see failure 2.

**Failure 1: clean long semi-monthly series shifted to a business day are read as biweekly, unflagged.**

Live, final read 21:00:24Z:

| Case | My input | Bar | Stored |
|---|---|---|---|
| H1, semi-monthly on the 3rd and 18th, next business day (July 3 holiday, weekends), 6 deposits | Zelle from Kim Nash, 360.00 on 07-06, 07-20, 08-03, 08-18, 09-03, 09-18 | point 1: semi_monthly, exact, unflagged (6 deposits, so outside the short-series limit) | **biweekly**, 360.00, count 6, ambiguity [], reasons ["awaiting_family_statement"] |

Annualized at 26 periods instead of 24, H1 would overstate by 8.3 percent (9,360.00 instead of 8,640.00). After VA1 stated own_account_transfer, the record read ["awaiting_review"]: a reviewer sees no flag.

Local breadth (weekend shifts only; 6 to 12 deposits):

| Clean input | Cases | Biweekly, unflagged | Flagged true tie (documented) | Flagged with another reason |
|---|---|---|---|---|
| semi-monthly, 80 pairs, previous business day | 219,427 | 493 | part of 566 | part of 12,480 |
| semi-monthly, 80 pairs, next business day | 219,415 | 712 | part of 566 | part of 12,480 |
| of these, the 9 common pairs (1st/15th, 1st/16th, 15th/last, 2nd/16th, 3rd/18th, 5th/20th, 6th/21st, 7th/22nd, 10th/25th) | 56,435 | **300** | 97 | 0 |

- Examples, all unflagged biweekly:
  - 15th and last day, previous business day: 2025-12-31, 01-15, 01-30, 02-13, 02-27, 03-13 at as-of 2026-03-13.
  - 1st and 15th, previous business day: 2026-01-01, 01-15, 01-30, 02-13, 02-27, 03-13.
  - 1st and 15th, next business day: 2026-08-03, 08-17, 09-01, 09-15, 10-01, 10-15 at as-of 2026-10-15.
  - 15th and last day, next business day, 8 deposits: also read biweekly (17 cases).
- None of the weekend-only cases fell on the live as-of date. H1 is the holiday-aware case that does.
- **Rule comparison** on the same 438,842 inputs: rule v4.1 gives the identical 1,205 unflagged biweekly readings. Rule v4 gives 97, none of them on the common pairs. Rule v4.2 changed only the under-6 path (git show 35e2cf4), so this is the v4.1 tie-break regression, still present at 6 or more deposits.
- **Cause, from the code** (recurring.ts at 35e2cf4, bestRegularRun, lines 259 to 269). When semi-monthly and biweekly both give a run of the same length, the smaller deviation wins. A business-day shift spreads a semi-monthly run's days of the month (the semi-monthly deviation rises), while the shifted dates can happen to sit closer to 14 days apart. Only an exact tie (sd === bd) or a short series is flagged. At 6 or more deposits, a non-tied pick is stored unflagged.

**Failure 1b, lower weight: clean shifted series flagged with reasons that are not listed limits.** 12,480 of the clean shifted inputs above are flagged irregular_pattern, missed_payment, or deposits_left_out. A shift stretches a gap past a band edge, so software records a missed payment that did not happen, or breaks the run. All 12,480 are on less common pairs: 17-day pairs (for example the 1st and 18th), pairs whose later day is the 28th with next-business-day shifts, and the 12th and last day. Rule v4 flags the same 12,480. Live:
- H2, Venmo from Lou Ames, 199.00 on the 12th and last day, previous business day (07-10, 07-31, 08-12, 08-31, 09-11, 09-30): stored semi_monthly, count 6, **missed_payments 1**, flagged missed_payment. Nothing was missed.
- H3, Cash App from Mia Ross, 225.00 on the 5th and 18th, next business day: the same.
Under the bar, these are "a clean input ... which is flagged". They are not silent misreads, though, and the user may prefer to list them as limits.

**Failure 2: qualifying senders not surfaced after Plaid's last webhook.**

| Time | VA2 state |
|---|---|
| 20:57:16.6Z to 20:57:20.0Z | 4 genuine webhooks received: INITIAL_UPDATE, SYNC_UPDATES_AVAILABLE, HISTORICAL_UPDATE, SYNC_UPDATES_AVAILABLE, all signature_valid true |
| 20:57:32.9Z | the last one processed, attempts 1; none failed, so nothing was due to retry |
| 20:57:33Z to 21:07:36Z | connection "ingested", 20 sources and 20 records; checked again at 21:00:24Z and 21:06:45Z |
| 21:07:20Z | I fired SYNC_UPDATES_AVAILABLE through plaid-sandbox |
| 21:07:36.8Z | processed; 2 sources added |

- The two missing senders:
  - P: Cash App from Abe Colt, 545.00 every 30 days, last 09-27, plus 385.00 on 09-29;
  - X5: Venmo from Jo Lamm, 81.00 every 14 days to 09-09.
- Both qualify under the bar, with deposits 2 and 22 days before the as-of date.
- After my fire, they appeared exactly as predicted: P monthly 545.00, count 6, deposits_left_out; X5 irregular, 81.00, count 12, irregular_pattern. So Plaid had the data. The same account linked again as VA5 surfaced all 22 senders on its own.
- **Probable cause, from the code and the timeline.** ingestItem runs inline for every webhook, with nothing serializing runs for one item. Each run deletes "stale" sources that are still awaiting the family's statement and absent from its own read (AS BUILT 24, N21).
  - A run that read only Plaid's first stage, which holds the last 30 days, sees P with 2 deposits and X5 with 1. Neither qualifies there.
  - So it deletes them if a concurrent full-history run has already written them. The full-history runs do not re-create them.
  - The same race was visible on VA1. Its SYNC event failed with last_error "stale_source_delete", which left a source with no record from 20:57:32Z until the pg_cron retry at 21:00:12Z (attempt 2). That one is the documented N28 shape.
  - VA2's race finished without an error, so nothing retried.
- In production, the next Plaid update would probably restore the senders. In this Sandbox, and after Plaid's last webhook anywhere, the final state lacks them. Under the bar, this is "a qualifying sender that is not surfaced". The N28 limit covers only a failed update that the 5 minute job retries.

I rate it medium, as before. Nothing becomes income without the family's statement and a reviewer's decision. But Phase 3 relies on an unflagged stream being exact, and a common semi-monthly payer paid on business days can be stored unflagged with the wrong number of periods per year. And a sender that is never surfaced is never asked about.

**To pass:**
- A clean semi-monthly sender with 6 or more deposits, paid on the previous or next business day (weekends and holidays), is stored as semi_monthly, exact and unflagged. At the least, it must be flagged whenever the semi-monthly/biweekly choice is decided by deviation rather than by length. Rule v4 read every common-pair case correctly; that must not regress. If the user decides business-day-shifted series are not clean inputs, the user records that in the bar, and every such non-tied pick is flagged.
- Either clean shifted series on less common pairs (failure 1b) are stored clean, or the user lists them as a limit.
- Concurrent ingestion of one item never ends with a qualifying sender removed, for example by serializing ingestItem per connection, or by not removing stale sources on a read that is not the complete history. Alternatively, the user documents this as a limit with a mechanism that re-reads after Plaid's last webhook.
- Every clean input in the four frequencies stays exact and unflagged, apart from listed limits. Every earlier shape still meets the bar.
- The choice stays deterministic and is documented in PHASE-2-SPEC.md AS BUILT.
- The unit tests and the plaid-sandbox integration test drive a 6-or-more-deposit business-day-shifted semi-monthly sender like H1, and concurrent webhooks on one item.

**What met the bar, stored on the real Plaid Sandbox** (VA1 and VA3 read 21:00:24Z, VA2 and VA5 read 21:00:24Z and 21:03:17Z). Each was surfaced, with needs_review true and every deposit listed. Each regular flagged stream carries schedule_ambiguous, and each irregular one carries irregular_pattern.

The seventh vetting's failing shapes, now under the short-series limit:

| Case | My input | Stored (proposal) | Ambiguity |
|---|---|---|---|
| F1 | Zelle from Rho Tam, 255.00 on 08-31, 09-15, 09-30 (15th and last day) | semi_monthly 255.00, count 3 | frequency_ambiguous |
| F2 | Venmo from Sid Ulm, 175.00 on 08-20, 09-05, 09-20 | semi_monthly 175.00, count 3 | frequency_ambiguous |
| F3 | Cash App from Tov Vey, 265.00 on 08-16, 09-02, 09-16 | semi_monthly 265.00, count 3 | frequency_ambiguous |
| F4 | Zelle from Uma Wix, 505.00 on 08-05, 08-20, 09-04, 09-18 (5th and 20th, previous business day) | biweekly 505.00, count 4 | frequency_ambiguous |
| F5 | Cash App from Val Yor, 86.00 every 14 days to 09-09 (next payment 8 days overdue) | semi_monthly 86.00, count 4 | frequency_ambiguous |
| F6 | Venmo from Kay Lund, 140.00 on the 1st and 16th, 5 deposits | semi_monthly 140.00, count 5 | frequency_ambiguous |

Clean inputs outside the limits, all exact and unflagged, with every deposit in the stream:

| Case | Input | Stored |
|---|---|---|
| L1 | biweekly 96.50, 13 deposits to 09-24 | biweekly, count 13 |
| L2 | semi-monthly 310.00 on the 1st and 15th, 12 deposits, 04-15 to 10-01 | semi_monthly, count 12 |
| L3 | semi-monthly 275.00 on the 15th and last day, 12 deposits | semi_monthly, count 12 |
| L4 | semi-monthly 520.00 on the 5th and 20th, previous business day, 11 in the lookback | semi_monthly, count 11 |
| L5 | monthly 415.00 at month end, previous business day (05-29), 6 deposits | monthly, count 6 |
| L6 | weekly 48.25, 26 Wednesdays | weekly, count 26 |
| L7 | weekly 61.00, 3 deposits | weekly, count 3 |
| L8 | monthly 330.00 on the 15th, 3 deposits | monthly, count 3 |
| L9 | monthly 201.99 on the 2nd, 5 in the lookback | monthly, count 5 |
| L10 | biweekly 72.00, 6 deposits | biweekly, count 6 |
| L11 | semi-monthly 230.00 on the 10th and 25th, next business day, 12 deposits | semi_monthly, count 12 |
| MEMO | Cash App from Ora Quin, 98.00 monthly, memo alternating | monthly, count 6 |
| RIB | Zelle from Xia Yoo, 200.00 × 3 then 280.00 × 3 (N29 limit) | monthly 240.00, count 6 |

Earlier families, flagged with every deposit listed:

| Case | My input | Stored (proposal) | Ambiguity |
|---|---|---|---|
| A | Venmo from Uli Vant, 145.00 every 30 days (6), plus 145.40 on 07-16 | monthly 145.00, count 6 | deposits_left_out |
| B | Zelle from Bo Wynn, 67.00 every 14 days (13), plus 67.10 on 06-11 | biweekly 67.00, count 13 | deposits_left_out |
| E | Venmo from Wes Yan, 315.00 every 30 days (5), plus 195.00 | monthly 315.00, count 5 | deposits_left_out |
| F | Zelle from Xan Zort, 46.00 biweekly to 06-19, then weekly | weekly 46.00, count 16, missed 1 | deposits_left_out, missed_payment (N19) |
| G | Venmo from Yul Abby, 425.00 every 30 days, plus 285.00 three days after one | monthly 425.00, count 6 | deposits_left_out |
| I | Zelle from Zoe Bart, 262.00 on the 6th and 21st (12), plus 172.00 | semi_monthly 262.00, count 12 | deposits_left_out |
| P | Cash App from Abe Colt (failure 2; after the re-sync) | monthly 545.00, count 6 | deposits_left_out |
| V1 | Venmo from Bea Dahl, varying 170 to 255 on the 22nd, plus 215.00 | monthly 214.17, count 6 | deposits_left_out |
| V2 | Zelle from Cy Eddy, varying 305 to 370 on the 26th, plus 335.00 on 09-29 | monthly 338.33, count 6 | deposits_left_out |
| Gift | Venmo from Di Fenz, 165.00 monthly, plus 860.00 | monthly 165.00, count 6 | deposits_left_out |
| M1 | Cash App from Ed Gall, 112.00 biweekly, one missed | biweekly, count 12, missed 1 | missed_payment |
| M2 | Venmo from Fay Hume, 41.00 weekly, one missed | weekly, count 25, missed 1 | missed_payment |
| X2 | Zelle from Gil Irvy, 37.00 weekly, one missed, plus 37.20 on 06-30 | weekly 37.02, count 13, missed 1 | deposits_left_out, missed_payment |
| X3b | Cash App from Hy Jent, 157.00 biweekly, one missed, plus 100.00 | biweekly 157.00, count 9 | deposits_left_out |
| X4 | Venmo from Ian Kerr, 55.00 weekly to 09-19 (latest missing) | biweekly 55.00, count 13 | deposits_left_out |
| X5 | Venmo from Jo Lamm (failure 2; after the re-sync; VA5 the same) | irregular, count 12 | irregular_pattern |
| X15 | Zelle from Kit Moor, 392.00 monthly, one missed, plus 257.00 on 04-20 | monthly 365.00, count 5, missed 1 | deposits_left_out, missed_payment |
| X16 | Cash App from Pat Rusch, 387.00 monthly, one missed, plus 262.00 | monthly 362.00, count 5, missed 1 | deposits_left_out, missed_payment |
| Two misses | Venmo from Liv Nunz, 93.00 biweekly, two missed | biweekly, count 8, missed 1 | deposits_left_out, missed_payment (N20) |
| Irregular | Zelle from Max Odom, 73.00 on 7 irregular dates | irregular, count 7 | irregular_pattern |
| LATE | Zelle from Ned Pratz, 53.00 weekly, 07-01 paid 07-04 | irregular, count 26 | irregular_pattern (N26) |
| R1 raise | Zelle from Ola Quam, 212.00 × 4 then 462.00 × 2 | monthly 295.33, count 6 | amount_changed |
| R3 cut | Cash App from Pip Rowan, 522.00 × 4 then 212.00 × 2 | monthly 418.67, count 6 | amount_changed |
| R4 monthly to weekly | Venmo from Que Samm, 482.00 × 5 then 66.00 weekly × 5 | weekly 66.00, count 5 | deposits_left_out |
| Raise plus gift | Zelle from Ray Tobb, 222 × 4, 472 × 2, plus 1000.00 | monthly 305.33, count 6 | deposits_left_out, amount_changed |
| Raise long ago | Venmo from Sal Ueno, 192 × 2 then 432 × 4 | monthly 432.00, count 4 | deposits_left_out |
| Weekly to monthly | Cash App from Tab Ulam, 61.00 weekly × 8 then 502.00 × 2 | irregular 149.20, count 10 | irregular_pattern, amount_changed |
| Old amount returns | Zelle from Uri Vost, 200, 200, 450, 450, 200, 200 | irregular 200.00, count 4 | irregular_pattern, deposits_left_out |
| Three amounts | Venmo from Vi Wolf, 51, 301, 1201 monthly | monthly 517.67, count 3 | amount_changed |
| Stopped, one new | Venmo from Wil Xue, 101.00 × 4 to 07-05, then 301.00 on 09-25 | irregular 141.00, count 5 | irregular_pattern, amount_changed |
| Semi plus extra | Venmo from Zed Amos, 131.00 on the 5th and 20th × 8, plus 131.00 on 09-08 | semi_monthly, count 8 | deposits_left_out |
| Biweekly raise | Cash App from Abe Foxx, 80.00 × 8 then 140.00 × 5 | biweekly 103.08, count 13 | amount_changed |
| Semi-monthly cut | Zelle from Bev Gray, 300.00 × 8 then 120.00 × 4 | semi_monthly 240.00, count 12 | amount_changed |
| Weekly raise | Venmo from Cole Hart, 40.00 × 15 then 90.00 × 10 | weekly 60.00, count 25 | amount_changed |

- STOP (Cash App from Yan Zelk, monthly to 08-03, 59 days before as-of) was not surfaced: the documented "stopped" limit.
- 0 sources came from the 48 payroll deposits and 24 outflows.

**Breadth, from the local sweeps (rule v4.2).**

| Clean input | Cases | Not exact |
|---|---|---|
| weekly, exact / previous / next business day | 21,840 each | 0 |
| monthly, exact / previous / next business day | 19,765 / 19,754 / 19,748 | 0 |
| biweekly, 6 to 13 deposits, exact / previous / next | 50,505 each | 0 |
| semi-monthly, exact days, 6 to 12 deposits | 219,625 | 0 |
| semi-monthly, shifted, 6 to 12 deposits | 438,842 | 14,251 (failure 1 and 1b; 566 are documented true ties) |
| biweekly, 3 to 5 deposits, every mode | 6,370 per length and mode | all flagged frequency_ambiguous, as the limit says |
| semi-monthly, exact days, 3 to 5 deposits | 31,850 per length | all flagged frequency_ambiguous, as the limit says |

**Random hunts** (28,903 senders in seeds 7 and 99; seeds 3 and 5 for examples):
- 0 qualifying senders dropped, 0 incomplete deposit lists, and 0 unflagged streams with a wrong frequency or a partial count.
- Unflagged perturbed inputs were all of three kinds:
  - in-band amount changes (N29), including a doubling at the band edge;
  - an extra deposit that fits the schedule;
  - a latest payment due within the activity window (N27).

## PASSING ITEMS

[x] Plaid sandbox integration functional, produces a normalized income_records entry.

- My bank links (VA1 to VA3 at 20:57:14Z, VA5 at 21:01:15Z) went from awaiting_data to ingested. 16 genuine Plaid-signed webhooks drove them, all signature_valid true.
- They produced:
  - 4 asset_records rows ("Vet Nine Checking VA1", "VA2", "VA3", and "VA5"), each with balance 3141.59 (my custom users' starting balance), a 4-digit mask, and account_number_encrypted null;
  - 78 income_sources and 78 income_records, ingestion_method plaid, before the re-sync.
- The rows match my inputs (item 5, apart from its failures), validate against the shared schema (item 8), and their tokens are encrypted (item 11).

[x] Payroll sandbox integration (Plaid Payroll Income; Argyle or Pinwheel as the listing names, if later added) functional, produces a normalized income_records entry of identical shape to the bank pipeline's output.

- plaid-link-token with product payroll_income returned 200 with a link-sandbox token (21:09:13Z).
- VA2's plaid-sandbox link with product payroll_income (21:09:23Z) returned 200: ingested, 2 stubs.
- A real INCOME.USER_INCOME_VERIFICATION webhook arrived at 21:09:19Z, signature_valid true, matched to the connection, and processed.
- The connection has product payroll_income, a Plaid user reference, and a 117-byte encrypted token with no plaintext.
- There are 2 income_records, ingestion_method plaid, source_type employment, source status detected, provider_record_ref set.
- Both pass the same strict schema as the bank and Textract rows (item 8).

[x] Textract Queries fallback pipeline functional against a sample scanned paystub, W-2, and Schedule C, each producing a normalized income_records entry of identical shape to the other two pipelines.

These were my own uploads into VA4's own folder, as VA4. The paystub went through a signed upload URL, as the UI does; the others went directly. Each was followed by an applicant_documents row written as VA4, then document-ingest with VA4's token.
- **Paystub** (21:10:26Z): 200 extracted, no reasons.
  - Fairview Parcel Services LLC, biweekly, rate 18.50, gross 1480.00, YTD 26640.00.
  - Period 2026-08-24 to 2026-09-06, pay date 2026-09-11, confidence 97.
  - Deduction total_deductions 276.02, which is 1480.00 minus net 1203.98.
- **W-2** (21:10:31Z): 200 needs_review (historical_annual). Gross 34120.50, annual, 2025-01-01 to 2025-12-31, confidence 99.
- **Schedule C** (21:10:37Z): 200 needs_review.
  - self_employment, Sample Lawn Care, gross 24800.00.
  - Deduction schedule_c_line_28_total_expenses 7350.00.
  - Reasons self_employment_net_income_phase3 and schedule_c_line_31:17450.00.
- Every value equals tests/fixtures/documents/expected.json.
- Stored raw_payload keys are answers and document_kind only. extracted_fields hold 10, 4, and 5 query aliases. No Blocks, Geometry, or BoundingBox is stored.
- **Two-page PDF** (21:10:40Z): 422 multi_page_pdf. The document is failed with that reason, and no record exists.
- **A text file uploaded as image/png** (21:10:43Z): 422 unsupported_type, failed, no record.
- **W-2 read again**: 409 already_processed.
- **No token**: 401. **Same-tenant applicant VC**: 404.
- **N22 concurrency** (21:10:52Z to 21:11:13Z), on fresh documents: two calls at once gave 200 and 409; two again gave 200 and 409; three at once gave 200, 409, and 409. One record each time.

[x] Payroll ingestion captures gross pay, pay frequency, YTD earnings, and deductions.

VA2's stored payroll rows:
- **Paid 2026-10-01:**
  - gross 2306.00, semi_monthly, rate 25.15;
  - YTD 2306.00 through 2026-09-30;
  - period 2026-09-16 to 2026-09-30;
  - deductions [taxes 1000.00].
- **Paid 2026-09-01:**
  - gross 2306.00, biweekly, YTD 2306.00 through 2026-08-31, period 2026-08-17 to 2026-08-31;
  - Social Security Tax 23.44, 401K 352.34, Medicare Tax 12.45, Dental Insurance 13.74, Federal Tax 612.91, State Tax 409.25.
- Each frequency is Plaid's own value for that stub (SEMI_MONTHLY and BIWEEKLY in pay_period_details).
- Both have needs_review true with variable_earnings:bonus,overtime.
- raw_payload keys are only deductions, document_id, earnings, employer, net_pay, pay_period_details, and source. employer is {name: "Platypus LLC"}. No employee, taxpayer, distribution, download, account, routing, ssn, or address string appears.

[x] Webhook signature verification present and tested for every webhook provider in use (Plaid, which serves both bank and payroll; and Argyle if later added), even in sandbox mode.

- **Forgeries** (21:12:11Z to 21:12:48Z). I sent 14 forged requests to plaid-webhook, each naming my real VA1 bank item, or my real payroll item and user. Each returned 401 {"error":"invalid_signature"}:
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
- **What was recorded.** Exactly 14 new webhook_events rows, each with signature_valid false, status rejected, provider_ref null, and a "rejected:" event id: missing_signature 1, malformed_signature 1, wrong_algorithm 4, missing_key_id 1, unknown_key 6, bad_signature 1. No valid row was added in that window.
- **Nothing was processed.** A snapshot of my five connections (status, error code, last event time, source and record counts, and the newest record time) was identical before and after. None moved to reauth_required or revoked.
- **Other method.** GET returned 405.
- **Valid path.** 21 genuine Plaid-signed events on my items were accepted and processed: 16 from the links, 4 that I fired, and the INCOME event.
- **Idempotency.** The catalog shows UNIQUE (provider, event_id). The stale-iat and tampered-body branches are unit tested in tests/unit/plaid-verify.test.ts, within my `npm test` run of 161.
- Argyle is not in use.

[x] Integration test suite covering all three ingestion paths.

`npm run test:integration`, run 2, 05:45:34Z to 05:50:11Z: "Test Files 3 passed (3)", "Tests 23 passed (23)".
- The files are plaid.test.ts, textract.test.ts, and shape-identity.test.ts.
- plaid.test.ts covers the bank path, the recurring cases including the rework 7 assertion, signed webhooks, retry, pg_net, forgeries, payroll, and cross-applicant access.
- Afterwards, auth.users held no int-* user and no int-* connection remained.
- Run 1 is counted as not run; see SUITES.

[x] Normalized income record shape identity test passes: one record from each pipeline validates against the single shared schema with an identical key set.

- The test (tests/integration/shape-identity.test.ts) passed inside my integration run 2.
- By hand, I rebuilt the normalized record from every stored row of my session (78 bank streams, 2 payroll stubs, 6 Textract documents). I validated each with normalizedIncomeRecordSchema from the committed normalized.ts:
  - all 86 valid;
  - each pipeline yields exactly one key set, equal to NORMALIZED_KEYS.
- The only other keys in raw_payload are per pipeline, and they are redacted (item 11). normalized.ts is unchanged since b43adf1.

[x] New Phase 2 tables have tenant_id and RLS in the migration that creates them; isolation suite extended to them and to the private document storage bucket, and passing.

- **Migration.** 20260928001000 creates provider_connections and applicant_documents with tenant_id and enables RLS with their policies in the same file. It also creates webhook_events with RLS and no policy, plus the storage policies.
- **Catalog** (05:53:08Z):
  - All 20 public tables have RLS on.
  - Policies: provider_connections 1, applicant_documents 2, income_sources 3, income_records 1, asset_records 3, and webhook_events 0. webhook_events has no tenant_id and grants only to postgres and service_role, the RULES.md exception.
  - The applicant-documents bucket is private, with a 10485760 byte limit and jpeg, png, and pdf only.
  - storage.objects has one INSERT and one SELECT policy, both for authenticated.
  - Both income_sources triggers are enabled.
- **Suite.** `npm run test:isolation`, 05:50:34Z to 05:52:41Z: "Test Files 1 passed (1)", "Tests 29 passed (29)".
  - Newest report, isolation-2026-10-02T05-50-44-329Z.json: projectRef mdatwozuqdiwioezalom, total 340, passed 340, failed 0.
  - My own recount is 340 entries, all with pass true, in 33 id groups including T1 to T5 (21 entries).
  - The summary and the report agree.
- **By hand** (21:13:26Z to 21:15:01Z). I probed as VB (applicant, second tenant vet9-probe), VRB (reviewer, vet9-probe), and VC (another cedar-row applicant), against VA4's W-2 and VA2's resources. I checked each user's JWT claims first.
  - document-ingest: 404 for VB and VC, 403 for VRB.
  - Storage:
    - download and createSignedUrl: "Object not found";
    - list: 0 objects;
    - upload, signed upload URL, and upsert-overwrite: "new row violates row-level security policy";
    - remove: 0 objects.
  - Selects of VA4's and VA2's applicants, household_members, provider_connections, applicant_documents, income_sources, income_records, and asset_records, and of cedar-row's audit_log: 0 rows each.
  - These calls against VA2's member or connection returned 404 for VB and VC and 403 for VRB: plaid-link-token, plaid-sandbox link, fire_webhook, remove, and plaid-exchange.
  - VB inserting a document row in its own tenant pointing at VA4's object: 23514. VB inserting one in cedar-row: 42501.
  - VB uploading under its own tenant prefix with VA4's applicant id: RLS violation.
  - VB writing VA2's statements: 0 rows. VB inserting an income_record for VA2: 42501.
  - anon: download "Object not found", list 0, and 42501 on income_records and provider_connections.
  - VA4's folder (names and update times), the W-2 status, and the vet9-probe prefix (0 objects) were unchanged.
  - Controls:
    - VA4 and same-tenant reviewer VR each downloaded the W-2 (90232 bytes).
    - VR saw VA4's 6 records.
    - VB got a link token for its own member (200).

[x] Recurring transfers follow PHASE-2-SPEC.md's rule: detected by software, stated by the family, confirmed by a reviewer; no transfer becomes income through software alone.

My probes ran from 21:05:58Z to 21:06:14Z, as real users. Every JWT claim had the right role and tenant.
- **Reviewer on an unstated source** (VA2's irregular stream, awaiting_family_statement):
  - VR writing family_statement: 42501 "only the applicant can give the family's statement".
  - confirm_income_source with a reason, for confirmed_income, confirmed_excluded, and dismissed: 22023 "the family has not stated what this is yet", all three.
  - Direct updates of status, source_type, connection_method, family_statement_at, and average_amount: 42501.
  - The source was unchanged, and audit_log stayed at 0.
- **Applicant limits** (VA2, own source): updating status, source_type, connection_method, average_amount, or frequency: 42501. Calling confirm: 42501 "staff only".
- **Other users:**
  - VC and VB writing VA2's statement: 0 rows.
  - VB confirming: 42501. VRB confirming: P0002 "source not found". VRB writing the statement: 0 rows.
  - VRB selecting VA2's sources and records, and VC selecting VA2's sources: 0 rows. Control: VR saw VA2's 20 records.
- **Positive path:**
  - VA2 stated regular_contribution: 1 row, status awaiting_review, family_statement_at 21:06:10.496Z. The record read right after had ["awaiting_review","irregular_pattern"], needs_review true (N1).
  - VR's confirm with a blank reason: 22023 "a reason is required". With outcome awaiting_review: 22023.
  - VR writing the stated statement: 42501.
  - VR confirmed confirmed_income with a reason. The record then had [] and needs_review false.
  - audit_log went from 0 to 1 row: actor VR, action confirm_income_source, target income_sources, before {status awaiting_review, family_statement regular_contribution}, after {status confirmed_income}, and the reason.
  - A second confirm: 22023 "this source has already been decided". A confirm on unstated M1: "the family has not stated what this is yet".
  - VA2 re-stating: 42501 "a statement can only be given while the source awaits one".
- **Flagged streams through statement and decision:**
  - G (schedule_ambiguous): after VA2 stated life_event_gift, ["awaiting_review","schedule_ambiguous"]. After VR confirmed_excluded, [].
  - R1 (amount_changed): after VA3's statement, ["awaiting_review","schedule_ambiguous"], left undecided.
  - F1 (frequency_ambiguous): stated, then dismissed by VR, giving [].
  - H1 (failure 1): stated, giving ["awaiting_review"], with no flag.
  - Three audit rows in all.
- **Re-ingest does not reset state.** At 21:07:13Z I snapshotted all 79 sources and records on my four bank items. At 21:07:18Z to 21:07:24Z I fired SYNC_UPDATES_AVAILABLE through plaid-sandbox on all four. All four were recorded, signature_valid true, and processed by 21:07:39Z.
  - I compared status, statement and its time, figures, reasons, needs_review, and raw_payload. **0 rows changed.**
  - The decided sources kept [].
  - VA2 gained the two senders of failure 2.
- **Stale removal (N21)**, in the same read. Before firing, I inserted, as owner, three recurring_transfer sources with records on VA3's connection, under stream references that Plaid's data does not contain:
  - the one awaiting the family's statement was removed with its record;
  - the stated one (awaiting_review) was kept with its record;
  - the confirmed one was kept with its record.

[x] No raw Textract response, SSN, or full account number is stored anywhere, confirmed by query; raw provider payloads are stored redacted; Plaid access tokens are encrypted and unreadable by any client role.

- **Scan** (21:16:06Z to 21:19:28Z). Present at the time: 88 income_records, 8 documents including 4 W-2s, and 5 encrypted tokens. I scanned all 84 text, varchar, JSON, array, and enum columns in 20 public tables, with these patterns:
  - SSN and masked SSN
  - EIN
  - runs of 9 to 17 digits
  - raw Textract keys (Blocks, BlockType, Geometry, DocumentMetadata, BoundingBox, Relationships)
  - the fixture person's name and street
  - payroll employee strings, taxpayer, account_number, routing, distribution, and download_url
  - plaintext Plaid access, public, and link tokens
  - all 57 of my sender names
  - positive controls: "Platypus LLC" and "Sample Lawn"
- **Result.**
  - The controls matched where expected (employer_name, raw_payload, extracted_fields, and the payroll source key).
  - Every other pattern had 0 hits, except digit runs.
  - Digit runs: hits only in hashes and ids (provider_record_ref, provider_stream_ref, webhook event ids, and stream ids inside raw_payload). Outside the stream payload, 0 records match. Outside transaction_id, 0 deposit entries match.
- **What is stored:**
  - Deposit entries hold only amount, date, in_stream, and transaction_id.
  - The bank raw_payload is {as_of, rule, stream}.
  - The payroll raw_payload holds the seven pay keys listed under item 4.
  - Textract raw_payload is {answers, document_kind}.
- **Encrypted columns.** ssn_encrypted and account_number_encrypted non-null: 0 each. No account_last_four is anything but 4 digits.
- **Tokens.** All 5 are 117 bytes, contain no plaintext, and decrypt (as owner, through read_provider_token) to an access-sandbox token.
- **Client access.** VA2, VR, and anon each got 42501 on all of:
  - selecting access_token_encrypted, `*`, or provider_user_ref from provider_connections;
  - read_provider_token and store_provider_token;
  - updating provider_connections;
  - selecting webhook_events.

  Controls: the permitted columns returned VA2's 3 connections and VR's tenant's 6. anon got 42501 there too.
- **Catalog.**
  - authenticated's SELECT columns on provider_connections exclude access_token_encrypted and provider_user_ref.
  - authenticated's only UPDATE column on income_sources is family_statement.
  - EXECUTE on read_provider_token, store_provider_token, encrypt_secret, decrypt_secret, and encrypt_pii is held by postgres and service_role only.

[x] Genericization check from RULES.md run, exact command as written there, no output.

I ran it at 21:19:45Z on 2026-10-01, from the repository root, at HEAD 35e2cf4 with a clean working tree. The command was read from RULES.md, section GENERICIZATION IS ENFORCED, NOT DECORATIVE, and run unmodified. It produced no output, exit code 1. I ran it again with this file present (untracked, so outside its scope): no output, exit 1. This file names none of the searched places.

## STATUS OF PRIOR OBSERVATIONS

### The 8 from PHASE_2_REWORK.md

1. **Bank deposit records not implemented.** Accepted as documented (AS BUILT 12). 48 payroll deposits produced no source.
2. **Records ignore confirmed status.** Addressed. 0 of 79 rows changed on re-ingest, and decided sources kept [].
3. **Applicants can relabel sources.** Addressed: source_type and connection_method updates give 42501. The residual is N3.
4. **webhook_events lacks tenant_id.** Addressed. The catalog matches RULES.md.
5. **Replay not tested end to end.** Still open, and a documented limit. Idempotency rests on UNIQUE (provider, event_id), seen in the catalog.
6. **Integration teardown leaks a row.** Addressed in a normal run: run 2 left nothing. My run 1 left 9 users after this machine slept; see N33.
7. **Sandbox items remain in Plaid.** Addressed. My removes returned 200, and a later fire returned ITEM_NOT_FOUND.
8. **Later-phase items unchanged.** Accepted as documented.

### N1 to N32

- **N1.** Addressed, observed as real users. The reasons were ["awaiting_review","irregular_pattern"] right after the statement and [] right after the confirm.
- **N2.** Accepted as documented; normalized.ts is unchanged.
- **N3.** Accepted as documented (AS BUILT 19). Not re-probed this session.
- **N4.** Addressed. Every stored source matched exactly one sender (0 unmatched).
- **N5.** Addressed.
- **N6.** Superseded by N12.
- **N7.** Addressed. X3b is judged by its current run, and the earlier deposits are listed.
- **N8.** Addressed. X5 was irregular with all 12 deposits.
- **N9.** A documented limit.
- **N10.** Addressed. The integration test confirms as a reviewer, and it passed.
- **N11. Plaid's key endpoint.** Still observed, informational. One forgery with an invented kid was recorded bad_signature, meaning Plaid returned a key for it; six others were unknown_key. All got 401.
- **N12.** Addressed. The uploader is unchanged; my e2e and full runs used fresh production builds.
- **N13.** Addressed. All 78 stream payloads carry the v4.2 label.
- **N14.** Addressed in normal runs. A teardown hook that times out never reaches deleteUserOrThrow (N33).
- **N15.** Addressed. "this source has already been decided".
- **N16.** Addressed, forced again in a real browser.
  - Setup: my own production server on port 3100, signed in as VC with genuine @supabase/ssr cookies. Playwright held every server action request unanswered.
  - At 06:01:17Z, 3 s after the click, the button read "Connecting…", disabled, with 1 request held.
  - At 06:03:15Z, after 121.5 s, the alert read "We could not start the bank connection. Check your connection, then try again.", and "Connect your bank" was enabled again.
  - I stopped only my own server (pid 21000) afterwards.
- **N17.** Addressed. Exact semi-monthly series spanning month ends were exact in every sweep at 6 or more deposits. Under 6, they are flagged, as the short-series limit says.
- **N18.** Accepted as a documented limit; not re-probed.
- **N19.** Accepted as a documented limit, and flagged (F recorded a miss).
- **N20.** Accepted as a documented limit, and flagged (two misses recorded as 1).
- **N21.** Addressed. Forced through a real signed webhook: only the unanswered stale source was removed. The same mechanism is behind failure 2 when runs overlap.
- **N22.** Addressed. In three concurrent trials, exactly one call succeeded each time.
- **N23.** Still observed, and longer than "a moment". VA1 had 20 sources and 19 records from 20:57:32Z to 21:00:12Z, because its failed SYNC event left the L5 source without a record until the retry (N28).
- **N24 and N25.** Documented limits. Not re-probed.
- **N26.** Documented limit; observed again (LATE was irregular and flagged).
- **N27.** Observed again in the random hunts: a latest payment due inside the activity window (for example monthly, 6 days overdue) stays clean and unflagged. Informational.
- **N28.** Observed again, and the cause is now visible. VA1's SYNC_UPDATES_AVAILABLE failed at 20:57:21Z with last_error "stale_source_delete". The pg_cron retry processed it at 21:00:12Z (attempt 2), restoring L5's record. That is the documented limit. Its silent variant is failure 2.
- **N29.** A documented limit; observed (RIB clean at a blended 240.00). The 50 percent band also admits a doubling: 128.94 × 4 then 257.88 × 6 biweekly is stored clean at a blended 206.30, 20 percent under the current amount.
- **N30.** The bar's wording now matches the rule. Observed: 566 true-tie flags among clean shifted long series.
- **N31.** Recorded; rule v4 is no longer in use.
- **N32. Environment.** Port 3000's listener was pid 3484 at about 21:20Z and pid 23048 at 06:03Z. I never touched port 3000.

## NEW OBSERVATIONS (not checklist failures)

- **N33. A sleep mid-run left integration leftovers.**
  - This machine slept from about 21:24Z to 05:41Z during integration run 1.
  - On resume, plaid.test.ts's afterAll timed out at 300 s, and one Textract upload failed with "fetch failed".
  - Left behind: 9 int-plaid users, 8 applicants, 10 connections, 25 records, 24 sources, 7 assets, 1 audit row, and 36 webhook_events.
  - Most items had already been removed at Plaid by the partial teardown (ITEM_NOT_FOUND). The one remaining payroll user I removed through plaid-sandbox, as its owner. To do that, I set that test user's password through the admin API, derived in memory, and deleted the user afterwards.
  - I then deleted the rows and users. Run 2 was clean.
  - A teardown that cannot finish leaves data behind. That is acceptable for dev, but worth knowing.
- **N34. 3- to 5-deposit biweekly senders are now always flagged.** Every clean biweekly or semi-monthly sender with fewer than 6 deposits gets frequency_ambiguous, as the bar now says. That is correct under the bar. It means every new biweekly sender in its first 10 weeks goes to review flagged.

## SUITES RUN BY THE VETTER

- `npm test` (21:20:04Z to 21:20:35Z): "Test Files 7 passed (7)", "Tests 161 passed (161)".
- `npm run test:integration`:
  - Run 1 (started 21:21:07Z): not run. The machine slept mid-run. It ended at 05:43:36Z with "Test Files 2 failed | 1 passed (3)", "Tests 1 failed | 22 passed (23)": the plaid.test.ts afterAll hook timed out, and a Schedule C upload got "fetch failed".
  - Run 2 (05:45:34Z to 05:50:11Z, no retry): "Test Files 3 passed (3)", "Tests 23 passed (23)".
- `npm run test:isolation` (05:50:34Z to 05:52:41Z): "Test Files 1 passed (1)", "Tests 29 passed (29)". The report isolation-2026-10-02T05-50-44-329Z.json gives total 340, passed 340, failed 0. My recount is 340 entries, all passing, in 33 groups. The two agree.
- Playwright 1.60.0, production build, app on port 3100, workers 1. Port 3100 was free before each run and after it.
  - `npm run test:e2e` (05:53:26Z to 05:55:49Z): "4 passed (2.2m)". BUILD_ID rewritten at 05:54:07Z.
  - `npm run test:theming`, full run 1 (05:55:59Z to 05:58:10Z): "9 passed (2.1m)". BUILD_ID rewritten at 05:56:29Z.
  - Full run 2 (05:58:21Z to 06:00:37Z): "9 passed (2.1m)". BUILD_ID rewritten at 05:59:04Z.
  - Each run logged the known SEC-P2-07 "The destination stream closed early" once.
  - I printed only summary lines, never trace contents or signed URLs.

## TEST DATA AND CLEANUP

**Baseline** at 20:36:20Z, 2026-10-01, before anything I ran:
- tenants 1 (cedar-row), programs 3, program_rule_sets 3, ami_schedules 6
- theme_configs 1, properties 2, property_programs 3
- users 1, applicants 1, household_members 1, auth.users 1, auth.identities 1
- 0 in each of: income_sources, income_records, asset_records, provider_connections, applicant_documents, calculated_determinations, generated_documents, workflow_state, audit_log, webhook_events
- storage objects 0; buckets applicant-documents and tenant-branding
- Vault secrets cron_secret, functions_base_url, pii_key, provider_token_key; cron job ingestion-retry every 5 minutes, active
- 16 migrations, the latest 20261001001600
- MD5 hashes (rows as JSON, sorted): applicants c323ca67…, users 0451e736…, household_members 4eac1c40…, tenants 6471601a…, theme_configs 43394d20…, properties 2e0f6ee6…, program_rule_sets d513899f…, property_programs ae398004…, ami_schedules 7d995156…, programs b00ee8e8…, auth.users (id and email) 4551537a…

The builder's report of 0 webhook_events and one real user matched.

**What I created:**
- tenant vet9-probe, with its theme, property, and program link
- 9 auth users:
  - VA1 to VA5 and VC (cedar-row applicants);
  - VR (cedar-row reviewer);
  - VB (vet9-probe applicant);
  - VRB (vet9-probe reviewer).
- 7 applicants and 7 household members
- 7 provider_connections:
  - 4 bank links;
  - VA2's payroll link;
  - VA2's link_started row from the payroll link-token call (it held a Plaid user);
  - VB's link_started row.
- 87 income_sources and 88 income_records:
  - 80 streams (78, plus the 2 from the re-sync);
  - 2 kept N21 fixtures (the third was removed by the function);
  - 1 payroll source with 2 records;
  - 6 document sources.
- 4 asset_records, 8 applicant_documents, and 8 storage objects
- 3 audit_log rows
- 35 webhook_events: 21 genuine and 14 forgeries
- The suites cleaned up after themselves, except run 1 (N33), which I cleaned up.

**Cleanup**, 06:04:45Z to 06:05:31Z:
- 6 removes through plaid-sandbox "remove" with the owning applicant's token, 200 each: the 4 bank items, the payroll item and user, and the Plaid user behind the link_started row. A fire_webhook on each bank and payroll item afterwards returned 502 ITEM_NOT_FOUND. VB's link_started row had nothing at Plaid.
- After a 15 s wait, I removed the 8 storage objects and deleted: audit_log 3, income_records 88, income_sources 87, asset_records 4, applicant_documents 8, provider_connections 7, household_members 7, applicants 7, webhook_events 35. Each count deleted equals the count created.
- The 9 auth users were deleted, and their public.users rows went with them. The vet9-probe tenant, theme, property, and program link were deleted.

**After cleanup**, read at 06:05:54Z: all 38 compared values are identical to the baseline, with 0 differences. That covers every table count, auth.users and identities, storage objects and buckets, webhook_events 0, the Vault secret names, the cron job, the migration list, and all eleven hashes.

The real applicant's data was read only as counts and hashes, and never modified. No password, key, or secret was written to any file. My test users' passwords were derived in memory. I printed no signed URL or trace content.

My temporary scripts were in the session scratchpad, outside the repository, and are deleted. One dot-prefixed temporary file in the repository root was created and deleted within one command. The working tree is clean apart from this file and the ignored artifacts the suites write (test-results, isolation reports, theming screenshots, .next). PHASE_2_REWORK.md to PHASE_2_REWORK_7.md are untouched. PROCESS-RULES.md was not marked.
