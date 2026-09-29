import { afterAll, beforeAll, describe as group, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client as PgClient } from "pg";
import { PROJECT_REF, anonClient } from "./env";
import {
  DOCUMENTS_BUCKET, PRIVATE_TABLES, PUBLIC_TENANT_TABLES, REFERENCE_TABLES, purge, setup,
  type Actor, type Fixtures, type PrivateTable,
} from "./fixtures";
import { describe, record, writeReport, type Evidence } from "./report";

// PHASE-1-SPEC.md, CROSS TENANT ISOLATION TEST PROCEDURE. Every check records what actually happened.

let fx: Fixtures;
let db: PgClient;
let svc: SupabaseClient;

function check(e: Evidence) {
  record(e);
  expect.soft(e.pass, `${e.id} ${e.actor} ${e.action}: expected ${e.expected}, got ${e.actual}`).toBe(true);
}

type Res = { data: unknown; error: { code?: string; message: string } | null };
const rowsOf = (res: Res) => (Array.isArray(res.data) ? (res.data as { id: string | number }[]) : []);
const noRows = (res: Res) => !res.error && rowsOf(res).length === 0;
const rejected = (res: Res) => res.error !== null;
const rejectedOrNoRows = (res: Res) => res.error !== null || rowsOf(res).length === 0;

/** Fixture row ids a table holds for the given applicants (users table: the given user ids). */
function idsFor(table: PrivateTable, keys: ("A1" | "A2" | "B1")[], extraUsers: Actor[] = []): string[] {
  if (table === "users") return [...keys.map((k) => fx.users[k].id), ...extraUsers.map((u) => u.id)];
  return keys.map((k) => fx.rows[table][k]).filter((v): v is string => Boolean(v));
}

const ownerScalar = async (sql: string, params: unknown[]) => (await db.query(sql, params)).rows[0];

beforeAll(async () => {
  ({ fx, db, svc } = await setup());
});

afterAll(async () => {
  const path = writeReport(PROJECT_REF);
  console.log(`Isolation report: ${path}`);
  if (db && svc) {
    await purge(db, svc);
    const left = await ownerScalar(
      `select (select count(*) from auth.users where email like 'iso-%@example.test')::int as users,
              (select count(*) from public.tenants where slug = 'harborpoint')::int as tenants`, []);
    console.log(`Teardown check, remaining fixture users: ${left.users}, remaining tenant B: ${left.tenants}`);
    await db.end();
  }
});

group("positive controls", () => {
  it("P1: an applicant reads exactly their own rows", async () => {
    const a1 = fx.users.A1;
    for (const t of PRIVATE_TABLES.filter((t) => t !== "audit_log")) {
      const res = await a1.client.from(t).select("id");
      const got = rowsOf(res).map((r) => String(r.id)).sort();
      const want = idsFor(t, t === "users" ? [] : ["A1"], t === "users" ? [a1] : []).sort();
      check({ id: "P1", actor: "A1", action: `select ${t}`, expected: `exactly own ${want.length} row(s)`,
              actual: describe(res), pass: !res.error && JSON.stringify(got) === JSON.stringify(want) });
    }
  });

  it("P2: a reviewer reads every applicant's rows in their tenant", async () => {
    const ra = fx.users.RA;
    for (const t of PRIVATE_TABLES) {
      const res = await ra.client.from(t).select("id");
      const got = new Set(rowsOf(res).map((r) => String(r.id)));
      const want = t === "users"
        ? [fx.users.A1, fx.users.A2, fx.users.A3, fx.users.RA, fx.users.AA].map((u) => u.id)
        : idsFor(t, ["A1", "A2"]);
      check({ id: "P2", actor: "RA", action: `select ${t}`, expected: `includes tenant A's ${want.length} fixture row(s)`,
              actual: describe(res), pass: !res.error && want.every((id) => got.has(id)) });
    }
  });

  it("P3: an applicant inserts a household member on their own application", async () => {
    const res = await fx.users.A1.client.from("household_members")
      .insert({ tenant_id: fx.tenantA, applicant_id: fx.rows.applicants.A1, full_name: "P3 member", relationship: "dependent" })
      .select("id");
    check({ id: "P3", actor: "A1", action: "insert own household_members", expected: "1 row",
            actual: describe(res), pass: !res.error && rowsOf(res).length === 1 });
  });

  it("P4: an applicant updates their own household member", async () => {
    const res = await fx.users.A1.client.from("household_members")
      .update({ full_name: "Fixture A1 renamed" }).eq("id", fx.rows.household_members.A1).select("id");
    check({ id: "P4", actor: "A1", action: "update own household_members", expected: "1 row",
            actual: describe(res), pass: !res.error && rowsOf(res).length === 1 });
  });

  it("Y0: an admin updates their own tenant's theme", async () => {
    const aa = fx.users.AA;
    const before = await ownerScalar(`select form_footer_text from public.theme_configs where tenant_id = $1`, [fx.tenantA]);
    const res = await aa.client.from("theme_configs").update({ form_footer_text: "Y0 control" })
      .eq("tenant_id", fx.tenantA).select("tenant_id");
    await db.query(`update public.theme_configs set form_footer_text = $2 where tenant_id = $1`,
                   [fx.tenantA, before.form_footer_text]);
    check({ id: "Y0", actor: "AA", action: "update own theme_configs", expected: "1 row",
            actual: describe(res), pass: !res.error && rowsOf(res).length === 1 });
  });
});

