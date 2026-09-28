# DESIGN.md — Project 1: Fairview Compliance Intake Platform

Status: partially complete. The architecture and data model sections below are final, carried directly from MASTER-SPEC-1.md. The visual design system and screen level specifications are not yet produced. They are the UX and Interface Skill's Phase 1 deliverable and this file must be updated, not left stale, once that skill has run.

## ARCHITECTURE SUMMARY

Single Supabase project. Single shared schema. Tenant isolation enforced through Postgres Row Level Security keyed on a tenant_id column present on every tenant scoped table, not through separate schemas or separate databases per tenant, and not through application layer checks alone. Full reasoning is in MASTER-SPEC-1.md. The short version: this is how a real multi tenant SaaS of this kind is actually operated, and demonstrating RLS enforced isolation correctly is one of the more valuable things this project can show.

Tenant resolution happens from a URL path slug, the first path segment, for example a path like /fairview/apply, not a subdomain and not a query parameter. A theme configuration table keyed by tenant_id supplies the brand colors, logo, and jurisdiction display names, injected server side as CSS custom properties. Only FHA-Meridian is actually configured, but a second tenant must be addable without a code change, since an unexercised claim of multi tenancy is not a real demonstration of it.

## DATA MODEL

Carried from MASTER-SPEC-1.md, which holds the column level definitions and is authoritative if the two disagree: tenants, theme_configs, users, applicants, household_members, income_sources, income_records, asset_records, calculated_determinations, generated_documents, workflow_state, audit_log. Every table except tenants carries its own tenant_id with an RLS policy. Social security numbers (household_members) and full account numbers (asset_records) are encrypted at the field level. Determination status is one of draft, pending_review, approved.

The calculated_determinations table's calculation trace field is the single most important field in the schema from a compliance standpoint. It must store every intermediate value the engine used, not only the final annual income figure: the annualized run rate, the YTD extrapolation if one was computed, which figure was used and why, the actual asset income, the imputed asset income if the threshold was crossed and which portion of assets that imputation applied to, and the AMI tier boundary the household landed inside. A determination that cannot be independently re-derived from its own stored trace is not an auditable determination, and independent re-derivation is exactly what the Regulatory Compliance Verification Skill's Phase 3 job requires.

## CALCULATION LOGIC, POINTER

The full income determination methodology, with real HUD Part 5 and HOTMA sourced rules and nine worked numeric examples with expected outputs, lives in CALC-SPEC-1.md. Do not restate or re-derive that logic here. Reference it. If this file and CALC-SPEC-1.md ever disagree, CALC-SPEC-1.md is authoritative, since it was produced by the Regulatory Compliance Verification Skill specifically to be the source of truth for this logic.

## PENDING: VISUAL DESIGN SYSTEM

Not yet produced. When the UX and Interface Skill runs its Phase 1 pass, this section must be replaced with the actual design system: color tokens (theme-able per tenant, not hardcoded), typography scale, spacing scale, and component specifications for at minimum the applicant intake flow (mobile first, save and resume, document and photo upload, e-signature step) and later, in Phase 4, the reviewer dashboard (dense, fast to scan, keyboard operable, built for repeated daily use rather than a one time applicant visit).

Until this section is filled in, no engineering work on visual components should proceed past rough scaffolding, since building real UI against a description rather than an actual design system risks exactly the kind of thin, mismatched output the project's own standing practice exists to avoid.

## PENDING: SCREEN LEVEL SPECIFICATIONS

Not yet produced. Depends on the visual design system above. Will include: the intake flow screen by screen, the reviewer dashboard's queue and detail views, and the theming preview used to confirm a second tenant renders correctly without a code change.
