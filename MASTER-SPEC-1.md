# MASTER SPECIFICATION — Project 1: Fairview Compliance Intake Platform

Produced by: Project Architect Skill, Phase 0. Revised 2026-09-28 to follow the scope of the Upwork job listing this project is built to (see CLAUDE.md).
Feeds: DESIGN.md, PROCESS-RULES.md

## ONE LINE DESCRIPTION

A white labeled, multi tenant compliance and applicant intake platform for multifamily real estate developers and operators. It replaces manual paper income qualification with consumer permissioned financial data APIs, a deterministic HUD Part 5 income determination engine, a PII masked exception review queue, and automated generation of official regulatory filings for affordable housing compliance, property tax relief, and inclusionary zoning programs in the fictional State of Meridian.

## FICTIONAL JURISDICTION, HELD CONSTANT

State of Meridian. Ashland County. City of Fairview. Two regulators are part of the fiction. The Fairview Housing Authority, referred to in code and documents as FHA-Meridian to avoid collision with the real Federal Housing Administration abbreviation, receives the Fairview Tenant Income Certification, or FTIC. The Ashland County Assessor receives the Ashland County Assessor Exemption Filing, or ACAEF. These names are used everywhere: code comments, database table names where relevant, generated PDFs, UI copy, and documentation. No real Illinois, Chicago, or Cook County name appears anywhere in the deliverable, even though the listing this project is built to names them.

## SCOPE, GENERICIZED FROM THE LISTING

The listing's scope, restated with the fiction applied. This section, not the listing text, is what the build is checked against.

1. White labeled web client and multi tenant core. A responsive applicant intake portal in Next.js (App Router, TypeScript) and Tailwind CSS, deployed on Vercel. Multi tenant Supabase Postgres with strict RLS guaranteeing tenant isolation. A white labeling engine that themes branding (logo, colors, and building parameters) from the URL.

2. Financial API ingestion and document processing. Argyle Link for verified payroll data: gross pay, pay frequency, YTD earnings, deductions. Plaid Assets for bank balances, plus transaction classification that identifies recurring peer to peer income transfers (Zelle, Venmo, Cash App). An AWS Textract fallback using the Queries API, parsing paystubs, W-2s, and 1040 Schedule C filings for applicants who cannot connect an account.

3. Deterministic rules engine and PDF mapping. HUD Part 5 calculations: annualized run rate against YTD comparison with variance handling, imputed asset income, and household AMI tier matching against income schedules held as data, not code. pdf-lib population of the FTIC and ACAEF forms from normalized records. Embedded e-signature through Dropbox Sign or DocuSign, with both the applicant and the landlord (the operator) signing.

4. Reviewer portal. A role restricted review portal for manual exception resolution and compliance approval. Field level PII encryption and masking of SSNs, full account numbers, and other sensitive financial identifiers. Twilio SMS for applicant follow ups, document request pings, and notifications.

Testing: deterministic unit tests (Vitest), with 100 percent coverage on the calculation engine's income run rate, YTD, and asset imputation logic.

Deliberate departure from the listing: the listing specifies asset imputation above five thousand dollars, which is the pre-HOTMA rule. This build uses the current HOTMA rule (see CALC-SPEC-1.md), with the threshold stored per program as data, so a different threshold is a data change, not a code change.

## TENANT MODEL

A tenant is an operator: a multifamily developer or property management company that uses the platform to qualify applicants for its properties. Each operator has its own users (applicants, reviewers, admins), its own properties, and its own branding. The regulators, FHA-Meridian and the Ashland County Assessor, are not tenants. They define the programs and receive the filings.

For this build, one operator is configured: Cedar Row Residential, slug cedar-row, a fictional Fairview operator. A second operator, Harbor Point Communities, slug harborpoint, exists only as the dummy tenant inserted during isolation and theming tests.

## MULTI TENANT ARCHITECTURE DECISION

Decision: single Supabase project, single shared schema, tenant isolation enforced entirely through Postgres Row Level Security keyed on a tenant_id column present on every tenant scoped table.

