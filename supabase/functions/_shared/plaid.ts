/* eslint-disable @typescript-eslint/no-explicit-any -- Plaid JSON is untyped here; every value is validated by normalize() or a column constraint before storage. */
// Plaid client and item ingestion (PHASE-2-SPEC.md). Deno only. Products: transactions (balances come with
// accounts). Auth is never requested, so no full account number ever reaches the platform.
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalize, toIncomeRecordRow } from "./normalized.ts";
import { mapPayStub, type PlaidPayStub } from "./payroll.ts";
import { detectRecurringTransfers, RULE_VERSION, streamReviewReasons, type Txn } from "./recurring.ts";
import { redactPayload } from "./redact.ts";

export const PLAID_ENV = Deno.env.get("PLAID_ENV") ?? "sandbox";
const BASE = { sandbox: "https://sandbox.plaid.com", production: "https://production.plaid.com" }[PLAID_ENV] ?? "https://sandbox.plaid.com";

export class PlaidError extends Error {
  constructor(public status: number, public errorType: string, public errorCode: string) {
    super(`plaid ${errorType}/${errorCode}`);
  }
}

/** POST to Plaid with credentials from Edge Function secrets. Errors carry Plaid's type and code only. */
export async function plaid<T = Record<string, unknown>>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Plaid-Version": "2020-09-14" },
    body: JSON.stringify({ client_id: Deno.env.get("PLAID_CLIENT_ID"), secret: Deno.env.get("PLAID_SECRET"), ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PlaidError(res.status, String(data.error_type ?? "UNKNOWN"), String(data.error_code ?? `HTTP_${res.status}`));
  return data as T;
}

/**
 * What may be logged or stored about a failure: Plaid's error type and code, one of our own fixed snake_case
 * codes (for example "asset_upsert"), or otherwise only the error's class name. Never a free text message,
 * which could someday carry data.
 */
export function safeReason(e: unknown): string {
  if (e instanceof PlaidError) return `${e.errorType}/${e.errorCode}`;
  if (e instanceof Error) return /^[a-z][a-z0-9_]{2,40}$/.test(e.message) ? e.message : e.name;
  return "unknown";
}

export const WEBHOOK_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/plaid-webhook`;

export type PlaidProduct = "transactions" | "payroll_income";

export interface Connection {
  id: string;
  tenant_id: string;
  applicant_id: string;
  household_member_id: string;
  product?: PlaidProduct;
  provider_user_ref?: string | null;
}

const ASSET_TYPE: Record<string, string> = {
  checking: "checking", savings: "savings", "money market": "savings", cd: "savings", "cash management": "checking",
  brokerage: "investment", "401k": "retirement", "403b": "retirement", ira: "retirement", roth: "retirement",
};

export interface IngestSummary {
  accounts: number;
  transactions: number;
  streams: number;
  status: "ingested" | "awaiting_data";
}

/**
 * Pull accounts and transactions for one connection and write assets and detected recurring transfers.
 * Idempotent: rows are keyed by provider references, so a re-run updates instead of duplicating. A detected
 * stream starts at awaiting_family_statement and is never moved on by software.
 */
export async function ingestItem(svc: SupabaseClient, c: Connection, asOf = new Date().toISOString().slice(0, 10)): Promise<IngestSummary> {
  const { data: token, error: tokenErr } = await svc.rpc("read_provider_token", { p_connection_id: c.id });
  if (tokenErr || !token) throw new Error("token_unavailable");

  // Balances. Masks only: Plaid returns the last four digits, never a full account number without Auth.
  const { accounts } = await plaid<{ accounts: Record<string, any>[] }>("/accounts/get", { access_token: token });
  const now = new Date().toISOString();
  const assetRows = accounts.map((a) => ({
    tenant_id: c.tenant_id,
    applicant_id: c.applicant_id,
    household_member_id: c.household_member_id,
    provider_connection_id: c.id,
    provider_account_ref: a.account_id,
    asset_type: ASSET_TYPE[String(a.subtype ?? "").toLowerCase()] ?? "other",
    institution_name: typeof a.name === "string" ? a.name.slice(0, 120) : null,
    account_last_four: /^\d{4}$/.test(String(a.mask ?? "")) ? String(a.mask) : null,
    current_balance: Math.round(Number(a.balances?.current ?? 0) * 100) / 100,
    balance_as_of: now,
    income_determinable: false,
  }));
  if (assetRows.length) {
    const { error } = await svc.from("asset_records").upsert(assetRows, { onConflict: "provider_connection_id,provider_account_ref" });
    if (error) throw new Error("asset_upsert");
  }

  // Transactions, full sync each time (180 days is small); idempotent downstream.
  const txns: Txn[] = [];
  let cursor: string | undefined;
  let updateStatus = "";
  for (let page = 0; page < 20; page++) {
    // include_original_description: the only field that carries a payment app deposit's sender.
    const r = await plaid<Record<string, any>>("/transactions/sync", {
      access_token: token, cursor, count: 500, options: { include_original_description: true },
    });
    for (const t of [...(r.added ?? []), ...(r.modified ?? [])]) {
      txns.push({
        transaction_id: t.transaction_id, account_id: t.account_id, date: t.date, amount: Number(t.amount),
        name: t.name ?? null, original_description: t.original_description ?? null, merchant_name: t.merchant_name ?? null,
        counterparties: (t.counterparties ?? []).map((cp: Record<string, unknown>) => ({ name: (cp.name as string) ?? null })),
        personal_finance_category: t.personal_finance_category ?? null,
      });
    }
    updateStatus = String(r.transactions_update_status ?? "");
    cursor = r.next_cursor;
    if (!r.has_more) break;
  }

  const streams = await detectRecurringTransfers(txns, asOf);
  for (const s of streams) {
    // A new stream is inserted with its figures in the same statement, so it is never visible half filled
    // (an earlier insert-then-update showed a source with no frequency or amount for a moment). Later runs refresh
    // the figures only; status and the family's statement are never touched by software.
    const figures = { counterparty_label: s.app, frequency: s.frequency, average_amount: s.average_amount,
                      occurrence_count: s.occurrence_count, first_seen: s.first_seen, last_seen: s.last_seen };
    await svc.from("income_sources").upsert({
      tenant_id: c.tenant_id, applicant_id: c.applicant_id, household_member_id: c.household_member_id,
      source_type: "recurring_transfer", connection_method: "plaid", provider_connection_id: c.id,
      provider_stream_ref: s.stream_ref, status: "awaiting_family_statement", ...figures,
    }, { onConflict: "provider_connection_id,provider_stream_ref", ignoreDuplicates: true });
    const { data: source, error: srcErr } = await svc.from("income_sources")
      .update(figures)
      .eq("provider_connection_id", c.id).eq("provider_stream_ref", s.stream_ref).select("id, status").single();
    if (srcErr || !source) throw new Error("income_source_upsert");

    // A re-read never resets a stated or confirmed transfer back to "awaiting the family's statement".
    // Once a reviewer has decided, nothing is left to review. Migration 1500 keeps these in step when the status
    // changes between reads; this is the same rule, applied when the figures are refreshed.
    const reasons = streamReviewReasons(source.status, s.pattern);
    const record = normalize({
      ingestion_method: "plaid", source_type: "recurring_transfer", employer_name: s.app, pay_frequency: s.frequency,
      pay_rate: null, expected_annual_hours: null, gross_pay: s.average_amount, pay_period_start: s.first_seen,
      pay_period_end: s.last_seen, pay_date: s.last_seen, ytd_gross: null, ytd_through_date: null, earnings_year_start: null,
      deductions: [], source_confidence: null, needs_review: reasons.length > 0, review_reasons: reasons, captured_at: now,
    });
    const raw = redactPayload({ rule: RULE_VERSION, as_of: asOf, stream: s }).value;
    // One atomic upsert keyed by the stream: the first ingestion and Plaid's first webhooks run concurrently, and a
    // delete-then-insert let one run read between the two (no record) or both insert (a duplicate).
    const { error: recErr } = await svc.from("income_records").upsert({
      ...toIncomeRecordRow(record, {
        tenant_id: c.tenant_id, applicant_id: c.applicant_id, income_source_id: source.id, provider_connection_id: c.id,
      }, raw),
      provider_record_ref: `stream:${s.stream_ref}`,
    }, { onConflict: "provider_connection_id,provider_record_ref" });
    if (recErr) throw new Error("income_record_upsert");
  }

  const status: IngestSummary["status"] = txns.length === 0 && updateStatus !== "HISTORICAL_UPDATE_COMPLETE" ? "awaiting_data" : "ingested";
  await svc.from("provider_connections").update({ status, last_event_at: now, error_code: null, updated_at: now }).eq("id", c.id);
  return { accounts: accounts.length, transactions: txns.length, streams: streams.length, status };
}

/** Exchange a public token and run the first ingestion. Shared by plaid-exchange and the sandbox helper. */
export async function exchangeAndIngest(svc: SupabaseClient, c: Connection, publicToken: string): Promise<IngestSummary> {
  const ex = await plaid<{ access_token: string; item_id: string }>("/item/public_token/exchange", { public_token: publicToken });
  const { error: refErr } = await svc.from("provider_connections")
    .update({ provider_ref: ex.item_id, status: "exchanged", updated_at: new Date().toISOString() }).eq("id", c.id);
  if (refErr) throw new Error("connection_update");
  const { error: tokErr } = await svc.rpc("store_provider_token", { p_connection_id: c.id, p_token: ex.access_token });
  if (tokErr) throw new Error("token_store");
  return c.product === "payroll_income" ? await ingestPayroll(svc, c) : await ingestItem(svc, c);
}

/**
 * Pay stubs from Plaid Payroll Income, read by the Plaid user id. Idempotent: each stub is keyed by Plaid's
 * document id. One income source per employer per connection.
 */
export async function ingestPayroll(svc: SupabaseClient, c: Connection): Promise<IngestSummary> {
  const userRef = c.provider_user_ref
    ?? (await svc.from("provider_connections").select("provider_user_ref").eq("id", c.id).single()).data?.provider_user_ref;
  if (!userRef) throw new Error("payroll_user_missing");
  const now = new Date().toISOString();
  let data: Record<string, any>;
  try {
    data = await plaid<Record<string, any>>("/credit/payroll_income/get", { user_id: userRef });
  } catch (e) {
    if (e instanceof PlaidError && ["PRODUCT_NOT_READY", "INCOME_VERIFICATION_NOT_READY"].includes(e.errorCode)) {
      await svc.from("provider_connections").update({ status: "awaiting_data", last_event_at: now, updated_at: now }).eq("id", c.id);
      return { accounts: 0, transactions: 0, streams: 0, status: "awaiting_data" };
    }
    throw e;
  }
  const stubs: PlaidPayStub[] = (data.items ?? []).flatMap((it: any) => (it.payroll_income ?? []).flatMap((pi: any) => pi.pay_stubs ?? []));
  let written = 0;
  for (const stub of stubs) {
    const m = mapPayStub(stub, now);
    const employerKey = `payroll:${(m.record.employer_name ?? "unknown employer").toLowerCase()}`;
    await svc.from("income_sources").upsert({
      tenant_id: c.tenant_id, applicant_id: c.applicant_id, household_member_id: c.household_member_id,
      source_type: "employment", connection_method: "plaid", provider_connection_id: c.id,
      provider_stream_ref: employerKey, status: "detected",
    }, { onConflict: "provider_connection_id,provider_stream_ref", ignoreDuplicates: true });
    const { data: source, error: srcErr } = await svc.from("income_sources").select("id")
      .eq("provider_connection_id", c.id).eq("provider_stream_ref", employerKey).single();
    if (srcErr || !source) throw new Error("income_source_upsert");
    const row = {
      ...toIncomeRecordRow(m.record, {
        tenant_id: c.tenant_id, applicant_id: c.applicant_id, income_source_id: source.id, provider_connection_id: c.id,
      }, m.rawPayload),
      provider_record_ref: m.recordRef,
    };
    const { error: recErr } = await svc.from("income_records").upsert(row, { onConflict: "provider_connection_id,provider_record_ref" });
    if (recErr) throw new Error("income_record_upsert");
    written++;
  }
  const status: IngestSummary["status"] = written > 0 ? "ingested" : "awaiting_data";
  await svc.from("provider_connections").update({ status, last_event_at: now, error_code: null, updated_at: now }).eq("id", c.id);
  return { accounts: 0, transactions: written, streams: 0, status };
}

/**
 * Create a link_started connection for the caller's own household member. The member is looked up through the
 * caller's RLS client, so an applicant can only connect accounts to their own household.
 */
export async function startConnection(
  svc: SupabaseClient, asCaller: SupabaseClient, tenantId: string, memberId: string, product: PlaidProduct = "transactions",
): Promise<Connection> {
  const { data: member } = await asCaller.from("household_members").select("id, applicant_id").eq("id", memberId).maybeSingle();
  if (!member) throw new Error("member_not_found");
  const { data, error } = await svc.from("provider_connections").insert({
    tenant_id: tenantId, applicant_id: member.applicant_id, household_member_id: member.id, provider: "plaid",
    status: "link_started", product,
  }).select("id, tenant_id, applicant_id, household_member_id, product").single();
  if (error || !data) throw new Error("connection_insert");
  const c = data as Connection;
  if (product === "payroll_income") {
    // Payroll Income is read per Plaid user. client_user_id is our internal id: Plaid gets no name or email.
    const user = await plaid<{ user_id: string }>("/user/create", { client_user_id: c.id });
    await svc.from("provider_connections").update({ provider_user_ref: user.user_id }).eq("id", c.id);
    c.provider_user_ref = user.user_id;
  }
  return c;
}

/** Link token parameters for a connection's product. */
export function linkTokenBody(c: Connection): Record<string, unknown> {
  const base = { client_name: "Applicant intake", language: "en", country_codes: ["US"], user: { client_user_id: c.id }, webhook: WEBHOOK_URL };
  if (c.product === "payroll_income") {
    return { ...base, products: ["income_verification"], user_id: c.provider_user_ref,
             income_verification: { income_source_types: ["payroll"] } };
  }
  return { ...base, products: ["transactions"], transactions: { days_requested: 180 } };
}
