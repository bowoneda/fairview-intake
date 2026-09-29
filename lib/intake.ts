import "server-only";
import type { StepState } from "@/components/ui";
import { sessionClient } from "@/lib/supabase/server";
import type { Property, Tenant } from "@/lib/tenant";

export const STEPS = [
  { slug: "household", title: "Household" },
  { slug: "income", title: "Income" },
  { slug: "assets", title: "Assets" },
  { slug: "documents", title: "Documents" },
  { slug: "review", title: "Review" },
] as const;
export type StepSlug = (typeof STEPS)[number]["slug"];

export const isStep = (s: string): s is StepSlug => STEPS.some((x) => x.slug === s);

export interface HouseholdMember {
  id: string;
  fullName: string;
  relationship: string;
  dateOfBirth: string | null;
}

export interface Application {
  id: string;
  propertyId: string;
  status: string;
  household: HouseholdMember[];
  counts: { income: number; assets: number; documents: number; awaitingStatement: number; failedDocuments: number };
}

/** The signed in applicant's own application in this tenant, read under RLS. */
export async function loadApplication(): Promise<Application | null> {
  const db = await sessionClient();
  const { data: app, error } = await db
    .from("applicants")
    .select("id, property_id, application_status")
    .maybeSingle();
  if (error) throw new Error(`Application lookup failed: ${error.message}`);
  if (!app) return null;

  const { data: members, error: memberError } = await db
    .from("household_members")
    .select("id, full_name, relationship, date_of_birth, created_at")
    .eq("applicant_id", app.id)
    .order("created_at");
  if (memberError) throw new Error(`Household lookup failed: ${memberError.message}`);

  const count = async (table: string) => {
    const { count: n, error: e } = await db.from(table).select("id", { count: "exact", head: true }).eq("applicant_id", app.id);
    if (e) throw new Error(`${table} count failed: ${e.message}`);
    return n ?? 0;
  };

  async function countWhere(table: string, column: string, value: string) {
    const { count: n, error: e } = await db.from(table).select("id", { count: "exact", head: true })
      .eq("applicant_id", app!.id).eq(column, value);
    if (e) throw new Error(`${table} count failed: ${e.message}`);
    return n ?? 0;
  }

  return {
    id: app.id,
    propertyId: app.property_id,
    status: app.application_status,
    household: (members ?? []).map((m) => ({
      id: m.id, fullName: m.full_name, relationship: m.relationship, dateOfBirth: m.date_of_birth,
    })),
    counts: {
      income: await count("income_sources"),
      assets: await count("asset_records"),
      documents: await count("applicant_documents"),
      awaitingStatement: await countWhere("income_sources", "status", "awaiting_family_statement"),
      failedDocuments: await countWhere("applicant_documents", "status", "failed"),
    },
  };
}

/**
 * Create the applicant's application for a property of this tenant, if they have none. RLS requires the
 * applicant role and user_id = auth.uid(); the composite foreign key requires the property to be the
 * tenant's own.
 */
export async function ensureApplication(tenant: Tenant, property: Property, userId: string, email: string | null) {
  const existing = await loadApplication();
  if (existing) return existing;
  const db = await sessionClient();
  const { error } = await db.from("applicants").insert({
    tenant_id: tenant.id,
    user_id: userId,
    property_id: property.id,
    contact_email: email,
  });
  if (error) throw new Error(`Could not create the application: ${error.message}`);
  return loadApplication();
}

/**
 * A step's state, per DESIGN.md: Complete when its required data is saved, In progress when anything is
 * saved, Not started otherwise. Income, assets, and documents gain real data in Phase 2.
 */
export function stepState(app: Application, step: StepSlug): StepState {
  switch (step) {
    case "household":
      if (app.household.some((m) => m.relationship === "head")) return "complete";
      return app.household.length > 0 ? "in_progress" : "not_started";
    case "income":
      if (app.counts.income === 0) return "not_started";
      return app.counts.awaitingStatement === 0 ? "complete" : "in_progress";
    case "assets": return app.counts.assets > 0 ? "complete" : "not_started";
    case "documents":
      if (app.counts.documents === 0) return "not_started";
      return app.counts.failedDocuments === 0 ? "complete" : "in_progress";
    case "review": return app.status === "in_progress" ? "not_started" : "complete";
  }
}

