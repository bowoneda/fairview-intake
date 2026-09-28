# TESTS.md — Project 1: Fairview Compliance Intake Platform

Status: required calculation engine test cases are fully specified, since CALC-SPEC-1.md already exists. Integration and end to end test scope is outlined but not yet built, since it depends on work not yet done in Phase 2 and beyond.

## THE HARD GATE

Phase 3 (calculation engine and PDF generation) cannot close until every test case below passes and the Regulatory Compliance Verification Skill has independently re-derived and confirmed each expected value against the actual engine output, not merely confirmed that a test suite written by the same skill that wrote the engine passes. This is the strictest gate on the project. See COLLABORATION-1.md for why.

## REQUIRED CALCULATION ENGINE TEST CASES

Sourced directly from CALC-SPEC-1.md, part by part, restated here as the literal test list so it can be checked off mechanically.

1.1 standard hourly annualization. Input: $18.50 per hour, full time. Expected: $38,480.00.

1.2 mid certification rate change. Input: $16.00 per hour for 400 hours, then $17.25 per hour for the remaining 1,680 hours in the annual cycle. Expected: $35,380.00.

2.1 run rate versus YTD within threshold. Input: $1,200.00 biweekly, YTD of $14,400.00 through 24 weeks. Expected: auto-resolved to $31,200.00, review flag false.

2.2 run rate versus YTD exceeding threshold. Input: $1,200.00 biweekly, YTD of $19,000.00 through 22 weeks. Expected: both $31,200.00 and $44,909.09 retained in the trace, review flag true, no figure auto-selected, determination status pending_review.

3.1 assets under threshold. Input: $22,000.00 total net assets, $242.00 actual income. Expected: $242.00, no imputation flag.

3.2 assets over threshold. Input: $85,000.00 total net assets, $50,000.00 with $450.00 actual income, $35,000.00 with no determinable yield. Expected: $590.00 total, imputation applied flag true, with $450.00 actual and $140.00 imputed distinguishable in the trace.

4.1 benefit plus asset income, no wages. Input: $14,200.00 fixed benefit, $65,000.00 total net assets split as $50,000.00 at $500.00 actual and $15,000.00 undetermined. Expected: $14,760.00.

5.1 standard tier match. Input: three person household, $46,000.00 total determined annual income. Expected: sixty percent AMI tier.

5.2 exact boundary. Input: three person household, exactly $47,520.00 total determined annual income. Expected: sixty percent AMI tier, confirming the comparison is inclusive, not strictly greater than.

## COVERAGE REQUIREMENT

Full coverage on the calculation engine means all nine cases above pass, plus any additional edge case the QA Test Agent Skill identifies during Phase 3 that is not already covered, for example a household with zero income sources at all, or a household where every asset falls above the threshold with no determinable income anywhere. New cases discovered this way get added to this file and to CALC-SPEC-1.md's test case summary, not tracked only in test code.

## PENDING: INTEGRATION TEST SCOPE

Phase 2. Tests confirming the Plaid sandbox pipeline, the Argyle sandbox pipeline, and the Textract fallback pipeline each produce an income_records entry of identical shape. Not yet built, since the pipelines themselves do not exist yet.

## PENDING: END TO END TEST SCOPE

A single scenario walking a simulated applicant from intake, through a Plaid or Argyle sandbox connection or a document upload, through calculation, through PDF generation, through e-signature. Not yet built. Depends on Phases 1 through 3 being complete.

## PENDING: SECURITY TEST SCOPE

The cross tenant read and write attempts described in SECURITY.md are tests in their own right and should be written as actual automated tests, not performed once manually and forgotten. Not yet built, first version expected at the end of Phase 1.
