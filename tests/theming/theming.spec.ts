import { expect, test, type Page } from "@playwright/test";
import type { Client as PgClient } from "pg";
import { ownerDb } from "../isolation/env";

// PHASE-1-SPEC.md, SECOND TENANT RENDER CHECK. A second operator is inserted by SQL only, then checked in a
// real browser: computed theme values, its own properties only, a live color change, and the 404.

const SHOTS = "tests/theming/screenshots";
const B = { slug: "harborpoint", name: "Harbor Point Communities", primary: "#6B2D5C", property: "Pier View" };
const A = { slug: "cedar-row", name: "Cedar Row Residential", primary: "#1F4E5A", properties: ["Maple Court", "Linden Terrace"] };

let db: PgClient;

async function removeTenantB() {
  const { rows } = await db.query<{ id: string }>(`select id from public.tenants where slug = $1`, [B.slug]);
  const id = rows[0]?.id;
  if (!id) return;
  await db.query(`delete from public.property_programs where tenant_id = $1`, [id]);
  await db.query(`delete from public.properties where tenant_id = $1`, [id]);
  await db.query(`delete from public.theme_configs where tenant_id = $1`, [id]);
  await db.query(`delete from public.tenants where id = $1`, [id]);
}

/** The value the browser actually computed for a custom property on :root. */
const rootVar = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toUpperCase(), name);

const headerBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.querySelector("header")!).backgroundColor);

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  db = await ownerDb();
  await removeTenantB();
  const { rows } = await db.query<{ id: string }>(
    `insert into public.tenants (slug, display_name) values ($1, $2) returning id`, [B.slug, B.name]);
  await db.query(
    `insert into public.theme_configs (tenant_id, color_primary, color_primary_contrast, color_accent, form_footer_text)
     values ($1, $2, '#FFFFFF', '#2E8B57', 'Harbor Point Communities, City of Fairview')`, [rows[0].id, B.primary]);
  await db.query(
    `insert into public.properties (tenant_id, slug, name, address_line1, address_city, address_state, address_postal_code, total_units)
     values ($1, 'pier-view', $2, '8 Pier View Road', 'Fairview', 'Meridian', '00418', 24)`, [rows[0].id, B.property]);
});

test.afterAll(async () => {
  await removeTenantB();
  await db.end();
});

test("the configured operator renders its own theme and properties", async ({ page }) => {
  const res = await page.goto(`/${A.slug}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("link", { name: A.name })).toBeVisible();
  expect(await rootVar(page, "--color-primary")).toBe(A.primary);
  expect(await headerBackground(page)).toBe(rgb(A.primary));
  for (const p of A.properties) await expect(page.getByRole("heading", { name: p })).toBeVisible();
  await expect(page.getByText(B.property)).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/cedar-row-landing.png`, fullPage: true });
});

test("a second operator inserted by SQL renders with no code change", async ({ page }) => {
  const res = await page.goto(`/${B.slug}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("link", { name: B.name })).toBeVisible();
  expect(await rootVar(page, "--color-primary")).toBe(B.primary);
  expect(await headerBackground(page)).toBe(rgb(B.primary));
  await expect(page.getByRole("heading", { name: B.property })).toBeVisible();
  for (const p of A.properties) await expect(page.getByText(p)).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/harborpoint-landing.png`, fullPage: true });
});

test("a theme change in the database shows on the next request, with no rebuild", async ({ page }) => {
  await db.query(
    `update public.theme_configs set color_primary = '#0B5D1E'
     where tenant_id = (select id from public.tenants where slug = $1)`, [B.slug]);
  await page.goto(`/${B.slug}`);
  expect(await rootVar(page, "--color-primary")).toBe("#0B5D1E");
  expect(await headerBackground(page)).toBe(rgb("#0B5D1E"));
});

test("the preview pages show each operator's measured contrast", async ({ page }) => {
  await page.goto(`/${A.slug}/preview`);
  await expect(page.getByTestId("contrast-result")).toContainText("9.15:1, passes");
  await page.screenshot({ path: `${SHOTS}/cedar-row-preview.png`, fullPage: true });

  await db.query(
    `update public.theme_configs set color_primary = $2
     where tenant_id = (select id from public.tenants where slug = $1)`, [B.slug, B.primary]);
  await page.goto(`/${B.slug}/preview`);
  await expect(page.getByTestId("contrast-result")).toContainText("9.74:1, passes");
  await page.screenshot({ path: `${SHOTS}/harborpoint-preview.png`, fullPage: true });
});

test("an unknown operator is a neutral 404", async ({ page }) => {
  const res = await page.goto("/no-such-tenant");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "We could not find that page" })).toBeVisible();
  await expect(page.locator("header")).toHaveCount(0);
});
