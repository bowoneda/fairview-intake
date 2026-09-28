# PHASE_1_COMPLETE.md — Project 1: Fairview Compliance Intake Platform

Produced by an independent Master Vetting sub-agent on 2026-09-28. It did not build any part of Phase 1. Every piece of evidence below was obtained by the sub-agent itself, in this session, against fairview-dev (project ref mdatwozuqdiwioezalom), unless it says otherwise. The builder's reports, MEMORY.md, SECURITY.md evidence, and earlier test reports were treated as leads only.

Timestamps. Two clocks disagree by about four hours. The Postgres server's `now()` (shown as "DB UTC") read 18:36 to 18:44 UTC during vetting. This machine's clock and Node's `toISOString()` (shown as "local UTC") read 14:35 to 14:44 UTC over the same period. Both are given where available. The skew is an environment observation, not a Phase 1 finding.

Credentials were loaded from .env.local and never printed. The staging project was touched only by the three rejection probes and one no-key control described under item 1.

## PHASE 1: ARCHITECTURE AND SHELL

[x] Separate development and staging Supabase environments exist with distinct keys, set up before any schema work, and development keys confirmed distinct from every other environment's.

Method: I tried the development credentials against the staging project and expected them to be rejected. Each rejection was paired with a positive control against development. I did not read or print any staging credential. Local UTC was 2026-09-28T14:37Z, and DB UTC was 18:37Z.
- Project refs differ. Dev is mdatwozuqdiwioezalom, the host in .env.local's URL. Staging is sfjgzcqvqinnfdoapnim.
- Control: dev publishable key against dev `GET /auth/v1/settings` returned HTTP 200. Dev secret key against dev `GET /rest/v1/tenants` returned HTTP 200.
- (a) Dev publishable key against staging `GET https://sfjgzcqvqinnfdoapnim.supabase.co/auth/v1/settings` returned HTTP 401, "Invalid API key ... might also be owned by another Supabase project".
- (b) Dev secret key against staging `GET /rest/v1/tenants` returned HTTP 401, "Invalid API key". Dev secret key against staging `/auth/v1/settings` also returned 401.
- Staging is live, not paused: a request to staging with no key returned 401 "No API key found in request".
- (c) Postgres to the staging pooler, with host aws-1-eu-west-1.pooler.supabase.com:5432, user postgres.sfjgzcqvqinnfdoapnim, TLS, and the dev database password, returned error 28P01 "password authentication failed". Control: the same password against user postgres.mdatwozuqdiwioezalom connected (current_user postgres, DB UTC 18:37:32Z).
- No staging credential in the repository. I searched the working tree, excluding node_modules, .next, and .git:
  - The staging ref appears only in MEMORY.md. A project ref is public.
  - Key-shaped strings (`sb_secret_`/`sb_publishable_` followed by 16 or more characters) appear only in .env.local. That file holds dev values: they were accepted by dev and rejected by staging.
  - There are no JWT-shaped tokens anywhere.
  - Git history (`git log -p --all`) has 0 key-shaped matches.
  - The only tracked env-type file is .env.example. `git ls-files` shows .env.local is not tracked.
- Ordering: .env.example was committed in 527262f (04:32 -04:00). The first migrations were committed in d76cbc5 (06:16 -04:00). The date staging was created cannot be read without dashboard access. The commit order is consistent with the claim.

[x] Multi tenant Supabase schema created with tenant_id on every tenant scoped table.

Method: I queried the live catalog, `pg_tables` joined to `information_schema.columns`, at DB UTC 18:36:40Z.
- There are 17 public tables.
- has_tenant_id is false for exactly 4 tables: ami_schedules, program_rule_sets, programs, tenants.
- has_tenant_id is true for the other 13: applicants, asset_records, audit_log, calculated_determinations, generated_documents, household_members, income_records, income_sources, properties, property_programs, theme_configs, users, workflow_state.

[x] Row Level Security policy present on every tenant scoped table.

Method: the same catalog query, plus `pg_policies`, at DB UTC 18:36:40Z.
- `rowsecurity = true` on all 17 tables. `relforcerowsecurity` is false on all of them; see Observations.
- Policy counts per tenant scoped table:
  - applicants 3, asset_records 3, household_members 3, income_sources 3
  - properties 3, property_programs 3, theme_configs 3
  - users 3 (select, update, and a select for supabase_auth_admin)
  - workflow_state 2 (select, insert)
  - audit_log 1, calculated_determinations 1, generated_documents 1, income_records 1 (select only; there is no client write path, by design)
