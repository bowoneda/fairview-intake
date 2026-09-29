import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Client as PgClient } from "pg";
import { PUBLISHABLE_KEY, SUPABASE_URL, ownerDb, serviceClient } from "../isolation/env";

// PHASE-2-SPEC.md, INTAKE UI, in a real browser: a document uploaded through the actual control is read by
// Textract and stored; a detected transfer is answered through the actual form. Sign in uses genuine session
// cookies from @supabase/ssr (the email code path is covered separately). Makes one billable Textract call.

const EMAIL_PREFIX = "e2e-ingest-";
const svc = serviceClient();
let db: PgClient;
let userId = "", appId = "", memberId = "", tenantId = "";
let cookies: { name: string; value: string }[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  db = await ownerDb();
  tenantId = (await db.query(`select id from public.tenants where slug = 'cedar-row'`)).rows[0].id;
  const email = `${EMAIL_PREFIX}${Date.now()}@example.test`, password = `E2e-${crypto.randomUUID()}-a1A!`;
  const { data } = await svc.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { tenant_slug: "cedar-row" } });
  userId = data.user!.id;

  const jar = new Map<string, string>();
  const ssr = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, { cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (s) => s.forEach(({ name, value }) => jar.set(name, value)),
  } });
  await ssr.auth.signInWithPassword({ email, password });
  cookies = [...jar].map(([name, value]) => ({ name, value }));

  const api = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  await api.auth.signInWithPassword({ email, password });
  const property = (await db.query(`select p.id from public.properties p where p.tenant_id = $1 and p.slug = 'maple-court'`, [tenantId])).rows[0].id;
  appId = (await api.from("applicants").insert({ tenant_id: tenantId, user_id: userId, property_id: property }).select("id").single()).data!.id;
  memberId = (await api.from("household_members").insert({ tenant_id: tenantId, applicant_id: appId, full_name: "Robin E2E", relationship: "head" }).select("id").single()).data!.id;
});

test.afterAll(async () => {
  const { rows: objs } = await db.query(`select name from storage.objects where bucket_id = 'applicant-documents' and (storage.foldername(name))[2] = $1`, [appId]);
  if (objs.length) await svc.storage.from("applicant-documents").remove(objs.map((o: { name: string }) => o.name));
  for (const t of ["income_records", "income_sources", "applicant_documents", "provider_connections", "household_members"]) {
    await db.query(`delete from public.${t} where applicant_id = $1`, [appId]);
  }
  await db.query(`delete from public.applicants where id = $1`, [appId]);
  await svc.auth.admin.deleteUser(userId);
  await db.end();
});

test.beforeEach(async ({ context }) => {
  await context.addCookies(cookies.map((c) => ({ ...c, domain: "localhost", path: "/" })));
});

test("a pay stub uploaded through the real control is read and stored", async ({ page }) => {
  await page.goto("/cedar-row/apply/documents");
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  await page.getByLabel("What kind of document? (required)").selectOption("paystub");
  // The visible "Choose a file" button opens this input; Playwright sets the file on it directly.
  await page.locator('input[type="file"][accept="image/jpeg,image/png,application/pdf"]').setInputFiles("tests/fixtures/documents/paystub.png");
  await expect(page.getByText(/Uploaded paystub\.png/)).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("heading", { name: "Your documents" })).toBeVisible();
  await page.screenshot({ path: "tests/theming/screenshots/documents-step.png", fullPage: true });

  const rec = (await db.query(`select r.gross_pay, r.employer_name, d.status from public.income_records r
    join public.applicant_documents d on d.id = r.document_id where d.applicant_id = $1`, [appId])).rows[0];
  expect(Number(rec.gross_pay)).toBe(1480);
  expect(rec.employer_name).toBe("Fairview Parcel Services LLC");
});

test("a multi page PDF is refused in the page with a plain message", async ({ page }) => {
  await page.goto("/cedar-row/apply/documents");
  await page.locator('input[type="file"][accept="image/jpeg,image/png,application/pdf"]').setInputFiles("tests/fixtures/documents/two-page.pdf");
  // Next.js adds its own route announcer with role alert, so match ours by its text.
  await expect(page.getByRole("alert").filter({ hasText: "2 pages" })).toBeVisible({ timeout: 60_000 });
});

test("a detected transfer is answered through the real form and moves to review", async ({ page }) => {
  const sourceId = (await db.query(`insert into public.income_sources (tenant_id, applicant_id, household_member_id, source_type, connection_method, status, counterparty_label, frequency, average_amount, occurrence_count, first_seen, last_seen)
    values ($1, $2, $3, 'recurring_transfer', 'plaid', 'awaiting_family_statement', 'Venmo', 'monthly', 200.00, 6, '2026-04-03', '2026-09-02') returning id`, [tenantId, appId, memberId])).rows[0].id;
  await page.goto("/cedar-row/apply/income");
  await expect(page.getByText(/We found 6 deposits from Venmo of about \$200\.00 every month/)).toBeVisible();
  await page.getByRole("button", { name: "Save answer" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Choose the answer that fits best" })).toBeVisible();
  await page.getByLabel("Someone outside my household regularly gives me money").check();
  await page.getByRole("button", { name: "Save answer" }).click();
  await expect(page.getByText(/Your answer is saved; a reviewer will confirm it/)).toBeVisible({ timeout: 30_000 });
  const src = (await db.query(`select status, family_statement from public.income_sources where id = $1`, [sourceId])).rows[0];
  expect(src).toEqual({ status: "awaiting_review", family_statement: "regular_contribution" });
  await expect(page.getByRole("button", { name: "Connect your bank" })).toBeEnabled({ timeout: 30_000 });
  await page.screenshot({ path: "tests/theming/screenshots/income-step.png", fullPage: true });
});

test("the assets step shows its empty state before any bank is connected", async ({ page }) => {
  await page.goto("/cedar-row/apply/assets");
  await expect(page.getByText("No accounts yet")).toBeVisible();
});
