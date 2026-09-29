# RULES.md — Project 1: Fairview Compliance Intake Platform

Engineering conventions and hard constraints for this codebase specifically. General practice (separate dev and production databases, and so on) lives in CLAUDE.md and applies to every project; this file is what is particular to this one.

## GENERICIZATION IS ENFORCED, NOT DECORATIVE

Every code comment, UI string, form label, PDF template, and piece of documentation uses the fictional names: State of Meridian, Ashland County, City of Fairview, FHA-Meridian, FTIC, ACAEF. This is a literal check the Master Vetting Skill runs at every phase gate, not a one time review at the end.

The check is a case insensitive search for Chicago, Illinois, or Cook County across every file tracked in the repository, and it must return nothing, with exactly four exclusions: CLAUDE.md, COLLABORATION-1.md, MASTER-SPEC-1.md, and this file. Those four are the governance documents that state the rule, and they cannot forbid the names without naming them. No other file may name them, including other project documents, which refer to "the genericization rule" instead. The exact command, run from the repository root:

    git grep -n -i -E "chicago|illinois|cook county" -- . ":!CLAUDE.md" ":!COLLABORATION-1.md" ":!MASTER-SPEC-1.md" ":!RULES.md"

A clean result is no output and exit code 1. Other files, including phase completion evidence, refer to this command by name ("the genericization check in RULES.md") and never quote it, since quoting it would put the forbidden names in a non-excluded file. Run the check as a gate before a commit, so that a failure stops the commit. The search covers tracked files only, so installed dependencies are not in scope (timezone data in date libraries legitimately contains America/Chicago). Anything the project commits is in scope, including test fixtures and sandbox response samples copied from Plaid or Argyle, which must be scrubbed if they carry a real address in one of the forbidden places.

## TENANT ISOLATION RULES

Every table that stores tenant scoped data carries its own tenant_id column, including child tables whose tenant could be derived through a parent, so every RLS policy is a direct comparison, never a join. Child tables reference their parent through a composite foreign key on (parent id, tenant_id), so a child row cannot carry a different tenant than its parent. Every such table has an RLS policy. The only tables without tenant_id are the four platform reference tables named in MASTER-SPEC-1.md (tenants, programs, program_rule_sets, ami_schedules), and webhook_events (Phase 2). The reference tables have RLS enabled, with read only policies and no client write path. webhook_events has RLS enabled with no policy at all and no client grant: it is written by the webhook functions before any tenant is known (the provider's item reference is resolved to a connection only when the event is processed), stores no payload, and is read only by the service role. The only unauthenticated read access anywhere is the deliberate public read on exactly five tables named in MASTER-SPEC-1.md (tenants, programs, theme_configs, properties, property_programs), which hold public branding, program, and building information only. No query path, including an Edge Function, reads or writes tenant scoped data without RLS active, except a narrowly scoped service role operation that has already independently authenticated and authorized the request through other means. A service role key is never sent to the client, ever, under any circumstance including local development convenience.

New tables added after Phase 1 are not exempt from this rule by virtue of being added later. If a new tenant scoped table is introduced in Phase 2 or beyond, it gets a tenant_id column and an RLS policy in the same commit that introduces it, not as a follow up.

## CALCULATION ENGINE RULES

The engine is deterministic. The same inputs always produce the same outputs. No call to a language model, no non-deterministic library behavior, and no wall clock dependent logic other than the explicitly documented one (weeks elapsed since the start of the earnings year, for YTD extrapolation) belongs anywhere in this engine.

The engine writes a full calculation trace on every determination, per DESIGN.md. A determination without a trace is not a valid determination and should fail validation before it can be saved.

The engine's rules, thresholds, and conversion factors are not hardcoded as magic numbers scattered through the implementation. Program specific values (the asset imputation threshold, the passbook rate, the variance threshold, and the income tier percentages) live as data in program_rule_sets, versioned by effective date, and the area median income schedule lives in ami_schedules. Each rule set records which year's threshold and passbook rate it uses, since both are periodically republished (see MASTER-SPEC-1.md, open decisions). The HUD methodology constants that do not vary by program, meaning the annualization factors (2,080 hours, 52 weeks, 26, 24, and 12 pay periods), live in a single constants module. Those two tables and that module are the only places such numbers may appear. If a federal rule changes, or the fictional AMI schedule needs adjusting, the change is a new rule set or schedule row, not a code change. The engine records the rule set it applied in every calculation trace.

Every worked example in CALC-SPEC-1.md is a required, permanent automated test. A future change to the engine that breaks any of those nine cases is a regression, full stop, regardless of what other tests it might pass.

## FINANCIAL API INTEGRATION RULES

Provider sandbox credentials (Plaid, which serves bank and payroll; Argyle if later added) are stored as environment secrets, never committed, and never logged, including in error logs or stack traces. A webhook handler for either provider verifies the webhook signature before processing, even in sandbox mode, since sandbox code paths tend to become production code paths without anyone rewriting the security relevant parts.

The normalized income record produced by the bank pipeline, the payroll pipeline, and the Textract fallback pipeline must have the identical shape, per MASTER-SPEC-1.md's income_records table. The calculation engine should not know or care which pipeline produced a given income record.

## PII HANDLING RULES

Social security numbers and full financial account numbers are encrypted at the field level using Supabase Vault or pgcrypto, not merely access controlled. The reviewer dashboard displays these fields masked by default, with an explicit, audit logged action required to reveal an unmasked value. No PII field is ever sent to an external logging, analytics, or error tracking service. If such a service is introduced later, every payload it receives must be checked against this rule before that integration ships.

## DOCUMENT GENERATION RULES

Generated FTIC and ACAEF PDFs are produced from the calculated_determinations record's stored trace values, not recalculated at generation time. A generated document reflects exactly the determination that was approved, permanently, even if the underlying rules or configuration change later. Re-running a determination produces a new determination record and a new generated document; it never mutates a prior one.

## COMMIT DISCIPLINE

Multiple related issues found during a phase are fixed in a single commit rather than trickled out one at a time, consistent with the general practice already established from prior projects. A phase boundary commit is preceded by the literal PROCESS-RULES.md checklist for that phase, copied with a checkmark or a cross against every item.
