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
  const items = (await db.query(`select provider_ref from public.provider_connections where applicant_id = any($1::uuid[])`, [apps])).rows.map((r: { provider_ref: string }) => r.provider_ref);
  for (const t of ["income_records", "income_sources", "asset_records", "provider_connections", "household_members"]) {
    await db.query(`delete from public.${t} where applicant_id = any($1::uuid[])`, [apps]);
  }
  await db.query(`delete from public.applicants where id = any($1::uuid[])`, [apps]);
  await db.query(`delete from public.webhook_events where provider = 'plaid' and (provider_ref = any($1::text[]) or (signature_valid = false and received_at >= $2))`, [items, startedAt]);
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
    const rec = (await db.query(`select ingestion_method, needs_review, review_reasons, gross_pay, raw_payload::text p from public.income_records where provider_connection_id = $1`, [connectionId])).rows[0];
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
      [`test-retry-${crypto.randomUUID()}`, item.replace(/.$/, "Z")])).rows[0].id;

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

  it("refuses callers without a token, and another applicant's connection", async () => {
    expect((await call("plaid-link-token", null, { household_member_id: owner.memberId })).status).toBe(401);
    const other = await makeApplicant("other");
    const r = await call("plaid-exchange", other.token, { connection_id: connectionId, public_token: "public-sandbox-x" });
    expect(r.status).toBe(404);
    const foreignMember = await call("plaid-link-token", other.token, { household_member_id: owner.memberId });
    expect(foreignMember.status).toBe(404);
  });
});
