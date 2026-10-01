import { describe, expect, it } from "vitest";
import { detectRecurringTransfers, streamReviewReasons, type Txn } from "../../supabase/functions/_shared/recurring";

const AS_OF = "2026-09-28";
let seq = 0;
const inflow = (date: string, amount: number, name: string, account = "acc1"): Txn =>
  ({ transaction_id: `t${seq++}`, account_id: account, date, amount: -amount, name });
const monthly = (name: string, amount = 200, account = "acc1") =>
  ["2026-04-03", "2026-05-03", "2026-06-02", "2026-07-03", "2026-08-03", "2026-09-02"].map((d) => inflow(d, amount, name, account));

// Plaid's real shape, confirmed on sandbox data 2026-09-29: name is normalized to the app for every deposit and
// the counterparty is the app itself; only original_description carries the sender.
const plaidVenmo = (date: string, amount: number, sender: string, account = "acc1"): Txn => ({
  transaction_id: `p${seq++}`, account_id: account, date, amount: -amount, name: "Venmo", merchant_name: null,
  original_description: `Venmo from ${sender}`, counterparties: [{ name: "Venmo" }],
});

describe("detectRecurringTransfers on Plaid's real field shape (PHASE_2_REWORK.md item 5)", () => {
  it("Defect B: two regular senders on one app produce two streams", async () => {
    const alex = ["2026-04-01", "2026-05-01", "2026-05-31", "2026-06-30", "2026-07-30", "2026-08-29", "2026-09-26"].map((d) => plaidVenmo(d, 100, "Alex One"));
    const blake = ["2026-07-10", "2026-07-24", "2026-08-07", "2026-08-21", "2026-09-04", "2026-09-18"].map((d) => plaidVenmo(d, 50, "Blake Two"));
    const found = await detectRecurringTransfers([...alex, ...blake], AS_OF);
    expect(found.map((s) => [s.frequency, s.average_amount, s.occurrence_count]).sort()).toEqual([["biweekly", 50, 6], ["monthly", 100, 7]]);
    expect(found.every((s) => s.app === "Venmo")).toBe(true);
  });

  it("Defect A: a one-off gift from a different sender stays out of the regular stream", async () => {
    const casey = ["2026-07-20", "2026-08-03", "2026-08-17", "2026-08-31", "2026-09-14", "2026-09-28"].map((d) => plaidVenmo(d, 85.5, "Casey Friend"));
    const gift = plaidVenmo("2026-06-21", 500, "Birthday Gift");
    const found = await detectRecurringTransfers([...casey, gift], AS_OF);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ frequency: "biweekly", average_amount: 85.5, occurrence_count: 6, first_seen: "2026-07-20" });
    expect(found[0].transaction_ids).not.toContain(gift.transaction_id);
  });

  it("a one-off large payment from the same sender is excluded from the stream and listed for the reviewer", async () => {
    const regular = ["2026-04-03", "2026-05-03", "2026-06-02", "2026-07-03", "2026-08-03", "2026-09-02"].map((d) => plaidVenmo(d, 200, "A Relative"));
    const birthday = plaidVenmo("2026-06-15", 1000, "A Relative");
    const [s, ...rest] = await detectRecurringTransfers([...regular, birthday], AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: "monthly", average_amount: 200, occurrence_count: 6, first_seen: "2026-04-03" });
    expect(s.excluded_transaction_ids).toEqual([birthday.transaction_id]);
  });

  it("would have failed before the fix: grouping by name alone merges senders", async () => {
    // With only name ("Venmo") to go on, these two senders are indistinguishable; the fix depends on
    // original_description. Without it, both senders fall into one group and only one of the two streams is found.
    const noOriginal = (t: Txn): Txn => ({ ...t, original_description: null });
    const alex = ["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01"].map((d) => noOriginal(plaidVenmo(d, 100, "Alex One")));
    const blake = ["2026-08-07", "2026-08-21", "2026-09-04", "2026-09-18"].map((d) => noOriginal(plaidVenmo(d, 50, "Blake Two")));
    expect(await detectRecurringTransfers([...alex, ...blake], AS_OF)).toHaveLength(1);
    const withOriginal = await detectRecurringTransfers([...alex, ...blake].map((t, i) => ({ ...t, original_description: `Venmo from ${i < 4 ? "Alex One" : "Blake Two"}` })), AS_OF);
    expect(withOriginal).toHaveLength(2);
  });
});

