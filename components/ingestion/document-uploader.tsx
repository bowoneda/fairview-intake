"use client";

import { useRef, useState } from "react";
import { Banner, Field, buttonClass, inputClass } from "@/components/ui";
import { ingestUploadedDocument, requestDocumentUpload } from "@/app/[tenant]/apply/ingestion-actions";

// DESIGN.md, File and photo upload. The file goes from the browser straight to storage with a one time signed
// URL for the applicant's own folder; the server never relays it.

const KINDS = [
  { value: "paystub", label: "Pay stub" },
  { value: "w2", label: "W-2 tax form" },
  { value: "schedule_c", label: "Schedule C (self employment), page 1" },
  { value: "benefit_letter", label: "Benefit award letter" },
] as const;
const ACCEPT = "image/jpeg,image/png,application/pdf";
const MAX = 10 * 1024 * 1024;

const REASON_TEXT: Record<string, string> = {
  historical_annual: "a past year's form, which a reviewer will check against current pay",
  self_employment_net_income_phase3: "self employment, which a reviewer always checks",
  frequency_inferred: "the pay frequency was worked out from the dates",
};

type State =
  | { kind: "empty" }
  | { kind: "uploading"; name: string }
  | { kind: "uploaded"; name: string; size: number; review: string[] }
  | { kind: "error"; message: string };

export function DocumentUploader({ tenant, members }: { tenant: string; members: { id: string; name: string }[] }) {
  const [state, setState] = useState<State>({ kind: "empty" });
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [docKind, setDocKind] = useState<(typeof KINDS)[number]["value"]>("paystub");
  const photo = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);

  async function handle(f: File | undefined) {
    if (!f) return;
    if (f.size > MAX) return setState({ kind: "error", message: `This file is ${(f.size / 1048576).toFixed(0)} MB. Files must be 10 MB or smaller. Try a photo instead of a scan.` });
    const mime = f.type === "image/jpg" ? "image/jpeg" : f.type;
    if (!["image/jpeg", "image/png", "application/pdf"].includes(mime)) {
      return setState({ kind: "error", message: "This file type is not supported. Upload a JPEG or PNG photo, or a one page PDF." });
    }
    setState({ kind: "uploading", name: f.name });
    const base = { tenant, memberId, kind: docKind, mime: mime as "image/jpeg" | "image/png" | "application/pdf", size: f.size };
    const ticket = await requestDocumentUpload(base);
    if (!ticket.ok) return setState({ kind: "error", message: ticket.message });
    const put = await fetch(ticket.signedUrl, { method: "PUT", headers: { "Content-Type": mime, "x-upsert": "false" }, body: f });
    if (!put.ok) return setState({ kind: "error", message: "The upload did not finish. Check your connection and try again." });
    const outcome = await ingestUploadedDocument({ ...base, path: ticket.path });
    if (!outcome.ok) return setState({ kind: "error", message: outcome.message });
    // No router.refresh(): the action's revalidatePath returns the updated page in the same response. A second
    // refresh here raced it, and on a slow connection the cancelled render left the list stale.
    setState({ kind: "uploaded", name: f.name, size: f.size, review: outcome.reasons });
  }

  return (
    <div className="flex flex-col gap-4">
      <Field id="doc_member" label="Whose document is this? (required)">
        <select id="doc_member" className={inputClass()} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <Field id="doc_kind" label="What kind of document? (required)">
        <select id="doc_kind" className={inputClass()} value={docKind} onChange={(e) => setDocKind(e.target.value as typeof docKind)}>
          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </Field>

      <div aria-live="polite" className={`flex flex-col gap-3 rounded-lg p-4 ${state.kind === "error" ? "border-2 border-danger" : "border-2 border-dashed border-border"}`}>
        {state.kind === "uploading" && <p>Reading {state.name}. This can take a few seconds.</p>}
        {state.kind === "uploaded" && (
          <div>
            <p className="text-success">✓ Uploaded {state.name}, {(state.size / 1048576).toFixed(1)} MB</p>
            {state.review.length > 0 && (
              <p className="text-sm text-muted">
                A reviewer will check this one: {state.review.map((r) => REASON_TEXT[r] ?? "some figures were hard to read").join("; ")}.
              </p>
            )}
          </div>
        )}
        {state.kind === "error" && <p role="alert" className="text-danger">{state.message}</p>}
        <p className="text-sm text-muted">Photos or PDFs, up to 10 MB each. A PDF must be a single page.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className={buttonClass.secondary} disabled={state.kind === "uploading" || !memberId} onClick={() => photo.current?.click()}>
            Take a photo
          </button>
          <button type="button" className={buttonClass.secondary} disabled={state.kind === "uploading" || !memberId} onClick={() => file.current?.click()}>
            Choose a file
          </button>
        </div>
        <input ref={photo} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true"
               onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={file} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden="true"
               onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {members.length === 0 && <Banner tone="info" title="Add your household first">Documents belong to a household member.</Banner>}
    </div>
  );
}
