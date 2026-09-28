import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Client as PgClient } from "pg";
import { PUBLISHABLE_KEY, SUPABASE_URL, ownerDb, serviceClient } from "./env";

// PHASE-1-SPEC.md, CROSS TENANT ISOLATION TEST PROCEDURE, Setup.

export const TENANT_A_SLUG = "cedar-row";
export const TENANT_B_SLUG = "harborpoint";
const EMAIL_PREFIX = "iso-";
const EMAIL_DOMAIN = "@example.test";

/** Tables holding private tenant data. Cross tenant reads of these must return nothing. */
export const PRIVATE_TABLES = [
  "users", "applicants", "household_members", "income_sources", "income_records", "asset_records",
  "calculated_determinations", "generated_documents", "workflow_state", "audit_log",
  "provider_connections", "applicant_documents",
] as const;

export const DOCUMENTS_BUCKET = "applicant-documents";
export type PrivateTable = (typeof PRIVATE_TABLES)[number];

/** Tenant scoped tables that are public by design; isolation for these means write isolation. */
export const PUBLIC_TENANT_TABLES = ["theme_configs", "properties", "property_programs"] as const;
export const REFERENCE_TABLES = ["tenants", "programs", "program_rule_sets", "ami_schedules"] as const;

/** Per applicant data tables, in the order rows are created. */
const APPLICANT_TABLES = [
  "applicants", "household_members", "income_sources", "income_records", "asset_records",
  "calculated_determinations", "generated_documents", "workflow_state", "audit_log",
  "provider_connections", "applicant_documents",
] as const;

export type UserKey = "A1" | "A2" | "A3" | "RA" | "AA" | "B1" | "RB" | "NOROW";

export interface Actor {
  key: UserKey;
  id: string;
  email: string;
  client: SupabaseClient;
  password: string;
}

export interface Fixtures {
  tenantA: string;
  tenantB: string;
  propertyA: string;
  propertyB: string;
  programId: string;
  /** A program tenant B's property is not enrolled in, so a cross tenant attach cannot fail on uniqueness. */
  unenrolledProgramId: string;
  users: Record<UserKey, Actor>;
  /** rows[table][applicantKey] = row id of the fixture row for that applicant. */
  rows: Record<string, Partial<Record<"A1" | "A2" | "B1", string>>>;
  /** Storage object path of each applicant's fixture document. */
  objects: Partial<Record<"A1" | "A2" | "B1", string>>;
}

const password = () => `Iso-${crypto.randomUUID()}-a1A!`;

async function createAuthUser(svc: SupabaseClient, key: UserKey, tenantSlug: string | null) {
  const email = `${EMAIL_PREFIX}${key.toLowerCase()}-${Date.now()}${EMAIL_DOMAIN}`;
  const pw = password();
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
    user_metadata: tenantSlug ? { tenant_slug: tenantSlug } : {},
  });
  if (error || !data.user) throw new Error(`createUser ${key}: ${error?.message}`);
  return { id: data.user.id, email, password: pw };
}

async function signIn(email: string, pw: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: pw });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return client;
}

/** Remove everything a previous run may have left behind: fixture users, their data, and tenant B. */
export async function purge(db: PgClient, svc: SupabaseClient): Promise<void> {
  const { rows: users } = await db.query<{ id: string }>(
    `select id from auth.users where email like $1`, [`${EMAIL_PREFIX}%${EMAIL_DOMAIN}`]);
  const ids = users.map((u) => u.id);
  const { rows: tb } = await db.query<{ id: string }>(`select id from public.tenants where slug = $1`, [TENANT_B_SLUG]);
  const tenantB = tb[0]?.id ?? null;

  const { rows: objs } = await db.query<{ name: string }>(
    `select name from storage.objects where bucket_id = $1 and (storage.foldername(name))[2] in
       (select id::text from public.applicants where user_id = any($2::uuid[]) or tenant_id = $3)`,
    [DOCUMENTS_BUCKET, ids, tenantB]);
  if (objs.length) {
    const { error } = await svc.storage.from(DOCUMENTS_BUCKET).remove(objs.map((o) => o.name));
    if (error) throw new Error(`storage purge: ${error.message}`);
  }

  await db.query("begin");
  const apps = `(select id from public.applicants where user_id = any($1::uuid[]) or tenant_id = $2)`;
  await db.query(`delete from public.audit_log where actor_id = any($1::uuid[]) or tenant_id = $2`, [ids, tenantB]);
  await db.query(`delete from public.workflow_state where applicant_id in ${apps} or actor_id = any($1::uuid[])`, [ids, tenantB]);
  for (const t of ["generated_documents", "calculated_determinations", "income_records", "income_sources",
                   "asset_records", "applicant_documents", "provider_connections", "household_members"]) {
    await db.query(`delete from public.${t} where applicant_id in ${apps}`, [ids, tenantB]);
  }
  await db.query(`delete from public.applicants where user_id = any($1::uuid[]) or tenant_id = $2`, [ids, tenantB]);
  await db.query("commit");

  // Deleting the auth user cascades to public.users.
  for (const id of ids) {
    const { error } = await svc.auth.admin.deleteUser(id);
    if (error) throw new Error(`deleteUser ${id}: ${error.message}`);
  }

  if (tenantB) {
    await db.query("begin");
    await db.query(`delete from public.users where tenant_id = $1`, [tenantB]);
    await db.query(`delete from public.property_programs where tenant_id = $1`, [tenantB]);
    await db.query(`delete from public.properties where tenant_id = $1`, [tenantB]);
    await db.query(`delete from public.theme_configs where tenant_id = $1`, [tenantB]);
    await db.query(`delete from public.tenants where id = $1`, [tenantB]);
    await db.query("commit");
  }
}

