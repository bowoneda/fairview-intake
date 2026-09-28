import { describe, expect, it } from "vitest";
import { REDACTED, redactPayload } from "../../supabase/functions/_shared/redact";

// PHASE-2-SPEC.md, SECURITY DECISIONS: "A unit test covers the redaction function with a payload containing
// every forbidden field." Values below are fictional.
const payload = {
  item_id: "item_sandbox_abc123",
  accounts: [
    {
      account_id: "acc_sandbox_1",
      mask: "0000",
      name: "Plaid Checking",
      balances: { current: 1250.55, available: 1200.0, iso_currency_code: "USD" },
      account_number: "1111222233331111",
      routing_number: "011401533",
      wire_routing: "021000021",
      owners: [
        {
          names: ["Alberta Bobbeth Charleson"],
          addresses: [{ data: { street: "2992 Cameron Road", city: "Fairview", postal_code: "00410" } }],
          ssn: "000-00-0000",
          date_of_birth: "1980-04-12",
        },
      ],
    },
  ],
  employee: {
    id: "emp_123",
    DateOfBirth: "1980-04-12",
    "Street Address": "8 Pier View Road",
    address_line1: "8 Pier View Road",
    line2: "Unit 4",
    tax_id: "12-3456789",
  },
  transactions: [
    { transaction_id: "txn_1", amount: 200.0, date: "2026-09-01", personal_finance_category: { primary: "TRANSFER_IN" },
      name: "Venmo from a friend", memo: "ref SSN 000-00-0000 and acct 1111 2222 3333 1111" },
  ],
  pay_date: "2026-09-11",
  captured_at: "2026-09-28T16:00:00Z",
};

describe("redactPayload", () => {
  const { value, removed } = redactPayload(payload);
  const text = JSON.stringify(value);

  it.each([
    ["full account number", "1111222233331111"],
    ["spaced account number", "1111 2222 3333 1111"],
    ["routing number", "011401533"],
    ["wire routing number", "021000021"],
    ["SSN", "000-00-0000"],
    ["date of birth", "1980-04-12"],
    ["street address", "2992 Cameron Road"],
    ["employee street address", "8 Pier View Road"],
    ["address line 2", "Unit 4"],
    ["tax id", "12-3456789"],
  ])("removes the %s", (_label, secret) => {
    expect(text).not.toContain(secret);
  });

  it.each([
    ["the mask", '"mask":"0000"'],
    ["balances", '"current":1250.55'],
    ["provider identifiers", '"item_id":"item_sandbox_abc123"'],
    ["account ids", '"account_id":"acc_sandbox_1"'],
    ["transaction amounts", '"amount":200'],
    ["dates", '"pay_date":"2026-09-11"'],
    ["timestamps", '"captured_at":"2026-09-28T16:00:00Z"'],
    ["categories", '"primary":"TRANSFER_IN"'],
    ["the city", '"city":"Fairview"'],
  ])("keeps %s", (_label, fragment) => {
    expect(text).toContain(fragment);
  });

  it("masks sensitive values inside free text but keeps the rest of the text", () => {
    const memo = (value as typeof payload).transactions[0].memo;
    expect(memo).toContain(REDACTED);
    expect(memo).toMatch(/^ref SSN /);
  });

  it("reports removed paths without their values", () => {
    expect(removed).toContain("accounts[0].account_number");
    expect(removed).toContain("accounts[0].owners[0].ssn");
    expect(removed.join(" ")).not.toContain("000-00-0000");
  });

  it("does not mutate its input", () => {
    expect(payload.accounts[0].account_number).toBe("1111222233331111");
  });

  it("leaves primitives and empty structures alone", () => {
    expect(redactPayload(42).value).toBe(42);
    expect(redactPayload(null).value).toBeNull();
    expect(redactPayload([]).value).toEqual([]);
  });
});
