import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Client as PgClient } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { NORMALIZED_KEYS, normalizedIncomeRecordSchema } from "../../supabase/functions/_shared/normalized";
import { PUBLISHABLE_KEY, SUPABASE_URL, deleteUserOrThrow, ownerDb, serviceClient } from "../isolation/env";

// PROCESS-RULES.md Phase 2: "one record from each pipeline validates against the single shared schema with an
// identical key set". Each pipeline runs for real (Plaid bank, Plaid payroll, Textract); the stored rows are read
// back, rebuilt into the normalized shape, and validated with the one schema. Makes one billable Textract call.

const svc = serviceClient();
let db: PgClient;
let userId = "", appId = "", token = "";

const iso = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ?? null);
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** Rebuild the normalized record from a stored income_records row plus its source's type. */
function fromRow(r: Record<string, unknown>) {
  return {
    ingestion_method: r.ingestion_method, source_type: r.source_type, employer_name: r.employer_name,
    pay_frequency: r.pay_frequency, pay_rate: num(r.pay_rate), expected_annual_hours: num(r.expected_annual_hours),
    gross_pay: num(r.gross_pay), pay_period_start: iso(r.pay_period_start), pay_period_end: iso(r.pay_period_end),
    pay_date: iso(r.pay_date), ytd_gross: num(r.ytd_gross), ytd_through_date: iso(r.ytd_through_date),
    earnings_year_start: iso(r.earnings_year_start),
    deductions: ((r.deductions as { category: string; amount: number }[] | null) ?? []).map((d) => ({ category: d.category, amount: Number(d.amount) })),
    source_confidence: num(r.source_confidence), needs_review: r.needs_review, review_reasons: r.review_reasons,
    captured_at: (r.captured_at as Date).toISOString(),
  };
}

beforeAll(async () => {
  db = await ownerDb();
  const tenantId = (await db.query(`select id from public.tenants where slug = 'cedar-row'`)).rows[0].id;
  const email = `int-shape-${Date.now()}@example.test`, password = `Sh-${crypto.randomUUID()}-a1A!`;
  const { data } = await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { tenant_slug: "cedar-row" } });
  userId = data.user!.id;
  const c = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data: s } = await c.auth.signInWithPassword({ email, password });
  token = s.session!.access_token;
  const property = (await db.query(`select id from public.properties where tenant_id = $1 and slug = 'maple-court'`, [tenantId])).rows[0].id;
  appId = (await c.from("applicants").insert({ tenant_id: tenantId, user_id: userId, property_id: property }).select("id").single()).data!.id;
  const memberId = (await c.from("household_members").insert({ tenant_id: tenantId, applicant_id: appId, full_name: "Shape", relationship: "head" }).select("id").single()).data!.id;
  const call = (name: string, body: unknown) => fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const bank = { override_accounts: [{ type: "depository", subtype: "checking", starting_balance: 500,
    transactions: [150, 120, 90, 60, 30, 3].map((d) => ({ date_transacted: day(d), date_posted: day(d), currency: "USD", amount: -200, description: "Zelle from Aunt" })) }] };
  expect((await call("plaid-sandbox", { action: "link", household_member_id: memberId, custom_user: bank })).status).toBe(200);
  expect((await call("plaid-sandbox", { action: "link", household_member_id: memberId, product: "payroll_income" })).status).toBe(200);
  const path = `${tenantId}/${appId}/${crypto.randomUUID()}.png`;
  const bytes = readFileSync("tests/fixtures/documents/paystub.png");
  await c.storage.from("applicant-documents").upload(path, bytes, { contentType: "image/png" });
  const doc = (await c.from("applicant_documents").insert({ tenant_id: tenantId, applicant_id: appId, household_member_id: memberId,
    document_kind: "paystub", storage_path: path, mime_type: "image/png", byte_size: bytes.length }).select("id").single()).data!.id;
  expect((await call("document-ingest", { document_id: doc })).status).toBe(200);
});

afterAll(async () => {
  const { rows: objs } = await db.query(`select name from storage.objects where bucket_id = 'applicant-documents' and (storage.foldername(name))[2] = $1`, [appId]);
  if (objs.length) await svc.storage.from("applicant-documents").remove(objs.map((o: { name: string }) => o.name));
  const conns = (await db.query(`select id, provider_ref, provider_user_ref from public.provider_connections where applicant_id = $1`, [appId])).rows;
  const refs = conns.flatMap((r: { provider_ref: string | null; provider_user_ref: string | null }) => [r.provider_ref, r.provider_user_ref].filter(Boolean));
  // Remove the items at Plaid first, so no webhook arrives after the cleanup below; then let in-flight ones land.
  for (const c of conns) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/plaid-sandbox`, { method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", connection_id: c.id }) });
    if (res.status !== 200) console.log(`teardown: Plaid removal of a connection returned ${res.status} ${await res.text()}`);
  }
  if (conns.length) await new Promise((r) => setTimeout(r, 10_000));
  for (const t of ["income_records", "income_sources", "asset_records", "applicant_documents", "provider_connections", "household_members"]) {
    await db.query(`delete from public.${t} where applicant_id = $1`, [appId]);
  }
  await db.query(`delete from public.applicants where id = $1`, [appId]);
  await db.query(`delete from public.webhook_events where provider_ref = any($1::text[])`, [refs]);
  await deleteUserOrThrow(svc, userId);
  await db.end();
});

it("one stored record from each pipeline rebuilds into the one schema with an identical key set", async () => {
  const deadline = Date.now() + 90_000;
  let rows: Record<string, unknown>[] = [];
  for (;;) {
    rows = (await db.query(`select distinct on (kind) * from (
        select r.*, s.source_type, case when r.ingestion_method = 'textract' then 'textract'
          when s.source_type = 'recurring_transfer' then 'bank' else 'payroll' end as kind
        from public.income_records r join public.income_sources s on s.id = r.income_source_id where r.applicant_id = $1) x
      order by kind, captured_at`, [appId])).rows;
    if (rows.length === 3 || Date.now() > deadline) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  expect(rows.map((r) => r.kind).sort()).toEqual(["bank", "payroll", "textract"]);
  const keySets = rows.map((r) => {
    const rebuilt = fromRow(r);
    const parsed = normalizedIncomeRecordSchema.safeParse(rebuilt);
    expect(parsed.success, `${r.kind}: ${parsed.success ? "" : JSON.stringify(parsed.error.issues)}`).toBe(true);
    return Object.keys(rebuilt).sort().join(",");
  });
  expect(new Set(keySets).size).toBe(1);
  expect(keySets[0]).toBe(NORMALIZED_KEYS.join(","));
});
