// Textract fallback, pure logic (PHASE-2-SPEC.md, TEXTRACT PIPELINE): the query set per document kind, reading
// query answers out of an AnalyzeDocument response, parsing them, and building the normalized record. No I/O,
// so it is unit tested in Node against canned responses; the document-ingest Edge Function does the calls.
import { normalize, type NormalizedIncomeRecord } from "./normalized.ts";

export type DocumentKind = "paystub" | "w2" | "schedule_c" | "benefit_letter" | "other";
type FieldType = "money" | "date" | "text" | "frequency" | "year";

interface QuerySpec {
  alias: string;
  text: string;
  type: FieldType;
  required: boolean;
}

// At most 15 queries per page for synchronous AnalyzeDocument (AWS set quotas). English only. No query ever
// asks for an SSN, an account number, a name of a person, or a date of birth.
export const QUERY_SETS: Record<Exclude<DocumentKind, "other">, QuerySpec[]> = {
  paystub: [
    { alias: "employer_name", text: "What is the employer or company name?", type: "text", required: true },
    { alias: "pay_period_start", text: "What is the pay period start date?", type: "date", required: false },
    { alias: "pay_period_end", text: "What is the pay period end date?", type: "date", required: true },
    { alias: "pay_date", text: "What is the pay date?", type: "date", required: true },
    { alias: "gross_pay", text: "What is the gross pay for this period?", type: "money", required: true },
    { alias: "ytd_gross", text: "What is the year to date gross pay?", type: "money", required: false },
    { alias: "hourly_rate", text: "What is the hourly rate of pay?", type: "money", required: false },
    { alias: "hours", text: "How many hours were worked this period?", type: "text", required: false },
    { alias: "pay_frequency", text: "What is the pay frequency?", type: "frequency", required: false },
    { alias: "total_deductions", text: "What are the total deductions for this period?", type: "money", required: false },
    { alias: "net_pay", text: "What is the net pay?", type: "money", required: false },
  ],
  w2: [
    { alias: "employer_name", text: "What is the employer's name?", type: "text", required: true },
    { alias: "tax_year", text: "What is the tax year?", type: "year", required: true },
    { alias: "box1_wages", text: "What are the wages, tips, other compensation in box 1?", type: "money", required: true },
    { alias: "box5_medicare_wages", text: "What are the Medicare wages and tips in box 5?", type: "money", required: false },
  ],
  schedule_c: [
    { alias: "tax_year", text: "What is the tax year of this Schedule C?", type: "year", required: true },
    { alias: "business_name", text: "What is the business name?", type: "text", required: true },
    { alias: "line1_gross_receipts", text: "What is line 1 gross receipts or sales?", type: "money", required: true },
    { alias: "line28_total_expenses", text: "What is line 28 total expenses?", type: "money", required: true },
    { alias: "line31_net_profit", text: "What is line 31 net profit or loss?", type: "money", required: true },
  ],
  benefit_letter: [
    { alias: "payer_name", text: "What agency or organization pays the benefit?", type: "text", required: true },
    { alias: "benefit_amount", text: "What is the benefit payment amount?", type: "money", required: true },
    { alias: "payment_frequency", text: "How often is the benefit paid?", type: "frequency", required: true },
    { alias: "effective_date", text: "What is the effective date of the benefit?", type: "date", required: false },
  ],
};

/** Project convention (PHASE-2-SPEC.md): a required field below this confidence is flagged for review. */
export const CONFIDENCE_THRESHOLD = 90;

export interface Answer {
  text: string;
  confidence: number;
}

interface Block {
  Id: string;
  BlockType: string;
  Text?: string;
  Confidence?: number;
  Query?: { Alias?: string; Text?: string };
  Relationships?: { Type: string; Ids: string[] }[];
}

/**
 * Query answers from an AnalyzeDocument response: alias to the highest confidence answer. Every other block
 * (every detected word, which on a W-2 includes the SSN) is ignored and never returned, so nothing but the
 * answers can reach storage.
 */
