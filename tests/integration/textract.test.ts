import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Client as PgClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import expected from "../fixtures/documents/expected.json";
import { PUBLISHABLE_KEY, SUPABASE_URL, deleteUserOrThrow, ownerDb, serviceClient } from "../isolation/env";

// PHASE-2-SPEC.md, TESTS: each fixture through the deployed document-ingest function and real Textract,
// compared with the answer key; the two page PDF refused before any AWS call. Makes a few billable AWS calls.

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/document-ingest`;
const EMAIL_PREFIX = "int-textract-";
const BUCKET = "applicant-documents";

let db: PgClient;
const svc = serviceClient();
const users: { id: string; client: SupabaseClient; token: string; appId: string; memberId: string }[] = [];
let tenantId = "";

async function makeApplicant(tag: string) {
  const email = `${EMAIL_PREFIX}${tag}-${Date.now()}@example.test`;
  const password = `Int-${crypto.randomUUID()}-a1A!`;
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { tenant_slug: "cedar-row" } });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s, error: se } = await client.auth.signInWithPassword({ email, password });
  if (se || !s.session) throw new Error(`signIn: ${se?.message}`);
  const property = (await db.query(`select p.id from public.properties p join public.tenants t on t.id = p.tenant_id
                                    where t.slug = 'cedar-row' and p.slug = 'maple-court'`)).rows[0].id;
  const app = await client.from("applicants").insert({ tenant_id: tenantId, user_id: data.user.id, property_id: property }).select("id").single();
  const member = await client.from("household_members").insert({ tenant_id: tenantId, applicant_id: app.data!.id, full_name: `Integration ${tag}`, relationship: "head" }).select("id").single();
  if (app.error || member.error) throw new Error(`setup: ${app.error?.message ?? member.error?.message}`);
  const u = { id: data.user.id, client, token: s.session.access_token, appId: app.data!.id, memberId: member.data!.id };
  users.push(u);
  return u;
}

/** Upload as the applicant (storage RLS applies), register the document row, then call the function. */
async function ingest(u: (typeof users)[number], file: string, kind: string, mime: string) {
  const path = `${tenantId}/${u.appId}/${crypto.randomUUID()}-${file}`;
  const bytes = readFileSync(`tests/fixtures/documents/${file}`);
  const up = await u.client.storage.from(BUCKET).upload(path, bytes, { contentType: mime });
  if (up.error) throw new Error(`upload: ${up.error.message}`);
  const doc = await u.client.from("applicant_documents").insert({
    tenant_id: tenantId, applicant_id: u.appId, household_member_id: u.memberId, document_kind: kind,
    storage_path: path, mime_type: mime, byte_size: bytes.length,
  }).select("id").single();
  if (doc.error) throw new Error(`document row: ${doc.error.message}`);
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${u.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: doc.data.id }),
  });
  return { documentId: doc.data.id as string, status: res.status, body: await res.json() };
}

const recordFor = async (documentId: string) =>
  (await db.query(`select r.*, s.source_type, s.connection_method, s.status as source_status
                   from public.income_records r join public.income_sources s on s.id = r.income_source_id
                   where r.document_id = $1`, [documentId])).rows;
const num = (v: unknown) => (v === null ? null : Number(v));

beforeAll(async () => {
  db = await ownerDb();
  tenantId = (await db.query(`select id from public.tenants where slug = 'cedar-row'`)).rows[0].id;
});

afterAll(async () => {
  const ids = users.map((u) => u.id);
  const apps = users.map((u) => u.appId);
  const { rows: objs } = await db.query(`select name from storage.objects where bucket_id = $1 and (storage.foldername(name))[2] = any($2::text[])`, [BUCKET, apps]);
  if (objs.length) await svc.storage.from(BUCKET).remove(objs.map((o: { name: string }) => o.name));
  for (const t of ["income_records", "income_sources", "applicant_documents", "household_members"]) {
    await db.query(`delete from public.${t} where applicant_id = any($1::uuid[])`, [apps]);
  }
  await db.query(`delete from public.applicants where id = any($1::uuid[])`, [apps]);
  for (const id of ids) await deleteUserOrThrow(svc, id);
  const left = (await db.query(`select (select count(*) from auth.users where email like $1)::int u,
    (select count(*) from storage.objects where bucket_id = $2 and (storage.foldername(name))[2] = any($3::text[]))::int o`,
    [`${EMAIL_PREFIX}%`, BUCKET, apps])).rows[0];
  console.log(`teardown: users left ${left.u}, objects left ${left.o}`);
  await db.end();
});

describe("document-ingest with real Textract", () => {
  it("paystub matches the answer key", async () => {
    const u = await makeApplicant("paystub");
    const r = await ingest(u, "paystub.png", "paystub", "image/png");
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const [row] = await recordFor(r.documentId);
    const e = expected.paystub;
    expect({
      employer_name: row.employer_name, pay_frequency: row.pay_frequency, pay_rate: num(row.pay_rate), gross_pay: num(row.gross_pay),
      ytd_gross: num(row.ytd_gross), pay_date: row.pay_date?.toISOString().slice(0, 10),
      pay_period_end: row.pay_period_end?.toISOString().slice(0, 10),
    }).toEqual({ employer_name: e.employer_name, pay_frequency: e.pay_frequency, pay_rate: e.pay_rate, gross_pay: e.gross_pay,
      ytd_gross: e.ytd_gross, pay_date: e.pay_date, pay_period_end: e.pay_period_end });
    expect(row.ingestion_method).toBe("textract");
    expect(row.source_type).toBe("employment");
    expect(row.connection_method).toBe("manual_upload");
    console.log(`paystub: status ${r.body.status}, reasons ${JSON.stringify(row.review_reasons)}, min confidence ${row.source_confidence}`);
  });

  it("W-2 box 1 matches and is flagged historical", async () => {
    const u = await makeApplicant("w2");
    const r = await ingest(u, "w2.png", "w2", "image/png");
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const [row] = await recordFor(r.documentId);
    expect(num(row.gross_pay)).toBe(expected.w2.box1_wages);
    expect(row.employer_name).toBe(expected.w2.employer_name);
    expect(row.review_reasons).toContain("historical_annual");
  });

  it("Schedule C gross, expenses, and net match", async () => {
    const u = await makeApplicant("schedc");
    const r = await ingest(u, "schedule-c-page1.png", "schedule_c", "image/png");
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const [row] = await recordFor(r.documentId);
    const e = expected.schedule_c;
    expect(num(row.gross_pay)).toBe(e.line1_gross_receipts);
    expect(row.deductions).toEqual([{ category: "schedule_c_line_28_total_expenses", amount: e.line28_total_expenses }]);
    expect(row.review_reasons).toContain(`schedule_c_line_31:${e.line31_net_profit.toFixed(2)}`);
    expect(row.source_type).toBe("self_employment");
  });

  it("no SSN, raw response, or full text is stored for any document", async () => {
    const apps = users.map((u) => u.appId);
    const { rows } = await db.query(`select d.extracted_fields::text f, r.raw_payload::text p from public.applicant_documents d
      left join public.income_records r on r.document_id = d.id where d.applicant_id = any($1::uuid[])`, [apps]);
    const all = rows.map((x: { f: string | null; p: string | null }) => `${x.f} ${x.p}`).join(" ");
    expect(all).not.toContain("000-00-0000");
    expect(all).not.toContain("Jordan Q. Sample");
    expect(all).not.toMatch(/"Blocks"|"BlockType"|"Geometry"/);
  });

  it("refuses the two page PDF before any AWS call, with a plain message", async () => {
    const u = await makeApplicant("pdf2");
    const r = await ingest(u, "two-page.pdf", "paystub", "application/pdf");
    expect(r.status).toBe(422);
    expect(r.body.error).toBe("multi_page_pdf");
    expect(r.body.message).toContain("2 pages");
    const doc = (await db.query(`select status, failure_reason from public.applicant_documents where id = $1`, [r.documentId])).rows[0];
    expect(doc).toEqual({ status: "failed", failure_reason: "multi_page_pdf" });
    expect(await recordFor(r.documentId)).toHaveLength(0);
  });

  it("rejects a caller without a token, and another applicant's document", async () => {
    const noToken = await fetch(FUNCTION_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document_id: crypto.randomUUID() }) });
    expect(noToken.status).toBe(401);
    const [owner] = users;
    const other = await makeApplicant("other");
    const ownerDoc = (await db.query(`select id from public.applicant_documents where applicant_id = $1 limit 1`, [owner.appId])).rows[0].id;
    const res = await fetch(FUNCTION_URL, { method: "POST", headers: { Authorization: `Bearer ${other.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ document_id: ownerDoc }) });
    expect(res.status).toBe(404);
  });
});