// PHASE_2_REWORK_2.md item 5: the second vetting's adversarial cases, with the vetter's shapes (days before AS_OF).
const ago = (n: number) => new Date(Date.parse(AS_OF) - n * 86_400_000).toISOString().slice(0, 10);

describe("detectRecurringTransfers with extra or off-schedule deposits (PHASE_2_REWORK_2.md item 5)", () => {
  it("case A: one extra same-amount deposit does not remove a monthly stream; it is left out and listed", async () => {
    const regular = [150, 120, 90, 60, 30, 3].map((d) => plaidVenmo(ago(d), 100, "Alex Moss"));
    const extra = plaidVenmo(ago(45), 100, "Alex Moss");
    const found = await detectRecurringTransfers([...regular, extra], AS_OF);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ frequency: "monthly", pattern: "regular", average_amount: 100, occurrence_count: 6, first_seen: ago(150), last_seen: ago(3) });
    expect(found[0].excluded_transaction_ids).toEqual([extra.transaction_id]);
  });

  it("case B: an off-schedule same-amount extra inside a biweekly series is not counted", async () => {
    const regular = Array.from({ length: 12 }, (_, i) => plaidVenmo(ago(157 - 14 * i), 50, "Blair Ng"));
    const extra = plaidVenmo(ago(66), 50, "Blair Ng");
    const [s, ...rest] = await detectRecurringTransfers([...regular, extra], AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: "biweekly", occurrence_count: 12, average_amount: 50 });
    expect(s.excluded_transaction_ids).toEqual([extra.transaction_id]);
  });

  it("case C: a memo that changes between deposits does not split the sender", async () => {
    const txns = [150, 120, 90, 60, 30, 3].map((d, i) => plaidVenmo(ago(d), 80, `Chris Po ${i % 2 ? "rent share" : "utilities"}`));
    const [s, ...rest] = await detectRecurringTransfers(txns, AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: "monthly", occurrence_count: 6, average_amount: 80 });
  });

  it("case E: an extra deposit inside the amount band, off schedule, is left out of a monthly stream", async () => {
    const regular = [125, 95, 65, 35, 5].map((d) => plaidVenmo(ago(d), 250, "Robin Ye"));
    const extra = plaidVenmo(ago(50), 150, "Robin Ye");
    const [s, ...rest] = await detectRecurringTransfers([...regular, extra], AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: "monthly", occurrence_count: 5, average_amount: 250, first_seen: ago(125), last_seen: ago(5) });
    expect(s.excluded_transaction_ids).toEqual([extra.transaction_id]);
  });

  it("case F: a switch from biweekly to weekly keeps the stream; the in-between deposits are listed", async () => {
    const biweekly = Array.from({ length: 11 }, (_, i) => plaidVenmo(ago(170 - 14 * i), 40, "Taylor Fox")); // last at 30 days ago
    const weekly = [23, 16, 9, 2].map((d) => plaidVenmo(ago(d), 40, "Taylor Fox"));
    const [s, ...rest] = await detectRecurringTransfers([...biweekly, ...weekly], AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: "biweekly", pattern: "regular", occurrence_count: 13, last_seen: ago(2) });
    expect(s.excluded_transaction_ids).toHaveLength(2);
  });

  it("a sender with no regular schedule is surfaced as irregular, not dropped", async () => {
    const txns = [140, 131, 97, 60, 58, 20].map((d) => plaidVenmo(ago(d), 60, "Dana Irregular"));
    const [s, ...rest] = await detectRecurringTransfers(txns, AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: null, pattern: "irregular", occurrence_count: 6, average_amount: 60, first_seen: ago(140), last_seen: ago(20) });
  });

  it("an irregular sender who stopped sending is not surfaced", async () => {
    const txns = [170, 150, 101, 90, 60].map((d) => plaidVenmo(ago(d), 60, "Old Irregular"));
    expect(await detectRecurringTransfers(txns, AS_OF)).toEqual([]);
  });

  it("the stream key is per sender, so it survives a change of frequency between reads (N4)", async () => {
    const early = await detectRecurringTransfers(Array.from({ length: 6 }, (_, i) => plaidVenmo(ago(80 - 14 * i), 40, "Key Keeper")), AS_OF);
    const later = await detectRecurringTransfers([28, 21, 14, 7, 0].map((d) => plaidVenmo(ago(d), 40, "Key Keeper")), AS_OF);
    expect(early[0].frequency).toBe("biweekly");
    expect(later[0].frequency).toBe("weekly");
    expect(later[0].stream_ref).toBe(early[0].stream_ref);
  });
});