Reasoning: a separate schema or separate database per tenant would be more isolated in theory, but it does not reflect how this kind of platform is actually operated in practice, where one compliance software vendor serves many operators from one deployment and scales by adding rows, not by provisioning new infrastructure per client. The RLS pattern is also the pattern Supabase is built around, and demonstrating it correctly, meaning tenant isolation enforced at the database layer rather than trusted to application code, is one of the more valuable signals this project can carry into a portfolio. Application layer isolation alone is not acceptable on this project. Every query must pass through RLS, and the Security Skill's Phase 1 check exists specifically to try to break that isolation, not just confirm the policy exists.

Every tenant scoped table carries a tenant_id column, a foreign key to a tenants table. RLS policies compare tenant_id against a value read from the authenticated user's JWT claims, set at sign in. Service role keys, which bypass RLS, are used only in narrowly scoped server side Edge Functions that have already authenticated and authorized the request through other means, never exposed to the client.

## WHITE LABEL THEMING

Tenant resolution happens from the URL path, using the operator's slug as the first path segment, for example platform.example/cedar-row, not a subdomain, since a path segment is cleaner for the applicant facing links this platform generates and shares and needs no per tenant DNS. The property an applicant is applying to is carried as a query parameter, for example platform.example/cedar-row/apply?property=maple-court. That covers both of the listing's resolution styles, slug and query parameter, each for the thing it suits.

A theme configuration table, keyed by tenant_id, stores the operator's logo, brand colors, and form footer text. Building parameters, meaning property name, address, unit count, and the programs a property participates in, come from the properties table and render on the operator's landing page and the property's application pages. On request, the Next.js server component resolves the slug, loads the theme row, and injects the brand colors as CSS custom properties at the document root, so no component needs tenant specific styling logic. The mechanism must genuinely support adding a second operator without a code change, since demonstrating that the multi tenant claim is real, not decorative, is part of the point of this build.

## CORE DATA MODEL

Two kinds of table.

Platform reference tables hold data defined by the platform or by the regulators, shared by every tenant: tenants, programs, program_rule_sets, ami_schedules. These carry no tenant_id. They have RLS enabled with read only policies and no client write path. They are written only by migrations and seed scripts.

Tenant scoped tables are every other table. Each carries its own tenant_id column, including child tables whose tenant could in principle be derived through a parent. The tenant_id is stored directly so that every RLS policy is a direct comparison against the JWT claim, never a join through a parent table. Child tables reference their parent through a composite foreign key on (parent id, tenant_id), so a child row can never carry a tenant_id different from its parent's.

### Platform reference tables

tenants: id, slug (unique, the URL path segment), display name, created at. Readable without authentication, since slug resolution happens before sign in and these columns are public identity only; writable by no client role.

programs: id, code (for example FHA-AHP), name, regulator (FHA-Meridian, Ashland County Assessor, or City of Fairview), program type (affordable housing, property tax relief, inclusionary zoning), the filing document types it requires (FTIC, ACAEF). Readable without authentication, since property pages show which programs a property participates in.

program_rule_sets: id, program_id, effective from, effective to, asset imputation threshold, passbook rate, run rate versus YTD variance threshold, the program's income tier percentages, and a basis note stating the rule and year the values come from. Versioned by effective date, never edited in place. The engine records the exact rule set it used in every calculation trace. Readable by authenticated users.

ami_schedules: id, jurisdiction, effective year, household size, area median income for that household size. Seeded from CALC-SPEC-1.md Part Five's fictional Ashland County schedule. Tier thresholds are computed as a program's tier percentage times this figure. Readable by authenticated users.

### Tenant scoped tables

theme_configs: tenant_id, logo reference, brand colors, form footer text. Public branding only, containing nothing sensitive. Readable without authentication, since the theme must render on the applicant landing page before sign in; writable only by that tenant's admin role. properties: id, tenant_id, slug (unique within the tenant, the property query parameter), name, address, total units. Every column is public building information, so the table is readable without authentication, for the operator's landing page. Writable by that tenant's admin.

property_programs: id, tenant_id, property_id, program_id, set aside units per income tier, active flag. Which programs a property participates in. Public, like properties, and readable without authentication.

Unauthenticated read access is limited to exactly five tables, all holding public information: tenants, programs, theme_configs, properties, property_programs. Every other table requires authentication.

