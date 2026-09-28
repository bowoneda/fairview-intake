// Checks on an uploaded document that run before any AWS call (PHASE-2-SPEC.md, TEXTRACT PIPELINE). Pure, so
// they are unit tested against the committed fixtures. Synchronous Textract accepts JPEG, PNG, and PDF of one
// page, up to 10 MB.

export const MAX_BYTES = 10 * 1024 * 1024;
export type AcceptedMime = "image/jpeg" | "image/png" | "application/pdf";

/** The file's real type from its leading bytes, whatever name or declared type it arrived with. */
export function sniffMime(bytes: Uint8Array): AcceptedMime | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

/**
 * Page objects in a PDF: dictionaries of /Type /Page (not /Pages). Returns null when no page dictionary is
 * visible (for example, pages hidden inside compressed object streams); the caller then lets Textract decide
 * and records whatever it answers, rather than guessing.
 */
export function pdfPageCount(bytes: Uint8Array): number | null {
  let text = "";
  for (let i = 0; i < bytes.length; i += 65536) text += String.fromCharCode(...bytes.subarray(i, i + 65536));
  const matches = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  return matches ? matches.length : null;
}

export type PrecheckResult =
  | { ok: true; mime: AcceptedMime; pages: number | null }
  | { ok: false; reason: "too_large" | "unsupported_type" | "type_mismatch" | "multi_page_pdf"; message: string };

/** What the applicant sees when a file is refused, per DESIGN.md's upload error pattern: what happened and what to do. */
export function precheck(bytes: Uint8Array, declaredMime: string): PrecheckResult {
  if (bytes.length > MAX_BYTES) {
    return { ok: false, reason: "too_large", message: "This file is larger than 10 MB. Try a photo of the page instead of a scan." };
  }
  const mime = sniffMime(bytes);
  if (!mime) {
    return { ok: false, reason: "unsupported_type", message: "This file type is not supported. Upload a JPEG or PNG photo, or a one page PDF." };
  }
  if (mime !== declaredMime) {
    return { ok: false, reason: "type_mismatch", message: "This file's contents do not match its type. Upload the original photo or PDF." };
  }
  if (mime === "application/pdf") {
    const pages = pdfPageCount(bytes);
    if (pages !== null && pages > 1) {
      return { ok: false, reason: "multi_page_pdf",
               message: `This PDF has ${pages} pages. Upload only the page with the figures we need, as its own file or as a photo.` };
    }
    return { ok: true, mime, pages };
  }
  return { ok: true, mime, pages: 1 };
}
