# SECURITY.md — Project 1: Fairview Compliance Intake Platform

Status: requirements defined, no audit yet performed. The Security Skill has not run. This file states what it will be checked against. Once it runs, its actual findings replace the placeholder language below, phase by phase, not all at once at the end.

## WHY THIS PROJECT'S SECURITY BAR IS HIGHER THAN USUAL

This platform handles social security numbers, full bank account numbers, and complete financial transaction histories for applicants to a housing program. A data leak here is not a generic security incident, it is exposure of exactly the kind of data that enables identity theft and financial fraud against people applying for assistance. The security bar reflects that, not a generic checklist.

## THREAT MODEL, STRIDE

Spoofing: could an applicant or reviewer authenticate as someone else, or could a request be crafted to appear to come from a different tenant. Tampering: could a stored income record, asset record, or calculated determination be altered without appearing in the audit log. Repudiation: could a reviewer action (approval, exception override, unmasking a PII field) occur without a durable, attributable log entry. Information disclosure: could PII reach an unapproved endpoint, log, or a user of a different tenant. Denial of service: not the primary concern for a portfolio build, noted but not prioritized. Elevation of privilege: could an applicant role reach reviewer or admin functionality, or could a reviewer of one tenant reach another tenant's data or functionality.

## TENANT ISOLATION, THE PRIMARY REQUIREMENT

Row Level Security policies must be verified by actually attempting a cross tenant read and a cross tenant write as two distinct simulated tenant users, not by reading the policy definitions and inferring they work. This check happens twice: an early pass at the end of Phase 1 against the shell application, and again as part of the full Phase 4 audit against the more complete application, and again against the actually deployed environment in Phase 5, since RLS behavior in local development is not proof of RLS behavior in production.

## PII FIELD REQUIREMENTS

Social security numbers: encrypted at rest at the field level, never displayed unmasked by default anywhere in the reviewer dashboard, never included in any log line, error message, or third party service payload.

Full bank account numbers: same treatment as social security numbers.

Any unmasking action is an explicit, logged event: who unmasked, which field, which record, when, and ideally why, recorded in the audit_log table defined in MASTER-SPEC-1.md.

## ENCRYPTION REQUIREMENTS

Field level encryption for the fields named above, implemented with Supabase Vault or pgcrypto, verified by inspecting what is actually stored in the database, not by inspecting the schema definition or trusting that an encryption function was called somewhere in the code path.

## AUDIT TRAIL REQUIREMENTS

Every workflow_state transition, every reviewer action, and every PII unmasking event is appended to audit_log, never overwritten. The audit_log table itself should not be writable through any path that also allows deletion or modification of existing rows.

## THIRD PARTY DATA EXPOSURE

Plaid, Argyle, Textract, DocuSign or Dropbox Sign, and Twilio each receive only the minimum data required for their specific function. None of them should receive a field marked as requiring masking in the reviewer dashboard unless that specific field is the literal purpose of sending data to that provider, for example Plaid legitimately needs bank account linkage data to function at all. This is a case by case judgment the Security Skill's audit must make explicit for each integration, not a blanket rule.

## AUDIT SCHEDULE

Phase 1 close: tenant isolation only, early check.

Phase 4 close: full STRIDE pass across the completed application.

Phase 5 close: tenant isolation re-verified against the actually deployed environment.

Any high severity finding at any of these checkpoints blocks that phase's completion. It is not logged as a known issue to fix later.