users: id (the Supabase Auth user id, which serves as the auth reference), tenant_id (fixed for life), role (applicant, reviewer, admin).

applicants: id, tenant_id, user_id (the applicant's own account, which the applicant level RLS layer keys on, so one applicant cannot read another applicant's household within the same tenant), property_id (the property applied to), contact information, current application status. The applicant record is the household's application; the people in the household live in household_members.

household_members: id, tenant_id, applicant_id, full name, relationship to head of household, date of birth, social security number (encrypted at the field level per SECURITY.md, never stored in plaintext). Household size for AMI tier matching is the count of this applicant's household_members rows.

income_sources: id, tenant_id, applicant_id, household_member_id (the member who earns or receives this income), source type (employment, self employment, benefit, recurring transfer, other), connection method (Argyle, Plaid, manual upload).

income_records: id, tenant_id, income_source_id, raw ingested data, normalized gross pay rate, pay frequency, deductions, YTD figure, capture date, ingestion method. Phase 2 fixes the final shape, which all three pipelines must produce identically.

asset_records: id, tenant_id, applicant_id, household_member_id (nullable, for assets held jointly by the household), asset type, institution name, full account number (encrypted at the field level per SECURITY.md), account number last four (plaintext, for masked display only), current balance, actual income generated, income determinable flag (true when actual income for this specific asset can be reliably determined from account data, which decides whether imputation applies to it above the threshold, per CALC-SPEC-1.md Part Three).

calculated_determinations: id, tenant_id, applicant_id, program_id, rule_set_id (the exact program_rule_sets row applied), calculation version, annualized income figure, imputed asset income figure, total annual income, AMI tier assigned, review required flag, calculation trace (every intermediate value, not just the final number), calculated at, status (draft, pending_review, approved). A determination whose run rate and YTD extrapolation differ by more than the variance threshold is saved as pending_review with no figure auto-selected, per CALC-SPEC-1.md Part Two; the reviewer's selection and written justification are written to audit_log before it can move to approved.

generated_documents: id, tenant_id, applicant_id, determination_id (the exact approved determination the document was produced from), document type (FTIC, ACAEF), generated PDF reference, applicant signature status, landlord signature status, generated at.

workflow_state: id, tenant_id, applicant_id, current stage, assigned reviewer, last action, last actor, timestamp. Every transition is appended, never overwritten, forming the audit trail.

audit_log: id, tenant_id, actor, action, target record, timestamp, before and after values where applicable. Append only: no update or delete path exists for any role.

The calculation trace field on calculated_determinations matters more than it looks. Because the Regulatory Compliance Verification Skill's Phase 3 job is to independently re-derive and check the engine's output, the engine must expose every intermediate value it used, not just the final annual income figure. A reviewer or auditor confirming a determination needs to see the rule set applied, the annualized run rate, the YTD extrapolation, which one was used and why, the actual asset income, the imputed asset income if the threshold was crossed, and the AMI tier boundary the household landed inside. Storing only the final number would make independent verification impossible and would not reflect how a real compliance system is required to behave.

## MILESTONE PLAN WITH ACCEPTANCE CRITERIA

The listing groups the work into four milestones. This project uses five phases, splitting deployment out of the listing's fourth milestone so that deployment gets its own vetting gate. Mapping: listing Milestone 1 is Phase 1, 2 is Phase 2, 3 is Phase 3, and 4 is Phases 4 and 5 together.

Milestone 1, architecture and shell. Deliverable: separate development and staging Supabase environments with distinct keys, set up before any schema work; multi tenant Supabase schema live in development with RLS policies on every tenant scoped table and automated isolation tests; Next.js intake shell resolving the operator from the URL slug, rendering its theme and its properties, with secure session handling. Acceptance criteria: the development environment's keys are confirmed distinct from any other environment's; a second, dummy operator can be inserted and its own theme renders correctly at its own slug without any code change; and an attempt to query one tenant's applicant data while authenticated as a user of a different tenant returns zero rows, verified by an actual query, not by reading the policy definition.

