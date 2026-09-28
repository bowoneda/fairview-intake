# MEMORY.md — Project 1: Fairview Compliance Intake Platform

Living state file. Update this at the end of every work session, regardless of how much or how little was done in that session. A new session starts by reading CLAUDE.md, then this file, before consulting anything else. Never rely on conversation history for project facts; if it is not written here, treat it as not known.

## CURRENT PHASE

Phase 0, foundation: complete.
Phase 1, architecture and shell: in progress. Step 1 of PHASE-1-SPEC.md's order of work is done.

## WHAT ACTUALLY EXISTS RIGHT NOW

COLLABORATION-1.md: exists. Defines the nine skill roster and the phase map.
MASTER-SPEC-1.md: exists. Architecture decisions, data model, five milestone plan with acceptance criteria.
CALC-SPEC-1.md: exists. Full income determination methodology, nine worked test cases with expected outputs, built on the current HOTMA rule rather than the outdated five thousand dollar threshold referenced in the job posting this project was inspired by.
CLAUDE.md, DESIGN.md, RULES.md, SECURITY.md, TESTS.md, PROCESS-RULES.md: exist, produced as the standard seven file handoff package.
MASTER-VETTING-SKILL.md, COMPLIANCE-VERIFICATION-SKILL.md: exist.

PHASE-1-SPEC.md: exists, written 2026-09-28 from the corrected MASTER-SPEC-1.md. It covers the environments, the column level schema, the JWT claim hook, the RLS pattern and per table access, tenant resolution and theming, the design system deliverable, the literal cross tenant test procedure with positive controls, the second tenant render check, and the gate evidence for the vetting sub-agent.

PHASE-2-SPEC.md through PHASE-5-SPEC.md: DO NOT EXIST. An earlier version of this file claimed all five phase specs existed with full content. That was false: they were described in a chat session but never saved to the project folder. Found and corrected 2026-09-28 by checking the folder directly. Until a phase spec is written, MASTER-SPEC-1.md and PROCESS-RULES.md govern that phase. DESIGN.md's visual design system section is also still pending; it is Phase 1 work for the UX and Interface Skill.

No application code exists yet. No Supabase project has been provisioned yet. No skill has actually been invoked and produced a real output yet, other than the Project Architect Skill and Regulatory Compliance Verification Skill work captured in MASTER-SPEC-1.md and CALC-SPEC-1.md.

## SKILL TEAM RESOLUTION, DECIDED

The open question about whether the nine COLLABORATION-1.md skills get built as formal files is resolved, split three ways rather than answered as a single yes or no.

Already existing, reuse directly, do not rebuild: the QA Test Agent Skill role is served by the existing qa-test-agent-skill already in the library (Playwright, axe-core, ffmpeg based, four modes including API/workflow-scenario-to-test-plan and repo test-coverage-gap analysis). When Phase 2 or Phase 3 work begins, read that skill's actual current SKILL.md and confirm it can produce a coverage report shaped to match TESTS.md's nine required calculation cases; extend it lightly for that output shape if needed, do not build a parallel skill from scratch.

Genuinely reusable across future projects, built now as standalone formal skill files: MASTER-VETTING-SKILL.md and COMPLIANCE-VERIFICATION-SKILL.md, both exist. The Master Vetting Skill generalizes the no-self-report-trusted discipline beyond this project. The Compliance Verification Skill generalizes the research-specification-independent-verification pattern beyond HUD Part 5 specifically, so any future project (Logistics, Real Estate, Healthcare, or beyond) with regulatory or domain specific logic can invoke it fresh.

Specific to this project, followed inline rather than formalized as separate skill files for now: Project Architect, Financial API Integration, UX and Interface, Full Stack Engineering, Security, and Deployment. Their playbooks are MASTER-SPEC-1.md, SECURITY.md, and the phase specifications (PHASE-1-SPEC.md so far). If any of these proves reusable after Logistics or Real Estate the way cybersecurity-skill and software-engineer-pretester-skill did, formalize it then, not preemptively now.

Master Vetting is run by a fresh sub-agent, decided by the user 2026-09-28. Not by the building session, and not by Claude web as COLLABORATION-1.md originally said. The sub-agent reads the project documents in full before verifying, so the vetting is deeply grounded and not a quick blitz. It is given the checklist items to verify, never the builder's conclusions to confirm. CLAUDE.md, COLLABORATION-1.md, and PROCESS-RULES.md are updated to match.

