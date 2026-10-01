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

## ITEM 5 ACCEPTANCE BAR (decided by the user, 2026-10-01)

Five vettings each found a narrower input that the recurring transfer detector read imperfectly. Each fix held, and each round found another shape. The user decided to close item 5 by making ambiguity explicit rather than patching each shape: "flag ambiguity", with the remaining edge cases agreed as documented limits. This bar is what the PROCESS-RULES.md Phase 2 item 5 checklist line is verified against from the sixth vetting on.

1. Clean inputs give exact figures, with no flag. A clean input is one sender on one of the four frequencies (weekly, biweekly, semi-monthly, monthly), with every deposit in the 180-day lookback on schedule, no missed payment, and no other deposit from that sender. The stored frequency, count, average, first and last dates must be exact. The record carries only the status reason, and the stream's ambiguity list is empty.
2. Every other qualifying sender is surfaced and flagged, never silently dropped. A qualifying sender has at least 3 deposits, and either a regular run that is still active or any deposit in the last 45 days (AS BUILT 25 widened this from deposits in the amount band, so a sender whose amount changed is not dropped). If software made any judgment, the record carries the review reason schedule_ambiguous or irregular_pattern, and the stored stream lists the reason (deposits_left_out, missed_payment, irregular_pattern). The judgments are: leaving out any deposit from that sender, bridging a missed payment, or finding no regular schedule. The stream also lists every deposit from the sender (date, amount, and whether it is in the stream), so the reviewer can check or correct the proposal.
3. A flagged stream's figures are a proposal, not a finding. In a flagged case they may be off (the detector's best reading of an ambiguous series); that is a documented limit, not a gate failure, as long as point 2 holds. Phase 3 must not annualize a flagged stream's figures until a reviewer has confirmed or corrected them.
4. Documented limits, agreed by the user. Each is surfaced and flagged, or is a stated scope boundary:
   - a missed payment with a one-off beside the gap (PHASE_2_REWORK_5.md X15, X16, X3b, X2b, X2): flagged, and the proposed figures may count the one-off;
   - a sender whose latest payment is missing (X4, X5): flagged, and may be proposed at a coarser frequency or as irregular;
   - two or more missed payments (N20): flagged; missed_payments records at most 1;
   - a schedule switch (F, N19): flagged, and may record a miss that did not happen;
   - cadences outside the four frequencies (every 28 or 60 days, N18): read as the nearest frequency or as irregular, and flagged when anything is left out. These are for the Regulatory Compliance Verification Skill before Phase 3 annualizes anything;
   - a sender who stopped (no active run, and no deposit in 45 days) is not surfaced: not anticipated income;
   - merged senders who share their first two words, and descriptions without "from" (AS BUILT 17);
   - replaying a genuine signed webhook cannot be tested from outside (first vetting, observation 5).
   - biweekly against semi-monthly in a short series. Under 6 deposits, the two cannot be told apart reliably: a payment moved to the previous business day, one overdue payment, or 14 day gaps that land on fixed days of the month (February) are enough to tip it. Any biweekly or semi-monthly reading from fewer than 6 deposits is therefore proposed by the better date fit and always flagged frequency_ambiguous (AS BUILT 26). It is not a clean input for point 1. With 6 or more deposits, the two readings are decided by length and date fit, and only an equal date fit is flagged (AS BUILT 25; the wording "fits exactly" there means equal deviation, PHASE_2_REWORK_7.md N30);
   - an amount change that stays inside the amount band (for example 200 to 280, N29): read as one stream at a blended average. When it is otherwise clean, it is not flagged; every deposit is listed for the reviewer;
   - a Plaid update that fails under concurrent processing is retried by the 5 minute job. Until then, the connection can read ingested while missing senders (N28).
   - a deposit paid on schedule at an amount outside the band (PHASE_2_REWORK_6.md N24, N25): it is left out of the run, so the input is not clean. It is flagged (deposits_left_out, and possibly missed_payment), never treated as clean;
   - one late payment can make a weekly sender irregular (N26): flagged irregular_pattern;
   - during Plaid's staged delivery, a source can be visible for a moment before its record is written (N23).

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
10. Payroll runs through Plaid Payroll Income instead of Argyle (stack decision 2026-09-29, MEMORY.md). The listing names Argyle or Pinwheel; Argyle's sandbox application sat in review and Pinwheel's documentation routes sandbox access through a Client Success Manager, so both were gated behind sales approval. Plaid Payroll Income provides the same required data (gross pay, pay frequency, YTD earnings, itemized deductions), was verified in the sandbox before any design change, and reuses the Plaid token, webhook, and retry machinery. A connection now records its Plaid product (transactions or payroll_income) and, for payroll, the Plaid user id. Pay stubs are keyed by Plaid's document id. The stored raw payload keeps pay figures only: the employee block, taxpayer id mask, pay distribution, and document download link are never stored. Bonus, overtime, and other variable earnings set needs_review, because how they count toward annual income is a Phase 3 CALC-SPEC-1.md question. Argyle can still be added later as another adapter behind the same normalized record.
11. Plaid Link's script is shared by every widget on a page and loaded once; readiness is checked when a widget is used, not tracked per widget. A per widget load callback left the second widget (payroll) permanently disabled, which the browser test caught.
12. Bank payroll deposits are not written as net_pay_only records. The mapping above planned them as corroboration for a payroll record; payroll now comes directly from Plaid Payroll Income (item 10) with gross pay and deductions, so a net-only bank copy of the same pay would add a second, weaker record of one income. Bank ingestion writes records for detected recurring transfers only. Revisit if Phase 3 needs deposit corroboration.
13. Recurring detection groups deposits by sender, not by Plaid's name field (PHASE_2_REWORK.md item 5). On real Plaid data, name is normalized to the app ("Venmo") for every deposit; the sender exists only in original_description, which /transactions/sync returns when include_original_description is set. Within a sender, a deposit more than 50 percent away from the group's median amount is kept out of the stream and listed for the reviewer (excluded_transaction_ids in the stored raw payload), so a one-off gift from the same person does not change a regular stream's count, average, or dates. Both are project conventions.
14. A detected stream's source and record are written by upserts keyed on (connection, stream reference), inserting the figures in the same statement. The first ingestion and a webhook can run at the same time; the earlier delete-then-insert could leave no record or two, and the earlier insert-then-update showed a source with no figures for a moment. A re-read refreshes figures only: it never resets a source's status or statement, and the record's review reason follows the source's status (awaiting_family_statement, awaiting_review, or none once a reviewer has decided).
15. The family states, a reviewer confirms, enforced in the database (PHASE_2_REWORK.md item 10; migration 20260929001400). Only the applicant can write family_statement; a staff write is refused (42501). confirm_income_source accepts only a source in awaiting_review with a statement (else 22023), so no transfer is confirmed that the family never explained. No client role can change a source's source_type or connection_method, since sources are system derived.
16. Plaid returns an item's history in stages (recent transactions first, the rest in a later HISTORICAL_UPDATE webhook), so a stream's figures can grow between webhooks until the full 180 days have arrived. Tests wait for the final state. plaid-sandbox also has a remove action so test teardown removes its items at Plaid, which stops late webhooks from landing after cleanup.
17. Recurring detection rule v2 (PHASE_2_REWORK_2.md item 5; supersedes the "75 percent of gaps in one band" test above and in AS BUILT 1). The second vetting showed that one extra deposit from a regular sender either removed the whole stream (the group no longer had 75 percent of its gaps in one band) or was counted into it. Now, per sender:
    - The stream is the longest run of the sender's deposits, in date order and skipping any, whose consecutive gaps all fall in one frequency's band (weekly 5 to 9 days, biweekly 12 to 16, monthly 26 to 35; semi-monthly 10 to 20 and the day of month clustering). It needs at least 3 deposits and must be active. Ties go to semi-monthly, then weekly, biweekly, and monthly.
    - Every deposit not in the run (an extra payment of the same amount, an in-band amount off schedule, the in-between deposits after a switch in schedule) is kept out of the count, average, and dates, and is listed in excluded_transaction_ids for the reviewer.
    - A frequency change (case F) keeps one source: the longer schedule wins, and the other deposits are listed. The stream key is now the account, app, and sender, without the frequency (vetter lead N4), so a source keeps its identity, status, and statement when its frequency changes between reads.
    - A sender with at least 3 deposits and one in the last 45 days, but no regular run, is not dropped. It is surfaced with no frequency (pattern "irregular", review reason irregular_pattern), and the family is asked "at irregular times". An irregular sender with no deposit in 45 days is not surfaced, like an ended regular stream: it is not anticipated income.
    - Memo text (case C): the sender is the first two words after "from" (or "by") in the original description, so "Venmo from Chris Po rent share" and "Venmo from Chris Po utilities" are one sender. Limits, accepted: two senders sharing their first two words merge. If their deposits interleave into one schedule they become one blended stream (the third vetting's case M: two monthly senders a fortnight apart became one semi-monthly stream with a blended average and nothing listed); otherwise the better schedule wins and the rest are listed. Either way the family is asked about the deposits; a description that names the sender without "from" or "by" is grouped by its full text.
    All of these are project conventions. They are unit tested with the vetter's cases A, B, C, E, and F and driven through plaid-sandbox by the integration suite.
18. A stream record's review reasons follow its source's status the moment it changes (vetter observation N1): migration 20260930001500 adds a trigger that sets them to the status reason (plus irregular_pattern) while undecided, and to none once a reviewer decides. The ingestion code applies the same rule (streamReviewReasons) on every read.
19. Not changed, for Phase 3 (vetter observation N3): an applicant may still insert its own income source with any source_type and connection_method, through Phase 1's insert grant. Such a source cannot be stated or confirmed, so the recurring transfer rule holds. Phase 3 must treat provider_connection_id, not connection_method, as proof that a source came from a provider.
20. Recurring detection rule v2.1 (PHASE_2_REWORK_3.md item 5). The third vetting showed that a one-off landing a few days after a scheduled deposit could take that deposit's place at the same run length (cases G, I, P), because ties went to the later deposit. The choice between runs is now scored, deterministically, in this order: more deposits; then amounts closer to the sender's median (sum of differences, in cents); then gaps closer to the frequency's exact interval (7, 14, 365.25/24, or 365.25/12 days); then the earlier deposit. Also:
    - Only runs still active at the as of date are considered (N7). A sender who paused and restarted is judged by the current schedule, if that schedule holds at least half of the sender's deposits; otherwise the sender is surfaced as irregular with all of them, so the family explains every deposit.
    - A regular run must include at least half of the sender's in-band deposits (RUN_SHARE 0.5, N8). Three deposits that happen to fall on a rhythm among many irregular ones are surfaced as irregular, not as a schedule.
    Unit tests cover G, I, P, a same-amount extra, N7, and N8; the old detector fails 5 of them. The integration suite drives G, I (on the 1st and 16th), and P through plaid-sandbox, and confirms N1 as a real reviewer through confirm_income_source (N10).
21. After an upload or a bank connection, the page is refreshed only by the server action's revalidatePath, which returns the updated page in the same response. The components also called router.refresh(), and the two raced: under load the browser test saw the upload succeed while the documents list never appeared (the cancelled render is the "destination stream closed early" log, SEC-P2-07). Removed from both components.
22. Recurring detection rule v3 (PHASE_2_REWORK_4.md item 5; the stored rule label now names it, N13). Supersedes the tie-break order and the share rule in AS BUILT 20. The fourth vetting showed two older defects: with varying scheduled amounts, a one-off a few days after a deposit could still win on amount (V1, V2); and a single missed payment dropped a sender to a coarser frequency, with half its genuine deposits listed (M1, M2).
    - Run choice, in order: more deposits; then timing; then amount; then the earlier deposit. Timing is scored against the run's own cadence, the median gap of a first pass, so a sender paid every 30 days is judged by 30 days, not the calendar month. Timing comes first because scheduled amounts can vary (shared bills), while a one-off a few days off the schedule always shows in the timing.
    - One missed payment is bridged. A run may contain at most one gap of twice the frequency's band, and only between two consecutive deposits from the sender, so a pause in which the sender still sent something is not called a miss. The stream keeps its frequency and all its deposits, and records missed_payments (0 or 1) in the stored stream. Phase 3 and the reviewer see the miss: annualizing average times periods assumes every period is paid, and a missed payment is a fact for the reviewer to weigh. Two or more misses are not bridged.
    - A schedule must hold strictly more than half of the sender's in-band deposits (exactly half is irregular). Otherwise, the sender is surfaced as irregular with all its deposits.
    Unit tests drive V1, V2, M1, M2, a missed month, and two missed payments, and the integration suite drives V1, V2, M1, and M2 through plaid-sandbox.
23. Other fixes from the fourth vetting:
    - N12: the document uploader and the bank connection now end every failure, including a thrown request or a step that does not answer within 120 s, in a plain message with the buttons usable again, as DESIGN.md's upload control requires.
    - N12: browser tests now run against a production build (npm run build, then start on port 3100), not the dev server. On this machine the dev server took 29 to 35 s to compile a route on first use and once left a server action unanswered. Production is also what Vercel serves.
    - N14: test teardowns delete users through deleteUserOrThrow, which retries and fails the run if a user is left behind.
    - N15: migration 20261001001600 gives a second confirm on a decided source its own message ("this source has already been decided"), still 22023.
    - The payroll retry test now checks the event's outcome, because the 5 minute pg_cron job can claim the event before the test's own call.
24. Recurring detection rule v4 (stored label "rule v4 (AS BUILT 24)"), for the ITEM 5 ACCEPTANCE BAR above. The run selection is rule v3's. New in v4:
    - Every stream records ambiguity (deposits_left_out, missed_payment, irregular_pattern) and deposits (every deposit from the sender in the lookback, with in_stream).
    - The record's review reasons add schedule_ambiguous for a flagged regular stream while it is undecided. Migration 1500's trigger keeps these non-status reasons when the status moves to awaiting_review, and clears all reasons once a reviewer decides.
    - Semi-monthly days of the month are circular (N17): a "1st" paid on the previous month's last day stays in its slot.
    - A stream that no longer qualifies on a later read is deleted with its record, but only while it is still awaiting the family's statement and the read has transactions (N21). A source the family stated or a reviewer decided is never removed by software.
    - document-ingest claims a document with one conditional update, so of two concurrent calls only one reads it and the other gets 409 (N22).
    - The bank connection's server steps time out at 120 s with a plain message, like the uploader (N16).
    Unit tests cover clean versus flagged, X15, X4, and N17. The integration suite drives one clean sender plus X15, X4, and X2b through plaid-sandbox.
25. Recurring detection rule v4.1 (PHASE_2_REWORK_6.md item 5), for the ACCEPTANCE BAR.
    - Semi-monthly against biweekly. Four biweekly dates can pass the day of month test, and semi-monthly won the tie, so a clean 4-deposit biweekly sender was stored as semi_monthly with no flag. When both fit with the same length, the dates now decide: the sum of each gap's distance from 14 days, against the sum of each date's distance from its fixed day of the month (circular). Only an exact tie is flagged frequency_ambiguous. A sweep of every as-of date in 2026 is unit tested: biweekly and clean, except the windows spanning February, where both readings fit exactly and the stream is flagged.
    - A sender whose amount changed (a raise, a cut, monthly to weekly) was dropped: the amount band followed the older majority amount, and recency was checked only inside it. If the banded pass finds nothing, and the sender has any deposit in the last 45 days, the sender is now analyzed on all its deposits and flagged amount_changed. Qualifying, for the bar, therefore means at least 3 deposits from the sender, plus an active regular run or any deposit in the last 45 days.
    Unit and plaid-sandbox integration tests cover both.
26. Recurring detection rule v4.2 (PHASE_2_REWORK_7.md item 5), for the ACCEPTANCE BAR.
    - Semi-monthly is recognized from 3 dates (two on one day of the month, one on the other).
    - Any biweekly or semi-monthly reading from fewer than SHORT_SERIES (6) deposits is flagged frequency_ambiguous. The seventh vetting showed that short series are tipped either way by a business-day shift (a regression from 25's tie-break in 4-deposit cases), by one overdue payment, or by 3-deposit semi-monthly series that were never recognized. That is now the documented short-series limit, flagged rather than misread silently.
    Unit tests cover F1, F4, F5, the 365-day 4-deposit sweep (now flagged), and clean 6-deposit biweekly and semi-monthly series (exact and unflagged). The integration suite's 4-deposit sender asserts the flag.