- Every authenticated policy's USING or WITH CHECK clause begins `tenant_id = app.tenant_id()`, a direct comparison.
- `app.tenant_id()` is `nullif(auth.jwt() ->> 'tenant_id','')::uuid`.
- `public.custom_access_token_hook` reads tenant_id and role from `public.users` only. It strips any incoming claim with the same name.
- Grants: anon has SELECT only, on exactly tenants, programs, theme_configs, properties, and property_programs. No UPDATE or DELETE table grant exists for anon or authenticated on any private table. authenticated has only SELECT on the four reference tables.

[x] Cross tenant read attempt, performed as an actual query by two simulated tenant users, returns zero rows.

Method 1, the suite: I ran `npm run test:isolation` myself.
- Vitest summary: "Test Files 1 passed (1), Tests 26 passed (26)", duration 116.68 s, process exit 0.
- Newest report: tests/isolation/reports/isolation-2026-09-28T14-38-11-119Z.json. projectRef mdatwozuqdiwioezalom, local UTC 14:38:11Z to 14:39:51Z.
- total 283, passed 283, failed 0. I recounted the entries myself and got 283 passing.
- Positive controls: P1 shows A1 reading exactly 1 own row in each of 9 private tables.
- Cross tenant reads: X.1, X.2, and X.3 as A1 and RA, and X4.1 to X4.3 as B1 and RB, over all 10 private tables. Every filtered and by-id read returned "0 row(s)", and no unfiltered read contained any of the other tenant's rows (120 checks).
- The Vitest summary and the report agree, so the SEC-P1-05 condition does not apply.

Method 2, by hand, outside the suite: a script I wrote myself, run at local UTC 14:40:58Z to 14:41:17Z (DB UTC 18:41:01Z).
- As the owner, I inserted a throwaway tenant `vet-probe` with a theme and property "Vet Tower".
- I created user VA (cedar-row) and user VB (vet-probe) through the Admin API, then signed each in with the publishable key using a password grant.
- Decoded claims: VA had tenant cedar-row, app_role applicant. VB had tenant vet-probe, app_role applicant.
- As the owner, I seeded one application and one household member for each.
- Positive controls, all HTTP 200 with 1 row: VA read its own applicant and household member, and VB read its own applicant and household member.
- Cross tenant reads, all HTTP 200 with 0 rows:
  - VA read VB's applicant by id.
  - VA read household_members where tenant_id = vet-probe.
  - VB read VA's applicant by id.
  - VB read applicants where tenant_id = cedar-row. This included the real cedar-row applicant.
  - VB read household_members where tenant_id = cedar-row.
- VB's unfiltered users and applicants reads each returned 1 row. cedar-row holds 2 applicants at that point, so these are VB's own rows only.

[x] Cross tenant write attempt, same method, is rejected.

Method 1, the suite, in the same run as above:
- W1: A1 inserted a household member with tenant B's tenant_id. Error 42501, RLS violation. Owner count afterwards: 0.
- W2: A1 inserted a household member on B1's application. Error 42501. Owner count: 0.
- W3: RA updated B1's application. 0 rows, and the owner re-read showed status still in_progress.
- W4: RA deleted B1's workflow_state row. Error 42501, and 1 row was still present.
- W5.1: RA inserted directly into audit_log. Error 42501.
- W5.2: RA called write_audit naming tenant B. The row landed in tenant A with actor RA.
- W5.3: an applicant called write_audit. Error 42501.
- Also passing: AP2, Y1.1 to Y1.3 (23503 composite FK errors and 42501), Y2, and L1.

Method 2, by hand (same script and time as above). Every rejection was confirmed by an owner connection re-read:
- VB updated VA's household member: HTTP 200 with 0 rows. Owner re-read: full_name still "VET A head".
- VB updated VA's applicants.address_city: 0 rows. Owner re-read: still null.
- VA inserted a household member with tenant_id = vet-probe on VB's application: error 42501. Owner count: 0.
- VA inserted with its own tenant_id but VB's applicant_id: error 42501. Owner count: 0.
- VB deleted VA's household member: error 42501 "permission denied". Owner count: still 1.
- Positive write control: VA updated its own household member. 1 row, and the owner re-read showed "VET A head renamed".

