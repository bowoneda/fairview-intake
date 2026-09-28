# COLLABORATION #1: Fintech/GovTech Compliance Intake Platform

This document is the anchor for the SKILL TEAM on this project. It works alongside CLAUDE.md, not instead of it. CLAUDE.md is read first and defines the read order; this file is read after MEMORY.md. The other handoff files describe the state of the build. This file describes who is building it and how they check each other's work.

How each skill below is realized is decided and recorded in MEMORY.md under SKILL TEAM RESOLUTION, and that record supersedes any earlier assumption that every skill must be built fresh as its own file. In short: the QA Test Agent Skill reuses the existing qa-test-agent skill; the Master Vetting Skill and the Regulatory Compliance Verification Skill exist as standalone files (MASTER-VETTING-SKILL.md, COMPLIANCE-VERIFICATION-SKILL.md); the remaining six roles are followed inline, using MASTER-SPEC-1.md, the phase specifications, and SECURITY.md as their playbooks.

## PROJECT SNAPSHOT

A white labeled compliance and applicant intake platform for multifamily developers and operators (the tenants), built to the scope of a real Upwork job listing under a fictional jurisdiction. It replaces manual paper income verification with connected financial data APIs, a deterministic income calculation engine, and automated generation of official regulatory filings for fictional regulators. MASTER-SPEC-1.md carries the genericized scope.

Stack: Next.js (App Router, TypeScript), Tailwind CSS, React Hook Form, Zod on the frontend. Supabase (Postgres, Edge Functions, Row Level Security, Vault/pgcrypto) on the backend. Plaid and Argyle in sandbox mode for financial data. AWS Textract as an OCR fallback. pdf-lib for form generation. DocuSign or Dropbox Sign for e-signature. Twilio for SMS. Deployed on Vercel.

Genericization rule: this build is not for Chicago or Cook County. All regulatory references, form names, and jurisdiction names are replaced with a fictional equivalent, held constant across every generated artifact. Use, permanently: State of Meridian, Ashland County, City of Fairview. The underlying math (HUD Part 5 style income determination) is real and must be correct. The jurisdiction wrapped around it is invented. Never let a real Illinois, Chicago, or Cook County reference leak into code, form labels, comments, or documentation.

Separate databases rule: as with every project, set up a distinct Supabase project (or distinct schema with distinct keys) for local development versus production before Phase 1 begins. Sandbox Plaid and Argyle keys are separate credentials from anything used later and must never be mixed with production keys, even though this project is not expected to reach real production.

## HOW REVIEW WORKS ON THIS PROJECT

Claude Code is the builder. It writes code, runs tests, and reports phase completion. The adversarial reviewer is a fresh sub-agent that runs the Master Vetting Skill, never the building session itself. Before verifying anything, that sub-agent grounds itself by reading the project documents in full (see CLAUDE.md for the list), so the review reflects a deep understanding of the project rather than a quick pass. It is handed the checklist items to verify, not the builder's conclusions to confirm. It does not accept a self reported PASS from Claude Code, or from any skill, as sufficient evidence that a phase is done. Before any PHASE_X_COMPLETE.md is accepted, the Master Vetting Skill (defined below) must have directly inspected the actual artifact: run the actual calculation engine against actual worked examples, queried the actual database as two different simulated tenants, opened the actual generated PDF, triggered the actual sandbox webhook. A claim of correctness is not evidence of correctness on this project.

## THE SKILL TEAM

