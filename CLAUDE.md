# CLAUDE.md — Project 1: Fairview Compliance Intake Platform

This is the anti-compaction anchor. Read this file first in every session, before anything else, including before COLLABORATION-1.md. If conversation history is unavailable or has been compacted, this file plus MEMORY.md are the only things that can be trusted for project facts. Never reconstruct project state from memory of an earlier conversation. Read the files.

## READ ORDER FOR A NEW SESSION

1. This file.
2. MEMORY.md, for current phase and what is actually done versus planned.
3. COLLABORATION-1.md, for the skill team roster, the phase map, and the review discipline.
4. PROCESS-RULES.md, for the gate checklist that defines done for the current phase. Read before building, so the finish line is known before work starts.
5. The current phase's specification: PHASE-X-SPEC.md if one exists for that phase, otherwise MASTER-SPEC-1.md.
6. RULES.md and SECURITY.md, since both constrain code from its first line.
7. DESIGN.md, before any UI work.
8. CALC-SPEC-1.md and TESTS.md, for Phase 3 and any work touching the calculation engine. CALC-SPEC-1.md is authoritative if the two disagree.
9. MASTER-VETTING-SKILL.md at every phase gate, and COMPLIANCE-VERIFICATION-SKILL.md at the Phase 3 gate.

## WHAT THIS PROJECT IS

A white labeled, multi tenant compliance and applicant intake platform for multifamily real estate developers and operators running affordable housing, property tax relief, and inclusionary zoning programs in the fictional State of Meridian, Ashland County, City of Fairview. Each tenant is an operator with its own properties and its own branding. The regulators are fictional too: the Fairview Housing Authority (FHA-Meridian), which receives the Fairview Tenant Income Certification (FTIC), and the Ashland County Assessor, which receives the Ashland County Assessor Exemption Filing (ACAEF). The platform replaces manual paper income verification with connected financial data APIs, a deterministic income determination engine built on real HUD Part 5 methodology, and automated generation of those filings.

This is a portfolio project built to the scope of a real Upwork job listing (job ~022097416197562470917), so the finished repository demonstrates that exact job's deliverables. Scope, stack, and milestone deliverables follow the listing. Two deliberate departures, each recorded in MEMORY.md: the jurisdiction is fictional, and the asset imputation rule is the current HOTMA rule rather than the listing's outdated five thousand dollar threshold. The listing text itself is never committed, since it names real places. MASTER-SPEC-1.md carries the genericized scope. The fictional jurisdiction wrapping is deliberate and permanent. Never let a real Illinois, Chicago, or Cook County reference appear anywhere in code, comments, UI copy, or generated documents. See MASTER-SPEC-1.md for the full genericization rule and RULES.md for the exact check run at every phase gate.

## STACK, LOCKED

Next.js, App Router, TypeScript. Tailwind CSS. React Hook Form. Zod. Supabase: Postgres, Edge Functions, Row Level Security, Vault/pgcrypto. Plaid, sandbox mode. Payroll: Plaid Payroll Income, sandbox mode (stack decision 2026-09-29, logged in MEMORY.md; the listing names Argyle or Pinwheel, both of which gate sandbox access behind sales approval, and Argyle slots in later as another adapter). AWS Textract, OCR fallback. pdf-lib, form generation. DocuSign or Dropbox Sign, e-signature. Twilio, SMS. Deployed on Vercel.

Do not substitute or add to this stack without it being logged as a decision in MEMORY.md with a reason.

## THE CORE OPERATING PRINCIPLE ON THIS PROJECT

No self report is trusted as evidence that work is done. This applies to every skill, including the engineering skill actually writing the code. A phase is not complete because a test suite the same engineer wrote passes. It is complete when the Master Vetting Skill has independently reproduced the evidence: run the calculation engine against the compliance specification's worked examples itself, queried the database as two different tenants itself, opened a generated PDF itself and checked its fields against source data itself.