[x] Next.js intake shell resolves the operator from the URL slug and renders its properties (building parameters) from the database.

Method: I started `npm run dev` myself on port 3000 and fetched the served HTML with curl (DB UTC about 18:42Z).
- `/cedar-row` returned HTTP 200. The page injects `:root{--color-primary:#1F4E5A;--color-primary-contrast:#FFFFFF;--color-accent:#C9822B;}`, which matches the live theme_configs row.
- The page contains "Maple Court" (6 occurrences) and "Linden Terrace" (6), "48 units" and "120 units", and the three program names FHA-Meridian Affordable Housing Program, Ashland County Affordable Housing Assessment Relief, and City of Fairview Inclusionary Zoning.
- It contains 0 occurrences of any other operator's name or property.
- Data source check: I renamed the throwaway operator's property by SQL to "Vet Gardens Renamed". The next request showed the new name, 4 occurrences.
- `/no-such-tenant` returned HTTP 404 with "We could not find that page" and no tenant color variables.
- Playwright test 1 also passed; see the next item.

[x] A second, dummy tenant can be inserted and its own theme renders at its own slug without a code change.

Method 1, by hand:
- At DB UTC 18:42:13Z I inserted tenant `vet-render` by SQL, with theme #7A1F2B / #FFFFFF / #3366AA and property "Vet Gardens".
- `/vet-render` returned HTTP 200 with `:root{--color-primary:#7A1F2B;--color-primary-contrast:#FFFFFF;--color-accent:#3366AA;}`, "Vetting Render Operator" (4), and "Vet Gardens" (4). It showed 0 occurrences of Cedar Row, Maple Court, Linden Terrace, or Pier View.
- At DB UTC 18:42:42Z I set color_primary to #0B6E4F by SQL. The next request served `--color-primary:#0B6E4F`, with no rebuild and no restart.
- `git status --porcelain` was empty before and after, so no code changed.
- The tenant was then deleted.

Method 2: I ran `npm run test:theming` myself (Playwright 1.60.0, pinned version unchanged), reusing my dev server.
- "5 passed (44.9s)", exit 0:
  - the configured operator's theme and properties
  - the second operator inserted by SQL
  - a database theme change shows on the next request
  - preview contrast
  - neutral 404
- My run regenerated the screenshots at 10:43 local time. I opened harborpoint-landing.png: a plum header band with "Harbor Point Communities", the h1 "Apply for a home with Harbor Point Communities", only the "Pier View" card (24 units), and a plum "Apply for Pier View" button.
- I also opened cedar-row-preview.png: the swatches #1F4E5A / #FFFFFF / #C9822B, "9.15:1, passes (minimum 4.5:1)", "Accent on white: 3.13:1", and a Linden Terrace property card.

[x] Platform reference tables (tenants, programs, program_rule_sets, ami_schedules) have RLS enabled with no client write path, confirmed by an attempted write.

Method:
- RLS: `rowsecurity = true` on all four, each with a single SELECT policy.
- Attempted writes, as authenticated applicant VA with a real session (local UTC 14:41:08Z to 14:41:12Z): insert, update, and delete on each of the four tables. All 12 attempts returned error 42501 "permission denied for table ...".
- As VB (the other tenant) with raw REST POST to each of the four tables: HTTP 403 with code 42501, all four.
- md5 of each table's full contents, taken before and after by the owner: unchanged.
- The isolation suite's R1 (A1, RA, AA, with an insert, update, and delete per table, plus hashes) was also 40 of 40 passing in my run.

[x] UX and Interface Skill's design system and intake flow specification produced, DESIGN.md updated accordingly.

Method: I read DESIGN.md in full.
- It contains a real visual design system: the token principle, tenant tokens, the contrast rule and formula, platform tokens (neutrals, semantic colors, focus ring, type scale, spacing, radii), and components.
- It contains screen-level specifications for: operator landing, sign in, application overview, the five intake steps, the different-operator page, the 404, and the theming preview. It also has a save-and-resume section.
- The reviewer dashboard is marked as Phase 4, which is correct scope.
- Tenant tokens are exactly `--color-primary`, `--color-primary-contrast`, and `--color-accent`. In the live database, theme_configs has exactly three color columns (color_primary, color_primary_contrast, color_accent), each with the CHECK `^#[0-9a-fA-F]{6}$`, so the tokens match the columns one for one. lib/tenant.ts injects exactly these three.
- I recomputed the stated contrast ratios with the WCAG formula. Cedar contrast on primary is 9.15, and Cedar accent on white is 3.13. Harbor contrast on primary is 9.74, and Harbor accent on white is 4.25. All four match DESIGN.md.

