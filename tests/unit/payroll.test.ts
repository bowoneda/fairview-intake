import { describe, expect, it } from "vitest";
import stub from "../fixtures/plaid/payroll-pay-stub.json";
import { NORMALIZED_KEYS } from "../../supabase/functions/_shared/normalized";
import { mapPayStub, type PlaidPayStub } from "../../supabase/functions/_shared/payroll";

const NOW = "2026-09-29T10:00:00Z";

describe("mapPayStub (real Plaid Sandbox pay stub)", () => {
  const { record, recordRef, rawPayload } = mapPayStub(stub as PlaidPayStub, NOW);
  const raw = JSON.stringify(rawPayload);

  it("maps the listing's required fields: gross pay, frequency, YTD, deductions", () => {
    expect(record).toMatchObject({
      ingestion_method: "plaid", source_type: "employment", employer_name: "Platypus LLC",
      pay_frequency: "biweekly", gross_pay: 2306, ytd_gross: 2306, pay_rate: 25.15,
      pay_period_start: "2026-09-14", pay_period_end: "2026-09-28", pay_date: "2026-09-29",
      ytd_through_date: "2026-09-28", earnings_year_start: "2026-01-01",
      deductions: [{ category: "taxes", amount: 1000 }],
    });
    expect(Object.keys(record).sort()).toEqual(NORMALIZED_KEYS);
  });

  it("flags bonus and overtime for review instead of deciding how they count", () => {
    expect(record.needs_review).toBe(true);
    expect(record.review_reasons).toEqual(["variable_earnings:bonus,overtime"]);
  });

  it("uses Plaid's document id as the idempotency key", () => {
    expect(recordRef).toBe("r9gyKrX85Kqj9");
  });

  it.each([
    ["the employee's name", "Josie Georgia Harrison"],
    ["the employee's street", "1234 Grand Ave"],
    ["the employee's city", "Oakland"],
    ["the taxpayer id mask", "9020"],
    ["the pay distribution bank", "Bank of America"],
    ["the distribution account mask", "1223"],
    ["the employer's street", "1098 Main Street"],
    ["the document download URL", "download"],
  ])("never stores %s", (_label, value) => {
    expect(raw).not.toContain(value);
  });

  it("keeps the pay figures in the raw payload", () => {
    expect(raw).toContain('"gross_earnings":2306');
    expect(raw).toContain('"canonical_description":"OVERTIME"');
  });

  it("does not flag a regular-pay-only stub", () => {
    const plain = { ...stub, earnings: { breakdown: [stub.earnings.breakdown[0]], total: { current_amount: 1006, ytd_amount: 1006 } },
      pay_period_details: { ...stub.pay_period_details, gross_earnings: 1006 } };
    const m = mapPayStub(plain as PlaidPayStub, NOW);
    expect(m.record).toMatchObject({ gross_pay: 1006, needs_review: false, review_reasons: [] });
  });

  it("sends an unknown frequency or missing gross to review rather than guessing", () => {
    const odd = { ...stub, pay_period_details: { ...stub.pay_period_details, pay_frequency: "WHENEVER", gross_earnings: null },
      earnings: { breakdown: [], total: { current_amount: null, ytd_amount: null } } };
    const m = mapPayStub(odd as unknown as PlaidPayStub, NOW);
    expect(m.record.pay_frequency).toBeNull();
    expect(m.record.gross_pay).toBeNull();
    expect(m.record.review_reasons).toEqual(expect.arrayContaining(["frequency_unknown", "missing:gross_pay"]));
  });
});
