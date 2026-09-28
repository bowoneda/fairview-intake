import { describe, expect, it } from "vitest";
import expected from "../fixtures/documents/expected.json";
import { NORMALIZED_KEYS } from "../../supabase/functions/_shared/normalized";
import {
  CONFIDENCE_THRESHOLD, QUERY_SETS, buildRecord, inferFrequency, parseDate, parseFrequency, parseMoney, parseYear,
  readAnswers, type Answer,
} from "../../supabase/functions/_shared/textract";

const NOW = "2026-09-28T17:00:00Z";

/** A canned AnalyzeDocument response: one QUERY + QUERY_RESULT per answer, plus LINE blocks of raw text. */
function response(answers: Record<string, [string, number]>, extraLines: string[] = []) {
  const blocks: Record<string, unknown>[] = [];
  let n = 0;
  for (const [alias, [text, confidence]] of Object.entries(answers)) {
    const q = `q${n}`, a = `a${n++}`;
    blocks.push({ Id: q, BlockType: "QUERY", Query: { Alias: alias, Text: `question ${alias}` }, Relationships: [{ Type: "ANSWER", Ids: [a] }] });
    blocks.push({ Id: a, BlockType: "QUERY_RESULT", Text: text, Confidence: confidence });
  }
  extraLines.forEach((t, i) => blocks.push({ Id: `l${i}`, BlockType: "LINE", Text: t, Confidence: 99 }));
  return { Blocks: blocks };
}

const answers = (r: ReturnType<typeof response>) => readAnswers(r as never);

describe("query sets", () => {
  it("stay within the synchronous limit of 15 queries per page", () => {
    for (const set of Object.values(QUERY_SETS)) expect(set.length).toBeLessThanOrEqual(15);
  });
  it("never ask for an SSN, account number, person's name, or birth date", () => {
    const all = Object.values(QUERY_SETS).flat().map((q) => q.text.toLowerCase()).join(" ");
    for (const word of ["social security", "ssn", "account number", "routing", "birth", "employee name", "employee's name"]) {
      expect(all).not.toContain(word);
    }
  });
});

describe("readAnswers", () => {
  it("returns only query answers, never raw detected text", () => {
    const r = response({ gross_pay: ["$1,480.00", 99] }, ["Employee SSN 000-00-0000", "Jordan Q. Sample"]);
    const out = answers(r);
    expect(out).toEqual({ gross_pay: { text: "$1,480.00", confidence: 99 } });
    expect(JSON.stringify(out)).not.toContain("000-00-0000");
  });
  it("keeps the highest confidence answer when a query has several", () => {
    const r = { Blocks: [
      { Id: "q", BlockType: "QUERY", Query: { Alias: "pay_date" }, Relationships: [{ Type: "ANSWER", Ids: ["a1", "a2"] }] },
      { Id: "a1", BlockType: "QUERY_RESULT", Text: "09/01/2026", Confidence: 60 },
      { Id: "a2", BlockType: "QUERY_RESULT", Text: "09/11/2026", Confidence: 95 },
    ] };
    expect(answers(r as never).pay_date).toEqual({ text: "09/11/2026", confidence: 95 });
  });
});

describe("parsers", () => {
  it.each([["$1,480.00", 1480], ["26640.00", 26640], ["$118.4", 118.4], ["(250.00)", -250], ["-17.5", -17.5],
           ["$1,2a0", null], ["about 500", null], ["1.005", null]])("parseMoney(%s)", (t, v) => expect(parseMoney(t)).toBe(v));
  it.each([["09/11/2026", "2026-09-11"], ["2026-09-11", "2026-09-11"], ["Sep 11, 2026", "2026-09-11"],
           ["September 11 2026", "2026-09-11"], ["02/30/2026", null], ["11-2026", null]])("parseDate(%s)", (t, v) => expect(parseDate(t)).toBe(v));
  it.each([["Bi-Weekly", "biweekly"], ["every two weeks", "biweekly"], ["Semi-Monthly", "semi_monthly"],
           ["Monthly", "monthly"], ["Annually", "annual"], ["sometimes", null]])("parseFrequency(%s)", (t, v) => expect(parseFrequency(t)).toBe(v));
  it("parseYear", () => { expect(parseYear("Tax year 2025")).toBe(2025); expect(parseYear("n/a")).toBeNull(); });
  it.each([["2026-08-24", "2026-09-06", "biweekly"], ["2026-09-01", "2026-09-07", "weekly"],
           ["2026-09-01", "2026-09-15", "semi_monthly"], ["2026-09-01", "2026-09-30", "monthly"],
           ["2026-09-01", "2026-09-10", null]])("inferFrequency(%s..%s)", (s, e, v) => expect(inferFrequency(s, e)).toBe(v));
});