group("cross tenant reads", () => {
  const crossReads = async (idPrefix: string, actors: Actor[], otherTenant: string, otherKeys: ("A1" | "A2" | "B1")[],
                            otherUsers: Actor[]) => {
    for (const actor of actors) {
      for (const t of PRIVATE_TABLES) {
        const others = idsFor(t, otherKeys, otherUsers);

        const filtered = await actor.client.from(t).select("id").eq("tenant_id", otherTenant);
        check({ id: `${idPrefix}.1`, actor: actor.key, action: `select ${t} where tenant_id = other tenant`,
                expected: "0 rows", actual: describe(filtered), pass: noRows(filtered) });

        const all = await actor.client.from(t).select("id");
        const leaked = rowsOf(all).filter((r) => others.includes(String(r.id)));
        check({ id: `${idPrefix}.2`, actor: actor.key, action: `select ${t} unfiltered`,
                expected: "none of the other tenant's rows",
                actual: all.error ? describe(all) : `${rowsOf(all).length} row(s), ${leaked.length} from other tenant`,
                pass: !all.error && leaked.length === 0 });

        const byId = await actor.client.from(t).select("id").in("id", others);
        check({ id: `${idPrefix}.3`, actor: actor.key, action: `select ${t} by other tenant's ids`,
                expected: "0 rows", actual: describe(byId), pass: noRows(byId) });
      }
    }
  };

  it("X1-X3: tenant A users cannot read tenant B", async () => {
    await crossReads("X", [fx.users.A1, fx.users.RA], fx.tenantB, ["B1"], [fx.users.RB]);
  });

  it("X4: tenant B users cannot read tenant A", async () => {
    await crossReads("X4", [fx.users.B1, fx.users.RB], fx.tenantA, ["A1", "A2"],
                     [fx.users.A3, fx.users.RA, fx.users.AA]);
  });
});