// PHASE_2_REWORK_3.md item 5: a one-off a few days after a scheduled deposit, with the vetter's dates.
describe("detectRecurringTransfers when an extra lands just after a scheduled deposit (PHASE_2_REWORK_3.md)", () => {
  const zelle = (date: string, amount: number, sender: string): Txn => ({ ...plaidVenmo(date, amount, sender), name: "Zelle", original_description: `Zelle from ${sender}` });

  it("case G: a smaller one-off 3 days after a mid-run deposit stays out; the scheduled deposit stays in", async () => {
    const regular = ["2026-05-01", "2026-05-31", "2026-06-30", "2026-07-30", "2026-08-29", "2026-09-28"].map((d) => zelle(d, 400, "Rosa Vega"));
    const extra = zelle("2026-09-01", 260, "Rosa Vega");
    const [s, ...rest] = await detectRecurringTransfers([...regular, extra], AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: "monthly", average_amount: 400, occurrence_count: 6, first_seen: "2026-05-01", last_seen: "2026-09-28" });
    expect(s.excluded_transaction_ids).toEqual([extra.transaction_id]);
  });

  it("case I: the same in a semi-monthly run", async () => {
    const dates = ["2026-04-16", "2026-05-01", "2026-05-16", "2026-06-01", "2026-06-16", "2026-07-01", "2026-07-16", "2026-08-01", "2026-08-16", "2026-09-01", "2026-09-16"];
    const regular = dates.map((d) => zelle(d, 350, "June Alvarez"));
    const extra = zelle("2026-07-04", 220, "June Alvarez");
    const [s, ...rest] = await detectRecurringTransfers([...regular, extra], AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: "semi_monthly", average_amount: 350, occurrence_count: 11 });
    expect(s.excluded_transaction_ids).toEqual([extra.transaction_id]);
  });

  it("case P: a one-off 2 days after the last scheduled deposit does not become the stream's last date", async () => {
    const regular = ["2026-04-30", "2026-05-30", "2026-06-29", "2026-07-29", "2026-08-28", "2026-09-26"].map((d) => zelle(d, 500, "Hugo Bell"));
    const extra = zelle("2026-09-28", 330, "Hugo Bell");
    const [s, ...rest] = await detectRecurringTransfers([...regular, extra], AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: "monthly", average_amount: 500, occurrence_count: 6, last_seen: "2026-09-26" });
    expect(s.excluded_transaction_ids).toEqual([extra.transaction_id]);
  });

  it("a same-amount extra 3 days after a scheduled date is the one listed, not the scheduled deposit", async () => {
    const regular = ["2026-05-01", "2026-05-31", "2026-06-30", "2026-07-30", "2026-08-29", "2026-09-28"].map((d) => zelle(d, 400, "Same Amount"));
    const extra = zelle("2026-09-01", 400, "Same Amount");
    const [s] = await detectRecurringTransfers([...regular, extra], AS_OF);
    expect(s).toMatchObject({ frequency: "monthly", occurrence_count: 6, last_seen: "2026-09-28" });
    expect(s.excluded_transaction_ids).toEqual([extra.transaction_id]);
  });

  it("N8: three deposits that happen to fall on a rhythm among many irregular ones are not a schedule", async () => {
    const txns = [166, 131, 127, 88, 70, 39, 25, 12].map((d) => plaidVenmo(ago(d), 70, "Eli Moss"));
    const [s, ...rest] = await detectRecurringTransfers(txns, AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: null, pattern: "irregular", occurrence_count: 8 });
  });

  it("N7: a sender who paused and restarted is judged by the current schedule when it is most of the deposits", async () => {
    const old = [170, 163, 156].map((d) => plaidVenmo(ago(d), 30, "Restart Weekly"));
    const current = [52, 45, 38, 31, 24, 17, 10, 3].map((d) => plaidVenmo(ago(d), 30, "Restart Weekly"));
    const [s] = await detectRecurringTransfers([...old, ...current], AS_OF);
    expect(s).toMatchObject({ frequency: "weekly", pattern: "regular", occurrence_count: 8, first_seen: ago(52) });
    expect(s.excluded_transaction_ids).toHaveLength(3);
  });

  it("N7: when the restarted schedule is under half the deposits, the sender is surfaced as irregular with all of them", async () => {
    const txns = [172, 146, 120, 94, 56, 30, 4].map((d) => plaidVenmo(ago(d), 90, "Paul Reyes"));
    const [s] = await detectRecurringTransfers(txns, AS_OF);
    expect(s).toMatchObject({ frequency: null, pattern: "irregular", occurrence_count: 7 });
  });
});

