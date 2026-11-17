import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Client as PgClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PUBLISHABLE_KEY, SUPABASE_URL, deleteUserOrThrow, ownerDb, serviceClient } from "../isolation/env";

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

/** A cedar-row reviewer. No sign up path produces staff, so the users row is written directly, as in the isolation fixtures. */
const reviewers: string[] = [];
async function makeReviewer() {
  const email = `${EMAIL_PREFIX}reviewer-${Date.now()}@example.test`, password = `Int-${crypto.randomUUID()}-a1A!`;
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  reviewers.push(data.user.id);
  await db.query(`insert into public.users (id, tenant_id, role) values ($1, $2, 'reviewer')`, [data.user.id, tenantId]);
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  await client.auth.signInWithPassword({ email, password });
  return { id: data.user.id, client };
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
  for (const u of users) await deleteUserOrThrow(svc, u.id);
  await db.query(`delete from public.audit_log where actor_id = any($1::uuid[])`, [reviewers]);
  for (const id of reviewers) await deleteUserOrThrow(svc, id);
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
    // A real reviewer, through the audited function (PHASE_2_REWORK_3.md N10).
    const reviewer = await makeReviewer();
    const confirmed = await reviewer.client.rpc("confirm_income_source", { p_source_id: irregular.id, p_outcome: "confirmed_income", p_reason: "integration test: family statement checked" });
    expect(confirmed.error).toBeNull();
    expect(await reasons()).toEqual({ needs_review: false, review_reasons: [] });
    const audit = (await db.query(`select action from public.audit_log where actor_id = $1 and target_id = $2`, [reviewer.id, irregular.id])).rows;
    expect(audit).toEqual([{ action: "confirm_income_source" }]);
  });

  it("rework 3 item 5: a one-off just after a scheduled deposit never takes its place (cases G, I, P)", async () => {
    // PHASE_2_REWORK_3.md: the vetter's shapes, as days before today, on one account through Plaid.
    const t = (d: number, amount: number, text: string) => txn(daysAgo(d), -amount, text);
    // I: the 1st and 16th of each month in the last 170 days, plus a one-off 3 days after a mid-run 1st.
    const semi: string[] = [];
    for (let m = 6; m >= 0; m--) {
      for (const dom of [1, 16]) {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, dom));
        if (d.getTime() <= today.getTime() && d.getTime() >= today.getTime() - 170 * 86_400_000) semi.push(d.toISOString().slice(0, 10));
      }
    }
    const firstOfMonth = semi.find((d, i) => i >= 3 && d.endsWith("-01"))!;
    const iExtra = new Date(Date.parse(firstOfMonth) + 3 * 86_400_000).toISOString().slice(0, 10);
    const scenario = { override_accounts: [{ type: "depository", subtype: "checking", starting_balance: 1200,
      transactions: [
        ...[150, 120, 90, 60, 30, 1].map((d) => t(d, 400, "Zelle from Rosa Vega")), t(27, 260, "Zelle from Rosa Vega"), // G: 3 days after the 30-day one
        ...semi.map((d) => txn(d, -350, "Zelle from June Alvarez")), txn(iExtra, -220, "Zelle from June Alvarez"), // I
        ...[154, 124, 94, 64, 34, 4].map((d) => t(d, 500, "Cash App from Hugo Bell")), t(2, 330, "Cash App from Hugo Bell"), // P: 2 days after the last
      ] }] };
    const u = await makeApplicant("rework5c");
    const r = await call("plaid-sandbox", u.token, { action: "link", household_member_id: u.memberId, custom_user: scenario });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const expected = [[350, semi.length], [400, 6], [500, 6]];
    const rows = await waitFor("three sources in their final state", async () => {
      const got = (await db.query(`select s.average_amount, s.occurrence_count, s.last_seen, r.raw_payload
        from public.income_sources s join public.income_records r on r.income_source_id = s.id
        where s.provider_connection_id = $1 and s.source_type = 'recurring_transfer' order by s.average_amount`, [r.body.connection_id])).rows;
      const shape = got.map((x: { average_amount: string; occurrence_count: number }) => [Number(x.average_amount), x.occurrence_count]);
      return JSON.stringify(shape) === JSON.stringify(expected) ? got : null;
    }, 150_000);
    const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
    expect(day(rows[2].last_seen)).toBe(daysAgo(4)); // P: the one-off two days later is not the last date
    // In each stream, exactly one deposit is listed for the reviewer, and it is the one-off: the average is exactly
    // the scheduled amount, which it could not be if the one-off had replaced a scheduled deposit.
    expect(rows.map((x: { raw_payload: { stream: { excluded_transaction_ids: string[]; frequency: string } } }) =>
      [x.raw_payload.stream.frequency, x.raw_payload.stream.excluded_transaction_ids.length])).toEqual([["semi_monthly", 1], ["monthly", 1], ["monthly", 1]]);
  });

  it("rework 4 item 5: varying amounts and a missed payment (cases V1, V2, M1, M2)", async () => {
    // PHASE_2_REWORK_4.md: the vetter's shapes, as days before today, on one account through Plaid.
    const t = (d: number, amount: number, text: string) => txn(daysAgo(d), -amount, text);
    const v1: [number, number][] = [[155, 240], [125, 310], [95, 265], [65, 330], [35, 225], [5, 290]];
    const v2: [number, number][] = [[154, 410], [124, 395], [94, 400], [64, 405], [34, 390], [4, 350]];
    const m1 = Array.from({ length: 12 }, (_, k) => 164 - 14 * k).filter((d) => d !== 66);
    const m2 = Array.from({ length: 25 }, (_, k) => 170 - 7 * k).filter((d) => d !== 65);
    const scenario = { override_accounts: [{ type: "depository", subtype: "checking", starting_balance: 1500,
      transactions: [
        ...v1.map(([d, a]) => t(d, a, "Zelle from Vic Hale")), t(32, 280, "Zelle from Vic Hale"), // V1: 3 days after the 35-day one
        ...v2.map(([d, a]) => t(d, a, "Venmo from Wes Ford")), t(1, 400, "Venmo from Wes Ford"), // V2: 3 days after the last
        ...m1.map((d) => t(d, 120, "Zelle from Bea Lund")), // M1: biweekly, one payment missed
        ...m2.map((d) => t(d, 40, "Venmo from Dee Moor")), // M2: weekly, one week missed
      ] }] };
    const u = await makeApplicant("rework5d");
    const r = await call("plaid-sandbox", u.token, { action: "link", household_member_id: u.memberId, custom_user: scenario });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const expected = [["weekly", 40, 24], ["biweekly", 120, 11], ["monthly", 276.67, 6], ["monthly", 391.67, 6]];
    const rows = await waitFor("four sources in their final state", async () => {
      const got = (await db.query(`select s.frequency, s.average_amount, s.occurrence_count, s.last_seen, r.raw_payload
        from public.income_sources s join public.income_records r on r.income_source_id = s.id
        where s.provider_connection_id = $1 and s.source_type = 'recurring_transfer' order by s.average_amount`, [r.body.connection_id])).rows;
      const shape = got.map((x: { frequency: string; average_amount: string; occurrence_count: number }) => [x.frequency, Number(x.average_amount), x.occurrence_count]);
      return JSON.stringify(shape) === JSON.stringify(expected) ? got : null;
    }, 150_000);
    const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
    expect(day(rows[3].last_seen)).toBe(daysAgo(4)); // V2 keeps its last scheduled date
    type Stream = { excluded_transaction_ids: string[]; missed_payments: number };
    expect(rows.map((x: { raw_payload: { stream: Stream } }) => [x.raw_payload.stream.excluded_transaction_ids.length, x.raw_payload.stream.missed_payments]))
      .toEqual([[0, 1], [0, 1], [1, 0], [1, 0]]);
    expect(rows[0].raw_payload.rule).toMatch(/rule v4.4/); // N13: the stored label names the rule that ran
  });

  it("ITEM 5 ACCEPTANCE BAR: a clean sender is exact and unflagged; ambiguous senders are surfaced, flagged, and list every deposit", async () => {
    // PHASE-2-SPEC.md, ITEM 5 ACCEPTANCE BAR (the user's decision, 2026-10-01), with PHASE_2_REWORK_5.md's shapes.
    const t = (d: number, amount: number, text: string) => txn(daysAgo(d), -amount, text);
    const x2b = Array.from({ length: 25 }, (_, k) => 2 + 7 * k).filter((d) => d !== 86);
    const scenario = { override_accounts: [{ type: "depository", subtype: "checking", starting_balance: 800,
      transactions: [
        ...[150, 120, 90, 60, 30, 1].map((d) => t(d, 100, "Venmo from Clean Payer")), // clean
        ...[160, 100, 70, 40, 10].map((d) => t(d, 400, "Zelle from Elle Varga")), t(157, 260, "Zelle from Elle Varga"), // X15: 130 missed, one-off beside
        ...Array.from({ length: 24 }, (_, k) => t(11 + 7 * k, 50, "Zelle from Eve Stone")), // X4: the latest week never came
        ...x2b.map((d) => t(d, 35, "Venmo from Bree Tolan")), t(91, 22, "Venmo from Bree Tolan"), // X2b: 86 missed, one-off beside
      ] }] };
    const u = await makeApplicant("bar5");
    const r = await call("plaid-sandbox", u.token, { action: "link", household_member_id: u.memberId, custom_user: scenario });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    type Stream = { deposits: { transaction_id: string }[]; ambiguity: string[] };
    const rows = await waitFor("four sources with their full history", async () => {
      const got = (await db.query(`select s.average_amount, s.frequency, r.review_reasons, r.raw_payload
        from public.income_sources s join public.income_records r on r.income_source_id = s.id
        where s.provider_connection_id = $1 and s.source_type = 'recurring_transfer' order by s.average_amount`, [r.body.connection_id])).rows;
      const counts = got.map((x: { raw_payload: { stream: Stream } }) => x.raw_payload.stream.deposits.length);
      return JSON.stringify(counts) === JSON.stringify([25, 24, 6, 6]) ? got : null;
    }, 150_000);
    // Order by average: X2b (about 35), X4 (50), the clean sender (100), X15 (about 400).
    const clean = rows[2];
    expect([Number(clean.average_amount), clean.frequency, clean.review_reasons, clean.raw_payload.stream.ambiguity])
      .toEqual([100, "monthly", ["awaiting_family_statement"], []]);
    for (const i of [0, 1, 3]) {
      const s = rows[i].raw_payload.stream as Stream;
      expect(s.ambiguity.length, `row ${i}`).toBeGreaterThan(0);
      expect(rows[i].review_reasons.some((x: string) => x === "schedule_ambiguous" || x === "irregular_pattern"), `row ${i}`).toBe(true);
    }
    expect(rows[0].raw_payload.rule).toMatch(/rule v4.4/);
  });

  it("rework 6/7 item 5: a 4-deposit biweekly sender is proposed biweekly and flagged; a sender whose amount changed is surfaced and flagged", async () => {
    // PHASE_2_REWORK_6.md: the clean input it misread, and a qualifying sender it dropped.
    const t = (d: number, amount: number, text: string) => txn(daysAgo(d), -amount, text);
    const scenario = { override_accounts: [{ type: "depository", subtype: "checking", starting_balance: 600,
      transactions: [
        ...[45, 31, 17, 3].map((d) => t(d, 75, "Venmo from Four Deposits")),
        ...[170, 140, 110, 80].map((d) => t(d, 200, "Zelle from Raised Sender")), ...[50, 20].map((d) => t(d, 450, "Zelle from Raised Sender")),
      ] }] };
    const u = await makeApplicant("rework6");
    const r = await call("plaid-sandbox", u.token, { action: "link", household_member_id: u.memberId, custom_user: scenario });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    type Stream = { deposits: unknown[]; ambiguity: string[]; frequency: string | null };
    const rows = await waitFor("two sources with their full history", async () => {
      const got = (await db.query(`select s.average_amount, r.review_reasons, r.raw_payload
        from public.income_sources s join public.income_records r on r.income_source_id = s.id
        where s.provider_connection_id = $1 and s.source_type = 'recurring_transfer' order by s.average_amount`, [r.body.connection_id])).rows;
      const counts = got.map((x: { raw_payload: { stream: Stream } }) => x.raw_payload.stream.deposits.length);
      return JSON.stringify(counts) === JSON.stringify([4, 6]) ? got : null;
    }, 150_000);
    const four = rows[0].raw_payload.stream as Stream, raised = rows[1].raw_payload.stream as Stream;
    // Under 6 deposits, biweekly against semi-monthly is a documented limit: proposed by fit, always flagged.
    expect([Number(rows[0].average_amount), four.frequency, four.ambiguity, rows[0].review_reasons])
      .toEqual([75, "biweekly", ["frequency_ambiguous"], ["awaiting_family_statement", "schedule_ambiguous"]]);
    expect(raised.ambiguity).toContain("amount_changed");
    expect(rows[1].review_reasons).toContain("schedule_ambiguous");
  });

  it("rework 8 item 5: a long semi-monthly sender paid on the next business day is clean semi-monthly", async () => {
    // PHASE_2_REWORK_8.md: the 3rd and 18th, 6 deposits, weekend dates moved to the next business day.
    const dates: string[] = [];
    for (let m = 0; dates.length < 6 && m < 8; m++) {
      for (const dom of [18, 3]) {
        let t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, dom);
        while ([0, 6].includes(new Date(t).getUTCDay())) t += 86_400_000;
        if (t <= today.getTime() && dates.length < 6) dates.unshift(new Date(t).toISOString().slice(0, 10));
      }
    }
    dates.sort();
    const scenario = { override_accounts: [{ type: "depository", subtype: "checking", starting_balance: 400,
      transactions: dates.map((d) => txn(d, -360, "Zelle from Shifted Semi")) }] };
    const u = await makeApplicant("rework8");
    const r = await call("plaid-sandbox", u.token, { action: "link", household_member_id: u.memberId, custom_user: scenario });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const row = await waitFor("the semi-monthly source with all 6 deposits", async () => {
      const got = (await db.query(`select s.frequency, s.average_amount, s.occurrence_count, r.review_reasons, r.raw_payload
        from public.income_sources s join public.income_records r on r.income_source_id = s.id
        where s.provider_connection_id = $1 and s.source_type = 'recurring_transfer'`, [r.body.connection_id])).rows;
      return got.length === 1 && got[0].occurrence_count === 6 ? got[0] : null;
    }, 150_000);
    expect([row.frequency, Number(row.average_amount), row.raw_payload.stream.ambiguity, row.review_reasons])
      .toEqual(["semi_monthly", 360, [], ["awaiting_family_statement"]]);
  });

  it("rework 8 failure 2: one ingestion at a time per connection (the lease functions, driven directly)", async () => {
    const u = await makeApplicant("lease");
    // A connection with no Plaid item: nothing at Plaid to remove, and teardown deletes it with its applicant.
    const c = (await db.query(`insert into public.provider_connections (tenant_id, applicant_id, household_member_id, provider)
      values ($1, $2, $3, 'plaid') returning id`, [tenantId, u.appId, u.memberId])).rows[0].id;
    const fn = async (name: string) => (await db.query(`select public.${name}($1) as r`, [c])).rows[0].r;
    const state = async () => (await db.query(`select ingest_lease_until is not null as held, ingest_requested as requested
      from public.provider_connections where id = $1`, [c])).rows[0];
    expect(await fn("begin_ingest")).toBe(true); // the first run takes the lease
    expect(await state()).toEqual({ held: true, requested: false });
    expect(await fn("begin_ingest")).toBe(false); // a second is refused, and its request recorded for the first
    expect(await state()).toEqual({ held: true, requested: true });
    expect(await fn("end_ingest")).toBe(true); // so the holder runs again, keeping the lease
    expect(await state()).toEqual({ held: true, requested: false });
    expect(await fn("end_ingest")).toBe(false); // nothing waiting: released
    expect(await state()).toEqual({ held: false, requested: false });
    // A failed run releases with its request left behind, for the retry job.
    expect(await fn("begin_ingest")).toBe(true);
    await fn("release_ingest");
    expect(await state()).toEqual({ held: false, requested: true });
    expect((await db.query(`select id from public.pending_ingest_requests(1000)`)).rows.map((r: { id: string }) => r.id)).toContain(c);
    // A lease left by a killed run expires, and a new run may take it.
    await db.query(`update public.provider_connections set ingest_lease_until = now() - interval '1 second', ingest_requested = false where id = $1`, [c]);
    expect(await fn("begin_ingest")).toBe(true);
    expect(await fn("end_ingest")).toBe(false);
    // No client role can call them.
    for (const name of ["begin_ingest", "end_ingest", "release_ingest"]) {
      const { error } = await u.client.rpc(name, { p_connection_id: c });
      expect(error?.code, name).toBe("42501");
    }
    const { error } = await u.client.rpc("pending_ingest_requests", { p_limit: 10 });
    expect(error?.code).toBe("42501");
  });

  it("rework 8 failure 2: webhooks racing Plaid's staged history leave every qualifying sender (the eighth vetting's P and X5)", async () => {
    // P: every 30 days, last 4 days ago, plus a one-off. X5: every 14 days until 22 days ago (no active run, but
    // recent). Both qualify only on the full history: Plaid's first stage (30 days) shows P twice and X5 once.
    const scenario = { override_accounts: [{ type: "depository", subtype: "checking", starting_balance: 500, transactions: [
      ...[154, 124, 94, 64, 34, 4].map((d) => txn(daysAgo(d), -545, "Cash App from Abe Colt")),
      txn(daysAgo(2), -385, "Cash App from Abe Colt"),
      ...Array.from({ length: 12 }, (_, k) => txn(daysAgo(22 + 14 * k), -81, "Venmo from Jo Lamm")),
    ] }] };
    const u = await makeApplicant("race");
    const r = await call("plaid-sandbox", u.token, { action: "link", household_member_id: u.memberId, custom_user: scenario });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const conn = r.body.connection_id;
    // More webhooks on top of Plaid's own, while its history is still arriving.
    const fired = await Promise.all([1, 2, 3].map(() =>
      call("plaid-sandbox", u.token, { action: "fire_webhook", connection_id: conn, webhook_code: "SYNC_UPDATES_AVAILABLE" })));
    expect(fired.map((f) => f.status)).toEqual([200, 200, 200]);
    const item = (await db.query(`select provider_ref from public.provider_connections where id = $1`, [conn])).rows[0].provider_ref;
    // Settled: the full history has been processed, no event is in flight or waiting, and no run holds the connection.
    await waitFor("every webhook processed and the connection idle", async () => {
      const ev = (await db.query(`select event_type, status from public.webhook_events where provider_ref = $1`, [item])).rows;
      const c = (await db.query(`select ingest_lease_until, ingest_requested from public.provider_connections where id = $1`, [conn])).rows[0];
      const settled = ev.some((e: { event_type: string; status: string }) => e.event_type === "TRANSACTIONS.HISTORICAL_UPDATE" && e.status === "processed")
        && ev.every((e: { status: string }) => e.status === "processed" || e.status === "ignored")
        && c.ingest_lease_until === null && c.ingest_requested === false;
      return settled ? true : null;
    }, 180_000);
    const rows = (await db.query(`select s.frequency, s.average_amount, s.occurrence_count, r.raw_payload
      from public.income_sources s join public.income_records r on r.income_source_id = s.id
      where s.provider_connection_id = $1 and s.source_type = 'recurring_transfer' order by s.average_amount desc`, [conn])).rows;
    expect(rows.map((x: { frequency: string | null; average_amount: string; occurrence_count: number; raw_payload: { stream: { ambiguity: string[] } } }) =>
      [x.frequency, Number(x.average_amount), x.occurrence_count, x.raw_payload.stream.ambiguity]))
      .toEqual([["monthly", 545, 6, ["deposits_left_out"]], [null, 81, 12, ["irregular_pattern"]]]);
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
    const eventId = (await db.query(`insert into public.webhook_events (provider, event_id, event_type, provider_ref, signature_valid, status, attempts, next_attempt_at)
      values ('plaid', $1, 'INCOME.USER_INCOME_VERIFICATION', $2, true, 'failed', 1, now() - interval '1 minute') returning id`,
      [`test-payroll-${crypto.randomUUID()}`, userRef])).rows[0].id;
    const secret = (await db.query(`select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'`)).rows[0].decrypted_secret;
    const retry = await call("ingestion-retry", null, {}, { "x-cron-secret": secret });
    expect(retry.status).toBe(200);
    // The 5 minute pg_cron run may claim the event first (claims are atomic, skip locked), so check the event's
    // outcome rather than which caller processed it.
    const outcome = await waitFor("the payroll event to be processed", async () => {
      const e = (await db.query(`select status from public.webhook_events where id = $1`, [eventId])).rows[0];
      return e.status === "processed" ? e : null;
    }, 60_000);
    expect(outcome.status).toBe("processed");
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
