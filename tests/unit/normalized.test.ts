import { describe, expect, it } from "vitest";
import {
  NORMALIZED_KEYS, normalize, normalizedIncomeRecordSchema, toIncomeRecordRow, type NormalizedIncomeRecord,
} from "../../supabase/functions/_shared/normalized";

const base: NormalizedIncomeRecord = {
  ingestion_method: "argyle",
  source_type: "employment",
  employer_name: "Fairview Parcel Services",
  pay_frequency: "biweekly",
  pay_rate: null,
  expected_annual_hours: null,
  gross_pay: 1200,
  pay_period_start: "2026-08-24",
  pay_period_end: "2026-09-06",
  pay_date: "2026-09-11",
  ytd_gross: 21600,
  ytd_through_date: "2026-09-06",
  earnings_year_start: "2026-01-01",
  deductions: [{ category: "federal_tax", amount: 96.4 }],
  source_confidence: null,
  needs_review: false,
  review_reasons: [],
  captured_at: "2026-09-28T16:00:00Z",
};

describe("normalized income record", () => {
  it("accepts a complete, consistent record", () => {
    expect(normalize(base)).toEqual(base);
  });

  it("has exactly the key set the spec defines", () => {
    expect(NORMALIZED_KEYS).toEqual([
      "captured_at", "deductions", "earnings_year_start", "employer_name", "expected_annual_hours", "gross_pay",
      "ingestion_method", "needs_review", "pay_date", "pay_frequency", "pay_period_end", "pay_period_start",
      "pay_rate", "review_reasons", "source_confidence", "source_type", "ytd_gross", "ytd_through_date",
    ]);
  });

  it("rejects an extra key, so no pipeline can smuggle fields past the schema", () => {
    expect(() => normalize({ ...base, ssn: "000-00-0000" })).toThrow(/Normalized income record rejected/);
  });

  it("rejects a missing key rather than defaulting it", () => {
    const { ytd_gross: _omit, ...missing } = base;
    expect(() => normalize(missing)).toThrow(/ytd_gross/);
  });

  it.each([
    ["more than two decimals", { gross_pay: 1200.005 }, /gross_pay/],
    ["a non ISO date", { pay_date: "09/11/2026" }, /pay_date/],
    ["period end before start", { pay_period_start: "2026-09-10", pay_period_end: "2026-09-01" }, /pay_period_end/],
    ["hourly without a rate", { pay_frequency: "hourly", pay_rate: null }, /pay_rate/],
    ["review flag without reasons", { needs_review: true, review_reasons: [] }, /review_reasons/],
    ["reasons without the flag", { needs_review: false, review_reasons: ["frequency_inferred"] }, /review_reasons/],
    ["a confidence on a connected record", { source_confidence: 97.5 }, /source_confidence/],
    ["an unknown frequency", { pay_frequency: "fortnightly" }, /pay_frequency/],
    ["a timestamp without an offset", { captured_at: "2026-09-28T16:00:00" }, /captured_at/],
  ])("rejects %s", (_label, patch, message) => {
    expect(() => normalize({ ...base, ...patch })).toThrow(message);
  });

  it("allows a confidence on a textract record", () => {
    expect(() => normalize({ ...base, ingestion_method: "textract", source_confidence: 97.5 })).not.toThrow();
  });

  it("maps to income_records columns without losing or inventing fields", () => {
    const row = toIncomeRecordRow(normalize(base), {
      tenant_id: "t", applicant_id: "a", income_source_id: "s", provider_connection_id: "c",
    }, { redacted: true });
    const fromRecord = Object.keys(row).filter((k) =>
      !["tenant_id", "applicant_id", "income_source_id", "provider_connection_id", "document_id", "raw_payload"].includes(k));
    // Every record key except source_type (which lives on income_sources) becomes a column.
    expect(fromRecord.sort()).toEqual(NORMALIZED_KEYS.filter((k) => k !== "source_type"));
    expect(row.document_id).toBeNull();
    expect(row.raw_payload).toEqual({ redacted: true });
  });

  it("exposes a strict object schema", () => {
    expect(normalizedIncomeRecordSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
  });
});