## DOCUMENT CORRECTIONS, 2026-09-28

A full cross read of all twelve documents before Phase 1 found and fixed the following. Recorded here so the reason for each change is not lost.

Read order in CLAUDE.md expanded to cover every document, with PROCESS-RULES.md read before building. COLLABORATION-1.md no longer claims to be read before MEMORY.md.
COLLABORATION-1.md's "every skill must be built fresh as its own file" replaced with a pointer to the SKILL TEAM RESOLUTION above, and its "unless changed later" jurisdiction wording made permanent.
Data model in MASTER-SPEC-1.md: tenant_id added to every table except tenants (it was missing from income_sources, income_records, asset_records, calculated_determinations, generated_documents, and workflow_state, which RULES.md required). Composite foreign keys keep child and parent tenant consistent. New household_members table, since household size drives AMI tier matching and SSNs belong to individual members. Encrypted SSN and full account number fields added, since SECURITY.md required encrypting fields the model never defined. asset_records gains an income determinable flag, which imputation depends on. Determination status gains pending_review, which CALC-SPEC-1.md case 2.2 requires. generated_documents links to the exact determination it came from. tenants and theme_configs get a deliberate unauthenticated read, since the theme must render before sign in.
URL form fixed to a path slug (platform.example/fairview/apply). MASTER-SPEC-1.md's example had shown a subdomain.
Genericization check in RULES.md: the original "grep returns nothing" could never pass, since the governance documents that state the rule must name the forbidden places. Now an exact git grep command that excludes exactly those four documents and covers tracked files only.
PROCESS-RULES.md: Phase 1 gains the environment separation item. Every phase from 1 to 5 gains the genericization check item, which RULES.md already required at every gate.
MASTER-SPEC-1.md open decisions now list three items to settle before Phase 3: income above the highest AMI tier (CALC-SPEC-1.md is silent), the effective year of the HOTMA threshold and passbook rate (both are periodically adjusted), and DocuSign versus Dropbox Sign.
CALC-SPEC-1.md: not edited. All nine worked examples and the full AMI table were independently recomputed and are arithmetically correct.
While writing PHASE-1-SPEC.md, applicants gained user_id in MASTER-SPEC-1.md. Without it, RLS keyed only on tenant_id would let one applicant read another applicant's household inside the same tenant. users.id is now defined as the Supabase Auth user id.

## WHAT DOES NOT YET EXIST

No Supabase project. No local development versus staging environment separation has been set up yet, which per CLAUDE.md must happen before any schema work begins, meaning it is the very first concrete action of Phase 1, not something to defer.

No specifications for Phases 2 to 5, no visual design system, no screen specifications, no code of any kind.

## DECISIONS LOCKED SO FAR

Stack: Next.js, Tailwind, React Hook Form, Zod, Supabase, Plaid, Argyle, Textract, pdf-lib, DocuSign or Dropbox Sign, Twilio, Vercel. Not to be changed without logging a reason here.

Multi tenant approach: single project, single schema, RLS keyed on tenant_id. Not per-tenant databases or schemas.

Fictional jurisdiction: State of Meridian, Ashland County, City of Fairview, agency FHA-Meridian, forms FTIC and ACAEF. Permanent, not a placeholder to be replaced later.

Asset imputation rule: current HOTMA rule, fifty thousand dollar threshold, roughly zero point four percent passbook rate, actual plus imputed on the undetermined portion. Explicitly not the five thousand dollar pre-HOTMA rule the original inspiring job posting assumed.

Variance threshold for annualized run rate versus YTD extrapolation: ten percent, a project convention documented in CALC-SPEC-1.md since federal guidance leaves this to administrator discretion.

Environments, decided by the user 2026-09-28: development runs on a hosted Supabase project, fairview-dev, not a local Docker stack. Staging is a second hosted project, fairview-staging, created in Phase 1 but left empty until Phase 5. Reason: no Docker dependency on this Windows machine, and development is the same kind of environment as staging, so isolation results in development are more meaningful. Development keys live only in the gitignored .env.local. Staging keys stay off this machine until they go into Vercel in Phase 5.

