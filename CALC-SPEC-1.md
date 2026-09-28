# CALCULATION SPECIFICATION — Project 1: Fairview Income Determination Engine

Produced by: Regulatory Compliance Verification Skill, Phase 0
Feeds: DESIGN.md, TESTS.md
Re-checked by: Regulatory Compliance Verification Skill, Phase 3, against the actual built engine's actual output

## BASIS

The methodology below is drawn from the real federal rule governing income determination for HUD assisted housing programs, 24 CFR 5.609, HUD Occupancy Handbook 4350.3, and the HOTMA (Housing Opportunity Through Modernization Act) revisions to asset income treatment. The jurisdiction, agency name, and form names are fictional, invented for this build under the genericization rule in the master specification. The arithmetic methodology and the current federal asset threshold and passbook rate are real and are not altered for the fiction. Where the fiction requires a number the real rule does not supply, meaning the AMI schedule itself, a fictional schedule is constructed for Ashland County and is clearly marked as such.

A note on accuracy: the original job posting this project was inspired by referenced a five thousand dollar asset threshold. That figure is the pre-HOTMA rule. The current rule, in effect since HOTMA's asset provisions took effect, sets the threshold at fifty thousand dollars, adjusted annually for inflation, with a passbook rate currently near four tenths of one percent. This specification is built on the current rule, not the outdated figure, since a compliance platform built on an outdated threshold would be a poor demonstration of the compliance rigor this project exists to show.

## PART ONE: ANNUALIZING EMPLOYMENT INCOME

Current pay is converted to an annual figure using the following standard conversion factors.

Hourly rate: multiply by 2,080 (a standard 40 hour week times 52 weeks), or by the actual expected annual hours if less than full time and documented as such.

Weekly rate: multiply by 52.

Biweekly rate: multiply by 26.

Semi-monthly rate: multiply by 24.

Monthly rate: multiply by 12.

### Worked example 1.1: standard hourly annualization

An applicant to FHA-Meridian's program works 40 hours per week at eighteen dollars and fifty cents per hour, connected through Argyle Link with employer verified payroll data.

Annualized income = $18.50 × 2,080 = $38,480.00

### Worked example 1.2: mid-certification pay rate change

An applicant's certification takes effect April 1. Payroll data shows a current rate of sixteen dollars per hour, with a documented, employer confirmed raise to seventeen dollars and twenty five cents per hour effective ten weeks later, on June 10.

Hours at old rate: 10 weeks × 40 hours = 400 hours. Income at old rate: 400 × $16.00 = $6,400.00

Remaining annual hours: 2,080 − 400 = 1,680 hours. Income at new rate: 1,680 × $17.25 = $28,980.00

Total annualized income = $6,400.00 + $28,980.00 = $35,380.00

## PART TWO: ANNUALIZED RUN RATE VERSUS YEAR TO DATE, AND VARIANCE HANDLING

The engine calculates income two ways whenever year to date payroll data is available: the annualized run rate method shown in Part One, and a year to date extrapolation, meaning the applicant's actual earnings so far this year, projected forward across the full year based on how much of the year has elapsed.

YTD extrapolation formula: (YTD earnings) × (52 ÷ weeks elapsed since the start of the earnings year)

Project convention, stated explicitly since federal guidance leaves the exact variance threshold to program administrator discretion: if the two methods differ by ten percent or less of the lower figure, the engine automatically selects the higher of the two figures and proceeds without human review, since a small variance is expected from ordinary pay timing and does not indicate a data or verification problem. If the two methods differ by more than ten percent, the engine does not auto-resolve. It records both figures, all underlying inputs, and routes the determination to the reviewer queue with both figures displayed side by side. A reviewer must select which figure to use, or enter a manually justified figure, and that choice, along with a required written justification, is written to the audit log before the determination can be approved.

### Worked example 2.1: variance within threshold, auto-resolved

An applicant is paid biweekly at $1,200.00 per pay period. Annualized run rate = $1,200.00 × 26 = $31,200.00

Plaid transaction data shows year to date earnings of $14,400.00 through 24 weeks elapsed in the earnings year. YTD extrapolation = $14,400.00 × (52 ÷ 24) = $31,200.00

Variance = ($31,200.00 − $31,200.00) ÷ $31,200.00 = 0 percent. Within threshold. Engine auto-selects $31,200.00 and proceeds.

### Worked example 2.2: variance exceeds threshold, routed to review

Same applicant profile, but Plaid transaction data instead shows year to date earnings of $19,000.00 through 22 weeks elapsed, reflecting a documented period of overtime earlier in the year.

Annualized run rate (from current pay stub) = $31,200.00

YTD extrapolation = $19,000.00 × (52 ÷ 22) = $44,909.09

Variance = ($44,909.09 − $31,200.00) ÷ $31,200.00 = 43.9 percent. Exceeds the ten percent threshold. The engine does not select a figure. It writes both $31,200.00 and $44,909.09 to the calculation trace, sets the determination status to pending review, and routes the case to the reviewer queue.

## PART THREE: ASSET INCOME AND IMPUTATION

Net family assets at or below fifty thousand dollars: include only the actual income the assets generate. No imputation.