group("cross tenant writes", () => {
  it("W1: insert with the other tenant's tenant_id is rejected", async () => {
    const res = await fx.users.A1.client.from("household_members")
      .insert({ tenant_id: fx.tenantB, applicant_id: fx.rows.applicants.A1, full_name: "W1 member", relationship: "dependent" });
    const leaked = await ownerScalar(`select count(*)::int n from public.household_members where full_name = 'W1 member'`, []);
    check({ id: "W1", actor: "A1", action: "insert household_members with tenant_id = B", expected: "rejected, no row",
            actual: `${describe(res)}; rows written: ${leaked.n}`, pass: rejected(res) && leaked.n === 0 });
  });

  it("W2: insert pointing at the other tenant's application is rejected", async () => {
    const res = await fx.users.A1.client.from("household_members")
      .insert({ tenant_id: fx.tenantA, applicant_id: fx.rows.applicants.B1, full_name: "W2 member", relationship: "dependent" });
    const leaked = await ownerScalar(`select count(*)::int n from public.household_members where full_name = 'W2 member'`, []);
    check({ id: "W2", actor: "A1", action: "insert household_members on B1's application", expected: "rejected, no row",
            actual: `${describe(res)}; rows written: ${leaked.n}`, pass: rejected(res) && leaked.n === 0 });
  });

  it("W3: updating the other tenant's application changes nothing", async () => {
    const res = await fx.users.RA.client.from("applicants").update({ application_status: "closed" })
      .eq("id", fx.rows.applicants.B1).select("id");
    const after = await ownerScalar(`select application_status from public.applicants where id = $1`, [fx.rows.applicants.B1]);
    check({ id: "W3", actor: "RA", action: "update B1's applicants row", expected: "0 rows, row unchanged",
            actual: `${describe(res)}; status after: ${after.application_status}`,
            pass: rejectedOrNoRows(res) && after.application_status === "in_progress" });
  });

  it("W4: deleting the other tenant's workflow row changes nothing", async () => {
    const res = await fx.users.RA.client.from("workflow_state").delete().eq("id", fx.rows.workflow_state.B1).select("id");
    const after = await ownerScalar(`select count(*)::int n from public.workflow_state where id = $1`, [fx.rows.workflow_state.B1]);
    check({ id: "W4", actor: "RA", action: "delete B1's workflow_state row", expected: "rejected or 0 rows, row present",
            actual: `${describe(res)}; rows present after: ${after.n}`, pass: rejectedOrNoRows(res) && after.n === 1 });
  });

  it("W5: audit log writes are forced into the caller's own tenant", async () => {
    const ra = fx.users.RA;
    const direct = await ra.client.from("audit_log")
      .insert({ tenant_id: fx.tenantB, action: "W5 direct", target_table: "applicants" });
    check({ id: "W5.1", actor: "RA", action: "insert audit_log directly", expected: "rejected",
            actual: describe(direct), pass: rejected(direct) });

    const rpc = await ra.client.rpc("write_audit", {
      p_action: "W5 rpc", p_target_table: "applicants", p_target_id: fx.rows.applicants.B1,
      p_before: null, p_after: null, p_reason: "isolation suite W5" });
    const row = rpc.error ? null : await ownerScalar(
      `select tenant_id, actor_id from public.audit_log where id = $1`, [rpc.data]);
    check({ id: "W5.2", actor: "RA", action: "write_audit naming B1's application", expected: "row in tenant A, actor RA",
            actual: rpc.error ? describe(rpc) : `tenant ${row?.tenant_id === fx.tenantA ? "A" : row?.tenant_id}, actor ${row?.actor_id === ra.id ? "RA" : row?.actor_id}`,
            pass: !rpc.error && row?.tenant_id === fx.tenantA && row?.actor_id === ra.id });

    const applicant = await fx.users.A1.client.rpc("write_audit", {
      p_action: "W5 applicant", p_target_table: "applicants", p_target_id: fx.rows.applicants.A1,
      p_before: null, p_after: null, p_reason: null });
    check({ id: "W5.3", actor: "A1", action: "write_audit as an applicant", expected: "rejected",
            actual: describe(applicant), pass: rejected(applicant) });
  });
});

group("within tenant, applicant to applicant", () => {
  it("AP1: an applicant cannot read another applicant's rows", async () => {
    for (const t of PRIVATE_TABLES) {
      const others = t === "users" ? [fx.users.A2.id] : idsFor(t, ["A2"]);
      const res = await fx.users.A1.client.from(t).select("id").in("id", others);
      check({ id: "AP1", actor: "A1", action: `select A2's ${t}`, expected: "0 rows", actual: describe(res), pass: noRows(res) });
    }
  });

  it("AP2: an applicant cannot update another applicant's household member", async () => {
    const res = await fx.users.A1.client.from("household_members").update({ full_name: "AP2 overwrite" })
      .eq("id", fx.rows.household_members.A2).select("id");
    const after = await ownerScalar(`select full_name from public.household_members where id = $1`, [fx.rows.household_members.A2]);
    check({ id: "AP2", actor: "A1", action: "update A2's household_members row", expected: "0 rows, row unchanged",
            actual: `${describe(res)}; name after: ${after.full_name}`,
            pass: rejectedOrNoRows(res) && after.full_name === "Fixture A2" });
  });
});