Each entry below is a skill that must be built as its own file (or its own clearly bounded section of a shared skill file, if the project's tooling requires that) before it is first used. Each entry states the real world role it stands in for, its mandate on this project specifically, what it needs as input, what it must produce as output, and when it is invoked.

### 1. Project Architect Skill
Stands in for: product manager and lead architect.
Mandate: turns the project snapshot above into a concrete milestone plan, decides the multi tenant architecture approach (how tenants are isolated, how the white label theming engine resolves a tenant from a URL slug), and decides the shape of the master specification that every other skill builds against.
Input: this document, the original job posting's scope (already on file), and the genericization rule.
Output: a master specification document (feeds directly into DESIGN.md), a milestone breakdown with explicit acceptance criteria per milestone (feeds into PROCESS-RULES.md), and a decision record for the multi tenant approach chosen.
Invoked: Phase 0, before any code is written. Consulted again at the start of every subsequent phase to confirm the plan still holds.

### 2. Regulatory Compliance Verification Skill
Stands in for: the compliance officer and the domain subject matter expert.
Mandate: researches how HUD Part 5 income determination actually works in the real United States housing system (annualized income versus year to date comparison, imputed asset income above a liquid asset threshold, area median income tier matching against a published income schedule), then re-expresses that logic under the fictional Meridian/Ashland/Fairview jurisdiction with the real math preserved. Produces a calculation specification with fully worked numeric examples, including edge cases: irregular income, a household member with only asset income, a household exactly at an income tier boundary. Later in the project, this skill does not write code. It independently re-derives the expected output for every test case and checks the engine's actual output against that independent derivation, the same way a compliance auditor would, not the way the engineer who wrote the code would.
Input: live research into real HUD Part 5 methodology, the fictional jurisdiction names, the milestone plan from the Project Architect Skill.
Output: a calculation specification document with worked examples (feeds into DESIGN.md and TESTS.md), and later a verification report confirming or disputing the built rules engine's actual output against that specification.
Invoked: Phase 0 for the initial specification. Phase 3 for independent verification of the built engine, before the Master Vetting Skill signs off on that phase.

### 3. Financial API Integration Skill
Stands in for: the integration specialist who has done this exact kind of work before and knows where the sharp edges are.
Mandate: owns everything touching Plaid, Argyle, AWS Textract, and the e-signature provider. Sets up sandbox accounts and credentials for both Plaid and Argyle (both offer immediate free sandbox access with no approval gate), builds the Link token exchange flow for each, builds the webhook ingestion state machine, and builds the Textract fallback pipeline for applicants who cannot connect an account and must upload a scanned document instead. Also owns the DocuSign or Dropbox Sign embedded signature flow and the Twilio SMS trigger integration.
Input: Plaid and Argyle sandbox documentation, the master specification's data model for what a normalized income record looks like once ingested.
Output: working sandbox integrations for all four services, and a running notes file of provider specific quirks (token expiry behavior, webhook retry semantics, rate limits) so this knowledge is not relearned from scratch on a future project.
Invoked: Phase 2.

### 4. UX and Interface Skill
Stands in for: the UI/UX designer.
Mandate: designs the applicant facing intake flow (mobile first, save and resume across devices, document and photo upload, e-signature step) and separately designs the internal reviewer dashboard, which has different design constraints: it needs to be dense, fast to scan, and built for someone doing this all day, not a one time applicant. Also owns the dynamic white label theming system, meaning the design system must be built as tokens that can be swapped per tenant, not hardcoded per screen.
Input: the master specification, the multi tenant/white label decision from the Project Architect Skill.
Output: the design system and screen specifications (feeds into DESIGN.md).
Invoked: Phase 1 for the intake flow and theming system, Phase 4 for the reviewer dashboard.

### 5. Full Stack Engineering Skill
Stands in for: the backend and frontend engineers, and the engineer half of the solutions architect role.
Mandate: builds the actual application. Multi tenant Supabase schema with Row Level Security policies that enforce tenant isolation at the database layer, not just at the application layer. The Next.js applicant intake shell with dynamic theme routing. The backend logic that receives normalized income data from the Financial API Integration Skill's pipelines and hands it to the rules engine. The pdf-lib integration that populates the fictional jurisdiction's official forms. The reviewer dashboard's backend, including field level PII masking logic.
Input: the master specification, the design system, the calculation specification, the financial data ingestion pipeline's output shape.
Output: the working application, phase by phase.
Invoked: every phase from Phase 1 onward. This is the most continuously active skill on the team.

### 6. Security Skill
Stands in for: the security engineer.
Mandate: threat models the platform using STRIDE against the specific attack surface here, which is unusually sensitive: social security numbers, bank account details, and full financial histories flow through this system. Verifies that Row Level Security policies actually isolate tenants by attempting cross tenant reads as two simulated tenant users, not by reading the policy code and assuming it works. Verifies field level encryption is actually applied to the fields the specification says must be masked, by inspecting the actual stored data, not the schema definition. Audits every path PII could reach an unapproved endpoint or log.
Input: the built application at each checkpoint, the PII masking requirements from the master specification.
Output: a security audit report per checkpoint (feeds into SECURITY.md), with any finding blocking phase sign off until resolved.
Invoked: an early pass at the end of Phase 1 (tenant isolation only), a full pass at the end of Phase 4.

### 7. QA Test Agent Skill
Stands in for: the QA engineer.
Mandate: the calculation specification from the Regulatory Compliance Verification Skill requires full coverage, meaning every worked example and every edge case in that specification has a corresponding automated test, not just a sample of them. Also builds integration tests against the Plaid and Argyle sandbox responses, and an end to end test that walks a simulated applicant from intake through document upload through calculation through PDF generation through signature.
Input: the calculation specification's worked examples, the built engine, the built integration pipelines.
Output: the test suite and a coverage report (feeds into TESTS.md).
Invoked: continuously from Phase 2 onward, with a hard gate at Phase 3 requiring full coverage on the calculation engine specifically before that phase can close.

### 8. Deployment Skill
Stands in for: the DevOps/infrastructure engineer.
Mandate: owns the distinction between the sandbox development environment and any later production environment, meaning separate Supabase projects and separate Plaid/Argyle credential sets from the start. Owns the Vercel deployment pipeline, environment secret management, and a pre deploy checklist that includes actually querying the deployed database to confirm Row Level Security policies are active in that environment, not just in local development.
Input: the built and security audited application.
Output: a deployed staging environment and a deployment checklist specific to this project's stack (feeds into PROCESS-RULES.md).
Invoked: Phase 5, and again for any redeploy.

### 9. Master Vetting Skill
Stands in for: the adversarial reviewer role that sits above every other skill.
Mandate: never accepts another skill's self report as sufficient. At every phase boundary, before a PHASE_X_COMPLETE.md is written, this skill independently reproduces the evidence: runs the calculation engine against the Regulatory Compliance Verification Skill's worked examples itself, queries the database as two tenants itself, opens the generated PDF itself and checks the fields against the source data itself, fires a sandbox webhook itself and confirms the state machine transitions correctly. If a discrepancy is found, the phase is not complete regardless of what any other skill reported, and the discrepancy is logged before rework begins.
Input: whatever the current phase's skills claim to have completed.
Output: either a genuine PHASE_X_COMPLETE.md with the actual verification evidence attached, or a rework list.
Invoked: at the end of every phase, without exception.

## PHASE MAP

Phase 0, foundation. Project Architect Skill and Regulatory Compliance Verification Skill. Produces the master specification, the milestone plan, and the calculation specification with worked examples.

Phase 1, architecture and shell. Full Stack Engineering Skill builds the multi tenant Supabase schema and RLS policies and the Next.js intake shell with dynamic theming. UX and Interface Skill delivers the intake flow design and theming tokens in parallel, feeding the engineering work. Security Skill runs an early tenant isolation check. Master Vetting Skill gates the phase.

Phase 2, financial ingestion. Financial API Integration Skill builds the Plaid, Argyle, and Textract pipelines. Full Stack Engineering Skill wires the ingested data into the application's data model. QA Test Agent Skill begins integration testing here and continues through the rest of the project. Master Vetting Skill gates the phase.

Phase 3, rules engine and PDF generation. Full Stack Engineering Skill builds the calculation engine to the Regulatory Compliance Verification Skill's specification and the pdf-lib form population logic. QA Test Agent Skill must reach full coverage on the calculation engine before this phase can close. Regulatory Compliance Verification Skill independently re-derives and checks the engine's actual output. Master Vetting Skill gates the phase and this gate is the strictest one on the project, given what a wrong calculation would mean in a real deployment.

Phase 4, reviewer dashboard and hardening. UX and Interface Skill delivers the reviewer dashboard design. Full Stack Engineering Skill builds it, including PII masking. Financial API Integration Skill wires Twilio SMS for follow ups and document requests. Security Skill runs its full audit pass here. Master Vetting Skill gates the phase.

Phase 5, deployment and handoff. Deployment Skill stages the environment, runs its checklist, and produces the repository handoff documentation. Master Vetting Skill performs a final end to end check against the deployed environment, not just local development, before the project is considered complete.

## RELATIONSHIP TO THE STANDARD HANDOFF PACKAGE

This document produces the inputs for the standard seven file package. CLAUDE.md should reference this file directly as the skill team anchor. DESIGN.md is fed by the Project Architect Skill's master specification and the UX and Interface Skill's design system. RULES.md is fed by architectural decisions made across the Full Stack Engineering Skill's work. SECURITY.md is fed by the Security Skill's audit reports. TESTS.md is fed by the QA Test Agent Skill's coverage reports. PROCESS-RULES.md is fed by the milestone plan and every Master Vetting Skill gate, written as a literal checklist with a checkmark or a cross against every item, never summarized. MEMORY.md remains the living state file and should record which phase is active and which skill is currently working, so a new session can resume without relying on this conversation's history.