Phase 1 is governed by PHASE-1-SPEC.md, decided by the user 2026-09-28.

Built to the Upwork listing, decided by the user 2026-09-28. Scope, stack, and milestone deliverables follow Upwork job ~022097416197562470917. It is read through the Upwork MCP tool, because direct fetches of Upwork pages return HTTP 403. MASTER-SPEC-1.md's SCOPE section is the genericized restatement the build is checked against. The listing text is never committed, since it names real places.

Tenant model, decided by the user 2026-09-28: tenants are operators (multifamily developers and property managers), per the listing, not the housing authority. FHA-Meridian and the Ashland County Assessor are regulators. They define programs and receive the FTIC and ACAEF filings. The configured operator is Cedar Row Residential (slug cedar-row), with properties Maple Court and Linden Terrace. The dummy test operator is Harbor Point Communities (slug harborpoint). New tables: properties and property_programs (tenant scoped), plus programs, program_rule_sets, and ami_schedules (platform reference, read only to clients). Seventeen tables in total.

Asset rule, decided by the user 2026-09-28: the current HOTMA fifty thousand dollar threshold, stored per program in program_rule_sets, so a different value is a data change. This deliberately departs from the listing's five thousand dollar pre-HOTMA figure.

Production environment, noted by the user 2026-09-28: the Supabase free tier allows only two projects, and both are in use. Deferred to Phase 5 as an open decision in MASTER-SPEC-1.md: either pause development to create production, or use staging plus a promotion runbook.

Listing scope added to later phases, recorded in MASTER-SPEC-1.md and PROCESS-RULES.md:
- Phase 2: Plaid recurring peer to peer transfer classification, Argyle deductions, Textract Queries on W-2 and Schedule C forms.
- Phase 3: 100 percent engine code coverage, AMI schedules and thresholds held as data, landlord co-signing.
- Phase 4: Twilio SMS.
- Phase 5: repository handoff.
Open calculation gaps for the Regulatory Compliance Verification Skill before Phase 3: self employment income, income above the highest tier, recurring transfer income, and per program tier sets.

## NEXT ACTION

Documents are corrected and consistent, and PHASE-1-SPEC.md is written, as of 2026-09-28. Phase 1 has started, following PHASE-1-SPEC.md's ORDER OF WORK. Step 1 is done: the git repository was initialized on 2026-09-28 on branch main, with .gitignore (every .env file except .env.example), .gitattributes (LF line endings), and .env.example. Initial commit 527262f. The genericization check from RULES.md ran clean on that commit: no output, exit 1. Step 2, 2026-09-28: the user created fairview-dev (ref mdatwozuqdiwioezalom) and fairview-staging (ref sfjgzcqvqinnfdoapnim), both in eu-west-1. .env.local holds dev values only. The dev API answered with the publishable key, and the dev database was reached through the session pooler (see PHASE-1-SPEC.md, ENVIRONMENTS; the direct host is IPv6 only and unreachable from this machine). Refs and publishable keys differ between the two projects.

RESOLVED 2026-09-28: both projects were first created with the same database password. The user reset the fairview-staging password. Builder check, not vetting evidence: first twelve SHA-256 hex characters, dev versus staging, all distinct. Project ref 4eea4a3dcf20 vs 92ed0f63bc17. Publishable key a793f2e7e438 vs 66caa2ff8fbf. Secret key dcb248d64d1e vs 68eafb568b19. Database password ea8c87e7a0bb vs 9b88f5e8eb8f. No staging key or password appears in any project file; only the staging project ref, which is public, appears in this file. The staging values were shared in chat and are therefore in the local session transcript. Rotating the staging secret key before Phase 5 is optional, at the user's discretion. The dev secret key is in .env.local and was verified against the Auth admin endpoint (HTTP 200). The staging secret key was shared in chat but is deliberately not written to any file.

The original step 2 instruction, kept for reference: create the fairview-dev and fairview-staging projects in Supabase and fill in .env.local for development only. Then the schema goes in table by table, each table's RLS in the same migration that creates it, while the UX and Interface Skill's design system work runs in parallel. Invoke MASTER-VETTING-SKILL.md at the close of every phase from here forward, without exception.