group("cross tenant properties and branding", () => {
  it("Y1: nobody can attach to the other operator's property", async () => {
    const aa = fx.users.AA;
    const fk = await aa.client.from("property_programs")
      .insert({ tenant_id: fx.tenantA, property_id: fx.propertyB, program_id: fx.unenrolledProgramId });
    check({ id: "Y1.1", actor: "AA", action: "insert property_programs for B's property, tenant_id A", expected: "rejected",
            actual: describe(fk), pass: rejected(fk) });
    const rls = await aa.client.from("property_programs")
      .insert({ tenant_id: fx.tenantB, property_id: fx.propertyB, program_id: fx.unenrolledProgramId });
    check({ id: "Y1.2", actor: "AA", action: "insert property_programs for B's property, tenant_id B", expected: "rejected",
            actual: describe(rls), pass: rejected(rls) });

    const a3 = fx.users.A3;
    const cross = await a3.client.from("applicants")
      .insert({ tenant_id: fx.tenantA, user_id: a3.id, property_id: fx.propertyB }).select("id");
    check({ id: "Y1.3", actor: "A3", action: "insert application for B's property", expected: "rejected",
            actual: describe(cross), pass: rejected(cross) });
    // Control: the same applicant can apply to their own operator's property.
    const own = await a3.client.from("applicants")
      .insert({ tenant_id: fx.tenantA, user_id: a3.id, property_id: fx.propertyA }).select("id");
    check({ id: "Y1.4", actor: "A3", action: "insert application for own operator's property (control)", expected: "1 row",
            actual: describe(own), pass: !own.error && rowsOf(own).length === 1 });
  });

  it("Y2: an admin cannot change the other operator's property or theme", async () => {
    const aa = fx.users.AA;
    const prop = await aa.client.from("properties").update({ name: "Y2 overwrite" }).eq("id", fx.propertyB).select("id");
    const theme = await aa.client.from("theme_configs").update({ color_primary: "#000000" })
      .eq("tenant_id", fx.tenantB).select("tenant_id");
    const after = await ownerScalar(
      `select p.name, t.color_primary from public.properties p join public.theme_configs t on t.tenant_id = p.tenant_id
       where p.id = $1`, [fx.propertyB]);
    check({ id: "Y2.1", actor: "AA", action: "update B's property", expected: "0 rows, unchanged",
            actual: `${describe(prop)}; name after: ${after.name}`, pass: rejectedOrNoRows(prop) && after.name === "Pier View" });
    check({ id: "Y2.2", actor: "AA", action: "update B's theme", expected: "0 rows, unchanged",
            actual: `${describe(theme)}; color after: ${after.color_primary}`,
            pass: rejectedOrNoRows(theme) && after.color_primary === "#6B2D5C" });
  });
});

group("platform reference tables", () => {
  it("R1: no client role can write reference tables", async () => {
    const snapshot = async () => {
      const out: Record<string, string> = {};
      for (const t of REFERENCE_TABLES) {
        out[t] = (await ownerScalar(`select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) h from public.${t} x`, [])).h;
      }
      return out;
    };
    const before = await snapshot();
    const inserts: Record<string, Record<string, unknown>> = {
      tenants: { slug: "r1-probe", display_name: "R1" },
      programs: { code: "R1", name: "R1", regulator: "R1", program_type: "affordable_housing", required_documents: ["FTIC"] },
      program_rule_sets: { program_id: fx.programId, effective_from: "2031-01-01", asset_imputation_threshold: 1,
                           passbook_rate: 0.001, variance_threshold: 0.1, tier_percentages: [50], basis_note: "R1" },
      ami_schedules: { jurisdiction: "R1", effective_year: 2031, household_size: 1, area_median_income: 1 },
    };
    const updates: Record<string, [Record<string, unknown>, string, string]> = {
      tenants: [{ display_name: "R1" }, "id", fx.tenantA],
      programs: [{ name: "R1" }, "id", fx.programId],
      program_rule_sets: [{ basis_note: "R1" }, "program_id", fx.programId],
      ami_schedules: [{ area_median_income: 1 }, "jurisdiction", "Ashland County"],
    };
    for (const actor of [fx.users.A1, fx.users.RA, fx.users.AA]) {
      for (const t of REFERENCE_TABLES) {
        const ins = await actor.client.from(t).insert(inserts[t]);
        check({ id: "R1", actor: actor.key, action: `insert ${t}`, expected: "rejected", actual: describe(ins), pass: rejected(ins) });
        const [patch, col, val] = updates[t];
        const upd = await actor.client.from(t).update(patch).eq(col, val).select();
        check({ id: "R1", actor: actor.key, action: `update ${t}`, expected: "rejected or 0 rows",
                actual: describe(upd), pass: rejectedOrNoRows(upd) });
        const del = await actor.client.from(t).delete().eq(col, val).select();
        check({ id: "R1", actor: actor.key, action: `delete ${t}`, expected: "rejected or 0 rows",
                actual: describe(del), pass: rejectedOrNoRows(del) });
      }
    }
    const after = await snapshot();
    for (const t of REFERENCE_TABLES) {
      check({ id: "R1", actor: "owner", action: `${t} content hash before vs after`, expected: "unchanged",
              actual: before[t] === after[t] ? "unchanged" : "CHANGED", pass: before[t] === after[t] });
    }
  });
});

