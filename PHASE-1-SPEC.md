# PHASE-1-SPEC.md — Project 1: Fairview Compliance Intake Platform

Phase 1, architecture and shell. Engineering level detail beyond MASTER-SPEC-1.md's Milestone 1. Written 2026-09-28 from the corrected MASTER-SPEC-1.md, and revised the same day for the operator tenant model and the Upwork listing's scope. If this file and MASTER-SPEC-1.md disagree on architecture, MASTER-SPEC-1.md is authoritative and the disagreement is fixed in both files, not silently resolved in code.

Governing documents for this phase: MASTER-SPEC-1.md (data model, architecture), RULES.md (tenant isolation, genericization), SECURITY.md (tenant isolation verification), DESIGN.md (no real UI past scaffolding until the design system exists), PROCESS-RULES.md (the Phase 1 gate checklist this file's work is measured against).

## WHAT PHASE 1 DELIVERS

1. Two hosted Supabase environments, development and staging, with distinct keys.
2. The complete schema from MASTER-SPEC-1.md, created in development: seventeen tables, four platform reference tables and thirteen tenant scoped tables, with RLS on every table from the migration that creates it.
3. Tenant and role claims placed in the JWT by a Custom Access Token Hook, from a source the user cannot edit.
4. A Next.js intake shell that resolves the operator from the URL path, renders that operator's theme and its properties, signs an applicant in against a chosen property, and creates their application record. Structure and routing only; real visual components wait for the design system.
5. An automated cross tenant isolation test suite, with positive controls, run against the development database.
6. The UX and Interface Skill's design system and intake flow specification, written into DESIGN.md, produced in parallel with items 2 through 4.
7. The Security Skill's early tenant isolation pass, written into SECURITY.md.

Out of scope for Phase 1: Plaid, Argyle, Textract (Phase 2); the calculation engine, PDF generation, e-signature, and determination immutability (Phase 3); PII reveal and the reviewer dashboard (Phase 4); staging schema deployment and Vercel (Phase 5). Tables for those phases are created now, so their RLS exists from day one, but their columns may be extended by the phase that uses them, in a migration that keeps the RLS rules in RULES.md intact.

## ORDER OF WORK

1. Initialize the git repository with a .gitignore that excludes .env*, except .env.example, plus node_modules and .next. Commit the existing project documents as the first commit.
2. User action: create the two Supabase projects (see ENVIRONMENTS). Fill in .env.local for development only.
3. Scaffold Next.js (App Router, TypeScript, Tailwind), add the Supabase CLI as a dev dependency, link the CLI to the development project.
4. Migrations, one table at a time in dependency order, each table's RLS policies in the same migration that creates it: enums and helper schema, tenants, programs, program_rule_sets, ami_schedules, theme_configs, properties, property_programs, users, the Custom Access Token Hook, applicants, household_members, income_sources, income_records, asset_records, calculated_determinations, generated_documents, workflow_state, audit_log.
5. User action: enable the Custom Access Token Hook in the development project's dashboard.
6. Seed the reference data and the Cedar Row Residential operator (see SEED DATA).
7. Cross tenant isolation test suite, run green against development.
8. Next.js tenant resolution, theming, auth, and intake shell.
9. Dummy second tenant check: insert by SQL only, confirm it renders.
10. Security Skill early pass, then the Master Vetting sub-agent, then PHASE_1_COMPLETE.md.

The UX and Interface Skill's design system work (DESIGN SYSTEM DELIVERABLE below) starts at step 3 and runs alongside steps 4 through 8.

## ENVIRONMENTS

Two hosted Supabase projects in the user's Supabase account, same region:

fairview-dev: all Phase 1 through Phase 4 development and testing.

fairview-staging: created now so that its keys exist and are demonstrably distinct from day one. It stays empty until Phase 5, when the same migrations are applied to it. Nothing in Phases 1 to 4 connects to it.

Keys. Each project has a project URL, a publishable key (the anon key in older dashboards), a secret key (the service_role key in older dashboards), and a database password. Development values go in .env.local at the repository root, which is gitignored. Staging values do not go on this machine at all in Phase 1; the user keeps them in a password manager until Phase 5, when they go directly into Vercel's environment settings. .env.example, which is committed, lists the variable names with no values:

    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
    SUPABASE_SECRET_KEY=
    SUPABASE_DB_PASSWORD=

Secret key usage in Phase 1 is limited to the test setup scripts and the seed script, both run locally and neither imported by application code. No file under app/ or lib/ reads SUPABASE_SECRET_KEY in Phase 1. Nothing prefixed NEXT_PUBLIC_ ever holds a secret.

Distinct key verification, for the gate: compare the two projects' refs, and compare the first twelve hex characters of the SHA-256 of each project's publishable key and of each secret key. Refs differ and all hash prefixes differ. Keys themselves are never printed into any log, report, or chat.

Database connection path: the projects' direct database hosts (db.<ref>.supabase.co) resolve to IPv6 only, and this development machine has no IPv6 route. Every direct database connection, including migrations, the isolation suite's verification reads, and the vetting sub-agent's own queries, therefore goes through the Supavisor session pooler: host aws-1-eu-west-1.pooler.supabase.com, port 5432, user postgres.<project ref>, TLS required. Migrations are applied with the Supabase CLI's --db-url flag against that pooler URL, so no Supabase account access token is needed on this machine. Verified 2026-09-28 against fairview-dev: connected, PostgreSQL 17.6, public schema empty.

Free tier note: inactive free tier projects pause after about a week. A paused staging project is expected and harmless until Phase 5.

## SCHEMA

All tables in the public schema. Helper functions in a private schema named app, not exposed through the API. Money is numeric(12,2). Primary keys are uuid default gen_random_uuid() unless stated. Every table has created_at timestamptz not null default now().

### Enums

app_role: applicant, reviewer, admin.
application_status: in_progress, submitted, under_review, determined, closed.
member_relationship: head, spouse, co_head, dependent, other_adult.
program_type: affordable_housing, property_tax_relief, inclusionary_zoning.
income_source_type: employment, self_employment, benefit, recurring_transfer, other.
connection_method: argyle, plaid, manual_upload.
ingestion_method: argyle, plaid, textract, manual_entry.
pay_frequency: hourly, weekly, biweekly, semi_monthly, monthly, annual.
asset_type: checking, savings, investment, retirement, real_estate, other.
determination_status: draft, pending_review, approved.
document_type: FTIC, ACAEF.
signature_status: not_sent, sent, signed, declined.
workflow_stage: intake, ingestion, calculation, review, documents, signature, complete.

### Tables

#### Platform reference tables (no tenant_id; RLS enabled; read only to clients)

tenants. One row per operator.
id; slug text not null unique, check format ^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$ and not in the reserved list (api, auth, admin, static, _next, favicon.ico, robots.txt, sitemap.xml); display_name text not null. Select for anon and authenticated.

programs.
id; code text not null unique; name text not null; regulator text not null; program_type not null; required_documents document_type[] not null. Select for anon and authenticated.

program_rule_sets.
id; program_id references programs; effective_from date not null; effective_to date null; asset_imputation_threshold numeric(12,2) not null; passbook_rate numeric(6,5) not null; variance_threshold numeric(5,4) not null; tier_percentages smallint[] not null; basis_note text not null. An exclusion constraint prevents overlapping effective ranges for the same program. Rows are never updated; a change is a new row with a new effective date. Select for authenticated.

ami_schedules.
id; jurisdiction text not null; effective_year smallint not null; household_size smallint not null, check between 1 and 8; area_median_income numeric(12,2) not null; unique (jurisdiction, effective_year, household_size). Select for authenticated.

#### Tenant scoped tables

theme_configs.
tenant_id uuid primary key references tenants; logo_path text null (object path in a public Supabase Storage bucket named tenant-branding); color_primary, color_primary_contrast, color_accent text not null, each with check ^#[0-9a-fA-F]{6}$; form_footer_text text not null; updated_at timestamptz. The hex check is a security control, not only validation: these values are injected into CSS, and the check guarantees nothing but a color can reach the stylesheet. The exact token set may be extended by the design system deliverable; every added color column carries the same check.

properties. Building parameters.
id; tenant_id; slug text not null, same format check as tenant slugs; name text not null; address_line1, address_city, address_state, address_postal_code text not null; total_units integer not null check > 0; active boolean not null default true; unique (tenant_id, slug); unique (id, tenant_id).

property_programs.
id; tenant_id; property_id, foreign key (property_id, tenant_id) references properties(id, tenant_id); program_id references programs; set_aside_units jsonb not null default '{}' (units reserved per tier percentage, for example {"60": 10, "80": 5}); active boolean not null default true; unique (property_id, program_id).

users. Profile row for every authenticated person.
id uuid primary key references auth.users(id) on delete cascade (so users.id is the auth reference); tenant_id not null references tenants; role app_role not null default 'applicant'; unique (id, tenant_id). tenant_id is fixed for life: no role may update it (column update privilege revoked, and a trigger rejects changes).

applicants. One household's application.
id; tenant_id; user_id uuid not null, foreign key (user_id, tenant_id) references users(id, tenant_id); property_id uuid not null, foreign key (property_id, tenant_id) references properties(id, tenant_id), so an application can only ever be for the operator's own property; contact_email text, contact_phone text, address_line1, address_line2, address_city, address_state, address_postal_code text; application_status not null default 'in_progress'; updated_at; unique (id, tenant_id); unique (tenant_id, user_id), one open application per applicant account in this build.

household_members.
id; tenant_id; applicant_id, foreign key (applicant_id, tenant_id) references applicants(id, tenant_id); full_name text not null; relationship member_relationship not null; date_of_birth date; ssn_encrypted bytea null; ssn_last_four char(4) null, check ^[0-9]{4}$, plaintext for masked display only; unique (id, tenant_id).

SSN encryption. ssn_encrypted is written only through app.encrypt_pii(text) returns bytea, a security definer function using pgcrypto's pgp_sym_encrypt with a symmetric key held in Supabase Vault (vault secret name pii_key) and read from vault.decrypted_secrets inside the function. The key never leaves the database and never appears in application code or environment variables. No decrypt function is exposed to any client role in Phase 1. The audit logged reveal path is Phase 4. Phase 1 creates the column, the Vault secret, and the encrypt function, so no plaintext storage path ever exists, even temporarily. The Phase 1 intake shell does not collect SSNs.

income_sources.
id; tenant_id; applicant_id (composite FK to applicants); household_member_id (composite FK to household_members), the member who earns or receives it; source_type not null; connection_method not null; provider_reference text null (Phase 2); unique (id, tenant_id).

income_records. Shape finalized in Phase 2, when all three pipelines must produce it identically.
id; tenant_id; income_source_id (composite FK); ingestion_method not null; raw_payload jsonb not null; pay_rate numeric(12,2) (gross); pay_frequency; deductions jsonb null (per the listing's Argyle scope; final shape in Phase 2); expected_annual_hours numeric(7,2) null (for documented less than full time work, CALC-SPEC-1.md Part One); ytd_amount numeric(12,2) null; earnings_year_start date null (for weeks elapsed in YTD extrapolation); captured_at timestamptz not null. Phase 2 must decide, and record in SECURITY.md, what raw_payload may retain, since raw provider payloads can carry account numbers.

asset_records.
id; tenant_id; applicant_id (composite FK); household_member_id null (composite FK when present; null for jointly held assets); asset_type not null; institution_name text; account_number_encrypted bytea null (via app.encrypt_pii); account_last_four char(4) null; current_balance numeric(12,2) not null; actual_income numeric(12,2) null; income_determinable boolean not null default false.

calculated_determinations. Engine behavior and immutability are Phase 3.
id; tenant_id; applicant_id (composite FK); program_id references programs; rule_set_id references program_rule_sets; calculation_version text not null; annualized_income, imputed_asset_income, total_annual_income numeric(12,2) null (null while pending_review with no figure selected); ami_tier text null; review_required boolean not null; calculation_trace jsonb not null, check it is a non-empty JSON object, enforcing RULES.md's "no determination without a trace" at the database level; status determination_status not null default 'draft'; calculated_at timestamptz not null; unique (id, tenant_id).

generated_documents.
id; tenant_id; applicant_id (composite FK); determination_id, foreign key (determination_id, tenant_id) references calculated_determinations(id, tenant_id); document_type not null; storage_path text not null; applicant_signature_status signature_status not null default 'not_sent'; landlord_signature_status signature_status not null default 'not_sent'; generated_at timestamptz not null.

workflow_state. Append only.
id; tenant_id; applicant_id (composite FK); stage workflow_stage not null; assigned_reviewer_id uuid null, foreign key (assigned_reviewer_id, tenant_id) references users(id, tenant_id); action text not null; actor_id uuid not null references users(id). The current stage of an application is its newest row.

audit_log. Append only.
id bigint generated always as identity; tenant_id; actor_id uuid null (null only for system actions); action text not null; target_table text; target_id uuid; before_value jsonb; after_value jsonb; reason text null.

## TENANT AND ROLE CLAIMS

A Custom Access Token Hook, a Postgres function public.custom_access_token_hook(event jsonb), runs on every token issue and refresh. It lives in public because that is where the hosted dashboard's hook configuration looks; execute is revoked from public, anon, and authenticated, so it is not callable over the API. It looks up public.users by the user's id and adds two top level claims: tenant_id and app_role. A user with no public.users row gets neither claim and, through RLS, sees nothing. The hook is granted to supabase_auth_admin only and revoked from every client role.

Claims are never read from user_metadata. A user can edit their own user_metadata, so a tenant claim sourced there would let anyone move themselves into another tenant. The isolation test suite includes a test that tries exactly this.

Helper functions, stable, security definer, in schema app:

    app.tenant_id()  returns uuid      -- (auth.jwt() ->> 'tenant_id')::uuid
    app.user_role()  returns app_role  -- (auth.jwt() ->> 'app_role')::app_role
    app.is_staff()   returns boolean   -- app.user_role() in ('reviewer', 'admin')
    app.my_applicant_ids() returns setof uuid  -- applicants.id where user_id = auth.uid() and tenant_id = app.tenant_id()

Claims refresh when the token refreshes, so a role change takes effect within one token lifetime. tenant_id cannot change, so staleness never affects isolation.

Applicant accounts. An applicant signs up on a tenant's own page. A trigger on auth.users insert creates the public.users row, taking the tenant from the slug passed at sign up and always setting role to applicant, never from any other metadata value. A person choosing which tenant's page to sign up on is not a privilege: it is the same as visiting that tenant's site. Reviewer and admin rows are created only by an admin through a server side path; no sign up path can produce a staff role.

## RLS POLICY PATTERN

Every tenant scoped table gets enable row level security in its creating migration, and separate policies per command, to authenticated only. Two layers, both required:

Tenant layer, in every policy on every table: tenant_id = app.tenant_id(). Direct comparison, never a join.

Role layer: applicants see only their own household's rows; staff see every row in their tenant.

The pattern, shown for household_members and replicated on every table with the table's own ownership column:

    alter table household_members enable row level security;

    create policy hm_select on household_members for select to authenticated
      using (tenant_id = app.tenant_id()
             and (app.is_staff() or applicant_id in (select app.my_applicant_ids())));

    create policy hm_insert on household_members for insert to authenticated
      with check (tenant_id = app.tenant_id()
                  and app.user_role() = 'applicant'
                  and applicant_id in (select app.my_applicant_ids()));

    create policy hm_update on household_members for update to authenticated
      using (tenant_id = app.tenant_id()
             and (app.is_staff() or applicant_id in (select app.my_applicant_ids())))
      with check (tenant_id = app.tenant_id());

    -- no delete policy: deletion is not a client operation in Phase 1

Per table access in Phase 1 (T means within own tenant; own means own household only):

tenants, programs: select for anon and authenticated; no client writes.
program_rule_sets, ami_schedules: select for authenticated; no client writes.
theme_configs, properties, property_programs: select for anon and authenticated; insert and update by admin, T.
users: select own row, or staff T; insert only through the sign up trigger; update of role by admin T; tenant_id never.
applicants: select, insert, and update, own for an applicant; select and update of application_status for staff, T.
household_members, income_sources, asset_records: select, insert, and update own for an applicant; select for staff, T.
income_records, calculated_determinations, generated_documents: select own for an applicant, select for staff, T; no client writes (written server side from Phase 2 and 3 onward, per RULES.md).
workflow_state: select own for an applicant, select for staff, T; insert by staff T; no update or delete for anyone.
audit_log: select by staff T; client insert only through public.write_audit(action, target_table, target_id, before_value, after_value, reason), a security definer function callable by staff only, which takes tenant_id and actor_id from the JWT, never from its arguments; no update or delete for any API role, including the service role.

Encrypted columns. household_members.ssn_encrypted and asset_records.account_number_encrypted are left out of every client column grant, so no client can write them at all, not even arbitrary bytes. Values reach them only through app.encrypt_pii, executable by the service role only in Phase 1. The same column grant mechanism limits applicants to the columns they legitimately fill in; for example, they cannot set asset income or the income determinable flag, which come from connected data.

income_records carries applicant_id directly, like tenant_id. The applicant ownership check then needs no join, and a composite foreign key keeps it consistent with its income source's applicant.

Append only tables. workflow_state and audit_log grant no update or delete to anon, authenticated, or service_role. Only the database owner, through a direct connection, can remove rows, which the isolation suite's teardown uses.

Defense in depth. Beyond RLS: revoke all on every table from anon except select on the five public tables (tenants, programs, theme_configs, properties, property_programs); revoke insert, update, and delete on the four platform reference tables from anon and authenticated; revoke update and delete on workflow_state and audit_log from anon and authenticated; revoke update (tenant_id) on users. RLS remains the primary control; the revokes ensure a missing policy fails closed.

Composite foreign keys are part of isolation, not only integrity: even if a policy were wrong, a child row cannot point at a parent in another tenant.

## SEED DATA

Reference data, in supabase/seed.sql:

programs: FHA-AHP, FHA-Meridian Affordable Housing Program, regulator FHA-Meridian, affordable_housing, requires FTIC. ACA-PTR, Ashland County Affordable Housing Assessment Relief, regulator Ashland County Assessor, property_tax_relief, requires ACAEF. FAIRVIEW-IZ, City of Fairview Inclusionary Zoning, regulator City of Fairview, inclusionary_zoning, requires FTIC.

program_rule_sets: one per program, effective 2026-01-01, asset imputation threshold 50000.00, passbook rate 0.00400, variance threshold 0.1000, tier percentages {30,50,60,80}, basis note stating these are CALC-SPEC-1.md's values under the current HOTMA rule, provisional until the Phase 3 compliance confirmation of the effective year and each program's tier set (MASTER-SPEC-1.md, open decisions).

ami_schedules: jurisdiction Ashland County, effective year 2026, household sizes 1 to 6 with CALC-SPEC-1.md Part Five's figures: 61,600.00; 70,400.00; 79,200.00; 88,000.00; 95,040.00; 102,080.00. Sizes 7 and 8 are not seeded, because CALC-SPEC-1.md does not define them. The engine must treat a missing row as a stop for review, never as a guess.

The configured operator: tenant Cedar Row Residential, slug cedar-row, with a theme_configs row and two properties. Maple Court (slug maple-court, 48 units, in Fairview) participates in FHA-AHP and ACA-PTR. Linden Terrace (slug linden-terrace, 120 units, in Fairview) participates in FAIRVIEW-IZ.

The seed contains no people and no second tenant. The dummy second tenant is inserted by SQL at verification time, never by a migration or seed file, because the acceptance criterion is that it works without a code change.

## NEXT.JS TENANT RESOLUTION AND THEMING

Routes:

    app/layout.tsx                  html and body, neutral base styles, no tenant logic
    app/page.tsx                    platform root, a neutral page; never lists tenants
    app/[tenant]/layout.tsx         resolves tenant, injects theme, 404 on unknown slug
    app/[tenant]/page.tsx           operator landing page: its properties and their programs
    app/[tenant]/sign-in/page.tsx   email one time code sign in and sign up, carrying ?property=
    app/[tenant]/apply/page.tsx     application overview for ?property=: steps and saved progress
    app/[tenant]/apply/[step]/page.tsx  one intake step: household, income, assets, documents, review
    app/[tenant]/preview/page.tsx   theming preview: every token rendered, no data

Resolution. app/[tenant]/layout.tsx is a server component. It calls resolveTenant(slug), wrapped in React cache() so it runs once per request: a select from tenants joined to theme_configs using the publishable key, relying on the public read policy. Unknown slug calls notFound(). Tenant pages render dynamically, with no generateStaticParams and no build time tenant data, so a tenant inserted into the database renders on its next request with no rebuild and no redeploy.

Theming. Before injection, the layout parses the theme row with a Zod schema that re-checks every color against ^#[0-9a-fA-F]{6}$, a second layer on the database check. It then renders a style element setting the theme's CSS custom properties on :root (--color-primary, --color-primary-contrast, --color-accent, plus whatever the design system adds). Tailwind's theme maps its color utilities to those variables, so no component contains tenant specific logic or tenant specific classes.

Session and tenant mismatch. On authenticated routes, the layout compares the session's tenant_id claim with the resolved tenant's id. On mismatch it renders a "signed in to a different property manager" page offering sign out, and loads no data. RLS would return nothing anyway; this check exists so the user sees a clear message instead of an empty application.

Auth. Supabase Auth, email one time code, through @supabase/ssr with cookie sessions and the standard session refresh in the Next.js request middleware (proxy.ts on Next.js 16 and later). Sign up passes the tenant slug so the sign up trigger can assign the tenant. SMS sign in through Twilio is not Phase 1.

Property selection. The property query parameter is resolved against the current operator's properties. An unknown or inactive property slug sends the applicant back to the operator landing page to choose one; it never creates an application. The composite foreign key on applicants.property_id makes an application for another operator's property impossible at the database level as well.

Intake shell. After first sign in, the applicant's applicants row is created for the chosen property, owned by them. The apply overview lists the steps and their saved state, read from the database, so progress resumes on any device. Step pages are rough scaffolding only (headings, placeholder fields, next and back) until DESIGN.md's design system exists, per DESIGN.md's own rule. Save and resume is real in Phase 1; the forms' visual design is not.

## DESIGN SYSTEM DELIVERABLE

Produced by the UX and Interface Skill in parallel, written into DESIGN.md's two pending sections, replacing the pending text:

1. Token set, split into tenant swappable tokens (exactly the theme_configs color columns, which must match one for one) and fixed platform tokens (neutrals, semantic success, warning, and error, the type scale, the spacing scale, radii).
2. A contrast rule for tenant colors: color_primary_contrast on color_primary must reach at least 4.5 to 1. The preview page displays the measured ratio, so a tenant with an illegible theme is visible, not silent.
3. Intake flow screen specifications, mobile first: operator landing with its properties, sign in, application overview with resume state, each step, document and photo upload, review and sign placeholder.
4. The theming preview screen's content.

The reviewer dashboard design is Phase 4 and not part of this deliverable.

## CROSS TENANT ISOLATION TEST PROCEDURE

Automated with Vitest in tests/isolation/, run against fairview-dev through real sign in via the Supabase API, never through SQL role simulation alone. Real sign in exercises the whole path: the hook, the claims, and RLS.

Setup (tests/isolation/setup.ts, the only code that uses the secret key): create tenant B, harborpoint, Harbor Point Communities, with a visibly different theme and one property with one property_programs row. Create, through the Admin API with email pre-confirmed so no email is sent: in tenant A (cedar-row), applicant A1, applicant A2, and reviewer RA; in tenant B, applicant B1 and reviewer RB. For each applicant, seed one row in every tenant scoped table, written with the secret key, since some tables have no client write path. Record every seeded id. Sign each user in with the publishable key to get a real session.

Positive controls, which must pass or every negative result below is meaningless:
P1. A1 reads their own applicants, household_members, income_sources, income_records, asset_records, calculated_determinations, generated_documents, and workflow_state rows: each returns exactly the seeded row count, not zero.
P2. RA reads every tenant scoped table and gets tenant A's rows for both A1 and A2.
P3. A1 inserts a household_members row on their own application: succeeds.
P4. A1 updates their own household_members row: one row affected.

Cross tenant reads, zero rows each:
X1. A1, then RA, select every tenant scoped table filtered to tenant B's tenant_id: zero rows.
X2. A1, then RA, select every tenant scoped table unfiltered: only tenant A rows, none of tenant B's seeded ids.
X3. A1 and RA each select tenant B's seeded row ids by primary key: zero rows.
X4. The same three checks run in the other direction, as B1 and RB against tenant A.

Cross tenant writes, rejected:
W1. A1 inserts a household_members row with tenant_id set to tenant B: rejected with an RLS violation.
W2. A1 inserts a household_members row with its own tenant_id but applicant_id pointing at B1's application: rejected (RLS or composite foreign key; the error is recorded).
W3. RA updates B1's applicants row: zero rows affected, and a secret key read afterwards confirms B1's row is unchanged. An RLS update filters silently rather than erroring, so the after-read is required, not optional.
W4. RA deletes B1's workflow_state row: zero rows affected, and the row is confirmed still present.
W5. RA inserts into audit_log directly: rejected. RA calls public.write_audit with arguments naming tenant B: the row lands in tenant A with RA as actor, because tenant and actor come from the JWT. A1, an applicant, calls public.write_audit: rejected.

Within tenant, applicant to applicant:
A1. A1 selects A2's rows in every table: zero rows.
A2. A1 updates A2's household_members row: zero rows affected, confirmed unchanged.

Claim source attacks:
C1. A1 sets their own user_metadata tenant_id to tenant B's id, refreshes the session, and repeats X1: still zero rows. This proves the claim is not sourced from editable metadata.
C2. A1 attempts to update their own users.tenant_id and users.role: both rejected.
C3. A user created with no public.users row signs in: zero rows from every table, including their own tenant's.

Anonymous:
N1. The anon client reads the five public tables (tenants, programs, theme_configs, properties, property_programs): succeeds.
N2. The anon client reads every other table: zero rows or a permission error.
N3. The anon client attempts an insert or update on each of the five public tables: rejected.

Platform reference tables:
R1. A1, RA, and an admin of tenant A each attempt insert, update, and delete on tenants, programs, program_rule_sets, and ami_schedules: all rejected, confirmed unchanged by a secret key read.

Cross tenant properties:
Y1. An admin of tenant A attempts to insert a property_programs row, or an applicants row as A1, pointing at tenant B's property: rejected.
Y2. An admin of tenant A attempts to update tenant B's properties and theme_configs rows: zero rows affected, confirmed unchanged.

Append only:
L1. Every role attempts to update and to delete an audit_log row and a workflow_state row: all rejected or zero rows, confirmed unchanged.

Teardown deletes every seeded row, every test auth user, and tenant B, and confirms none remain. It uses a direct database connection as the owner for the append only tables, and the secret key for everything else. Each run writes a report to tests/isolation/reports/ with a UTC timestamp, the project ref (never keys), and every test's actual result: expected, actual, row counts, error codes. This report is evidence for the gate, not only a pass or fail.

These tests are permanent. Phase 4 re-runs them against the complete application, and Phase 5 re-runs them against staging, per SECURITY.md.

## SECOND TENANT RENDER CHECK

Automated with Playwright in tests/theming/. Insert tenant harborpoint, its theme_configs row, and one property by SQL only. Load /cedar-row and /harborpoint. For each, assert the page returns 200, the operator's display name and its own properties render (and never the other operator's), and the computed value of --color-primary on :root equals that tenant's theme_configs value. Then change harborpoint's color_primary by SQL, reload, and assert the new value renders with no rebuild or redeploy. Load /no-such-tenant and assert 404. Store screenshots of both themed landing pages and the preview pages with the report. Tear down the tenant afterwards.

## SECURITY SKILL EARLY PASS

Scope is tenant isolation only, per SECURITY.md's audit schedule. The Security Skill independently reviews the isolation suite's design for gaps, not only its results, runs the suite itself, and then tries at least these beyond the suite: a request carrying a tampered JWT, rejected by the signature check; a direct REST call to each table with only the publishable key; a search of the built client bundle (.next/static) for the secret key's value and for the SUPABASE_SECRET_KEY name; and confirmation that every table in the public schema has RLS enabled, by querying pg_tables.rowsecurity, not by reading migrations. Findings are written to SECURITY.md under a Phase 1 heading. Any high severity finding blocks the gate.

## GATE EVIDENCE FOR THE MASTER VETTING SUB-AGENT

For each PROCESS-RULES.md Phase 1 item, the evidence the vetting sub-agent obtains itself, not from the builder's reports:

Environments: the key hash prefix comparison described under ENVIRONMENTS, done by the sub-agent.
tenant_id on every tenant scoped table: a query against information_schema.columns listing every public table and whether it has tenant_id, with exactly the four platform reference tables (tenants, programs, program_rule_sets, ami_schedules) as the exceptions.
RLS on every table: a query against pg_tables for rowsecurity, which must be true for all seventeen tables, plus pg_policies listing each table's policies.
Reference tables read only: the sub-agent attempts a write to each of the four reference tables as an authenticated user itself.
Operator renders its properties: the sub-agent loads /cedar-row and confirms Maple Court and Linden Terrace render from the database.
Cross tenant read and write: the sub-agent runs the isolation suite itself, reads the raw report, and additionally performs at least one cross tenant read and one cross tenant write by hand, outside the suite, to confirm the suite is not the only thing being trusted.
Tenant from URL slug, and the second tenant: the sub-agent performs the SQL insert itself, loads both slugs, and inspects the rendered CSS variables.
Design system: DESIGN.md's pending sections replaced with real content matching the token set in theme_configs.
Security early pass: SECURITY.md's Phase 1 findings exist, with no open high severity item.
Genericization: the exact git grep command from RULES.md, no output.