export function readAnswers(response: { Blocks?: Block[] }): Record<string, Answer> {
  const blocks = response.Blocks ?? [];
  const byId = new Map(blocks.map((b) => [b.Id, b]));
  const out: Record<string, Answer> = {};
  for (const q of blocks.filter((b) => b.BlockType === "QUERY" && b.Query?.Alias)) {
    const ids = (q.Relationships ?? []).filter((r) => r.Type === "ANSWER").flatMap((r) => r.Ids);
    for (const id of ids) {
      const a = byId.get(id);
      if (a?.BlockType !== "QUERY_RESULT" || !a.Text) continue;
      const alias = q.Query!.Alias!;
      const candidate = { text: a.Text.trim(), confidence: a.Confidence ?? 0 };
      if (!out[alias] || candidate.confidence > out[alias].confidence) out[alias] = candidate;
    }
  }
  return out;
}

// Parsers return null for anything they cannot read with certainty; the caller turns null into a review reason.
export function parseMoney(text: string): number | null {
  const negative = /^\(.*\)$/.test(text.trim()) || /^-/.test(text.trim());
  const cleaned = text.replace(/[$,\s()]/g, "").replace(/^-/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Math.round(Number(cleaned) * 100) / 100;
  return negative ? -n : n;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const iso = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

export function parseDate(text: string): string | null {
  const t = text.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // US order, as on US payroll documents
  if (m) return iso(+m[3], +m[1], +m[2]);
  m = t.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    return month ? iso(+m[3], month, +m[2]) : null;
  }
  return null;
}

export function parseYear(text: string): number | null {
  const m = text.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

export function parseFrequency(text: string): NormalizedIncomeRecord["pay_frequency"] {
  const t = text.toLowerCase().replace(/[^a-z]/g, "");
  if (["biweekly", "everytwoweeks", "everyotherweek", "fortnightly"].includes(t)) return "biweekly";
  if (["semimonthly", "twiceamonth", "twicemonthly"].includes(t)) return "semi_monthly";
  if (["weekly", "everyweek"].includes(t)) return "weekly";
  if (["monthly", "everymonth", "permonth"].includes(t)) return "monthly";
  if (["annual", "annually", "yearly", "peryear"].includes(t)) return "annual";
  if (["hourly"].includes(t)) return "hourly";
  return null;
}

/** Pay frequency from the length of a pay period, when the document does not state it. */
export function inferFrequency(start: string, end: string): NormalizedIncomeRecord["pay_frequency"] {
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
  if (days === 7) return "weekly";
  if (days === 14) return "biweekly";
  if (days >= 15 && days <= 16) return "semi_monthly";
  if (days >= 28 && days <= 31) return "monthly";
  return null;
}

export interface Extraction {
  record: NormalizedIncomeRecord | null;
  sourceType: NormalizedIncomeRecord["source_type"] | null;
  /** What is stored in applicant_documents.extracted_fields: answers and confidences only. */
  extracted: Record<string, Answer>;
  reviewReasons: string[];
}

export function buildRecord(kind: DocumentKind, answers: Record<string, Answer>, capturedAt: string): Extraction {
  if (kind === "other") {
    return { record: null, sourceType: null, extracted: {}, reviewReasons: ["unsupported_document_kind"] };
  }
  const specs = QUERY_SETS[kind];
  const reasons: string[] = [];
  const confidences: number[] = [];
  const extracted: Record<string, Answer> = {};

  const read = <T>(alias: string, parse: (s: string) => T | null): T | null => {
    const spec = specs.find((s) => s.alias === alias)!;
    const a = answers[alias];
    if (!a) {
      if (spec.required) reasons.push(`missing:${alias}`);
      return null;
    }
    extracted[alias] = a;
    confidences.push(a.confidence);
    if (spec.required && a.confidence < CONFIDENCE_THRESHOLD) reasons.push(`low_confidence:${alias}`);
    const value = parse(a.text);
    if (value === null) reasons.push(`unparseable:${alias}`);
    return value;
  };
  const text = (s: string) => (s.length ? s : null);

  const base = {
    ingestion_method: "textract" as const,
    pay_rate: null, expected_annual_hours: null, pay_period_start: null, pay_period_end: null, pay_date: null,
    ytd_gross: null, ytd_through_date: null, earnings_year_start: null, deductions: [] as { category: string; amount: number }[],
    captured_at: capturedAt,
  };
  let candidate: Record<string, unknown>;
  let sourceType: NormalizedIncomeRecord["source_type"];

  if (kind === "paystub") {
    sourceType = "employment";
    const start = read("pay_period_start", parseDate);
    const end = read("pay_period_end", parseDate);
    const payDate = read("pay_date", parseDate);
    const rate = read("hourly_rate", parseMoney);
    read("hours", text);
    read("net_pay", parseMoney);
    const totalDeductions = read("total_deductions", parseMoney);
    let frequency = read("pay_frequency", parseFrequency);
    if (!frequency && start && end) {
      frequency = inferFrequency(start, end);
      if (frequency) reasons.push("frequency_inferred");
    }
    if (!frequency) reasons.push("frequency_unknown");
    candidate = {
      ...base,
      source_type: sourceType,
      employer_name: read("employer_name", text),
      pay_frequency: frequency,
      pay_rate: rate,
      gross_pay: read("gross_pay", parseMoney),
      pay_period_start: start,
      pay_period_end: end,
      pay_date: payDate,
      ytd_gross: read("ytd_gross", parseMoney),
      ytd_through_date: end,
      // Project convention: the earnings year is the calendar year of the pay date unless a document says otherwise.
      earnings_year_start: payDate ? `${payDate.slice(0, 4)}-01-01` : null,
      deductions: totalDeductions !== null ? [{ category: "total_deductions", amount: totalDeductions }] : [],
    };
  } else if (kind === "w2") {
    sourceType = "employment";
    const year = read("tax_year", parseYear);
    read("box5_medicare_wages", parseMoney);
    reasons.push("historical_annual");
    candidate = {
      ...base,
      source_type: sourceType,
      employer_name: read("employer_name", text),
      pay_frequency: "annual",
      gross_pay: read("box1_wages", parseMoney),
      pay_period_start: year ? `${year}-01-01` : null,
      pay_period_end: year ? `${year}-12-31` : null,
    };
  } else if (kind === "schedule_c") {
    sourceType = "self_employment";
    const year = read("tax_year", parseYear);
    const expenses = read("line28_total_expenses", parseMoney);
    const net = read("line31_net_profit", parseMoney);
    // HUD counts net self employment income (Notice PIH 2023-27 / H 2023-10, G.19); the calculation is Phase 3.
    reasons.push("self_employment_net_income_phase3");
    if (net !== null) reasons.push(`schedule_c_line_31:${net.toFixed(2)}`);
    candidate = {
      ...base,
      source_type: sourceType,
      employer_name: read("business_name", text),
      pay_frequency: "annual",
      gross_pay: read("line1_gross_receipts", parseMoney),
      pay_period_start: year ? `${year}-01-01` : null,
      pay_period_end: year ? `${year}-12-31` : null,
      deductions: expenses !== null ? [{ category: "schedule_c_line_28_total_expenses", amount: expenses }] : [],
    };
  } else {
    sourceType = "benefit";
    const effective = read("effective_date", parseDate);
    candidate = {
      ...base,
      source_type: sourceType,
      employer_name: read("payer_name", text),
      pay_frequency: read("payment_frequency", parseFrequency),
      gross_pay: read("benefit_amount", parseMoney),
      pay_period_start: effective,
    };
  }

  // Unparseable or missing fields leave nulls; if that breaks a schema rule, review, never guess.
  const unique = [...new Set(reasons)];
  candidate.needs_review = unique.length > 0;
  candidate.review_reasons = unique;
  candidate.source_confidence = confidences.length ? Math.round(Math.min(...confidences) * 100) / 100 : null;
  if (candidate.pay_frequency === "hourly" && candidate.pay_rate === null) candidate.pay_frequency = null;

  return { record: normalize(candidate), sourceType, extracted, reviewReasons: unique };
}