group("anonymous", () => {
  const anon = () => anonClient();

  it("N1: anon reads the five public tables", async () => {
    for (const t of [...PUBLIC_TENANT_TABLES, "tenants", "programs"]) {
      const res = await anon().from(t).select("*").limit(5);
      check({ id: "N1", actor: "anon", action: `select ${t}`, expected: "rows returned",
              actual: describe(res), pass: !res.error && rowsOf(res).length > 0 });
    }
  });

  it("N2: anon reads nothing else", async () => {
    for (const t of [...PRIVATE_TABLES, "program_rule_sets", "ami_schedules"]) {
      const res = await anon().from(t).select("*").limit(5);
      check({ id: "N2", actor: "anon", action: `select ${t}`, expected: "rejected or 0 rows",
              actual: describe(res), pass: rejectedOrNoRows(res) });
    }
  });

  it("N3: anon cannot write the public tables", async () => {
    const writes: [string, Record<string, unknown>, string, string][] = [
      ["tenants", { display_name: "N3" }, "id", fx.tenantA],
      ["programs", { name: "N3" }, "id", fx.programId],
      ["theme_configs", { form_footer_text: "N3" }, "tenant_id", fx.tenantA],
      ["properties", { name: "N3" }, "id", fx.propertyA],
      ["property_programs", { active: false }, "property_id", fx.propertyA],
    ];
    for (const [t, patch, col, val] of writes) {
      const ins = await anon().from(t).insert({ ...patch, [col]: val });
      check({ id: "N3", actor: "anon", action: `insert ${t}`, expected: "rejected", actual: describe(ins), pass: rejected(ins) });
      const upd = await anon().from(t).update(patch).eq(col, val).select();
      check({ id: "N3", actor: "anon", action: `update ${t}`, expected: "rejected or 0 rows",
              actual: describe(upd), pass: rejectedOrNoRows(upd) });
    }
  });
});

group("append only", () => {
  it("L1: no role can update or delete audit_log or workflow_state", async () => {
    const targets: [string, string, Record<string, unknown>][] = [
      ["audit_log", fx.rows.audit_log.A1!, { reason: "L1 overwrite" }],
      ["workflow_state", fx.rows.workflow_state.A1!, { action: "L1 overwrite" }],
    ];
    const actors: [string, SupabaseClient][] = [
      ["A1", fx.users.A1.client], ["RA", fx.users.RA.client], ["AA", fx.users.AA.client], ["service_role", svc],
    ];
    for (const [t, id, patch] of targets) {
      const before = JSON.stringify(await ownerScalar(`select * from public.${t} where id = $1`, [id]));
      for (const [who, client] of actors) {
        const upd = await client.from(t).update(patch).eq("id", id).select();
        check({ id: "L1", actor: who, action: `update ${t}`, expected: "rejected or 0 rows",
                actual: describe(upd), pass: rejectedOrNoRows(upd) });
        const del = await client.from(t).delete().eq("id", id).select();
        check({ id: "L1", actor: who, action: `delete ${t}`, expected: "rejected or 0 rows",
                actual: describe(del), pass: rejectedOrNoRows(del) });
      }
      const after = JSON.stringify(await ownerScalar(`select * from public.${t} where id = $1`, [id]));
      check({ id: "L1", actor: "owner", action: `${t} row before vs after`, expected: "unchanged",
              actual: before === after ? "unchanged" : "CHANGED", pass: before === after });
    }
  });
});

