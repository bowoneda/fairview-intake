// The one normalized income record every ingestion pipeline produces (PHASE-2-SPEC.md, THE NORMALIZED INCOME
// RECORD). Argyle, Plaid, and Textract all pass their output through this schema before insert, and the
// shape identity test checks one record from each against it. Runs in Deno (Edge Functions) and Node (tests),
// so it imports nothing but zod.
import { z } from "zod";

/** Money: finite, at most two decimal places. Stored as numeric(12,2). */
const money = z
  .number()
  .finite()
  .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, "at most two decimal places")
  .refine((n) => Math.abs(n) < 1e10, "exceeds numeric(12,2)");

const isoDate = z.iso.date();

export const INGESTION_METHODS = ["argyle", "plaid", "textract"] as const;
export const SOURCE_TYPES = ["employment", "self_employment", "benefit", "recurring_transfer", "other"] as const;
export const PAY_FREQUENCIES = ["hourly", "weekly", "biweekly", "semi_monthly", "monthly", "annual"] as const;

export const deductionSchema = z.strictObject({
  category: z.string().min(1).max(80),
  amount: money,
});

export const normalizedIncomeRecordSchema = z
  .strictObject({
    ingestion_method: z.enum(INGESTION_METHODS),
    source_type: z.enum(SOURCE_TYPES),
    employer_name: z.string().min(1).max(200).nullable(),
    pay_frequency: z.enum(PAY_FREQUENCIES).nullable(),
    pay_rate: money.nullable(),
    expected_annual_hours: z.number().finite().min(0).max(8784).nullable(),
    gross_pay: money.nullable(),
    pay_period_start: isoDate.nullable(),
    pay_period_end: isoDate.nullable(),
    pay_date: isoDate.nullable(),
    ytd_gross: money.nullable(),
    ytd_through_date: isoDate.nullable(),
    earnings_year_start: isoDate.nullable(),
    deductions: z.array(deductionSchema),
    source_confidence: z.number().min(0).max(100).nullable(),
    needs_review: z.boolean(),
    review_reasons: z.array(z.string().min(1).max(120)),
    captured_at: z.iso.datetime({ offset: true }),
  })
  .superRefine((r, ctx) => {
    if (r.pay_period_start && r.pay_period_end && r.pay_period_start > r.pay_period_end) {
      ctx.addIssue({ code: "custom", path: ["pay_period_end"], message: "period end is before period start" });
    }
    if (r.pay_frequency === "hourly" && r.pay_rate === null) {
      ctx.addIssue({ code: "custom", path: ["pay_rate"], message: "an hourly record needs a pay rate" });
    }
    // A record with anything flagged for review must say why, and vice versa.
    if (r.needs_review !== r.review_reasons.length > 0) {
      ctx.addIssue({ code: "custom", path: ["review_reasons"], message: "needs_review must match whether reasons exist" });
    }
    // Confidence is a Textract concept; the connected pipelines never invent one.
    if (r.ingestion_method !== "textract" && r.source_confidence !== null) {
      ctx.addIssue({ code: "custom", path: ["source_confidence"], message: "only textract records carry a confidence" });
    }
  });

export type NormalizedIncomeRecord = z.infer<typeof normalizedIncomeRecordSchema>;

/** The exact key set every pipeline's record must have (used by the shape identity test). */
export const NORMALIZED_KEYS = Object.keys(normalizedIncomeRecordSchema.shape).sort();

/** Validate a pipeline's output; throws with every issue listed, never a partial record. */
export function normalize(candidate: unknown): NormalizedIncomeRecord {
  const parsed = normalizedIncomeRecordSchema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new Error(`Normalized income record rejected: ${issues}`);
  }
  return parsed.data;
}

/**
 * Columns for public.income_records. source_type belongs to income_sources; everything else maps one to one.
 * The caller supplies the row's ownership (tenant, applicant, source) and a redacted raw payload.
 */
export function toIncomeRecordRow(
  r: NormalizedIncomeRecord,
  owner: {
    tenant_id: string;
    applicant_id: string;
    income_source_id: string;
    provider_connection_id?: string | null;
    document_id?: string | null;
  },
  redactedRawPayload: unknown,
) {
  return {
    tenant_id: owner.tenant_id,
    applicant_id: owner.applicant_id,
    income_source_id: owner.income_source_id,
    provider_connection_id: owner.provider_connection_id ?? null,
    document_id: owner.document_id ?? null,
    ingestion_method: r.ingestion_method,
    raw_payload: redactedRawPayload,
    employer_name: r.employer_name,
    pay_frequency: r.pay_frequency,
    pay_rate: r.pay_rate,
    expected_annual_hours: r.expected_annual_hours,
    gross_pay: r.gross_pay,
    pay_period_start: r.pay_period_start,
    pay_period_end: r.pay_period_end,
    pay_date: r.pay_date,
    ytd_gross: r.ytd_gross,
    ytd_through_date: r.ytd_through_date,
    earnings_year_start: r.earnings_year_start,
    deductions: r.deductions,
    source_confidence: r.source_confidence,
    needs_review: r.needs_review,
    review_reasons: r.review_reasons,
    captured_at: r.captured_at,
  };
}
