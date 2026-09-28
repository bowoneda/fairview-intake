"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { accessFor } from "@/lib/guard";
import { ensureApplication, loadApplication } from "@/lib/intake";
import { sessionClient } from "@/lib/supabase/server";
import { findProperty, resolveTenant } from "@/lib/tenant";

async function applicantOf(tenantSlug: string) {
  const tenant = await resolveTenant(tenantSlug);
  if (!tenant) redirect("/");
  const access = await accessFor(tenant);
  if (access.kind !== "applicant") redirect(`/${tenant.slug}`);
  return { tenant, claims: access.claims };
}

/** For a signed in applicant who has no application yet (for example, signed in before choosing). */
export async function startApplication(form: FormData) {
  const { tenant, claims } = await applicantOf(String(form.get("tenant") ?? ""));
  const property = findProperty(tenant, String(form.get("property") ?? ""));
  if (!property) redirect(`/${tenant.slug}?notice=choose-property`);
  await ensureApplication(tenant, property, claims.userId, claims.email);
  redirect(`/${tenant.slug}/apply?property=${property.slug}`);
}

export interface MemberFormState {
  errors?: Partial<Record<"full_name" | "relationship" | "date_of_birth", string>>;
  formError?: string;
}

const memberSchema = z.object({
  full_name: z.string().trim().min(1, "Enter this person's full name.").max(200, "Use 200 characters or fewer."),
  relationship: z.enum(["head", "spouse", "co_head", "dependent", "other_adult"], {
    message: "Choose how this person is related to the head of household.",
  }),
  date_of_birth: z.union([
    z.literal(""),
    z.iso.date("Enter the date of birth as a date.").refine((d) => d <= new Date().toISOString().slice(0, 10),
      "Date of birth cannot be in the future."),
  ]),
});

/** Save one household member. Written under RLS as the applicant, onto their own application only. */
export async function addHouseholdMember(_prev: MemberFormState, form: FormData): Promise<MemberFormState> {
  const { tenant } = await applicantOf(String(form.get("tenant") ?? ""));
  const parsed = memberSchema.safeParse({
    full_name: form.get("full_name") ?? "",
    relationship: form.get("relationship") ?? undefined,
    date_of_birth: form.get("date_of_birth") ?? "",
  });
  if (!parsed.success) {
    const errors: MemberFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<MemberFormState["errors"]>;
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  const app = await loadApplication();
  if (!app) redirect(`/${tenant.slug}?notice=choose-property`);
  if (parsed.data.relationship === "head" && app.household.some((m) => m.relationship === "head")) {
    return { errors: { relationship: "This household already has a head of household. Choose another relationship." } };
  }

  const db = await sessionClient();
  const { error } = await db.from("household_members").insert({
    tenant_id: tenant.id,
    applicant_id: app.id,
    full_name: parsed.data.full_name,
    relationship: parsed.data.relationship,
    date_of_birth: parsed.data.date_of_birth || null,
  });
  if (error) return { formError: "We could not save this person. Try again." };

  const next = form.get("intent") === "finish_later" ? `/${tenant.slug}/apply?saved=1`
    : form.get("intent") === "continue" ? `/${tenant.slug}/apply/income`
    : `/${tenant.slug}/apply/household?saved=1`;
  redirect(next);
}
