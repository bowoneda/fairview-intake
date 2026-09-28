import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_BYTES, pdfPageCount, precheck, sniffMime } from "../../supabase/functions/_shared/documents";

const fixture = (name: string) => new Uint8Array(readFileSync(`tests/fixtures/documents/${name}`));

describe("document precheck (before any AWS call)", () => {
  it.each([["paystub.png"], ["w2.png"], ["schedule-c-page1.png"]])("accepts %s as PNG", (name) => {
    const r = precheck(fixture(name), "image/png");
    expect(r).toEqual({ ok: true, mime: "image/png", pages: 1 });
  });

  it("rejects the two page PDF fixture, naming the page count", () => {
    const bytes = fixture("two-page.pdf");
    expect(sniffMime(bytes)).toBe("application/pdf");
    expect(pdfPageCount(bytes)).toBe(2);
    const r = precheck(bytes, "application/pdf");
    expect(r).toMatchObject({ ok: false, reason: "multi_page_pdf" });
    expect(!r.ok && r.message).toContain("2 pages");
  });

  it("accepts a one page PDF", () => {
    const one = new TextEncoder().encode("%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R >> endobj\n%%EOF");
    expect(precheck(one, "application/pdf")).toEqual({ ok: true, mime: "application/pdf", pages: 1 });
  });

  it("rejects a file whose contents do not match its declared type", () => {
    expect(precheck(fixture("paystub.png"), "application/pdf")).toMatchObject({ ok: false, reason: "type_mismatch" });
  });

  it("rejects an unsupported type, such as a renamed text file", () => {
    expect(precheck(new TextEncoder().encode("not an image at all"), "image/png")).toMatchObject({ ok: false, reason: "unsupported_type" });
  });

  it("rejects a file over 10 MB before reading its type", () => {
    const big = new Uint8Array(MAX_BYTES + 1);
    big.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(precheck(big, "image/png")).toMatchObject({ ok: false, reason: "too_large" });
  });

  it("recognizes JPEG by its signature", () => {
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("image/jpeg");
  });
});
