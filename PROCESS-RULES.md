# PROCESS-RULES.md — Project 1: Fairview Compliance Intake Platform

This is the literal phase gate checklist. Before any phase boundary commit, every item for that phase is copied into that phase's PHASE_X_COMPLETE.md with an explicit checkmark or cross, verbatim, never summarized as "all items passed" without the list itself present. A checklist item marked complete without the Master Vetting Skill having independently verified it, per COLLABORATION-1.md, is a false completion and is treated as a serious process failure if discovered later, not a minor slip.

## PHASE 0: FOUNDATION

[x] Master specification produced (MASTER-SPEC-1.md).
[x] Multi tenant architecture decision made and justified.
[x] Calculation specification produced with worked numeric examples (CALC-SPEC-1.md).
[x] Calculation specification checked against the current federal rule, not an outdated one. The five thousand dollar asset threshold referenced in the original inspiring job posting was identified as pre-HOTMA and superseded; the current fifty thousand dollar threshold and current calculation method were used instead.
[x] Milestone plan with acceptance criteria produced.
[x] Full seven file handoff package created: CLAUDE.md, DESIGN.md, RULES.md, SECURITY.md, TESTS.md, PROCESS-RULES.md, MEMORY.md.

Phase 0 status: complete.

## PHASE 1: ARCHITECTURE AND SHELL

[x] Separate development and staging Supabase environments exist with distinct keys, set up before any schema work, and development keys confirmed distinct from every other environment's.
[x] Multi tenant Supabase schema created with tenant_id on every tenant scoped table.
[x] Row Level Security policy present on every tenant scoped table.
[x] Cross tenant read attempt, performed as an actual query by two simulated tenant users, returns zero rows.
[x] Cross tenant write attempt, same method, is rejected.
[x] Next.js intake shell resolves the operator from the URL slug and renders its properties (building parameters) from the database.
[x] A second, dummy tenant can be inserted and its own theme renders at its own slug without a code change.
[x] Platform reference tables (tenants, programs, program_rule_sets, ami_schedules) have RLS enabled with no client write path, confirmed by an attempted write.
[x] UX and Interface Skill's design system and intake flow specification produced, DESIGN.md updated accordingly.
[x] Security Skill's early tenant isolation pass complete, no unresolved high severity finding.
[x] Genericization check from RULES.md run, exact command as written there, no output.

Phase 1 status: complete, 2026-09-28. Every item independently verified by the Master Vetting sub-agent; evidence in PHASE_1_COMPLETE.md.

## PHASE 2: FINANCIAL INGESTION

[ ] Plaid sandbox integration functional, produces a normalized income_records entry.
[ ] Payroll sandbox integration (Plaid Payroll Income; Argyle or Pinwheel as the listing names, if later added) functional, produces a normalized income_records entry of identical shape to the bank pipeline's output.
[ ] Textract Queries fallback pipeline functional against a sample scanned paystub, W-2, and Schedule C, each producing a normalized income_records entry of identical shape to the other two pipelines.
[ ] Payroll ingestion captures gross pay, pay frequency, YTD earnings, and deductions.
[ ] Plaid transaction classification identifies recurring peer to peer income transfers in a sandbox account and produces a recurring transfer income source.
[ ] Webhook signature verification present and tested for every webhook provider in use (Plaid, which serves both bank and payroll; and Argyle if later added), even in sandbox mode.
[ ] Integration test suite covering all three ingestion paths.
[ ] Normalized income record shape identity test passes: one record from each pipeline validates against the single shared schema with an identical key set.
[ ] New Phase 2 tables have tenant_id and RLS in the migration that creates them; isolation suite extended to them and to the private document storage bucket, and passing.
[ ] Recurring transfers follow PHASE-2-SPEC.md's rule: detected by software, stated by the family, confirmed by a reviewer; no transfer becomes income through software alone.
[ ] No raw Textract response, SSN, or full account number is stored anywhere, confirmed by query; raw provider payloads are stored redacted; Plaid access tokens are encrypted and unreadable by any client role.
[ ] Genericization check from RULES.md run, exact command as written there, no output.

Phase 2 status: in progress. Two items were reworded on 2026-09-29 from "Argyle" to "payroll" after the stack decision to use Plaid Payroll Income (MEMORY.md); the requirement itself, verified payroll data of the same normalized shape, is unchanged.

## PHASE 3: RULES ENGINE AND PDF GENERATION

[ ] Calculation engine built to CALC-SPEC-1.md.
[ ] All required test cases in TESTS.md pass.
[ ] 100 percent code coverage on the calculation engine, per the coverage report.
[ ] Engine reads thresholds from program_rule_sets and the income schedule from ami_schedules, and every trace records the rule set applied.
[ ] Regulatory Compliance Verification Skill has independently re-derived and confirmed every CALC-SPEC-1.md case against the actual engine output, not merely confirmed the existing test suite passes.
[ ] Calculation trace stored on every determination, containing every intermediate value, not only the final figure.
[ ] FTIC PDF generation produces a document whose fields, opened and inspected directly, match the source determination.
[ ] ACAEF PDF generation, same standard.
[ ] E-signature integration functional against a generated document, with both the applicant and the landlord signing in a sandbox envelope.
[ ] No hardcoded threshold or conversion factor found outside program_rule_sets, ami_schedules, and the single constants module named in RULES.md.
[ ] Genericization check from RULES.md run, exact command as written there, no output.

Phase 3 status: not started. This is the strictest gate on the project.

## PHASE 4: REVIEWER DASHBOARD AND HARDENING

[ ] Reviewer dashboard built, PII fields masked by default.
[ ] Unmasking action requires explicit user action and produces an audit_log entry.
[ ] Full STRIDE security pass complete, per SECURITY.md.
[ ] No unresolved high severity security finding.
[ ] Exception queue functional for cases the calculation engine routes to manual review, per the variance handling rule in CALC-SPEC-1.md.
[ ] Twilio SMS sends a document request and a follow up reminder to a test number, confirmed received, with no PII in the message body.
[ ] Genericization check from RULES.md run, exact command as written there, no output.

Phase 4 status: not started.

## PHASE 5: DEPLOYMENT AND HANDOFF

[ ] Staging environment deployed on Vercel and Supabase, using credentials distinct from local development.
[ ] Production environment deployed, or the production promotion runbook written, per the Phase 5 decision recorded in MEMORY.md.
[ ] Repository handoff documentation written: setup, environments, migrations, running the test suites, and operating runbook.
[ ] Per environment Vault configuration set in each deployed environment (functions_base_url for the ingestion-retry job), confirmed by a pg_net call from the database job returning 200 in that environment.
[ ] plaid-sandbox (and any other sandbox only function) is not deployed to production, confirmed by listing the production project's functions (SECURITY.md SEC-P2-03).
[ ] Deployment Skill's checklist run and passed.
[ ] Row Level Security re-verified against the actually deployed database, using the same cross tenant query attempt as Phase 1, not assumed to carry over from local development.
[ ] End to end scenario, intake through signature, run successfully against the deployed environment.
[ ] Genericization check from RULES.md run, exact command as written there, no output.

Phase 5 status: not started.

## STANDING RULE ACROSS ALL PHASES

A PHASE_X_COMPLETE.md is written only after every item above for that phase is checked, and only after the Master Vetting Skill, run by a fresh and fully grounded sub-agent per CLAUDE.md, has performed its own independent verification of the items that require it, per COLLABORATION-1.md. A new session beginning mid project reads the files in the order CLAUDE.md defines, which includes this file, to know exactly what is and is not actually done, rather than inferring project state from conversation history.
