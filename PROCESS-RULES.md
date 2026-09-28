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

[ ] Separate development and staging Supabase environments exist with distinct keys, set up before any schema work, and development keys confirmed distinct from every other environment's.
[ ] Multi tenant Supabase schema created with tenant_id on every tenant scoped table.
[ ] Row Level Security policy present on every tenant scoped table.
[ ] Cross tenant read attempt, performed as an actual query by two simulated tenant users, returns zero rows.
[ ] Cross tenant write attempt, same method, is rejected.
[ ] Next.js intake shell resolves tenant from URL slug.
[ ] A second, dummy tenant can be inserted and its own theme renders at its own slug without a code change.
[ ] UX and Interface Skill's design system and intake flow specification produced, DESIGN.md updated accordingly.
[ ] Security Skill's early tenant isolation pass complete, no unresolved high severity finding.
[ ] Genericization check from RULES.md run, exact command as written there, no output.

Phase 1 status: not started.

## PHASE 2: FINANCIAL INGESTION

[ ] Plaid sandbox integration functional, produces a normalized income_records entry.
[ ] Argyle sandbox integration functional, produces a normalized income_records entry of identical shape to the Plaid pipeline's output.
[ ] Textract fallback pipeline functional against a sample scanned document, produces a normalized income_records entry of identical shape to the other two pipelines.
[ ] Webhook signature verification present and tested for both Plaid and Argyle, even in sandbox mode.
[ ] Integration test suite covering all three ingestion paths.
[ ] Genericization check from RULES.md run, exact command as written there, no output.

Phase 2 status: not started.

## PHASE 3: RULES ENGINE AND PDF GENERATION

[ ] Calculation engine built to CALC-SPEC-1.md.
[ ] All nine required test cases in TESTS.md pass.
[ ] Regulatory Compliance Verification Skill has independently re-derived and confirmed all nine cases against the actual engine output, not merely confirmed the existing test suite passes.
[ ] Calculation trace stored on every determination, containing every intermediate value, not only the final figure.
[ ] FTIC PDF generation produces a document whose fields, opened and inspected directly, match the source determination.
[ ] ACAEF PDF generation, same standard.
[ ] E-signature integration functional against a generated document.
[ ] No hardcoded threshold or conversion factor found outside the single configuration module named in RULES.md.
[ ] Genericization check from RULES.md run, exact command as written there, no output.

Phase 3 status: not started. This is the strictest gate on the project.

## PHASE 4: REVIEWER DASHBOARD AND HARDENING

[ ] Reviewer dashboard built, PII fields masked by default.
[ ] Unmasking action requires explicit user action and produces an audit_log entry.
[ ] Full STRIDE security pass complete, per SECURITY.md.
[ ] No unresolved high severity security finding.
[ ] Exception queue functional for cases the calculation engine routes to manual review, per the variance handling rule in CALC-SPEC-1.md.
[ ] Genericization check from RULES.md run, exact command as written there, no output.

Phase 4 status: not started.

## PHASE 5: DEPLOYMENT

[ ] Staging environment deployed on Vercel and Supabase, using credentials distinct from local development.
[ ] Deployment Skill's checklist run and passed.
[ ] Row Level Security re-verified against the actually deployed database, using the same cross tenant query attempt as Phase 1, not assumed to carry over from local development.
[ ] End to end scenario, intake through signature, run successfully against the deployed environment.
[ ] Genericization check from RULES.md run, exact command as written there, no output.

Phase 5 status: not started.

## STANDING RULE ACROSS ALL PHASES

A PHASE_X_COMPLETE.md is written only after every item above for that phase is checked, and only after the Master Vetting Skill, run by a fresh and fully grounded sub-agent per CLAUDE.md, has performed its own independent verification of the items that require it, per COLLABORATION-1.md. A new session beginning mid project reads the files in the order CLAUDE.md defines, which includes this file, to know exactly what is and is not actually done, rather than inferring project state from conversation history.
