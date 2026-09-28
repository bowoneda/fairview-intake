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
  counts: { income: number; assets: number };
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

  return {
    id: app.id,
    propertyId: app.property_id,
    status: app.application_status,
    household: (members ?? []).map((m) => ({
      id: m.id, fullName: m.full_name, relationship: m.relationship, dateOfBirth: m.date_of_birth,
    })),
    counts: { income: await count("income_sources"), assets: await count("asset_records") },
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
    case "income": return app.counts.income > 0 ? "in_progress" : "not_started";
    case "assets": return app.counts.assets > 0 ? "in_progress" : "not_started";
    case "documents": return "not_started";
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