// PHASE_2_REWORK_4.md item 5, with the vetter's dates: varying scheduled amounts, and one missed payment.
describe("detectRecurringTransfers with varying amounts or a missed payment (PHASE_2_REWORK_4.md)", () => {
  const app = (name: string) => (date: string, amount: number, sender: string): Txn =>
    ({ ...plaidVenmo(date, amount, sender), name, original_description: `${name} from ${sender}` });
  const zelle = app("Zelle"), venmo = app("Venmo"), cash = app("Cash App");
  const every = (start: string, step: number, n: number) => Array.from({ length: n }, (_, k) => new Date(Date.parse(start) + k * step * 86_400_000).toISOString().slice(0, 10));

  it("V1: with varying scheduled amounts, a one-off 3 days after a deposit nearer the median still stays out", async () => {
    const plan: [string, number][] = [["2026-04-17", 240], ["2026-05-17", 310], ["2026-06-16", 265], ["2026-07-16", 330], ["2026-08-15", 225], ["2026-09-14", 290]];
    const extra = zelle("2026-08-18", 280, "Vic Hale");
    const [s, ...rest] = await detectRecurringTransfers([...plan.map(([d, a]) => zelle(d, a, "Vic Hale")), extra], AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: "monthly", average_amount: 276.67, occurrence_count: 6, first_seen: "2026-04-17", last_seen: "2026-09-14", missed_payments: 0 });
    expect(s.excluded_transaction_ids).toEqual([extra.transaction_id]);
  });

  it("V2: the same at the end of the run, which keeps its last scheduled date", async () => {
    const plan: [string, number][] = [["2026-04-06", 410], ["2026-05-06", 395], ["2026-06-05", 400], ["2026-07-05", 405], ["2026-08-04", 390], ["2026-09-03", 350]];
    const extra = venmo("2026-09-06", 400, "Wes Ford");
    const [s] = await detectRecurringTransfers([...plan.map(([d, a]) => venmo(d, a, "Wes Ford")), extra], AS_OF);
    expect(s).toMatchObject({ frequency: "monthly", average_amount: 391.67, occurrence_count: 6, last_seen: "2026-09-03" });
    expect(s.excluded_transaction_ids).toEqual([extra.transaction_id]);
  });

  it("M1: a biweekly sender who misses one payment stays biweekly with all 12 deposits", async () => {
    const dates = every("2026-04-10", 14, 13).filter((d) => d !== "2026-08-28");
    const [s, ...rest] = await detectRecurringTransfers(dates.map((d) => zelle(d, 120, "Bea Lund")), AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: "biweekly", occurrence_count: 12, missed_payments: 1, first_seen: "2026-04-10", last_seen: "2026-09-25" });
    expect(s.excluded_transaction_ids).toEqual([]);
  });

  it("M2: a weekly sender who misses one week stays weekly with all 24 deposits", async () => {
    const dates = every("2026-04-06", 7, 25).filter((d) => d !== "2026-08-31");
    const [s] = await detectRecurringTransfers(dates.map((d) => venmo(d, 40, "Dee Moor")), AS_OF);
    expect(s).toMatchObject({ frequency: "weekly", occurrence_count: 24, missed_payments: 1, last_seen: "2026-09-21" });
    expect(s.excluded_transaction_ids).toEqual([]);
  });

  it("a monthly sender who misses one month stays monthly", async () => {
    const dates = every("2026-04-05", 30, 6).filter((_, i) => i !== 4);
    const [s] = await detectRecurringTransfers(dates.map((d) => cash(d, 150, "Fay Orr")), AS_OF);
    expect(s).toMatchObject({ frequency: "monthly", occurrence_count: 5, missed_payments: 1 });
  });

  it("only one missed payment is bridged: two in a row are not a schedule", async () => {
    const dates = every("2026-04-10", 14, 13).filter((d) => d !== "2026-07-31" && d !== "2026-08-14");
    const [s] = await detectRecurringTransfers(dates.map((d) => zelle(d, 120, "Two Missed")), AS_OF);
    expect(s.frequency === "biweekly" && s.occurrence_count === 11).toBe(false);
  });
});

