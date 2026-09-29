// Plaid Payroll Income pay stub to the normalized income record (PHASE-2-SPEC.md, AS BUILT 10). Pure: unit tested
// against a real sandbox pay stub. Deno and Node.
//
// Data minimization: the stored raw payload keeps pay figures only. The employee block (name, home address,
// taxpayer id mask) and the pay distribution (bank name and account mask) are never stored.
import { normalize, type NormalizedIncomeRecord } from "./normalized.ts";
import { redactPayload } from "./redact.ts";

type Money = number | null | undefined;
interface Line { canonical_description?: string | null; description?: string | null; current_amount?: Money; ytd_amount?: Money; rate?: Money; hours?: Money }

export interface PlaidPayStub {
  document_id?: string | null;
  earnings?: { breakdown?: Line[] | null; total?: { current_amount?: Money; ytd_amount?: Money; hours?: Money } | null } | null;
  deductions?: { breakdown?: Line[] | null; total?: { current_amount?: Money; ytd_amount?: Money } | null } | null;
  net_pay?: { current_amount?: Money; ytd_amount?: Money } | null;
  employer?: { name?: string | null } | null;
  pay_period_details?: {
    start_date?: string | null; end_date?: string | null; pay_date?: string | null;
    pay_frequency?: string | null; gross_earnings?: Money;
  } | null;
}

const FREQUENCY: Record<string, NormalizedIncomeRecord["pay_frequency"]> = {
  WEEKLY: "weekly", BIWEEKLY: "biweekly", SEMI_MONTHLY: "semi_monthly", SEMIMONTHLY: "semi_monthly",
  MONTHLY: "monthly", ANNUALLY: "annual", ANNUAL: "annual", HOURLY: "hourly",
};

/** Earnings kinds that CALC-SPEC-1.md does not yet say how to treat; their presence sends the stub to review. */
export const VARIABLE_EARNINGS = ["BONUS", "OVERTIME", "COMMISSION", "TIPS", "OTHER"] as const;

const cents = (n: Money) => (typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) / 100 : null);
const date = (s: string | null | undefined) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

export interface PayrollMapping {
  record: NormalizedIncomeRecord;
  /** Plaid's document id, the idempotency key for this stub. */
  recordRef: string | null;
  /** What is stored in income_records.raw_payload: pay figures only, redacted. */
  rawPayload: unknown;
}

export function mapPayStub(stub: PlaidPayStub, capturedAt: string): PayrollMapping {
  const reasons: string[] = [];
  const period = stub.pay_period_details ?? {};
  const lines = stub.earnings?.breakdown ?? [];

  const freqText = String(period.pay_frequency ?? "").toUpperCase();
  let frequency = FREQUENCY[freqText] ?? null;
  if (!frequency) reasons.push("frequency_unknown");

  const gross = cents(period.gross_earnings) ?? cents(stub.earnings?.total?.current_amount);
  if (gross === null) reasons.push("missing:gross_pay");

  const regular = lines.find((l) => l.canonical_description === "REGULAR_PAY");
  const payRate = cents(regular?.rate);
  if (frequency === "hourly" && payRate === null) frequency = null;

  const variable = [...new Set(lines
    .map((l) => String(l.canonical_description ?? "").toUpperCase())
    .filter((c) => (VARIABLE_EARNINGS as readonly string[]).includes(c) && lines.some((l) => l.canonical_description === c && (l.current_amount ?? 0) !== 0)))];
  // Whether bonus or overtime counts toward annual income, and how, is a Phase 3 CALC-SPEC-1.md question.
  if (variable.length) reasons.push(`variable_earnings:${variable.join(",").toLowerCase()}`);

  const payDate = date(period.pay_date);
  const end = date(period.end_date);
  const deductions = (stub.deductions?.breakdown ?? [])
    .map((d) => ({ category: String(d.description ?? d.canonical_description ?? "deduction").slice(0, 80) || "deduction", amount: cents(d.current_amount) }))
    .filter((d): d is { category: string; amount: number } => d.amount !== null);

  const record = normalize({
    ingestion_method: "plaid",
    source_type: "employment",
    employer_name: stub.employer?.name?.trim() || null,
    pay_frequency: frequency,
    pay_rate: payRate,
    expected_annual_hours: null,
    gross_pay: gross,
    pay_period_start: date(period.start_date),
    pay_period_end: end,
    pay_date: payDate,
    ytd_gross: cents(stub.earnings?.total?.ytd_amount),
    ytd_through_date: end,
    // Project convention, as for documents: the earnings year is the calendar year of the pay date.
    earnings_year_start: payDate ? `${payDate.slice(0, 4)}-01-01` : null,
    deductions,
    source_confidence: null,
    needs_review: reasons.length > 0,
    review_reasons: reasons,
    captured_at: capturedAt,
  });

  const kept = {
    source: "plaid_payroll_income",
    document_id: stub.document_id ?? null,
    employer: { name: stub.employer?.name ?? null },
    pay_period_details: {
      start_date: period.start_date ?? null, end_date: period.end_date ?? null, pay_date: period.pay_date ?? null,
      pay_frequency: period.pay_frequency ?? null, gross_earnings: period.gross_earnings ?? null,
    },
    earnings: stub.earnings ?? null,
    deductions: stub.deductions ?? null,
    net_pay: stub.net_pay ?? null,
  };
  return { record, recordRef: stub.document_id ?? null, rawPayload: redactPayload(kept).value };
}
