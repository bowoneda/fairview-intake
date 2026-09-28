import { describe, expect, it } from "vitest";
import { detectRecurringTransfers, type Txn } from "../../supabase/functions/_shared/recurring";

const AS_OF = "2026-09-28";
let seq = 0;
const inflow = (date: string, amount: number, name: string, account = "acc1"): Txn =>
  ({ transaction_id: `t${seq++}`, account_id: account, date, amount: -amount, name });
const monthly = (name: string, amount = 200, account = "acc1") =>
  ["2026-04-03", "2026-05-03", "2026-06-02", "2026-07-03", "2026-08-03", "2026-09-02"].map((d) => inflow(d, amount, name, account));

describe("detectRecurringTransfers", () => {
  it("detects a monthly Venmo inflow with its average, count, and dates", async () => {
    const [s, ...rest] = await detectRecurringTransfers(monthly("Venmo from A Relative"), AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ app: "Venmo", frequency: "monthly", average_amount: 200, occurrence_count: 6,
      first_seen: "2026-04-03", last_seen: "2026-09-02" });
    expect(s.transaction_ids).toHaveLength(6);
  });

  it("classifies weekly, biweekly, and semi-monthly", async () => {
    const weekly = ["2026-08-07", "2026-08-14", "2026-08-21", "2026-08-28", "2026-09-04", "2026-09-11", "2026-09-18", "2026-09-25"]
      .map((d) => inflow(d, 50, "Zelle payment from Neighbor"));
    const biweekly = ["2026-07-10", "2026-07-24", "2026-08-07", "2026-08-21", "2026-09-04", "2026-09-18"]
      .map((d) => inflow(d, 300, "Cash App transfer from Parent", "acc2"));
    const semi = ["2026-07-01", "2026-07-15", "2026-08-01", "2026-08-15", "2026-09-01", "2026-09-15"]
      .map((d) => inflow(d, 125, "Venmo from Sibling", "acc3"));
    const found = await detectRecurringTransfers([...weekly, ...biweekly, ...semi], AS_OF);
    const byApp = Object.fromEntries(found.map((s) => [s.app, s.frequency]));
    expect(byApp).toEqual({ Zelle: "weekly", "Cash App": "biweekly", Venmo: "semi_monthly" });
  });

  it("recognizes semi-monthly on the 15th and the last day of the month", async () => {
    const midAndEnd = ["2026-06-15", "2026-06-30", "2026-07-15", "2026-07-31", "2026-08-14", "2026-08-31", "2026-09-15"]
      .map((d) => inflow(d, 90, "Zelle from Grandparent"));
    const [s] = await detectRecurringTransfers(midAndEnd, AS_OF);
    expect(s.frequency).toBe("semi_monthly");
  });

  it("does not mistake biweekly deposits that drift across the month for semi-monthly", async () => {
    const biweekly = ["2026-06-05", "2026-06-19", "2026-07-03", "2026-07-17", "2026-07-31", "2026-08-14", "2026-08-28", "2026-09-11", "2026-09-25"]
      .map((d) => inflow(d, 80, "Venmo from Roommate"));
    const [s] = await detectRecurringTransfers(biweekly, AS_OF);
    expect(s.frequency).toBe("biweekly");
  });

  it("ignores outflows, non payment-app deposits, and payroll", async () => {
    const outflows = ["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01"]
      .map((d) => ({ transaction_id: `o${seq++}`, account_id: "acc1", date: d, amount: 200, name: "Venmo to Landlord" }));
    const payroll = ["2026-08-07", "2026-08-21", "2026-09-04", "2026-09-18"].map((d) => inflow(d, 1203.98, "FAIRVIEW PARCEL PAYROLL"));
    expect(await detectRecurringTransfers([...outflows, ...payroll], AS_OF)).toEqual([]);
  });

  it("needs at least 3 occurrences", async () => {
    const two = ["2026-08-03", "2026-09-02"].map((d) => inflow(d, 200, "Venmo from A Relative"));
    expect(await detectRecurringTransfers(two, AS_OF)).toEqual([]);
  });

  it("drops irregular deposits (a birthday gift and random transfers are not a pattern)", async () => {
    const irregular = ["2026-04-11", "2026-04-19", "2026-06-30", "2026-07-02", "2026-09-10"].map((d) => inflow(d, 40, "Venmo from Friend"));
    expect(await detectRecurringTransfers(irregular, AS_OF)).toEqual([]);
  });

  it("drops a stream that stopped (not active as of the date)", async () => {
    const stopped = ["2026-02-03", "2026-03-03", "2026-04-02", "2026-05-03"].map((d) => inflow(d, 200, "Venmo from A Relative"));
    expect(await detectRecurringTransfers(stopped, AS_OF)).toEqual([]);
  });

  it("only looks back 180 days", async () => {
    const old = ["2025-11-01", "2025-12-01", "2026-01-01"].map((d) => inflow(d, 200, "Zelle from Aunt"));
    const recent = ["2026-07-01", "2026-08-01", "2026-09-01"].map((d) => inflow(d, 200, "Zelle from Aunt"));
    const [s] = await detectRecurringTransfers([...old, ...recent], AS_OF);
    expect(s.occurrence_count).toBe(3);
    expect(s.first_seen).toBe("2026-07-01");
  });

  it("keeps different senders and different accounts apart, ignoring reference numbers", async () => {
    const withRefs = ["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01"].map((d, i) => inflow(d, 100, `Zelle from Aunt ref ${1000 + i}`));
    const otherSender = ["2026-06-05", "2026-07-05", "2026-08-05", "2026-09-05"].map((d) => inflow(d, 60, "Zelle from Cousin"));
    const otherAccount = monthly("Zelle from Aunt ref 1", 100, "acc9");
    const found = await detectRecurringTransfers([...withRefs, ...otherSender, ...otherAccount], AS_OF);
    expect(found).toHaveLength(3);
  });

  it("is deterministic: same input, same stream keys, in any input order", async () => {
    const txns = [...monthly("Venmo from A Relative"), ...monthly("Zelle from Aunt", 150, "acc2")];
    const a = await detectRecurringTransfers(txns, AS_OF);
    const b = await detectRecurringTransfers([...txns].reverse(), AS_OF);
    expect(a).toEqual(b);
    expect(a.map((s) => s.stream_ref)).toHaveLength(2);
  });

  it("recognizes the app through merchant or counterparty fields too", async () => {
    const txns = ["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01"].map((d) => ({
      transaction_id: `c${seq++}`, account_id: "acc1", date: d, amount: -75, name: "Transfer 8841",
      counterparties: [{ name: "Cash App" }] }));
    const [s] = await detectRecurringTransfers(txns, AS_OF);
    expect(s.app).toBe("Cash App");
  });
});