Net family assets above fifty thousand dollars: for any portion of assets where actual income can be reliably determined from account data, include that actual income. For any portion where actual income cannot be reliably determined, meaning no interest, dividend, or yield data is available for that specific asset, impute income on that portion at the passbook rate of four tenths of one percent (0.004). The two amounts are added together, not compared against each other. This is the current HOTMA methodology and is a change from the pre-HOTMA rule, which compared a single actual total against a single imputed total on the full asset value and took whichever was greater.

### Worked example 3.1: under threshold, actual only

A household holds $22,000.00 in a single savings account earning 1.1 percent annual interest, actually posted as $242.00 for the year, visible in Plaid Assets data.

Total net assets = $22,000.00, at or below the fifty thousand dollar threshold. Asset income = $242.00, the actual figure. No imputation applies.

### Worked example 3.2: over threshold, actual plus imputed on the undetermined portion

A household holds $85,000.00 in total net assets: $50,000.00 in an interest bearing account with actual documented income of $450.00 for the year, and $35,000.00 in an asset for which no yield data is available through connected account data.

Total net assets = $85,000.00, above the fifty thousand dollar threshold.

Actual income on the determined portion = $450.00

Imputed income on the undetermined portion = $35,000.00 × 0.004 = $140.00

Total asset income = $450.00 + $140.00 = $590.00

## PART FOUR: HOUSEHOLD WITH NO EMPLOYMENT INCOME

A household's only income sources are a fixed unearned benefit and asset income, with no wages.

### Worked example 4.1

A retired household member receives $14,200.00 per year in a fixed benefit, verified by an uploaded benefit award letter processed through the Textract fallback pipeline since this income source cannot be connected through Argyle or Plaid. The household holds $65,000.00 in net assets: $50,000.00 with actual documented income of $500.00, and $15,000.00 with no determinable yield.

Asset income = $500.00 (actual, determined portion) + ($15,000.00 × 0.004 = $60.00, imputed, undetermined portion) = $560.00

Total annual income = $14,200.00 (benefit) + $560.00 (asset income) = $14,760.00

This case has no employment income component at all, exercising the path through the engine that must not assume a wage record exists.

## PART FIVE: AREA MEDIAN INCOME SCHEDULE AND TIER MATCHING

The figures below are a fictional Ashland County area median income schedule, constructed for this build and not drawn from any real published HUD data set, consistent with the genericization rule. The household size adjustment percentages applied to the four person baseline follow the standard HUD adjustment convention, only the underlying dollar figures are invented.

Fictional Ashland County area median income, four person household baseline: $88,000.00 per year.

Household size adjustment: one person, 70 percent. Two person, 80 percent. Three person, 90 percent. Four person, 100 percent. Five person, 108 percent. Six person, 116 percent.

Resulting area median income by household size: one person $61,600.00. Two person $70,400.00. Three person $79,200.00. Four person $88,000.00. Five person $95,040.00. Six person $102,080.00.

Program eligibility tiers, applied as a percentage of the household size adjusted area median income figure above: thirty percent, fifty percent, sixty percent, eighty percent.

Three person household tier thresholds: thirty percent tier $23,760.00. Fifty percent tier $39,600.00. Sixty percent tier $47,520.00. Eighty percent tier $63,360.00.

Tier assignment rule: a household is assigned to the lowest tier whose threshold is greater than or equal to the household's total determined annual income. The comparison is inclusive at the boundary: a household whose income exactly equals a tier's threshold qualifies at that tier, and is not bumped to the next tier up.

Rounding convention, stated explicitly as a project convention adopted for deterministic testing, since it is not itself a point of federal law: all intermediate dollar amounts are carried to the cent. The final total annual income figure used for tier comparison is rounded to the nearest whole dollar, using round half up.

### Worked example 5.1: standard tier match

A three person household has a total determined annual income, after summing employment, benefit, and asset income components, of $46,000.00.

Comparing against the three person tier thresholds: $46,000.00 exceeds the thirty percent threshold ($23,760.00) and the fifty percent threshold ($39,600.00), but is at or below the sixty percent threshold ($47,520.00). The household is assigned the sixty percent tier.

### Worked example 5.2: exact boundary, inclusive

A three person household has a total determined annual income of exactly $47,520.00, precisely equal to the sixty percent tier threshold for a three person household.

Applying the inclusive boundary rule, the household qualifies at the sixty percent tier, not the eighty percent tier. This case exists specifically to test that the comparison operator used in the engine is greater than or equal to, not strictly greater than.

## TEST CASE SUMMARY FOR QA TEST AGENT SKILL

Every worked example above is a required automated test case. Full coverage on this engine means all of the following pass against these exact expected values, independently re-derived by the Regulatory Compliance Verification Skill before Phase 3 can close, not merely authored once and trusted.

1.1 standard hourly annualization, expects $38,480.00
1.2 mid certification rate change, expects $35,380.00
2.1 run rate versus YTD within threshold, expects auto-resolved $31,200.00, review flag false
2.2 run rate versus YTD exceeding threshold, expects both figures retained, review flag true, no auto-selected figure
3.1 assets under threshold, expects $242.00, no imputation flag
3.2 assets over threshold, expects $590.00, imputation applied flag true, imputed portion $140.00 traceable separately from actual portion $450.00
4.1 benefit plus asset income only, no wages, expects $14,760.00
5.1 standard tier match, expects sixty percent tier
5.2 exact boundary, expects sixty percent tier, not eighty percent, confirming inclusive comparison