Milestone 2, financial ingestion. Deliverable: Argyle and Plaid sandbox integrations with token exchange and a webhook ingestion state machine; Plaid transaction classification of recurring peer to peer transfers; the Textract Queries fallback for uploaded paystubs, W-2s, and Schedule C filings. Acceptance criteria: a simulated applicant can complete the Plaid Link and Argyle Link sandbox flows, and both produce a normalized income_records entry with the same shape regardless of which pipeline produced it; a sample scanned paystub, W-2, and Schedule C, run through Textract, also produce income_records entries in the same shape; a sandbox account with recurring peer to peer deposits produces a classified recurring transfer income source.

Milestone 3, calculation engine and PDF generation. Deliverable: the deterministic income determination engine built to the calculation specification, reading its thresholds from program_rule_sets and its income schedule from ami_schedules; pdf-lib generation of the FTIC and ACAEF forms; embedded e-signature envelopes for the applicant and the landlord. Acceptance criteria: 100 percent code coverage on the engine, and every worked example in the calculation specification passing, independently re-derived and confirmed by the Regulatory Compliance Verification Skill, not just passed by tests the same engineer wrote. Generated PDFs contain the correct values in the correct fields, confirmed by opening the actual generated file, not by trusting the code that wrote it. A sandbox envelope completes with both signatures.

Milestone 4, reviewer dashboard and hardening. Deliverable: PII masked reviewer dashboard with manual exception resolution and compliance approval; Twilio SMS for follow ups and document requests; full security audit pass. Acceptance criteria: SSNs and full account numbers are masked in the dashboard UI and confirmed masked in what actually renders, not only in the database schema. A Twilio test message is sent and received for a document request. Security Skill's full STRIDE pass produces no unresolved high severity finding.

Milestone 5, deployment and handoff. Deliverable: deployment on Vercel and Supabase, separate from development credentials, with the Deployment Skill's checklist run and passed; end to end integration test against the deployed environment; repository handoff documentation. Acceptance criteria: RLS is confirmed active against the deployed database specifically, not assumed to carry over from development, by running the same cross tenant query attempt against the live environment. The end to end scenario passes against the deployed environment.

## OPEN DECISIONS CARRIED FORWARD

Resolved into CALC-SPEC-1.md: the fictional Ashland County AMI schedule and the ten percent variance threshold. Both are now also stored as data (ami_schedules, program_rule_sets), with CALC-SPEC-1.md remaining the authoritative source of the values.

Still open, each to be resolved before the phase that depends on it:

Income above the highest tier (Phase 3). CALC-SPEC-1.md's tier rule assigns the lowest tier whose threshold is at or above the household's income, but does not say what happens when income exceeds the highest tier. The engine must not guess. Resolve through the Regulatory Compliance Verification Skill and add to CALC-SPEC-1.md, with a worked example, before the engine is built.

Effective year of the asset threshold and passbook rate (Phase 3). The real fifty thousand dollar HOTMA threshold is adjusted annually for inflation, and the passbook rate is republished periodically. Each program_rule_sets row records which year's values it uses in its basis note, confirmed by the Regulatory Compliance Verification Skill, rather than presenting fifty thousand dollars and zero point four percent as permanent constants.

Self employment income (Phase 3). The listing includes 1040 Schedule C parsing, but CALC-SPEC-1.md has no methodology or worked example for self employment income. Add it through the Regulatory Compliance Verification Skill before the engine is built.

Recurring transfer income (Phase 2 and 3). Classifying recurring peer to peer deposits as income needs a stated rule: what counts as recurring, and when a reviewer must confirm it. Define in the Phase 2 specification, and add the calculation side to CALC-SPEC-1.md.

Per program tier sets (Phase 3). CALC-SPEC-1.md defines one tier set (30, 50, 60, 80 percent). Confirm which tiers each seeded program uses.

E-signature provider (Phase 3). DocuSign or Dropbox Sign. Choose before Phase 3 begins and log the decision and reason in MEMORY.md.

Production environment (Phase 5). The listing asks for staging and production. The Supabase free tier allows two active projects, and both are in use (development and staging). Options, decided at Phase 5: pause the development project to create a production project, if paused projects do not count toward the limit; or treat staging as the single deployed environment and document production promotion as a runbook. Record the choice in MEMORY.md.