describe("streamReviewReasons", () => {
  const clean = { pattern: "regular" as const, ambiguity: [] };
  const irregular = { pattern: "irregular" as const, ambiguity: ["irregular_pattern" as const] };
  const flagged = { pattern: "regular" as const, ambiguity: ["deposits_left_out" as const, "missed_payment" as const] };
  it("follows the source status, adding the pattern reasons while undecided", () => {
    expect(streamReviewReasons("awaiting_family_statement", clean)).toEqual(["awaiting_family_statement"]);
    expect(streamReviewReasons("awaiting_review", irregular)).toEqual(["awaiting_review", "irregular_pattern"]);
    expect(streamReviewReasons("awaiting_family_statement", flagged)).toEqual(["awaiting_family_statement", "schedule_ambiguous"]);
    expect(streamReviewReasons("confirmed_income", irregular)).toEqual([]);
    expect(streamReviewReasons("dismissed", flagged)).toEqual([]);
  });
});

// PHASE-2-SPEC.md, ITEM 5 ACCEPTANCE BAR (the user's decision, 2026-10-01): clean inputs give exact figures and no
// flag; anything that needed a judgment is surfaced, flagged, and carries every deposit for the reviewer.
describe("clean or flagged (ITEM 5 ACCEPTANCE BAR)", () => {
  it("a clean monthly sender is not flagged, and lists all its deposits as in the stream", async () => {
    const [s] = await detectRecurringTransfers(monthly("Venmo from Clean Sender"), AS_OF);
    expect(s.ambiguity).toEqual([]);
    expect(s.deposits).toHaveLength(6);
    expect(s.deposits.every((d) => d.in_stream)).toBe(true);
  });

  it("a left-out deposit, a missed payment, and an irregular sender are each flagged with the reason", async () => {
    const extra = await detectRecurringTransfers([...monthly("Venmo from Extra Sender"), inflow("2026-06-20", 200, "Venmo from Extra Sender")], AS_OF);
    expect(extra[0].ambiguity).toEqual(["deposits_left_out"]);
    const missed = await detectRecurringTransfers(monthly("Venmo from Missed Sender").filter((_, i) => i !== 3), AS_OF);
    expect(missed[0]).toMatchObject({ frequency: "monthly", ambiguity: ["missed_payment"] });
    const irr = await detectRecurringTransfers([140, 131, 97, 60, 58, 20].map((d) => plaidVenmo(ago(d), 60, "Irregular Sender")), AS_OF);
    expect(irr[0].ambiguity).toEqual(["irregular_pattern"]);
  });

  it("PHASE_2_REWORK_5.md X15: a missed payment with a one-off beside it is surfaced and flagged, with every deposit listed", async () => {
    const z = (d: string, a: number): Txn => ({ ...plaidVenmo(d, a, "Elle Varga"), name: "Zelle", original_description: "Zelle from Elle Varga" });
    const txns = [...["2026-04-14", "2026-06-13", "2026-07-13", "2026-08-12", "2026-09-11"].map((d) => z(d, 400)), z("2026-04-17", 260)];
    const [s, ...rest] = await detectRecurringTransfers(txns, AS_OF);
    expect(rest).toHaveLength(0);
    expect(s.ambiguity.length).toBeGreaterThan(0);
    expect(s.deposits.map((d) => d.transaction_id).sort()).toEqual(txns.map((t) => t.transaction_id).sort());
  });

  it("PHASE_2_REWORK_5.md X4: a weekly sender whose latest week is missing is surfaced and flagged, never clean", async () => {
    const txns = Array.from({ length: 25 }, (_, k) => plaidVenmo(new Date(Date.parse("2026-04-05") + 7 * k * 86_400_000).toISOString().slice(0, 10), 50, "Eve Stone"));
    const [s] = await detectRecurringTransfers(txns, "2026-10-01");
    expect(s.ambiguity.length).toBeGreaterThan(0);
    expect(s.deposits).toHaveLength(25);
  });

  it("PHASE_2_REWORK_6.md: a clean 4-deposit biweekly sender is biweekly and unflagged at every as-of date in 2026", async () => {
    // Exception, a true tie: when the 4 dates span February, 14 day gaps fall on the same days of the month (Feb 1,
    // Feb 15, Mar 1, Mar 15), so both readings fit exactly. That is flagged frequency_ambiguous, never misread silently.
    const wrong: string[] = [];
    let ties = 0;
    for (let day = 0; day < 365; day++) {
      const asOf = new Date(Date.UTC(2026, 0, 1) + day * 86_400_000).toISOString().slice(0, 10);
      const dates = [45, 31, 17, 3].map((n) => new Date(Date.parse(asOf) - n * 86_400_000).toISOString().slice(0, 10));
      const [s] = await detectRecurringTransfers(dates.map((d) => plaidVenmo(d, 75, "Four Deposits")), asOf);
      // Days of the month, circular: a late day counts back from the next month's 1st (Jan 28 and Feb 25 are both -3).
      const circ = (d: string) => { const n = Number(d.slice(8)); const len = new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)), 0)).getUTCDate(); return n > 24 ? n - len : n; };
      const plain = dates.map((d) => Number(d.slice(8))), round = dates.map(circ);
      const trueTie = (plain[0] === plain[2] && plain[1] === plain[3]) || (round[0] === round[2] && round[1] === round[3]);
      if (trueTie && s?.ambiguity.includes("frequency_ambiguous")) { ties++; continue; }
      if (!s || s.frequency !== "biweekly" || s.ambiguity.length) wrong.push(`${asOf}: ${s?.frequency} ${s?.ambiguity}`);
    }
    expect(wrong).toEqual([]);
    expect(ties).toBeLessThanOrEqual(31); // only the February-spanning windows
  });

  it("a clean 4-deposit semi-monthly sender (1st and 16th) is semi-monthly and unflagged", async () => {
    const [s] = await detectRecurringTransfers(["2026-08-01", "2026-08-16", "2026-09-01", "2026-09-16"].map((d) => plaidVenmo(d, 90, "Four Semi")), AS_OF);
    expect(s).toMatchObject({ frequency: "semi_monthly", occurrence_count: 4, ambiguity: [] });
  });

  it("PHASE_2_REWORK_6.md: senders whose amount changed are surfaced and flagged amount_changed, never dropped", async () => {
    const raise = await detectRecurringTransfers([
      ...[170, 140, 110, 80].map((d) => plaidVenmo(ago(d), 200, "Raised Sender")),
      ...[50, 20].map((d) => plaidVenmo(ago(d), 450, "Raised Sender"))], AS_OF);
    const cut = await detectRecurringTransfers([
      ...[170, 140, 110, 80].map((d) => plaidVenmo(ago(d), 500, "Cut Sender")),
      ...[50, 20].map((d) => plaidVenmo(ago(d), 200, "Cut Sender"))], AS_OF);
    const switched = await detectRecurringTransfers([
      ...[175, 145, 115, 85, 55].map((d) => plaidVenmo(ago(d), 500, "Switched Sender")),
      ...[29, 22, 15, 8, 1].map((d) => plaidVenmo(ago(d), 60, "Switched Sender"))], AS_OF);
    for (const [label, found, n] of [["raise", raise, 6], ["cut", cut, 6], ["switch", switched, 10]] as const) {
      expect(found, label).toHaveLength(1);
      expect(found[0].ambiguity, label).toContain("amount_changed");
      expect(found[0].deposits, label).toHaveLength(n);
    }
  });

  it("N17: a semi-monthly 1st paid on the previous month's last day stays semi-monthly and clean", async () => {
    const dates = ["2026-04-16", "2026-05-01", "2026-05-16", "2026-05-31", "2026-06-16", "2026-07-01", "2026-07-16", "2026-08-01", "2026-08-16", "2026-08-31", "2026-09-16"];
    const [s] = await detectRecurringTransfers(dates.map((d) => plaidVenmo(d, 180, "Nia Ford")), AS_OF);
    expect(s).toMatchObject({ frequency: "semi_monthly", occurrence_count: 11, ambiguity: [] });
  });
});

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

  it("does not call irregular deposits regular, but surfaces them for the family's statement", async () => {
    // Before PHASE_2_REWORK_2.md this group was dropped silently; now the family is asked about it.
    const irregular = ["2026-04-11", "2026-04-19", "2026-06-30", "2026-07-02", "2026-09-10"].map((d) => inflow(d, 40, "Venmo from Friend"));
    const [s, ...rest] = await detectRecurringTransfers(irregular, AS_OF);
    expect(rest).toHaveLength(0);
    expect(s).toMatchObject({ frequency: null, pattern: "irregular", occurrence_count: 5 });
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
