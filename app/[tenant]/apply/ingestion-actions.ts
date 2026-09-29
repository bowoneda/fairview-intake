"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { callFunction } from "@/lib/functions";
import { accessFor } from "@/lib/guard";
import { loadApplication } from "@/lib/intake";
import { sessionClient } from "@/lib/supabase/server";
import { resolveTenant } from "@/lib/tenant";

// Server actions for the Income, Assets, and Documents steps (PHASE-2-SPEC.md, INTAKE UI). Each one
// authenticates the caller and works through the caller's own RLS session; provider calls go through our Edge
// Functions with the caller's token. Returns are shaped for the UI, never raw rows.

async function applicant(tenantSlug: string) {
  const tenant = await resolveTenant(tenantSlug);
  if (!tenant) return null;
  const access = await accessFor(tenant);
  if (access.kind !== "applicant") return null;
  const app = await loadApplication();
  return app ? { tenant, app } : null;
}

const KINDS = ["paystub", "w2", "schedule_c", "benefit_letter"] as const;
const MIMES = ["image/jpeg", "image/png", "application/pdf"] as const;
const EXT: Record<(typeof MIMES)[number], string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };
const MAX = 10 * 1024 * 1024;

const uploadRequest = z.object({
  tenant: z.string(),
  memberId: z.uuid(),
  kind: z.enum(KINDS),
  mime: z.enum(MIMES),
  size: z.number().int().positive().max(MAX),
});

export type UploadTicket = { ok: true; path: string; signedUrl: string } | { ok: false; message: string };

/**
 * Step 1 of an upload: a one time signed URL for a path inside the caller's own tenant and application folder.
 * The file then goes from the browser straight to storage, never through this server (Vercel caps request
 * bodies well below the 10 MB document limit).
 */
export async function requestDocumentUpload(input: z.input<typeof uploadRequest>): Promise<UploadTicket> {
  const parsed = uploadRequest.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: input.size > MAX ? "This file is larger than 10 MB. Try a photo of the page instead of a scan." : "Choose a JPEG or PNG photo, or a one page PDF." };
  }
  const who = await applicant(parsed.data.tenant);
  if (!who) return { ok: false, message: "Sign in again to continue." };
  if (!who.app.household.some((m) => m.id === parsed.data.memberId)) return { ok: false, message: "Choose a person from your household." };

  const path = `${who.tenant.id}/${who.app.id}/${crypto.randomUUID()}.${EXT[parsed.data.mime]}`;
  const db = await sessionClient();
  const { data, error } = await db.storage.from("applicant-documents").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: "We could not start the upload. Try again." };
  return { ok: true, path, signedUrl: data.signedUrl };
}

export type IngestOutcome = { ok: true; status: string; reasons: string[] } | { ok: false; message: string };

/** Step 2: record the uploaded document (RLS: own application only), then read it with Textract. */
export async function ingestUploadedDocument(input: z.input<typeof uploadRequest> & { path: string }): Promise<IngestOutcome> {
  const parsed = uploadRequest.safeParse(input);
  const who = parsed.success ? await applicant(parsed.data.tenant) : null;
  if (!parsed.success || !who) return { ok: false, message: "Sign in again to continue." };
  if (!input.path.startsWith(`${who.tenant.id}/${who.app.id}/`)) return { ok: false, message: "That upload does not belong to your application." };

  const db = await sessionClient();
  const { data: doc, error } = await db.from("applicant_documents").insert({
    tenant_id: who.tenant.id, applicant_id: who.app.id, household_member_id: parsed.data.memberId,
    document_kind: parsed.data.kind, storage_path: input.path, mime_type: parsed.data.mime, byte_size: parsed.data.size,
  }).select("id").single();
  if (error || !doc) return { ok: false, message: "We could not save this document. Try again." };

  const r = await callFunction<{ status: string; review_reasons: string[] }>("document-ingest", { document_id: doc.id });
  revalidatePath(`/${who.tenant.slug}/apply`, "layout");
  if (r.status !== 200) return { ok: false, message: r.body.message ?? "We could not read this document. Try a clearer photo of the page." };
  return { ok: true, status: r.body.status, reasons: r.body.review_reasons ?? [] };
}

export type LinkStart = { ok: true; linkToken: string; connectionId: string } | { ok: false; message: string };

export async function startBankConnection(
  tenantSlug: string, memberId: string, product: "transactions" | "payroll_income" = "transactions",
): Promise<LinkStart> {
  const who = await applicant(tenantSlug);
  if (!who) return { ok: false, message: "Sign in again to continue." };
  if (!who.app.household.some((m) => m.id === memberId)) return { ok: false, message: "Choose a person from your household." };
  const r = await callFunction<{ link_token: string; connection_id: string }>("plaid-link-token", {
    household_member_id: memberId, product: product === "payroll_income" ? "payroll_income" : "transactions",
  });
  if (r.status !== 200) return { ok: false, message: r.body.message ?? "The bank connection service is not available right now." };
  return { ok: true, linkToken: r.body.link_token, connectionId: r.body.connection_id };
}

export async function finishBankConnection(tenantSlug: string, connectionId: string, publicToken: string): Promise<{ ok: boolean; message?: string }> {
  const who = await applicant(tenantSlug);
  if (!who) return { ok: false, message: "Sign in again to continue." };
  const r = await callFunction("plaid-exchange", { connection_id: connectionId, public_token: publicToken });
  revalidatePath(`/${who.tenant.slug}/apply`, "layout");
  return r.status === 200 ? { ok: true } : { ok: false, message: r.body.message ?? "The bank connection could not be completed. Try again." };
}

const STATEMENTS = ["regular_contribution", "gig_or_business_income", "own_account_transfer",
                    "shared_expense_reimbursement", "life_event_gift", "will_not_repeat"] as const;

/**
 * The family's statement about a detected transfer. Written under RLS with the family_statement column grant;
 * the database trigger stamps it and moves the source to awaiting_review. Status is never client writable.
 */
export async function stateTransfer(tenantSlug: string, sourceId: string, statement: string): Promise<{ ok: boolean; message?: string }> {
  const who = await applicant(tenantSlug);
  const parsed = z.enum(STATEMENTS).safeParse(statement);
  if (!who || !parsed.success) return { ok: false, message: "Choose one of the answers." };
  const db = await sessionClient();
  const { data, error } = await db.from("income_sources").update({ family_statement: parsed.data }).eq("id", sourceId).select("id");
  revalidatePath(`/${who.tenant.slug}/apply`, "layout");
  if (error || !data?.length) return { ok: false, message: "We could not save your answer. Try again." };
  return { ok: true };
}
