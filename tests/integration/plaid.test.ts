import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Client as PgClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PUBLISHABLE_KEY, SUPABASE_URL, ownerDb, serviceClient } from "../isolation/env";

// PHASE-2-SPEC.md, TESTS (Plaid): the real Plaid Sandbox through the deployed functions. The Plaid secret stays in
// Edge Function secrets; plaid-sandbox (sandbox only) replaces the Link UI and runs the same exchange code.

const FN = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;
const EMAIL_PREFIX = "int-plaid-";
const svc = serviceClient();
let db: PgClient;
let tenantId = "";
const startedAt = new Date().toISOString();
const users: { id: string; token: string; appId: string; memberId: string; client: SupabaseClient }[] = [];
/** webhook_events rows the tests insert directly; their provider_ref matches no connection, so they are removed by id. */
const insertedEvents: string[] = [];

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000).toISOString().slice(0, 10);
const txn = (date: string, amount: number, description: string) =>
  ({ date_transacted: date, date_posted: date, currency: "USD", amount, description });

// Plaid sign convention: negative amounts are money in. Six monthly Venmo deposits, biweekly payroll, rent out.
const CUSTOM_USER = {
  override_accounts: [{
    type: "depository", subtype: "checking", starting_balance: 1840.25, meta: { name: "Everyday Checking" },
    transactions: [
      ...[150, 120, 90, 60, 30, 3].map((d) => txn(daysAgo(d), -200, "Venmo from A Relative")),
      ...[140, 126, 112, 98, 84, 70, 56, 42, 28, 14].map((d) => txn(daysAgo(d), -1203.98, "FAIRVIEW PARCEL PAYROLL")),
      ...[145, 115, 85, 55, 25].map((d) => txn(daysAgo(d), 950, "Rent payment to Cedar Row Residential")),
    ],
  }],
};

async function makeApplicant(tag: string) {
  const email = `${EMAIL_PREFIX}${tag}-${Date.now()}@example.test`, password = `Int-${crypto.randomUUID()}-a1A!`;
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { tenant_slug: "cedar-row" } });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s } = await client.auth.signInWithPassword({ email, password });
  const property = (await db.query(`select p.id from public.properties p join public.tenants t on t.id = p.tenant_id where t.slug = 'cedar-row' and p.slug = 'maple-court'`)).rows[0].id;
  const app = await client.from("applicants").insert({ tenant_id: tenantId, user_id: data.user.id, property_id: property }).select("id").single();
  const member = await client.from("household_members").insert({ tenant_id: tenantId, applicant_id: app.data!.id, full_name: `Plaid ${tag}`, relationship: "head" }).select("id").single();
  const u = { id: data.user.id, token: s.session!.access_token, appId: app.data!.id, memberId: member.data!.id, client };
  users.push(u);
  return u;
}