/** Steps with their states and links: every step up to and including the first incomplete one is a link. */
export function stepList(app: Application, base: string) {
  const firstIncomplete = STEPS.findIndex((s) => stepState(app, s.slug) !== "complete");
  return STEPS.map((s, i) => ({
    ...s,
    state: stepState(app, s.slug),
    href: firstIncomplete === -1 || i <= firstIncomplete || stepState(app, s.slug) !== "not_started"
      ? `${base}/apply/${s.slug}` : undefined,
  }));
}

export const STATUS_LABEL: Record<string, string> = {
  in_progress: "In progress", submitted: "Submitted", under_review: "Under review", determined: "Decision made", closed: "Closed",
};

export interface IngestionView {
  sources: {
    id: string; memberId: string; sourceType: string; connectionMethod: string; status: string;
    appLabel: string | null; frequency: string | null; averageAmount: number | null; occurrences: number | null;
    firstSeen: string | null; lastSeen: string | null; familyStatement: string | null;
    employerName: string | null; grossPay: number | null; payFrequency: string | null; needsReview: boolean;
  }[];
  connections: { id: string; memberId: string; provider: string; status: string }[];
  assets: { id: string; type: string; institution: string | null; lastFour: string | null; balance: number; asOf: string | null }[];
  documents: { id: string; memberId: string; kind: string; status: string; failureReason: string | null; createdAt: string }[];
}

/** Everything the Income, Assets, and Documents steps show, read under RLS; shaped for display only. */
export async function loadIngestionView(applicantId: string): Promise<IngestionView> {
  const db = await sessionClient();
  const [src, rec, con, ast, doc] = await Promise.all([
    db.from("income_sources").select("id, household_member_id, source_type, connection_method, status, counterparty_label, frequency, average_amount, occurrence_count, first_seen, last_seen, family_statement").eq("applicant_id", applicantId).order("created_at"),
    db.from("income_records").select("income_source_id, employer_name, gross_pay, pay_frequency, needs_review").eq("applicant_id", applicantId),
    db.from("provider_connections").select("id, household_member_id, provider, status").eq("applicant_id", applicantId).order("created_at"),
    db.from("asset_records").select("id, asset_type, institution_name, account_last_four, current_balance, balance_as_of").eq("applicant_id", applicantId).order("created_at"),
    db.from("applicant_documents").select("id, household_member_id, document_kind, status, failure_reason, created_at").eq("applicant_id", applicantId).order("created_at", { ascending: false }),
  ]);
  for (const r of [src, rec, con, ast, doc]) if (r.error) throw new Error(`ingestion view: ${r.error.message}`);
  const recBySource = new Map((rec.data ?? []).map((r) => [r.income_source_id, r]));
  return {
    sources: (src.data ?? []).map((s) => {
      const r = recBySource.get(s.id);
      return {
        id: s.id, memberId: s.household_member_id, sourceType: s.source_type, connectionMethod: s.connection_method, status: s.status,
        appLabel: s.counterparty_label, frequency: s.frequency, averageAmount: s.average_amount === null ? null : Number(s.average_amount),
        occurrences: s.occurrence_count, firstSeen: s.first_seen, lastSeen: s.last_seen, familyStatement: s.family_statement,
        employerName: r?.employer_name ?? null, grossPay: r?.gross_pay == null ? null : Number(r.gross_pay),
        payFrequency: r?.pay_frequency ?? null, needsReview: Boolean(r?.needs_review),
      };
    }),
    connections: (con.data ?? []).map((c) => ({ id: c.id, memberId: c.household_member_id, provider: c.provider, status: c.status })),
    assets: (ast.data ?? []).map((a) => ({ id: a.id, type: a.asset_type, institution: a.institution_name, lastFour: a.account_last_four,
      balance: Number(a.current_balance), asOf: a.balance_as_of })),
    documents: (doc.data ?? []).map((d) => ({ id: d.id, memberId: d.household_member_id, kind: d.document_kind, status: d.status,
      failureReason: d.failure_reason, createdAt: d.created_at })),
  };
}