group("within tenant escalation (Security Skill Phase 1 early pass)", () => {
  it("E1-E3: roles change only by an admin, only within their own tenant", async () => {
    const roleOf = async (id: string) => (await ownerScalar(`select role from public.users where id = $1`, [id])).role;
    const self = await fx.users.RA.client.from("users").update({ role: "admin" }).eq("id", fx.users.RA.id).select();
    check({ id: "E1", actor: "RA", action: "reviewer sets own role to admin", expected: "0 rows, still reviewer",
            actual: `${describe(self)}; role after: ${await roleOf(fx.users.RA.id)}`,
            pass: rejectedOrNoRows(self) && (await roleOf(fx.users.RA.id)) === "reviewer" });
    const cross = await fx.users.AA.client.from("users").update({ role: "admin" }).eq("id", fx.users.RB.id).select();
    check({ id: "E2", actor: "AA", action: "admin sets tenant B reviewer's role to admin", expected: "0 rows, still reviewer",
            actual: `${describe(cross)}; role after: ${await roleOf(fx.users.RB.id)}`,
            pass: rejectedOrNoRows(cross) && (await roleOf(fx.users.RB.id)) === "reviewer" });
    // Control: an admin manages their own tenant's staff. Set RA to reviewer (no net change).
    const own = await fx.users.AA.client.from("users").update({ role: "reviewer" }).eq("id", fx.users.RA.id).select("id");
    check({ id: "E3", actor: "AA", action: "admin updates own tenant's reviewer (control)", expected: "1 row",
            actual: describe(own), pass: !own.error && rowsOf(own).length === 1 });
  });

  it("E4: an applicant can submit their application, and set no other status", async () => {
    const a1 = fx.users.A1, appId = fx.rows.applicants.A1!;
    const statusOf = async () => (await ownerScalar(`select application_status from public.applicants where id = $1`, [appId])).application_status;
    const attempt = async (status: string) => a1.client.from("applicants").update({ application_status: status }).eq("id", appId).select("id");

    for (const status of ["under_review", "determined", "closed"]) {
      const res = await attempt(status);
      const stored = await statusOf();
      check({ id: "E4", actor: "A1", action: `set own status in_progress -> ${status}`, expected: "rejected, still in_progress",
              actual: `${describe(res)}; stored: ${stored}`, pass: rejected(res) && stored === "in_progress" });
    }
    const submit = await attempt("submitted");
    check({ id: "E4", actor: "A1", action: "submit own application (control)", expected: "1 row, submitted",
            actual: `${describe(submit)}; stored: ${await statusOf()}`,
            pass: !submit.error && rowsOf(submit).length === 1 && (await statusOf()) === "submitted" });
    const back = await attempt("in_progress");
    check({ id: "E4", actor: "A1", action: "set own status submitted -> in_progress", expected: "rejected, still submitted",
            actual: `${describe(back)}; stored: ${await statusOf()}`, pass: rejected(back) && (await statusOf()) === "submitted" });
    const staff = await fx.users.RA.client.from("applicants").update({ application_status: "under_review" }).eq("id", appId).select("id");
    check({ id: "E4", actor: "RA", action: "reviewer moves the application to under_review (control)", expected: "1 row",
            actual: `${describe(staff)}; stored: ${await statusOf()}`,
            pass: !staff.error && rowsOf(staff).length === 1 && (await statusOf()) === "under_review" });
  });
});