export async function setup(): Promise<{ fx: Fixtures; db: PgClient; svc: SupabaseClient }> {
  const db = await ownerDb();
  const svc = serviceClient();
  await purge(db, svc);

  const one = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows[0];

  const tenantA = (await one(`select id from public.tenants where slug = $1`, [TENANT_A_SLUG])).id as string;
  const propertyA = (await one(`select id from public.properties where tenant_id = $1 and slug = 'maple-court'`,
                               [tenantA])).id as string;
  const program = await one(
    `select p.id, r.id as rule_set_id from public.programs p
     join public.program_rule_sets r on r.program_id = p.id where p.code = 'FHA-AHP'`);

  const unenrolledProgramId = (await one(`select id from public.programs where code = 'FAIRVIEW-IZ'`)).id as string;

  // Tenant B, the dummy operator, exists only for the duration of this run.
  const tenantB = (await one(`insert into public.tenants (slug, display_name) values ($1, 'Harbor Point Communities')
                              returning id`, [TENANT_B_SLUG])).id as string;
  await db.query(`insert into public.theme_configs (tenant_id, color_primary, color_primary_contrast, color_accent, form_footer_text)
                  values ($1, '#6B2D5C', '#FFFFFF', '#2E8B57', 'Harbor Point Communities, City of Fairview')`, [tenantB]);
  const propertyB = (await one(
    `insert into public.properties (tenant_id, slug, name, address_line1, address_city, address_state, address_postal_code, total_units)
     values ($1, 'pier-view', 'Pier View', '8 Pier View Road', 'Fairview', 'Meridian', '00418', 24) returning id`,
    [tenantB])).id as string;
  await db.query(`insert into public.property_programs (tenant_id, property_id, program_id) values ($1, $2, $3)`,
                 [tenantB, propertyB, program.id]);

  // Users. Applicants go through the real sign up trigger (tenant from slug); staff rows are written directly,
  // since no sign up path can produce a staff role.
  const plan: { key: UserKey; slug: string | null; staff?: { tenant: string; role: "reviewer" | "admin" } }[] = [
    { key: "A1", slug: TENANT_A_SLUG }, { key: "A2", slug: TENANT_A_SLUG }, { key: "A3", slug: TENANT_A_SLUG },
    { key: "RA", slug: null, staff: { tenant: tenantA, role: "reviewer" } },
    { key: "AA", slug: null, staff: { tenant: tenantA, role: "admin" } },
    { key: "B1", slug: TENANT_B_SLUG },
    { key: "RB", slug: null, staff: { tenant: tenantB, role: "reviewer" } },
    { key: "NOROW", slug: null },
  ];
  const created = {} as Record<UserKey, { id: string; email: string; password: string }>;
  for (const p of plan) {
    created[p.key] = await createAuthUser(svc, p.key, p.slug);
    if (p.staff) {
      await db.query(`insert into public.users (id, tenant_id, role) values ($1, $2, $3)`,
                     [created[p.key].id, p.staff.tenant, p.staff.role]);
    }
  }

  // One row per applicant in every per applicant table.
  const rows: Fixtures["rows"] = Object.fromEntries(APPLICANT_TABLES.map((t) => [t, {}]));
  const objects: Fixtures["objects"] = {};
  const seedApplicant = async (key: "A1" | "A2" | "B1", tenant: string, property: string, staffId: string) => {
    const userId = created[key].id;
    const app = (await one(`insert into public.applicants (tenant_id, user_id, property_id, contact_email)
                            values ($1, $2, $3, $4) returning id`, [tenant, userId, property, created[key].email])).id;
    const member = (await one(
      `insert into public.household_members (tenant_id, applicant_id, full_name, relationship, ssn_encrypted, ssn_last_four)
       values ($1, $2, $3, 'head', app.encrypt_pii('000-00-0000'), '0000') returning id`,
      [tenant, app, `Fixture ${key}`])).id;
    const source = (await one(`insert into public.income_sources (tenant_id, applicant_id, household_member_id, source_type, connection_method)
                               values ($1, $2, $3, 'employment', 'argyle') returning id`, [tenant, app, member])).id;
    const record = (await one(
      `insert into public.income_records (tenant_id, applicant_id, income_source_id, ingestion_method, raw_payload, pay_rate, pay_frequency, captured_at)
       values ($1, $2, $3, 'argyle', '{"fixture": true}', 18.50, 'hourly', now()) returning id`, [tenant, app, source])).id;
    const asset = (await one(
      `insert into public.asset_records (tenant_id, applicant_id, household_member_id, asset_type, account_number_encrypted, account_last_four, current_balance)
       values ($1, $2, $3, 'savings', app.encrypt_pii('000000001234'), '1234', 22000.00) returning id`,
      [tenant, app, member])).id;
    const det = (await one(
      `insert into public.calculated_determinations (tenant_id, applicant_id, program_id, rule_set_id, calculation_version, review_required, calculation_trace, calculated_at)
       values ($1, $2, $3, $4, 'fixture', false, '{"fixture": true}', now()) returning id`,
      [tenant, app, program.id, program.rule_set_id])).id;
    const doc = (await one(
      `insert into public.generated_documents (tenant_id, applicant_id, determination_id, document_type, storage_path, generated_at)
       values ($1, $2, $3, 'FTIC', 'fixtures/none.pdf', now()) returning id`, [tenant, app, det])).id;
    const wf = (await one(`insert into public.workflow_state (tenant_id, applicant_id, stage, action, actor_id)
                           values ($1, $2, 'intake', 'fixture', $3) returning id`, [tenant, app, staffId])).id;
    const audit = (await one(`insert into public.audit_log (tenant_id, actor_id, action, target_table, target_id)
                              values ($1, $2, 'fixture', 'applicants', $3) returning id`, [tenant, staffId, app])).id;
    const connection = (await one(
      `insert into public.provider_connections (tenant_id, applicant_id, household_member_id, provider, provider_ref, status, access_token_encrypted)
       values ($1, $2, $3, 'plaid', $4, 'ingested', app.encrypt_secret('fixture-access-token')) returning id`,
      [tenant, app, member, `fixture-item-${key}-${Date.now()}`])).id;
    const objectPath = `${tenant}/${app}/fixture-${key}.png`;
    const { error: upErr } = await svc.storage.from(DOCUMENTS_BUCKET)
      .upload(objectPath, Buffer.from(`fixture ${key}`), { contentType: "image/png" });
    if (upErr) throw new Error(`fixture upload ${key}: ${upErr.message}`);
    objects[key] = objectPath;
    const document = (await one(
      `insert into public.applicant_documents (tenant_id, applicant_id, household_member_id, document_kind, storage_path, mime_type, byte_size)
       values ($1, $2, $3, 'paystub', $4, 'image/png', 11) returning id`, [tenant, app, member, objectPath])).id;
    Object.entries({ applicants: app, household_members: member, income_sources: source, income_records: record,
                     asset_records: asset, calculated_determinations: det, generated_documents: doc,
                     workflow_state: wf, audit_log: String(audit), provider_connections: connection,
                     applicant_documents: document })
      .forEach(([t, id]) => { rows[t][key] = id; });
  };
  await seedApplicant("A1", tenantA, propertyA, created.RA.id);
  await seedApplicant("A2", tenantA, propertyA, created.RA.id);
  await seedApplicant("B1", tenantB, propertyB, created.RB.id);

  // Real sessions, signed in with the publishable key, after all rows exist.
  const users = {} as Record<UserKey, Actor>;
  for (const p of plan) {
    const c = created[p.key];
    users[p.key] = { key: p.key, id: c.id, email: c.email, password: c.password, client: await signIn(c.email, c.password) };
  }

  return { fx: { tenantA, tenantB, propertyA, propertyB, programId: program.id, unenrolledProgramId, users, rows, objects }, db, svc };
}