const call = async (fn: string, token: string | null, body: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(FN(fn), { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

async function waitFor<T>(what: string, probe: () => Promise<T | null>, timeoutMs = 90_000): Promise<T> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const v = await probe();
    if (v) return v;
    if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

beforeAll(async () => {
  db = await ownerDb();
  tenantId = (await db.query(`select id from public.tenants where slug = 'cedar-row'`)).rows[0].id;
});

afterAll(async () => {
  const apps = users.map((u) => u.appId);
  const refs = (await db.query(`select id, applicant_id, provider_ref, provider_user_ref from public.provider_connections where applicant_id = any($1::uuid[])`, [apps])).rows;
  const items = refs.flatMap((r: { provider_ref: string | null; provider_user_ref: string | null }) => [r.provider_ref, r.provider_user_ref].filter(Boolean));
  // Remove the items at Plaid first, so no webhook arrives after the cleanup below; then let in-flight ones land.
  for (const r of refs.filter((x: { provider_ref: string | null; provider_user_ref: string | null }) => x.provider_ref || x.provider_user_ref)) {
    const u = users.find((x) => x.appId === r.applicant_id)!;
    const res = await call("plaid-sandbox", u.token, { action: "remove", connection_id: r.id });
    if (res.status !== 200) console.log(`teardown: Plaid removal of a connection returned ${res.status} ${JSON.stringify(res.body)}`);
  }
  if (refs.length) await new Promise((r) => setTimeout(r, 10_000));
  for (const t of ["income_records", "income_sources", "asset_records", "provider_connections", "household_members"]) {
    await db.query(`delete from public.${t} where applicant_id = any($1::uuid[])`, [apps]);
  }
  await db.query(`delete from public.applicants where id = any($1::uuid[])`, [apps]);
  await db.query(`delete from public.webhook_events where provider = 'plaid' and (provider_ref = any($1::text[]) or id = any($3::uuid[]) or (signature_valid = false and received_at >= $2))`, [items, startedAt, insertedEvents]);
  for (const u of users) await svc.auth.admin.deleteUser(u.id);
  const left = (await db.query(`select (select count(*) from auth.users where email like $1)::int u, (select count(*) from public.provider_connections where applicant_id = any($2::uuid[]))::int c`, [`${EMAIL_PREFIX}%`, apps])).rows[0];
  console.log(`teardown: users left ${left.u}, connections left ${left.c}`);
  await db.end();
});

describe("Plaid Sandbox through the deployed functions", () => {
  let owner: Awaited<ReturnType<typeof makeApplicant>>;
  let connectionId = "";

  it("creates a Link token for the caller's own household member (Plaid keys are valid)", async () => {
    owner = await makeApplicant("owner");
    const r = await call("plaid-link-token", owner.token, { household_member_id: owner.memberId });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.link_token).toMatch(/^link-sandbox-/);
  });

  it("links a custom sandbox user and stores balances with masks only", async () => {
    const r = await call("plaid-sandbox", owner.token, { action: "link", household_member_id: owner.memberId, custom_user: CUSTOM_USER });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    connectionId = r.body.connection_id;
    const assets = (await db.query(`select account_last_four, current_balance, account_number_encrypted, provider_account_ref from public.asset_records where provider_connection_id = $1`, [connectionId])).rows;
    expect(assets.length).toBeGreaterThan(0);
    for (const a of assets) {
      expect(a.account_number_encrypted).toBeNull();
      expect(a.account_last_four === null || /^\d{4}$/.test(a.account_last_four)).toBe(true);
    }
    const conn = (await db.query(`select status, provider_ref, access_token_encrypted is not null as token_stored, encode(access_token_encrypted, 'escape') like '%access-sandbox%' as token_plaintext from public.provider_connections where id = $1`, [connectionId])).rows[0];
    expect(conn).toMatchObject({ token_stored: true, token_plaintext: false });
    expect(conn.provider_ref).toBeTruthy();
    console.log(`link: ${JSON.stringify(r.body)}; connection status ${conn.status}`);
  });

  it("detects the monthly Venmo stream as awaiting the family's statement, and nothing else", async () => {
    const sources = await waitFor("a detected recurring transfer", async () => {
      const rows = (await db.query(`select counterparty_label, frequency, average_amount, occurrence_count, status, family_statement from public.income_sources where provider_connection_id = $1`, [connectionId])).rows;
      return rows.length ? rows : null;
    });
    expect(sources).toHaveLength(1);
    expect({ ...sources[0], average_amount: Number(sources[0].average_amount) }).toEqual({
      counterparty_label: "Venmo", frequency: "monthly", average_amount: 200, occurrence_count: 6,
      status: "awaiting_family_statement", family_statement: null });
    const rec = await waitFor("the stream's record", async () =>
      (await db.query(`select ingestion_method, needs_review, review_reasons, gross_pay, raw_payload::text p from public.income_records where provider_connection_id = $1`, [connectionId])).rows[0] ?? null);
    const recCount = (await db.query(`select count(*)::int n from public.income_records where provider_connection_id = $1`, [connectionId])).rows[0].n;
    expect(recCount).toBe(1);
    expect(rec).toMatchObject({ ingestion_method: "plaid", needs_review: true, review_reasons: ["awaiting_family_statement"] });
    expect(rec.p).not.toMatch(/"account_number"|"routing/);
  });

  it("verifies and processes a real signed webhook, without duplicating anything", async () => {
    const before = (await db.query(`select count(*)::int n from public.income_sources where provider_connection_id = $1`, [connectionId])).rows[0].n;
    const item = (await db.query(`select provider_ref from public.provider_connections where id = $1`, [connectionId])).rows[0].provider_ref;
    const fired = await call("plaid-sandbox", owner.token, { action: "fire_webhook", connection_id: connectionId, webhook_code: "SYNC_UPDATES_AVAILABLE" });
    expect(fired.status, JSON.stringify(fired.body)).toBe(200);
    const ev = await waitFor("the signed webhook to be processed", async () => {
      const rows = (await db.query(`select status, signature_valid, event_type from public.webhook_events where provider = 'plaid' and provider_ref = $1 and event_type = 'TRANSACTIONS.SYNC_UPDATES_AVAILABLE' and status in ('processed','failed')`, [item])).rows;
      return rows.length ? rows : null;
    });
    expect(ev.some((e: { status: string; signature_valid: boolean }) => e.status === "processed" && e.signature_valid)).toBe(true);
    const after = (await db.query(`select count(*)::int n from public.income_sources where provider_connection_id = $1`, [connectionId])).rows[0].n;
    expect(after).toBe(before);
  });

  it("retries failed processing: re-ingests due events, closes unknown ones, refuses callers without the secret", async () => {
    const item = (await db.query(`select provider_ref from public.provider_connections where id = $1`, [connectionId])).rows[0].provider_ref;
    const due = (await db.query(`insert into public.webhook_events (provider, event_id, event_type, provider_ref, signature_valid, status, attempts, next_attempt_at)
      values ('plaid', $1, 'TRANSACTIONS.SYNC_UPDATES_AVAILABLE', $2, true, 'failed', 1, now() - interval '1 minute') returning id`,
      [`test-retry-${crypto.randomUUID()}`, item])).rows[0].id;
    const unknown = (await db.query(`insert into public.webhook_events (provider, event_id, event_type, provider_ref, signature_valid, status, attempts, next_attempt_at)
      values ('plaid', $1, 'TRANSACTIONS.SYNC_UPDATES_AVAILABLE', $2, true, 'failed', 1, now() - interval '1 minute') returning id`,
      [`test-retry-${crypto.randomUUID()}`, `unknown-item-${crypto.randomUUID()}`])).rows[0].id;
    insertedEvents.push(due, unknown);

    expect((await call("ingestion-retry", null, {})).status).toBe(401);
    expect((await call("ingestion-retry", null, {}, { "x-cron-secret": "guess" })).status).toBe(401);

    // The test reads the secret from Vault as the database owner, exactly as the cron job does.
    const secret = (await db.query(`select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'`)).rows[0].decrypted_secret;
    const r = await call("ingestion-retry", null, {}, { "x-cron-secret": secret });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const status = async (id: string) => (await db.query(`select status, attempts from public.webhook_events where id = $1`, [id])).rows[0];
    expect(await status(due)).toEqual({ status: "processed", attempts: 2 });
    expect(await status(unknown)).toEqual({ status: "ignored", attempts: 2 });
    const sources = (await db.query(`select count(*)::int n from public.income_sources where provider_connection_id = $1`, [connectionId])).rows[0].n;
    expect(sources).toBe(1);
  });

  it("the database job reaches the function through pg_net (the cron wiring, without waiting 5 minutes)", async () => {
    const before = (await db.query(`select coalesce(max(id), 0)::bigint m from net._http_response`)).rows[0].m;
    await db.query(`select app.run_ingestion_retry()`);
    const resp = await waitFor("the pg_net response", async () => {
      const rows = (await db.query(`select status_code, timed_out, error_msg from net._http_response where id > $1 order by id desc limit 1`, [before])).rows;
      return rows.length ? rows[0] : null;
    }, 60_000);
    expect(resp).toMatchObject({ status_code: 200, timed_out: false });
  });

  it("rejects forged webhooks with 401 and records them as rejected", async () => {
    const body = { webhook_type: "TRANSACTIONS", webhook_code: "SYNC_UPDATES_AVAILABLE", item_id: "forged-item" };
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const { generateKeyPairSync, createSign } = await import("node:crypto");
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const es256 = (payload: unknown) => {
      const head = `${b64({ alg: "ES256", kid: "forged-kid", typ: "JWT" })}.${b64(payload)}`;
      const sig = createSign("SHA256").update(head).sign({ key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
      return `${head}.${sig}`;
    };
    const cases: [string, Record<string, string>][] = [
      ["no signature header", {}],
      ["garbage signature", { "Plaid-Verification": "not.a.jwt" }],
      ["HS256 token", { "Plaid-Verification": `${b64({ alg: "HS256", kid: "x" })}.${b64({ iat: Math.floor(Date.now() / 1000) })}.c2ln` }],
      ["ES256 token from an unknown key", { "Plaid-Verification": es256({ iat: Math.floor(Date.now() / 1000), request_body_sha256: "00" }) }],
    ];
    for (const [label, headers] of cases) {
      const r = await call("plaid-webhook", null, body, headers);
      expect(r.status, label).toBe(401);
    }
    const rejected = (await db.query(`select event_type from public.webhook_events where provider = 'plaid' and signature_valid = false and received_at >= $1`, [startedAt])).rows.map((r: { event_type: string }) => r.event_type);
    expect(rejected).toEqual(expect.arrayContaining(["missing_signature", "malformed_signature", "wrong_algorithm", "unknown_key"]));
  });

  it("rework item 5: distinct senders on one app are distinct streams, and a one-off gift stays out", async () => {
    const venmo = (d: number, amount: number, sender: string) => txn(daysAgo(d), -amount, `Venmo from ${sender}`);
    const scenario = { override_accounts: [{ type: "depository", subtype: "checking", starting_balance: 640,
      transactions: [
        ...[71, 57, 43, 29, 15, 1].map((d) => venmo(d, 85.5, "Casey Friend")),
        venmo(100, 500, "Birthday Gift"),
        ...[150, 120, 90, 60, 30, 3].map((d) => venmo(d, 100, "Alex One")),
        ...[80, 66, 52, 38, 24, 10].map((d) => venmo(d, 50, "Blake Two")),
      ] }] };
    const u = await makeApplicant("rework5");
    const r = await call("plaid-sandbox", u.token, { action: "link", household_member_id: u.memberId, custom_user: scenario });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    // Plaid delivers history in stages (recent first); wait for the final state, not the first three rows.
    const streams = await waitFor("three complete Venmo streams", async () => {
      const rows = (await db.query(`select frequency, average_amount, occurrence_count, first_seen from public.income_sources
        where provider_connection_id = $1 and source_type = 'recurring_transfer' order by average_amount`, [r.body.connection_id])).rows;
      // A half filled source must never be visible, at any stage.
      expect(rows.every((x: { frequency: string | null; average_amount: string | null }) => x.frequency !== null && x.average_amount !== null)).toBe(true);
      return rows.length === 3 && rows.every((x: { occurrence_count: number }) => x.occurrence_count === 6) ? rows : null;
    }, 120_000);
    expect(streams.map((s: { frequency: string; average_amount: string; occurrence_count: number }) =>
      [s.frequency, Number(s.average_amount), s.occurrence_count])).toEqual([["biweekly", 50, 6], ["biweekly", 85.5, 6], ["monthly", 100, 6]]);
    // The $500 gift is in no stream's figures: Casey's average is exactly 85.50 and starts 71 days ago, not 100.
    const casey = streams.find((s: { average_amount: string }) => Number(s.average_amount) === 85.5);
    expect(String(casey.first_seen instanceof Date ? casey.first_seen.toISOString().slice(0, 10) : casey.first_seen)).toBe(daysAgo(71));
  });

  it("rework 2 item 5: extra, off-schedule, and memo-varying deposits keep their streams; an irregular sender is surfaced", async () => {
    // PHASE_2_REWORK_2.md cases A, B, C, E, and F, plus a sender with no schedule, on one account through Plaid.
    const t = (d: number, amount: number, text: string) => txn(daysAgo(d), -amount, text);
    const scenario = { override_accounts: [{ type: "depository", subtype: "checking", starting_balance: 910,
      transactions: [
        ...[150, 120, 90, 60, 30, 3].map((d) => t(d, 100, "Venmo from Alex Moss")), t(45, 100, "Venmo from Alex Moss"), // A
        ...Array.from({ length: 12 }, (_, i) => t(157 - 14 * i, 50, "Zelle from Blair Ng")), t(66, 50, "Zelle from Blair Ng"), // B
        ...[150, 120, 90, 60, 30, 3].map((d, i) => t(d - 1, 80, `Venmo from Chris Po ${i % 2 ? "rent share" : "utilities"}`)), // C
        ...[125, 95, 65, 35, 5].map((d) => t(d, 250, "Cash App from Robin Ye")), t(50, 150, "Cash App from Robin Ye"), // E
        ...Array.from({ length: 11 }, (_, i) => t(170 - 14 * i, 40, "Venmo from Taylor Fox")), ...[23, 16, 9, 2].map((d) => t(d, 40, "Venmo from Taylor Fox")), // F
        ...[140, 131, 97, 60, 58, 20].map((d) => t(d, 60, "Venmo from Dana Wren")), // irregular
      ] }] };
    const u = await makeApplicant("rework5b");
    const r = await call("plaid-sandbox", u.token, { action: "link", household_member_id: u.memberId, custom_user: scenario });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    // F, B, the irregular sender, C, A, E, by average amount.
    const expected = [["biweekly", 40, 13], ["biweekly", 50, 12], [null, 60, 6], ["monthly", 80, 6], ["monthly", 100, 6], ["monthly", 250, 5]];
    // Plaid delivers history in stages; wait until the sources equal the final expected set.
    const rows = await waitFor("six sources in their final state", async () => {
      const got = (await db.query(`select s.id, s.frequency, s.average_amount, s.occurrence_count, r.raw_payload, r.review_reasons
        from public.income_sources s join public.income_records r on r.income_source_id = s.id
        where s.provider_connection_id = $1 and s.source_type = 'recurring_transfer' order by s.average_amount`, [r.body.connection_id])).rows;
      const shape = got.map((x: { frequency: string | null; average_amount: string; occurrence_count: number }) => [x.frequency, Number(x.average_amount), x.occurrence_count]);
      return JSON.stringify(shape) === JSON.stringify(expected) ? got : null;
    }, 150_000);
    // Each extra or off-schedule deposit is out of the figures above and listed for the reviewer.
    const excluded = rows.map((x: { raw_payload: { stream: { excluded_transaction_ids: string[] } } }) => x.raw_payload.stream.excluded_transaction_ids.length);
    expect(excluded).toEqual([2, 1, 0, 0, 1, 1]);
    const irregular = rows[2];
    expect(irregular.raw_payload.stream.pattern).toBe("irregular");
    expect(irregular.review_reasons).toEqual(["awaiting_family_statement", "irregular_pattern"]);

    // N1: the record's reasons follow the status at once, not at the next Plaid read.
    const stated = await u.client.from("income_sources").update({ family_statement: "regular_contribution" }).eq("id", irregular.id).select("status");
    expect(stated.error).toBeNull();
    expect(stated.data).toEqual([{ status: "awaiting_review" }]);
    const reasons = async () => (await db.query(`select needs_review, review_reasons from public.income_records where income_source_id = $1`, [irregular.id])).rows[0];
    expect(await reasons()).toEqual({ needs_review: true, review_reasons: ["awaiting_review", "irregular_pattern"] });
    await db.query(`update public.income_sources set status = 'confirmed_income' where id = $1`, [irregular.id]); // as the owner, standing in for the audited confirm
    expect(await reasons()).toEqual({ needs_review: false, review_reasons: [] });
  });

  it("payroll: a Link token for Plaid Payroll Income", async () => {
    const r = await call("plaid-link-token", owner.token, { household_member_id: owner.memberId, product: "payroll_income" });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.link_token).toMatch(/^link-sandbox-/);
  });

  it("payroll: pay stubs become normalized records with gross, frequency, YTD, and deductions, and no employee data", async () => {
    const r = await call("plaid-sandbox", owner.token, { action: "link", household_member_id: owner.memberId, product: "payroll_income" });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const payrollConnection = r.body.connection_id as string;
    const rows = await waitFor("payroll records", async () => {
      const x = (await db.query(`select r.gross_pay, r.pay_frequency, r.ytd_gross, r.deductions, r.employer_name, r.needs_review,
          r.review_reasons, r.provider_record_ref, r.raw_payload::text p, s.source_type, s.status as source_status
        from public.income_records r join public.income_sources s on s.id = r.income_source_id where r.provider_connection_id = $1`, [payrollConnection])).rows;
      return x.length ? x : null;
    });
    const row = rows[0];
    expect(Number(row.gross_pay)).toBeGreaterThan(0);
    expect(row.pay_frequency).not.toBeNull();
    expect(row.ytd_gross).not.toBeNull();
    expect(Array.isArray(row.deductions) && row.deductions.length).toBeGreaterThan(0);
    expect(row.source_type).toBe("employment");
    expect(row.provider_record_ref).toBeTruthy();
    for (const r2 of rows) {
      expect(r2.p).not.toMatch(/"employee"|Harrison|Grand Ave|taxpayer_id|download_url|distribution_breakdown/);
    }
    const conn = (await db.query(`select product, provider_user_ref is not null as has_user, status from public.provider_connections where id = $1`, [payrollConnection])).rows[0];
    expect(conn).toMatchObject({ product: "payroll_income", has_user: true, status: "ingested" });
    console.log(`payroll: ${rows.length} stub(s); first gross ${row.gross_pay} ${row.pay_frequency}, reasons ${JSON.stringify(row.review_reasons)}`);

    // Re-read through the retry path (an INCOME event keyed by the Plaid user id): no duplicates.
    const userRef = (await db.query(`select provider_user_ref from public.provider_connections where id = $1`, [payrollConnection])).rows[0].provider_user_ref;
    await db.query(`insert into public.webhook_events (provider, event_id, event_type, provider_ref, signature_valid, status, attempts, next_attempt_at)
      values ('plaid', $1, 'INCOME.USER_INCOME_VERIFICATION', $2, true, 'failed', 1, now() - interval '1 minute')`, [`test-payroll-${crypto.randomUUID()}`, userRef]);
    const secret = (await db.query(`select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'`)).rows[0].decrypted_secret;
    const retry = await call("ingestion-retry", null, {}, { "x-cron-secret": secret });
    expect(retry.body.results?.some((x: { status: string }) => x.status === "processed"), JSON.stringify(retry.body)).toBe(true);
    const after = (await db.query(`select count(*)::int n from public.income_records where provider_connection_id = $1`, [payrollConnection])).rows[0].n;
    expect(after).toBe(rows.length);
    await db.query(`delete from public.webhook_events where provider_ref = $1`, [userRef]);
  });

  it("refuses callers without a token, and another applicant's connection", async () => {
    expect((await call("plaid-link-token", null, { household_member_id: owner.memberId })).status).toBe(401);
    const other = await makeApplicant("other");
    const r = await call("plaid-exchange", other.token, { connection_id: connectionId, public_token: "public-sandbox-x" });
    expect(r.status).toBe(404);
    const foreignMember = await call("plaid-link-token", other.token, { household_member_id: owner.memberId });
    expect(foreignMember.status).toBe(404);
  });
});