group("phase 2 surfaces: provider tokens, webhooks, documents, statements", () => {
  it("T1-T3: tokens and webhook events are unreadable; clients cannot create connections", async () => {
    const a1 = fx.users.A1;
    const token = await a1.client.from("provider_connections").select("access_token_encrypted").eq("id", fx.rows.provider_connections.A1!);
    check({ id: "T1", actor: "A1", action: "select own provider_connections.access_token_encrypted", expected: "rejected",
            actual: describe(token), pass: rejected(token) });
    for (const [who, client] of [["A1", a1.client], ["RA", fx.users.RA.client], ["anon", anonClient()]] as const) {
      const res = await client.from("webhook_events").select("id").limit(1);
      check({ id: "T2", actor: who, action: "select webhook_events", expected: "rejected or 0 rows",
              actual: describe(res), pass: rejectedOrNoRows(res) });
    }
    const ins = await a1.client.from("provider_connections").insert({
      tenant_id: fx.tenantA, applicant_id: fx.rows.applicants.A1, household_member_id: fx.rows.household_members.A1,
      provider: "plaid", provider_ref: "t3-probe" });
    check({ id: "T3", actor: "A1", action: "insert provider_connections", expected: "rejected", actual: describe(ins), pass: rejected(ins) });
  });

  it("T4: document storage is isolated by tenant and applicant", async () => {
    const own = await fx.users.A1.client.storage.from(DOCUMENTS_BUCKET).download(fx.objects.A1!);
    check({ id: "T4.1", actor: "A1", action: "download own document (control)", expected: "downloaded",
            actual: own.error ? `error: ${own.error.message}` : `${own.data?.size} bytes`, pass: !own.error && (own.data?.size ?? 0) > 0 });
    for (const [who, client, target] of [
      ["A1", fx.users.A1.client, fx.objects.B1!], ["RA", fx.users.RA.client, fx.objects.B1!], ["A1", fx.users.A1.client, fx.objects.A2!],
      ["B1", fx.users.B1.client, fx.objects.A1!], ["anon", anonClient(), fx.objects.A1!],
    ] as const) {
      const res = await client.storage.from(DOCUMENTS_BUCKET).download(target);
      const whose = target === fx.objects.B1 ? "B1" : target === fx.objects.A2 ? "A2" : "A1";
      check({ id: "T4.2", actor: who, action: `download ${whose}'s document`, expected: "denied",
              actual: res.error ? `error: ${res.error.message}` : `${res.data?.size} bytes`, pass: Boolean(res.error) });
    }
    const intoB = await fx.users.A1.client.storage.from(DOCUMENTS_BUCKET)
      .upload(`${fx.tenantB}/${fx.rows.applicants.B1}/t4-probe.png`, Buffer.from("x"), { contentType: "image/png" });
    check({ id: "T4.3", actor: "A1", action: "upload into B1's folder", expected: "denied",
            actual: intoB.error ? `error: ${intoB.error.message}` : "uploaded", pass: Boolean(intoB.error) });
    const intoOwn = await fx.users.A1.client.storage.from(DOCUMENTS_BUCKET)
      .upload(`${fx.tenantA}/${fx.rows.applicants.A1}/t4-own.png`, Buffer.from("x"), { contentType: "image/png" });
    check({ id: "T4.4", actor: "A1", action: "upload into own folder (control)", expected: "uploaded",
            actual: intoOwn.error ? `error: ${intoOwn.error.message}` : "uploaded", pass: !intoOwn.error });
  });

  it("T5: a detected transfer is stated by the family and confirmed only by staff", async () => {
    const mk = async (applicant: "A1" | "A2") => (await ownerScalar(
      `insert into public.income_sources (tenant_id, applicant_id, household_member_id, source_type, connection_method, status, counterparty_label, frequency, average_amount, occurrence_count)
       values ($1, $2, $3, 'recurring_transfer', 'plaid', 'awaiting_family_statement', 'Venmo', 'monthly', 200.00, 6) returning id`,
      [fx.tenantA, fx.rows.applicants[applicant], fx.rows.household_members[applicant]])).id as string;
    const s1 = await mk("A1"), s2 = await mk("A2");
    const stateOf = async (id: string) => ownerScalar(`select status, family_statement, family_statement_at from public.income_sources where id = $1`, [id]);

    const stated = await fx.users.A1.client.from("income_sources").update({ family_statement: "regular_contribution" }).eq("id", s1).select("id");
    const after = await stateOf(s1);
    check({ id: "T5.1", actor: "A1", action: "state own detected transfer (control)", expected: "1 row, status awaiting_review, stamped",
            actual: `${describe(stated)}; status ${after.status}, stamped ${Boolean(after.family_statement_at)}`,
            pass: !stated.error && rowsOf(stated).length === 1 && after.status === "awaiting_review" && Boolean(after.family_statement_at) });
    const selfConfirm = await fx.users.A1.client.from("income_sources").update({ status: "confirmed_excluded" }).eq("id", s1).select("id");
    check({ id: "T5.2", actor: "A1", action: "set own source status directly", expected: "rejected, unchanged",
            actual: `${describe(selfConfirm)}; status ${(await stateOf(s1)).status}`,
            pass: rejected(selfConfirm) && (await stateOf(s1)).status === "awaiting_review" });
    const other = await fx.users.A1.client.from("income_sources").update({ family_statement: "life_event_gift" }).eq("id", s2).select("id");
    check({ id: "T5.3", actor: "A1", action: "state A2's transfer", expected: "0 rows, unchanged",
            actual: `${describe(other)}; A2 statement ${(await stateOf(s2)).family_statement}`,
            pass: rejectedOrNoRows(other) && (await stateOf(s2)).family_statement === null });
    const staffStates = await fx.users.RA.client.from("income_sources").update({ family_statement: "life_event_gift" }).eq("id", s2).select("id");
    check({ id: "T5.3b", actor: "RA", action: "reviewer writes the family's statement", expected: "rejected, unchanged",
            actual: `${describe(staffStates)}; A2 statement ${(await stateOf(s2)).family_statement}`,
            pass: rejected(staffStates) && (await stateOf(s2)).family_statement === null });
    const early = await fx.users.RA.client.rpc("confirm_income_source", { p_source_id: s2, p_outcome: "confirmed_income", p_reason: "T5 too early" });
    check({ id: "T5.3c", actor: "RA", action: "reviewer confirms before the family has stated", expected: "rejected, unchanged",
            actual: `${describe(early)}; A2 status ${(await stateOf(s2)).status}`,
            pass: rejected(early) && (await stateOf(s2)).status === "awaiting_family_statement" });
    const applicantRpc = await fx.users.A1.client.rpc("confirm_income_source", { p_source_id: s1, p_outcome: "confirmed_excluded", p_reason: "T5" });
    check({ id: "T5.4", actor: "A1", action: "confirm_income_source as an applicant", expected: "rejected",
            actual: describe(applicantRpc), pass: rejected(applicantRpc) });
    const crossRpc = await fx.users.RB.client.rpc("confirm_income_source", { p_source_id: s1, p_outcome: "confirmed_excluded", p_reason: "T5 cross" });
    check({ id: "T5.5", actor: "RB", action: "confirm tenant A's source as tenant B staff", expected: "rejected, unchanged",
            actual: `${describe(crossRpc)}; status ${(await stateOf(s1)).status}`,
            pass: rejected(crossRpc) && (await stateOf(s1)).status === "awaiting_review" });
    const staff = await fx.users.RA.client.rpc("confirm_income_source", { p_source_id: s1, p_outcome: "confirmed_income", p_reason: "T5 regular contribution confirmed" });
    const audit = await ownerScalar(`select count(*)::int n from public.audit_log where action = 'confirm_income_source' and target_id = $1 and actor_id = $2`, [s1, fx.users.RA.id]);
    check({ id: "T5.6", actor: "RA", action: "reviewer confirms with a reason (control)", expected: "confirmed_income, audited",
            actual: `${staff.error ? describe(staff) : "ok"}; status ${(await stateOf(s1)).status}; audit rows ${audit.n}`,
            pass: !staff.error && (await stateOf(s1)).status === "confirmed_income" && audit.n === 1 });
  });
});

