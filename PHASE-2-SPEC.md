# PHASE-2-SPEC.md — Project 1: Fairview Compliance Intake Platform

Phase 2, financial ingestion. Engineering level detail beyond MASTER-SPEC-1.md's Milestone 2. Written 2026-09-28, after Phase 1 closed. If this file and MASTER-SPEC-1.md disagree on architecture, MASTER-SPEC-1.md is authoritative and both are corrected together.

Governing documents: MASTER-SPEC-1.md (scope, data model), RULES.md (tenant isolation, financial API integration rules, PII rules), SECURITY.md (third party data exposure, PII fields), DESIGN.md (the Income, Assets, and Documents steps and the upload control), PROCESS-RULES.md (the Phase 2 gate), CALC-SPEC-1.md (what the Phase 3 engine will need from ingested data).

Sources checked 2026-09-28 for this specification, primary where possible: 24 CFR 5.609 as amended by the HOTMA final rule (88 FR 9657); HUD Notice PIH 2023-27 / H 2023-10, Attachment G.1 (Nonrecurring Income) and G.19 (Self Employment); Plaid documentation for webhook verification and /transactions/recurring/get; Argyle documentation for webhooks; AWS Textract documentation for AnalyzeDocument and its set quotas. Anything marked CONFIRM AT BUILD was not verifiable from documentation alone and is checked first when implementation starts.

## WHAT PHASE 2 DELIVERS

1. Argyle Link (payroll) in sandbox: link, user token, webhook ingestion, paystub normalization, including gross pay, pay frequency, YTD earnings, and deductions.
2. Plaid Link in sandbox: link token, public token exchange, balances and asset data, transaction history, and recurring inflow detection, including recurring peer to peer transfers (Zelle, Venmo, Cash App).
3. The AWS Textract fallback: upload of a paystub, W-2, or Schedule C page to private storage, synchronous AnalyzeDocument with QUERIES, and normalization.
4. One normalized income record shape, produced identically by all three pipelines and checked by a test.
5. A webhook ingestion state machine for Plaid and Argyle with signature verification (sandbox included), idempotency, and retry.
6. The recurring transfer classification flow: detection by software, a statement from the family, and confirmation by a reviewer, per the rule in RECURRING TRANSFER RULE below.
7. The Income, Assets, and Documents intake steps made real, per DESIGN.md.
8. New tables with tenant_id and RLS in the migration that creates them, and the isolation suite extended to cover them.
9. An integration test suite covering all three ingestion paths, plus webhook signature tests.

Out of scope: the calculation engine and any income determination (Phase 3); SSN collection (the encrypted path exists from Phase 1; SSN entry is not part of ingestion); the reviewer dashboard (Phase 4), though Phase 2 writes the review flags that dashboard will read; Twilio (Phase 4).

## ARCHITECTURE DECISION: WHERE THE INTEGRATION CODE RUNS

Provider calls and webhook receivers run in Supabase Edge Functions (Deno), per the locked stack. There are three reasons. Webhooks need a public HTTPS endpoint, which the local Next.js dev server does not have, while Edge Functions do. Provider secrets then live only in Edge Function secrets, never in the Next.js environment. And RULES.md already defines the pattern: a narrowly scoped server side function that authenticates the request itself before any service role operation.

Functions:

    plaid-link-token     POST, applicant JWT. Creates a Link token for the caller's own application.
    plaid-exchange       POST, applicant JWT. Exchanges the public token and records the connection.
    plaid-webhook        POST, no JWT. Plaid signature verified first, then processed.
    argyle-user-token    POST, applicant JWT. Creates or reuses the Argyle user and returns a Link user token.
    argyle-webhook       POST, no JWT. Argyle signature verified first, then processed.
    document-ingest      POST, applicant JWT. Runs Textract on one uploaded document the caller owns.
    ingestion-retry      Scheduled with pg_cron. Retries failed webhook processing with backoff.

Authentication inside each JWT function: verify the Supabase JWT (getClaims), take tenant_id and app_role from the verified claims, require the applicant role, and resolve the caller's own application through a normal RLS client, never from request body identifiers. Only then use the service role client, and only to write rows for that application. The webhook functions have no user; after signature verification they resolve tenant and application from the stored connection, never from the payload alone.

Deployment needs a Supabase access token for `supabase functions deploy` (a user action, see USER ACTIONS). Provider secrets are set with `supabase secrets set` on fairview-dev only.