[x] Security Skill's early tenant isolation pass complete, no unresolved high severity finding.

Method: I read SECURITY.md's "PHASE 1 EARLY PASS FINDINGS" section.
- It records findings SEC-P1-01 to SEC-P1-06. There is no High finding. The Medium finding, SEC-P1-01, is marked fixed. The rest are Low (one fixed, one accepted) or Informational.
- Spot checks I performed myself (local UTC 14:41:12Z to 14:41:15Z):
  - (S4) A real VA token with its payload edited to tenant_id = vet-probe and app_role = admin, original signature kept: HTTP 401 PGRST301.
  - (S5) An alg=none token: HTTP 401 PGRST301.
  - Control: the genuine VA token returned HTTP 200 with 1 row.
  - (S8) Anon, publishable key only, GET on household_members, applicants, users, audit_log, and program_rule_sets: HTTP 401 with code 42501 on each.
  - Control: anon GET tenants returned HTTP 200 with rows.
  - Anon POST to household_members: HTTP 401, 42501.
  - (SEC-P1-01 fix) Suite E4 passed in my run. It covers 3 rejected status changes and 1 rejected revert, plus the submit and reviewer controls.
  - (S14, partial) `grep` for SUPABASE_SECRET_KEY and SUPABASE_DB_PASSWORD across app/, lib/, components/, and proxy.ts found no matches (exit 1).

[x] Genericization check from RULES.md run, exact command as written there, no output.

Method: at local UTC 2026-09-28T14:35:40Z, from the repository root, with a clean working tree at HEAD c8c771a, I ran:

    git grep -n -i -E "<the pattern in RULES.md>" -- . ":!CLAUDE.md" ":!COLLABORATION-1.md" ":!MASTER-SPEC-1.md" ":!RULES.md"

It produced no output, with exit code 1.

Phase 1 status: complete. All 11 items were independently verified by the Master Vetting sub-agent.

## Test data and cleanup

Baseline before vetting (DB UTC 18:36:11Z), which is identical to the state after vetting (DB UTC 18:44:18Z):
- 1 tenant (cedar-row), 3 programs, 3 program_rule_sets, 6 ami_schedules rows
- 1 theme_configs row, 2 properties, 3 property_programs
- 1 user, 1 applicant, 1 household member, 1 auth.users row
- 0 rows in income_sources, income_records, asset_records, calculated_determinations, generated_documents, workflow_state, and audit_log

Also after vetting: auth users matching `vet-%` = 0 and `iso-%` = 0, and cedar-row's theme and properties are unchanged.

Data I created and removed:
- tenant vet-probe, its theme, and property "Vet Tower"
- users vet-a@example.test and vet-b@example.test, with their two applicants and household members
- tenant vet-render, its theme, and property "Vet Gardens"

The suites' own fixtures (harborpoint, iso-* users) were torn down by the suites; the counts above confirm it. The real applicant's rows were read (as counts only) and never modified. My temporary scripts were deleted, and the dev server I started was stopped.

## Observations (not checklist failures)

1. No table uses FORCE ROW LEVEL SECURITY, so the owner connection bypasses RLS. SECURITY.md documents this as SEC-P1-04. It matters in Phase 5, where the database password must stay out of the application environment.
2. SEC-P1-03 (anon can list every operator and property) is accepted as Low for Phase 1. It should be revisited in Phase 4 as planned.
3. The date the staging project was created cannot be verified without dashboard access. Commit order is the only evidence that environments came before schema.
4. The manual cross-tenant probes used applicant accounts only. Cross-tenant attempts by reviewers and admins rest on the isolation suite (RA, RB, AA), which I ran myself.
5. The Harbor Point fixture property shows no program tags on its landing card, because its fixture has no property_programs row in the theming suite. This is cosmetic.
6. This machine's clock is about 4 hours behind the database server's clock (see Timestamps). Report timestamps from this machine should be read with that in mind.