group("claim source attacks", () => {
  it("C2: an applicant cannot change their own tenant or role", async () => {
    const a1 = fx.users.A1;
    const tenant = await a1.client.from("users").update({ tenant_id: fx.tenantB }).eq("id", a1.id).select();
    const role = await a1.client.from("users").update({ role: "admin" }).eq("id", a1.id).select();
    const after = await ownerScalar(`select tenant_id, role from public.users where id = $1`, [a1.id]);
    check({ id: "C2.1", actor: "A1", action: "update own users.tenant_id", expected: "rejected, unchanged",
            actual: `${describe(tenant)}; tenant after: ${after.tenant_id === fx.tenantA ? "A" : after.tenant_id}`,
            pass: rejectedOrNoRows(tenant) && after.tenant_id === fx.tenantA });
    check({ id: "C2.2", actor: "A1", action: "update own users.role to admin", expected: "rejected or 0 rows, unchanged",
            actual: `${describe(role)}; role after: ${after.role}`, pass: rejectedOrNoRows(role) && after.role === "applicant" });
  });

  it("C3: a user with no profile row sees nothing", async () => {
    for (const t of PRIVATE_TABLES) {
      const res = await fx.users.NOROW.client.from(t).select("id");
      check({ id: "C3", actor: "NOROW", action: `select ${t}`, expected: "0 rows", actual: describe(res), pass: noRows(res) });
    }
  });

  it("C1: forged tenant in editable user_metadata does not move the user", async () => {
    const a1 = fx.users.A1;
    const upd = await a1.client.auth.updateUser({ data: { tenant_id: fx.tenantB, app_role: "admin" } });
    const refreshed = await a1.client.auth.refreshSession();
    const token = refreshed.data.session?.access_token ?? "";
    const claims = token ? JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) : {};
    check({ id: "C1.0", actor: "A1", action: "forge user_metadata, refresh, read claims",
            expected: "top level tenant_id A, app_role applicant",
            actual: upd.error ? `error: ${upd.error.message}` :
              `tenant_id ${claims.tenant_id === fx.tenantA ? "A" : claims.tenant_id}, app_role ${claims.app_role}`,
            pass: !upd.error && claims.tenant_id === fx.tenantA && claims.app_role === "applicant" });
    for (const t of PRIVATE_TABLES) {
      const res = await a1.client.from(t).select("id").eq("tenant_id", fx.tenantB);
      check({ id: "C1", actor: "A1 (forged metadata)", action: `select ${t} where tenant_id = B`, expected: "0 rows",
              actual: describe(res), pass: noRows(res) });
    }
  });
});