## ACCOUNTS AND CREDENTIALS

Plaid: sandbox client_id and sandbox secret. Products requested: assets and transactions. Auth (full account and routing numbers) is deliberately not requested. The platform never needs a full account number, so it never receives one (SECURITY.md, third party data exposure: minimum data). Masks (last four digits) come with balances.

Argyle: sandbox API key id and secret, plus a webhook secret chosen by us when subscribing. Scope: employments and paystubs.

AWS: an IAM user with a single inline policy allowing only textract:AnalyzeDocument, in one region. Region: eu-west-1, to keep documents in the same region as the database. CONFIRM AT BUILD: that QUERIES is available in eu-west-1; if not, record the region used and why in MEMORY.md. No S3 bucket and no asynchronous Textract (see TEXTRACT PIPELINE).

Edge Function secrets, never in .env.local, never NEXT_PUBLIC:

    PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV=sandbox
    ARGYLE_API_KEY_ID, ARGYLE_API_KEY_SECRET, ARGYLE_WEBHOOK_SECRET, ARGYLE_ENV=sandbox
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION=eu-west-1

The Next.js app needs only the Plaid and Argyle Link client side scripts, which are loaded from the providers' own CDNs as their SDKs require, and no provider secret.

## DATA MODEL CHANGES

New migrations numbered from 1000. Every new tenant scoped table gets tenant_id, composite foreign keys, RLS, and column grants in the migration that creates it (RULES.md). Every new function revokes PUBLIC execute explicitly (migration 800's lesson, MEMORY.md).

provider_connections, tenant scoped. One per linked Plaid item or Argyle user.
id; tenant_id; applicant_id (composite FK); household_member_id (composite FK); provider (plaid, argyle); provider_ref (Plaid item_id or Argyle user id; unique per provider); access_token_encrypted bytea null (the Plaid access token, encrypted with app.encrypt_secret using a separate Vault key, provider_token_key, distinct from pii_key); status (link_started, exchanged, awaiting_data, ingested, reauth_required, error, revoked); last_event_at; error_code text null; created_at; updated_at.
RLS: applicant selects own; staff select within tenant; no client writes (functions write with the service role after authenticating). Column grants: access_token_encrypted is excluded from select for anon and authenticated, so no client role can read it even in encrypted form.

webhook_events, platform table, no tenant_id. It is written before the tenant is known, so it holds no PII.
id; provider; event_id (the provider's id, or the SHA-256 of the body when the provider has none); event_type; provider_ref; signature_valid boolean; status (received, processing, processed, failed, ignored, rejected); attempts; next_attempt_at; last_error; received_at; processed_at; unique (provider, event_id) for idempotency.
It stores no payload, only the hash, type, and references. RLS is enabled with no client policy at all; only the functions touch it.

applicant_documents, tenant scoped. Uploads for the Textract fallback.
id; tenant_id; applicant_id (composite FK); household_member_id (composite FK); document_kind (paystub, w2, schedule_c, benefit_letter, other); storage_path (in the private bucket applicant-documents, always under tenant_id/applicant_id/); mime_type; byte_size; status (uploaded, processing, extracted, needs_review, failed); extracted_fields jsonb null (query alias to answer text and confidence only; see SECURITY DECISIONS); failure_reason text null; created_at; updated_at.
RLS: applicant selects own and inserts own through the upload flow; staff select within tenant. The storage bucket applicant-documents is private, and storage.objects policies allow an applicant to insert and read only objects under their own tenant_id/applicant_id/ prefix, and staff to read within their tenant prefix.

income_sources: add status (detected, awaiting_family_statement, awaiting_review, confirmed_income, confirmed_excluded, dismissed), provider_connection_id null, document_id null, and for recurring transfers: counterparty_label text (payment app name only, never the sender's account details), frequency, average_amount, occurrence_count, first_seen, last_seen, family_statement (enum, see RECURRING TRANSFER RULE), family_statement_at.

income_records: finalized to the normalized shape below. It adds provider_connection_id null, document_id null, employer_name, pay_period_start, pay_period_end, pay_date, gross_pay (per period), ytd_gross, ytd_through_date, deductions jsonb (category to amount per period), source_confidence numeric null (Textract only), and needs_review boolean. raw_payload is retained in redacted form only (see SECURITY DECISIONS).

asset_records: filled from Plaid balances. account_last_four comes from the Plaid mask; account_number_encrypted stays null, because Auth is not requested. Plaid does not provide actual interest income per asset reliably, so income_determinable defaults to false unless an interest income figure is supported by transactions categorized as interest over the lookback period, recorded in the trace. This rule's calculation side belongs to CALC-SPEC-1.md in Phase 3.

## THE NORMALIZED INCOME RECORD

A single Zod schema, in one shared module imported by all three pipelines and by the tests. Every pipeline's output passes through the same schema before insert. The Phase 2 shape identity test asserts that one output from each pipeline validates against the schema and has exactly the same key set.

    NormalizedIncomeRecord {
      ingestion_method: "argyle" | "plaid" | "textract"
      source_type: "employment" | "self_employment" | "benefit" | "recurring_transfer" | "other"
      employer_name: string | null            // or payer, or business name
      pay_frequency: "hourly"|"weekly"|"biweekly"|"semi_monthly"|"monthly"|"annual" | null
      pay_rate: decimal | null                // hourly rate when hourly
      expected_annual_hours: decimal | null
      gross_pay: decimal | null               // per pay period, before deductions
      pay_period_start: date | null
      pay_period_end: date | null
      pay_date: date | null
      ytd_gross: decimal | null
      ytd_through_date: date | null           // with earnings_year_start, gives weeks elapsed for YTD extrapolation
      earnings_year_start: date | null
      deductions: { category: string, amount: decimal }[]   // per period; empty array when none
      source_confidence: decimal | null       // Textract query confidence, 0 to 100
      needs_review: boolean
      review_reasons: string[]                // for example "low_confidence:ytd_gross", "frequency_inferred"
      captured_at: timestamp
    }

Mapping, per pipeline:
Argyle paystub: gross pay, pay date, period, frequency (from employment, or inferred from paystub spacing, then flagged frequency_inferred), YTD gross, and deductions by category.
Plaid: payroll inflows categorized as wages become a record with frequency from the recurring stream and gross_pay null (bank deposits are net pay), needs_review true, with review reason net_pay_only. Bank data is corroboration for payroll, not a replacement for it. Recurring peer to peer inflows become recurring_transfer sources and records as described below.
Textract paystub: query answers mapped to the same fields; any required field below the confidence threshold sets needs_review. Textract W-2: source_type employment, pay_frequency annual, gross_pay = box 1 wages, with the period as the tax year, flagged historical_annual. Textract Schedule C page 1: source_type self_employment, pay_frequency annual, gross_pay = line 1 gross receipts, with line 28 total expenses and line 31 net profit carried in deductions and review_reasons for Phase 3. HUD counts net self employment income (Notice G.19), and that calculation belongs to CALC-SPEC-1.md.

## RECURRING TRANSFER RULE

The rule comes from 24 CFR 5.609 as amended by HOTMA, and HUD Notice PIH 2023-27 / H 2023-10, Attachment G.1:
- Annual income is all amounts not specifically excluded.
- Nonrecurring income, meaning income that will not be repeated beyond the coming year based on information from the family, is excluded.
- That exclusion does not cover periodic payments received at regular intervals.
- Gifts for holidays, birthdays, and other significant life events are excluded.
- An owner may accept the family's self-certification that income will not recur.

What is a project convention, not federal text, is stated as such below and needs Regulatory Compliance Verification Skill confirmation before Phase 3 uses it in a calculation.

Detection (software). The source is a Plaid recurring inflow stream (/transactions/recurring/get, with at least 180 days of history requested, per Plaid) that satisfies all of the following:
- is_active;
- frequency weekly, biweekly, semi-monthly, or monthly;
- at least 3 occurrences;
- a payment app counterparty (personal finance category of payment app or transfer in, or a counterparty or merchant name of Zelle, Venmo, or Cash App).
It must also not be matched to an Argyle payroll record. The detection criteria are a project convention. A match creates an income source with status awaiting_family_statement. Software never decides that a transfer is or is not income.

Family statement (intake, Income step). For each detected stream, shown as the app name, typical amount, frequency, and date range (never the sender's details), the family chooses one:
- regular_contribution: someone outside the household regularly gives money;
- gig_or_business_income: payment for work done (independent contractor income is not nonrecurring, Notice G.1 and F.2.b);
- own_account_transfer: moving the family's own money between their own accounts;
- shared_expense_reimbursement: a roommate or relative repaying a share of a bill;
- life_event_gift: a gift for a holiday, birthday, or life event (excluded, 5.609(b)(24));
- will_not_repeat: self-certification that it will not repeat in the coming year (excluded, Notice G.1).
The statement and its timestamp are stored. The status moves to awaiting_review.

Reviewer confirmation (the Phase 4 dashboard reads it; in Phase 2 the status is set and visible). A reviewer confirms or overrides the statement, and the confirmation is written through write_audit with a reason. The outcome is confirmed_income (regular_contribution, gig_or_business_income) or confirmed_excluded (own_account_transfer, life_event_gift, will_not_repeat). shared_expense_reimbursement is treated as not income only on reviewer confirmation, and that treatment is a project convention flagged for compliance confirmation.

Only confirmed_income sources reach the Phase 3 engine. How a confirmed recurring contribution is annualized (average amount times frequency periods) is added to CALC-SPEC-1.md with a worked example before Phase 3. This closes the Phase 2 half of MASTER-SPEC-1.md's open decision "Recurring transfer income".

## WEBHOOK INGESTION STATE MACHINE

Verification comes first, before any parsing beyond what verification needs, and applies in sandbox exactly as in production (RULES.md).

Plaid: the Plaid-Verification header carries a JWT.
- Its alg must be ES256; anything else is rejected.
- The verification key is fetched with /webhook_verification_key/get by the JWT's key id, and cached by key id.
- iat must be no more than 5 minutes old.
- The SHA-256 of the exact raw body must equal the request_body_sha256 claim, compared in constant time.

Argyle: the X-Argyle-Signature header must equal the HMAC-SHA512 of the exact raw body keyed with our webhook secret, compared in constant time.

A request that fails verification is recorded in webhook_events as rejected, with only its type and the reason, and answered 401. It is never processed.

Idempotency: after verification, insert into webhook_events with unique (provider, event_id). A duplicate is answered 200 and not processed again.

Connection states: link_started, then exchanged (Plaid) or user created (Argyle), then awaiting_data, then ingested. The side states are reauth_required, error, and revoked. Events that move them:
- Plaid ASSETS PRODUCT_READY and TRANSACTIONS SYNC_UPDATES_AVAILABLE or RECURRING_TRANSACTIONS_UPDATE: fetch and ingest.
- Plaid ITEM ERROR with ITEM_LOGIN_REQUIRED, and PENDING_EXPIRATION: reauth_required, which the Income step offers to fix with Link update mode.
- Argyle accounts connected and paystubs added or fully synced: fetch and ingest.
CONFIRM AT BUILD: the exact current event names in both providers' webhook references, recorded in the function source with the date checked.

Processing and retry: the function processes inline after recording the event, bounded by the Edge Function time limit. On failure it marks the event failed, with attempts and next_attempt_at under exponential backoff (1, 5, 15, 60 minutes, then give up after 5 attempts with status failed and the connection in error). ingestion-retry, scheduled with pg_cron, picks up due events. Providers retry non 2xx responses themselves, so the function returns 2xx once the event is durably recorded, and never leaves a verified event unrecorded.

## TEXTRACT PIPELINE

Flow:
1. The applicant chooses a document kind in the Documents step and uploads it with the upload control (DESIGN.md) directly to the private bucket, under their own prefix, using their own session. Storage RLS enforces the prefix.
2. The applicant's session calls document-ingest with the document id. The function verifies ownership through RLS.
3. The function downloads the object and calls AnalyzeDocument synchronously with FeatureTypes QUERIES and the query set for that kind.
4. It maps answers into a normalized record, writes the extracted fields and record, and sets the document status.

Synchronous only. Textract's synchronous limit is one page for PDF and TIFF, 10 MB, and 15 queries per page (AWS set quotas). A paystub and a W-2 are one page, and on Schedule C every line this build needs (1, 28, 31) is on page 1. So Phase 2 accepts JPEG, PNG, and single page PDF up to 10 MB. A multi page PDF is rejected before any AWS call, with a message asking for the right page (DESIGN.md's upload error pattern). No S3 bucket and no asynchronous job are needed.

Query sets, at most 15 each, English only, as Textract Queries require:
- Paystub: employer name, pay period start, pay period end, pay date, gross pay this period, year to date gross pay, hourly rate, hours worked this period, pay frequency, net pay.
- W-2: employer name, tax year, box 1 wages tips other compensation, box 5 Medicare wages.
- Schedule C: tax year, business name, line 1 gross receipts or sales, line 28 total expenses, line 31 net profit or loss.
No query ever asks for an SSN or account number.

Confidence: a required field below 90 sets needs_review with a low_confidence reason naming the field. The threshold is a project convention. AWS's managed human review (A2I) entered maintenance mode in July 2026 and accepts no new customers, so review is always the platform's own reviewer queue, never an AWS feature.

Test fixtures: synthetic documents made for this project, one per kind (paystub, W-2, Schedule C page 1). They use the fictional jurisdiction, a fictional employer in the City of Fairview, obviously fake names, and 000-00-0000 where an SSN box exists. They are committed under tests/fixtures/documents/ and pass the genericization check. No real document is ever committed.

## SECURITY DECISIONS FOR PHASE 2

Recorded in SECURITY.md under a Phase 2 heading when implemented.
- Raw provider payloads (income_records.raw_payload): stored redacted. Before storage, remove any field containing a full account or routing number, SSN, date of birth, or street address. Keep amounts, dates, categories, and provider identifiers. A unit test covers the redaction function with a payload containing every forbidden field.
- Textract: the raw response (every detected word, which on a W-2 includes the SSN) is never persisted. Only the query answers and confidences are stored.
- The Plaid access token is encrypted with its own Vault key, provider_token_key, via app.encrypt_secret, which the service role alone can execute. The key is decrypted only inside the Plaid functions. It is not readable by any client role, in any form.
- Plaid Auth is not requested, so no full account number reaches the platform.
- Third party minimum data: Plaid and Argyle receive only a link or user token request tied to an internal id, never the applicant's name, email, or SSN. Textract receives the document image, which is its purpose.
- Webhook endpoints verify signatures before anything else, including in sandbox.
- Provider errors are logged by code and type only. No payload, token, or PII appears in any log line.

## INTAKE UI

Per DESIGN.md's Income, Assets, and Documents screen specs.
Income: "Connect your payroll" (Argyle Link), "Connect your bank" (Plaid Link), and "Upload paystubs or tax forms" (to Documents). It shows connection status per source, with reconnect for reauth_required. Detected recurring transfers appear as questions with the six statement options.
Assets: shows balances and masks from Plaid. Full account numbers never appear and are never typed.
Documents: the upload control becomes real in all four states, with a checklist of what is still needed.
Link SDKs load from the providers' CDNs only. The Content Security Policy that allows exactly those origins is Phase 4 hardening, but the origins are recorded here: cdn.plaid.com and Argyle's Link origin (CONFIRM AT BUILD).

## TESTS

Integration suite, tests/integration/, run against fairview-dev and the provider sandboxes:
- Plaid, driven with no UI through /sandbox/public_token/create. It covers exchange, assets and transactions fetch, a normalized record, and a recurring peer to peer stream detected from a sandbox custom user whose transactions include a monthly Venmo or Zelle inflow. CONFIRM AT BUILD: the current sandbox custom user format for injecting transactions.
- Argyle: sandbox user linked with Argyle's documented sandbox test credentials, then paystubs ingested with gross, frequency, YTD, and deductions present. CONFIRM AT BUILD: whether a sandbox link can be completed by API; if it needs the Link UI, a Playwright script drives it with the sandbox test credentials.
- Textract: each of the three fixtures produces a normalized record. A multi page PDF is rejected before any AWS call.
- Shape identity: one record from each pipeline validates against the same schema and has an identical key set.
- Webhook security, both providers: a valid signature is accepted; a tampered body, wrong secret or key, missing header, and stale iat (Plaid) are rejected with 401 and recorded as rejected; a replayed valid event is processed once.
- Redaction unit test, per SECURITY DECISIONS.

Isolation suite extension: provider_connections, applicant_documents, and storage objects in applicant-documents are added to the cross tenant read and write checks, with positive controls. It also checks that no client role can read access_token_encrypted, and that no client role can read webhook_events at all.

## USER ACTIONS

1. Create a Plaid developer account and copy the sandbox client_id and sandbox secret.
2. Create an Argyle account with sandbox access and copy the sandbox API key id and secret.
3. AWS: an account and an IAM user with only textract:AnalyzeDocument, and its access key. Textract is billed per page with no sandbox; the test fixtures total a handful of pages per run, and new accounts may have free tier pages. Confirm cost acceptability before the first run.
4. Create a Supabase personal access token (dashboard, Account, Access Tokens) for deploying Edge Functions to fairview-dev.
5. Secrets go into Edge Function secrets through a command the user runs, or are pasted by the user directly into the dashboard, never into chat or the repository.

## ORDER OF WORK

1. User actions 1 to 4, plus CONFIRM AT BUILD checks, recorded in MEMORY.md.
2. Migrations 1000 onward: provider_connections, webhook_events, applicant_documents and the storage bucket with its policies, income_sources and income_records changes, the Vault key and app.encrypt_secret. Each has RLS and grants, and extends the isolation suite in the same change.
3. The shared normalized schema and redaction module, with unit tests.
4. Textract pipeline first (no webhooks, the smallest surface), with fixtures.
5. Argyle pipeline and webhook.
6. Plaid pipeline, webhook, and recurring detection.
7. The recurring transfer family statement flow in the Income step.
8. Intake UI for Income, Assets, and Documents.
9. Integration suite, webhook security tests, shape identity test, isolation suite green.
10. Security Skill pass on the Phase 2 surface, then the Master Vetting sub-agent, then PHASE_2_COMPLETE.md.

## GATE EVIDENCE FOR THE MASTER VETTING SUB-AGENT

Per PROCESS-RULES.md Phase 2, obtained independently:
- The vetter completes each sandbox flow itself and inspects the resulting income_records rows.
- It runs the shape identity test and also compares one row from each pipeline by hand.
- It sends its own forged and replayed webhooks to both endpoints and reads webhook_events.
- It runs a fixture through Textract itself.
- It tries a cross tenant read of another tenant's document object in storage.
- It confirms that no raw Textract response, SSN, or full account number is stored anywhere, by querying.
- It runs the genericization check from RULES.md.

## AS BUILT: DEVIATIONS FROM THIS SPECIFICATION

Recorded during the build, each with its reason. Where these conflict with the sections above, these win.

1. Recurring detection runs on our own deterministic detector (supabase/functions/_shared/recurring.ts), not on Plaid's /transactions/recurring/get. Plaid's documentation does not confirm that endpoint detects patterns in Sandbox custom user data, and an auditor can re-run our rule on the same transactions and get the same answer, which cannot be done with a provider's black box. The criteria are this spec's, plus semi-monthly detection by clustering days of the month, and an explicit as of date (never the clock) so a run is reproducible.
2. Every provider call uses at least 180 days of history (days_requested), in the sandbox helper as well as the real Link token. Plaid defaults to 90 days, which the integration test showed silently drops the older deposits the rule's lookback needs.
3. Plaid Sandbox is driven by plaid-sandbox, a function that refuses to run unless PLAID_ENV is sandbox. It creates the sandbox link server side and then runs the same exchange and ingestion code as the real flow, so the Plaid secret never has to leave Edge Function secrets for tests to run.
4. The gateway's JWT check is off for every function (config.toml). It cannot verify this project's ES256 tokens, so each function verifies the caller itself with getClaims. The webhook functions authenticate by provider signature, and ingestion-retry by a secret generated in the database.
5. Retries: pg_cron runs every 5 minutes and calls ingestion-retry through pg_net, authenticated by a Vault secret generated in the database. The function base URL is per environment configuration in Vault (functions_base_url), not in a migration, so staging must set its own; PROCESS-RULES.md Phase 5 has the check. Events are claimed atomically (skip locked), so overlapping runs never double process.
6. Plaid webhook verification lives in a pure module (supabase/functions/_shared/plaid-verify.ts) with the key lookup injected, so the branches that cannot be forged against Plaid (a stale token and a tampered body under a valid signature) are unit tested with keys the tests control.
7. A benefit letter query set was added to the Textract fallback, because CALC-SPEC-1.md case 4.1 verifies a benefit through an uploaded award letter.
8. Document uploads use a one time signed upload URL for the applicant's own storage folder: the browser sends the file straight to storage, and the server only issues the URL and then registers the document. A server action relay would have worked locally but not on Vercel, whose request body limit (about 4.5 MB) is below the 10 MB document limit.
9. Browser tests run the app on port 3100, not 3000. During the build, another local project was serving port 3000, and Playwright's reuse of an existing server silently tested that app instead of this one.