The Master Vetting Skill is run by a fresh sub-agent, never by the building session itself. Before verifying anything, that sub-agent reads the project documents in full (this file, MEMORY.md, COLLABORATION-1.md, PROCESS-RULES.md, the phase's specification, RULES.md, SECURITY.md, DESIGN.md, and for Phase 3 CALC-SPEC-1.md, TESTS.md, and COMPLIANCE-VERIFICATION-SKILL.md), so its vetting is grounded in what the project is, not a quick pass over a report. It is handed the checklist items to verify, never the builder's conclusions to confirm. This is stated at length in COLLABORATION-1.md and is repeated here because it is the single most important behavioral rule on this project, given that the subject matter is regulated financial and housing data.

## SEPARATE ENVIRONMENTS, NON-NEGOTIABLE

A distinct Supabase project (or at minimum a distinct schema with distinct keys) for local development versus any later staging or production environment, set up before Phase 1 begins. Sandbox Plaid and Argyle credentials are never mixed with any other credential set. This rule exists independent of this specific project and applies to every project.

## DOCUMENT MAP

COLLABORATION-1.md: the skill team, what each skill stands in for in the real world, and the phase map.

MASTER-SPEC-1.md: the architecture decisions, the data model, the milestone plan with acceptance criteria.

CALC-SPEC-1.md: the actual income determination methodology, worked numeric examples, and the exact test cases the calculation engine must pass.

DESIGN.md: the UI and system design, built from the two files above plus the UX and Interface Skill's output once produced.

PHASE-1-SPEC.md through PHASE-5-SPEC.md: engineering level detail for each phase beyond MASTER-SPEC-1.md's milestone level acceptance criteria. PHASE-1-SPEC.md and PHASE-2-SPEC.md exist (both written 2026-09-28); PHASE-3 through PHASE-5 do not yet. Whether a later phase gets one is decided at the start of that phase and recorded in MEMORY.md. Where no phase spec exists, MASTER-SPEC-1.md and PROCESS-RULES.md govern that phase. If PHASE-3-SPEC.md is written, it covers only the engineering work around the calculation logic, meaning the PDF field mapping and the signature integration, and does not restate the math, which lives entirely in CALC-SPEC-1.md.

MASTER-VETTING-SKILL.md: the formal, project agnostic version of the no-self-report-trusted discipline. Invoke this at the close of every phase, without exception, before any PHASE_X_COMPLETE.md is written, run by a fresh, fully grounded sub-agent as described above.

COMPLIANCE-VERIFICATION-SKILL.md: the formal, project agnostic version of the research-specification-independent-verification pattern used to produce and check CALC-SPEC-1.md. Already applied once on this project; exists now as a standalone skill so future projects with their own regulatory or domain specific logic do not need this pattern rebuilt from scratch.

The remaining roles from COLLABORATION-1.md, Project Architect, Financial API Integration, UX and Interface, Full Stack Engineering, Security, and Deployment, are followed inline using MASTER-SPEC-1.md, the phase specs, and SECURITY.md as their playbooks, not built as separate skill files at this time. The QA Test Agent Skill role is served by the existing qa-test-agent-skill already in the library; confirm its output can be shaped to TESTS.md's format before Phase 2, extend lightly if needed, do not rebuild it.

.claude/skills/ui-kit-designer/: the UX and Interface Skill's design toolkit, installed 2026-09-28 from the user's THUB project (an expanded version of the ui-kit-designer skill). Use it for its design discipline: the design brief approved by the user before any code, hierarchy maps, and the typography, spacing, and anti-pattern references. On this project it is subordinate to DESIGN.md, RULES.md, and SECURITY.md, with these overrides:
- Output is Next.js components in this repository, never a standalone HTML file, and never written to the THUB output folder.
- The applicant flow follows DESIGN.md's calm, plain, legible direction. No custom cursors, no magnetic buttons, no decorative page transitions. Tenant colors appear only in the roles DESIGN.md allows.
- No image generation service (kie.ai or Imagen) is called on this project unless first cleared against SECURITY.md's third party data rules, and never with applicant data.
- Its brand examples (H-Tech, Nigerian edtech) are not this project's brand. The fictional operators and regulators are.
The installed copy has its hardcoded kie.ai API key removed; it reads KIE_API_KEY from the environment instead.

RULES.md: engineering conventions and constraints specific to this codebase.

SECURITY.md: the PII and tenant isolation requirements this build is audited against, and the audit findings once the Security Skill has run.

TESTS.md: the required test coverage, seeded from CALC-SPEC-1.md's test case summary, extended as later phases add scope.

PROCESS-RULES.md: the literal phase gate checklist. Every item gets a checkmark or a cross, copied verbatim, never summarized, before any phase boundary commit.

MEMORY.md: the living state file. Current phase, what exists, what does not yet exist, next action. Update this at the end of every work session regardless of how much or little was done.

## CURRENT STATE

See MEMORY.md, which is authoritative for current state. Do not rely on this section for it.
