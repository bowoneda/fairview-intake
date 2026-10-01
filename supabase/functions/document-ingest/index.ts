// document-ingest: run Textract on one uploaded document the caller owns (PHASE-2-SPEC.md, TEXTRACT PIPELINE).
// POST { document_id } with the applicant's bearer token. Deno, Supabase Edge Runtime.
import { AwsClient } from "aws4fetch";
import { authenticate, errorResponse, HttpError, json, serviceClient } from "../_shared/auth.ts";
import { precheck } from "../_shared/documents.ts";
import { toIncomeRecordRow } from "../_shared/normalized.ts";
import { redactPayload } from "../_shared/redact.ts";
import { buildRecord, QUERY_SETS, readAnswers, type DocumentKind } from "../_shared/textract.ts";

const REGION = Deno.env.get("AWS_REGION") ?? "eu-west-1";
const aws = new AwsClient({
  accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") ?? "",
  secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "",
  region: REGION,
  service: "textract",
});

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(s);
}

/** AnalyzeDocument with QUERIES, retrying throttling and server errors with backoff. */
async function analyze(bytes: Uint8Array, kind: Exclude<DocumentKind, "other">) {
  const body = JSON.stringify({
    Document: { Bytes: toBase64(bytes) },
    FeatureTypes: ["QUERIES"],
    QueriesConfig: { Queries: QUERY_SETS[kind].map((q) => ({ Text: q.text, Alias: q.alias })) },
  });
  for (let attempt = 1; ; attempt++) {
    const res = await aws.fetch(`https://textract.${REGION}.amazonaws.com/`, {
      method: "POST",
      headers: { "X-Amz-Target": "Textract.AnalyzeDocument", "Content-Type": "application/x-amz-json-1.1" },
      body,
    });
    if (res.ok) return await res.json();
    const err = (await res.json().catch(() => ({}))) as { __type?: string };
    const type = (err.__type ?? "").split("#").pop() ?? `http_${res.status}`;
    const retryable = res.status >= 500 || ["ThrottlingException", "ProvisionedThroughputExceededException"].includes(type);
    if (!retryable || attempt >= 3) {
      // Logged by AWS error type only: never the document, never the response.
      console.error(`document-ingest: textract ${type} (attempt ${attempt})`);
      throw new HttpError(type === "BadDocumentException" || type === "UnsupportedDocumentException" ? 422 : 502,
        `textract_${type}`, "We could not read this document. Try a clearer photo of the page.");
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const svc = serviceClient();
  let documentId: string | null = null;
  try {
    const caller = await authenticate(req, "applicant");
    const input = await req.json().catch(() => ({}));
    documentId = typeof input?.document_id === "string" ? input.document_id : null;
    if (!documentId) throw new HttpError(400, "missing_document_id", "No document was given.");

    // Ownership through RLS: the caller can only see their own document rows.
    const { data: doc, error: docErr } = await caller.asCaller
      .from("applicant_documents")
      .select("id, tenant_id, applicant_id, household_member_id, document_kind, storage_path, mime_type, status")
      .eq("id", documentId)
      .maybeSingle();
    if (docErr || !doc) throw new HttpError(404, "not_found", "Document not found.");
    if (!["uploaded", "failed"].includes(doc.status)) {
      throw new HttpError(409, "already_processed", "This document has already been read.");
    }

    const update = (fields: Record<string, unknown>) =>
      svc.from("applicant_documents").update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", doc.id).eq("tenant_id", caller.tenantId);

    // The claim is one conditional update (N22): of two concurrent calls, only the one that moves the row out of
    // uploaded or failed proceeds; the other gets the same 409 as a later call.
    const { data: claimed } = await svc.from("applicant_documents")
      .update({ status: "processing", failure_reason: null, updated_at: new Date().toISOString() })
      .eq("id", doc.id).eq("tenant_id", caller.tenantId).in("status", ["uploaded", "failed"]).select("id");
    if (!claimed || claimed.length !== 1) throw new HttpError(409, "already_processed", "This document has already been read.");

    // Download with the caller's own session: storage RLS confirms the object is theirs too.
    const { data: blob, error: dlErr } = await caller.asCaller.storage.from("applicant-documents").download(doc.storage_path);
    if (dlErr || !blob) {
      await update({ status: "failed", failure_reason: "file_missing" });
      throw new HttpError(404, "file_missing", "The uploaded file could not be found. Upload it again.");
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());

    // Checks that cost nothing run before any AWS call.
    const check = precheck(bytes, doc.mime_type);
    if (!check.ok) {
      await update({ status: "failed", failure_reason: check.reason });
      return json(422, { error: check.reason, message: check.message });
    }

    const kind = doc.document_kind as DocumentKind;
    const capturedAt = new Date().toISOString();
    if (kind === "other") {
      await update({ status: "needs_review", extracted_fields: {} });
      return json(200, { status: "needs_review", review_reasons: ["unsupported_document_kind"] });
    }

    const response = await analyze(bytes, kind);
    // Only query answers survive this line; the raw response (every detected word) is never stored.
    const answers = readAnswers(response);
    const extraction = buildRecord(kind, answers, capturedAt);
    const record = extraction.record!;

    const { data: source, error: srcErr } = await svc.from("income_sources").insert({
      tenant_id: doc.tenant_id,
      applicant_id: doc.applicant_id,
      household_member_id: doc.household_member_id,
      source_type: extraction.sourceType,
      connection_method: "manual_upload",
      document_id: doc.id,
      status: "detected",
    }).select("id").single();
    if (srcErr || !source) throw new Error("income_source_insert");

    const raw = redactPayload({ document_kind: kind, answers: extraction.extracted }).value;
    const row = toIncomeRecordRow(record, {
      tenant_id: doc.tenant_id, applicant_id: doc.applicant_id, income_source_id: source.id, document_id: doc.id,
    }, raw);
    const { error: recErr } = await svc.from("income_records").insert(row);
    if (recErr) throw new Error("income_record_insert");

    const status = record.needs_review ? "needs_review" : "extracted";
    await update({ status, extracted_fields: extraction.extracted });
    return json(200, { status, review_reasons: record.review_reasons });
  } catch (e) {
    if (documentId && !(e instanceof HttpError && e.status < 500 && e.code !== "file_missing")) {
      await svc.from("applicant_documents").update({ status: "failed", failure_reason: "processing_error" })
        .eq("id", documentId).eq("status", "processing");
    }
    return errorResponse(e, "document-ingest");
  }
});