describe("buildRecord against the fixture answer key", () => {
  it("paystub", () => {
    const e = expected.paystub;
    const { record, sourceType, extracted } = buildRecord("paystub", answers(response({
      employer_name: [e.employer_name, 98], pay_period_start: ["08/24/2026", 97], pay_period_end: ["09/06/2026", 97],
      pay_date: ["09/11/2026", 99], gross_pay: ["$1,480.00", 99], ytd_gross: ["$26,640.00", 98], hourly_rate: ["$18.50", 96],
      hours: ["80.00", 95], pay_frequency: ["Bi-Weekly", 97], total_deductions: ["$276.02", 94], net_pay: ["$1,203.98", 99],
    })), NOW);
    expect(sourceType).toBe("employment");
    expect(record).toMatchObject({
      ingestion_method: "textract", employer_name: e.employer_name, pay_frequency: e.pay_frequency, pay_rate: e.pay_rate,
      gross_pay: e.gross_pay, ytd_gross: e.ytd_gross, pay_period_start: e.pay_period_start, pay_period_end: e.pay_period_end,
      pay_date: e.pay_date, ytd_through_date: e.pay_period_end, earnings_year_start: "2026-01-01",
      deductions: [{ category: "total_deductions", amount: 276.02 }], needs_review: false, source_confidence: 94,
    });
    expect(Object.keys(record!).sort()).toEqual(NORMALIZED_KEYS);
    expect(Object.keys(extracted)).toContain("net_pay");
  });

  it("w2 is always reviewed as historical annual income", () => {
    const e = expected.w2;
    const { record } = buildRecord("w2", answers(response({
      employer_name: [e.employer_name, 99], tax_year: ["2025", 99], box1_wages: ["34120.50", 99], box5_medicare_wages: ["35200.00", 98],
    })), NOW);
    expect(record).toMatchObject({ pay_frequency: "annual", gross_pay: e.box1_wages, pay_period_start: "2025-01-01",
      pay_period_end: "2025-12-31", needs_review: true, review_reasons: ["historical_annual"] });
  });

  it("schedule c carries gross, total expenses, and net for Phase 3", () => {
    const e = expected.schedule_c;
    const { record, sourceType } = buildRecord("schedule_c", answers(response({
      tax_year: ["2025", 99], business_name: [e.business_name, 97], line1_gross_receipts: ["24800.00", 99],
      line28_total_expenses: ["7350.00", 98], line31_net_profit: ["17450.00", 99],
    })), NOW);
    expect(sourceType).toBe("self_employment");
    expect(record).toMatchObject({ employer_name: e.business_name, gross_pay: e.line1_gross_receipts,
      deductions: [{ category: "schedule_c_line_28_total_expenses", amount: e.line28_total_expenses }], needs_review: true });
    expect(record!.review_reasons).toEqual(["self_employment_net_income_phase3", "schedule_c_line_31:17450.00"]);
  });

  it("benefit letter (CALC-SPEC-1.md case 4.1's verification path)", () => {
    const { record, sourceType } = buildRecord("benefit_letter", answers(response({
      payer_name: ["Meridian Retirement Board", 97], benefit_amount: ["$1,183.33", 98], payment_frequency: ["Monthly", 96],
      effective_date: ["01/01/2026", 95],
    })), NOW);
    expect(sourceType).toBe("benefit");
    expect(record).toMatchObject({ gross_pay: 1183.33, pay_frequency: "monthly", pay_period_start: "2026-01-01", needs_review: false });
  });
});

describe("review rules", () => {
  const full: Record<string, [string, number]> = {
    employer_name: ["Fairview Parcel Services LLC", 98], pay_period_start: ["08/24/2026", 97], pay_period_end: ["09/06/2026", 97],
    pay_date: ["09/11/2026", 99], gross_pay: ["$1,480.00", 99], pay_frequency: ["Bi-Weekly", 97],
  };
  const build = (a: Record<string, [string, number]>) => buildRecord("paystub", answers(response(a)), NOW);

  it("flags a missing required field and leaves it null", () => {
    const rest = { ...full };
    delete rest.gross_pay;
    const { record } = build(rest);
    expect(record!.gross_pay).toBeNull();
    expect(record!.review_reasons).toContain("missing:gross_pay");
  });
  it(`flags a required field below ${CONFIDENCE_THRESHOLD} confidence`, () => {
    const { record } = build({ ...full, gross_pay: ["$1,480.00", 72.4] });
    expect(record!.review_reasons).toContain("low_confidence:gross_pay");
    expect(record!.source_confidence).toBe(72.4);
  });
  it("flags an unparseable value instead of guessing", () => {
    const { record } = build({ ...full, gross_pay: ["one thousand", 99] });
    expect(record!.gross_pay).toBeNull();
    expect(record!.review_reasons).toContain("unparseable:gross_pay");
  });
  it("infers frequency from the period only when the document does not state it, and says so", () => {
    const rest = { ...full };
    delete rest.pay_frequency;
    const { record } = build(rest);
    expect(record!.pay_frequency).toBe("biweekly");
    expect(record!.review_reasons).toContain("frequency_inferred");
  });
  it("treats an unsupported document kind as review only, with no record", () => {
    const out = buildRecord("other", {} as Record<string, Answer>, NOW);
    expect(out.record).toBeNull();
    expect(out.reviewReasons).toEqual(["unsupported_document_kind"]);
  });
});
