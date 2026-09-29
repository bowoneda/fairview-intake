// Recurring peer to peer transfer detection (PHASE-2-SPEC.md, RECURRING TRANSFER RULE). Pure and deterministic
// so an auditor can re-run it on the same transactions and get the same answer. Detection only: a detected
// stream starts at awaiting_family_statement; software never decides whether it is income.
//
// Project conventions (not federal text; flagged for Regulatory Compliance Verification Skill confirmation):
// payment app inflows only; grouped by sender; at least 3 occurrences in a 180 day lookback; deposits whose
// amount is more than 50 percent away from the group's median are kept out of the stream (a one-off gift is not
// part of a regular pattern) and listed for the reviewer; at least 75 percent of the gaps between deposits fall
// in one frequency band; active when the last deposit is within 1.5 intervals of the as of date.
//
// Grouping by sender matters: on real Plaid data, `name` is normalized to the app ("Venmo") for every deposit
// and the counterparty is the app itself; the sender exists only in `original_description`, which Plaid returns
// when /transactions/sync is called with include_original_description. Grouping by `name` merged every sender on
// an app into one group (found by the Phase 2 vetting sub-agent, PHASE_2_REWORK.md item 5).

export type Frequency = "weekly" | "biweekly" | "semi_monthly" | "monthly";

/** Plaid's sign convention: positive amounts are money out of the account, negative amounts are money in. */
export interface Txn {
  transaction_id: string;
  account_id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  name?: string | null;
  /** The raw bank description; for payment apps it carries the sender ("Venmo from ..."). */
  original_description?: string | null;
  merchant_name?: string | null;
  counterparties?: { name?: string | null }[] | null;
  personal_finance_category?: { primary?: string | null; detailed?: string | null } | null;
}

export interface DetectedStream {
  /** Stable key per stream: the same deposits produce the same key on every run. */
  stream_ref: string;
  account_id: string;
  app: "Zelle" | "Venmo" | "Cash App";
  frequency: Frequency;
  average_amount: number;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  transaction_ids: string[];
  /** Deposits from the same sender left out of the stream because their amount was far from typical. */
  excluded_transaction_ids: string[];
}

export const LOOKBACK_DAYS = 180;
export const MIN_OCCURRENCES = 3;
export const BAND_SHARE = 0.75;
export const AMOUNT_TOLERANCE = 0.5;

const APPS: [DetectedStream["app"], RegExp][] = [
  ["Zelle", /\bzelle\b/i],
  ["Venmo", /\bvenmo\b/i],
  ["Cash App", /\bcash\s?app\b|\bsquare\s?cash\b/i],
];

const DAY = 86_400_000;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

function appOf(t: Txn): DetectedStream["app"] | null {
  const text = [t.name, t.original_description, t.merchant_name, ...(t.counterparties ?? []).map((c) => c.name)].filter(Boolean).join(" ");
  for (const [app, re] of APPS) if (re.test(text)) return app;
  return null;
}

/**
 * Who sent it: the original description when present (it carries the sender), else the name. Digits are dropped,
 * because reference numbers change per transfer.
 */
function counterpartyKey(t: Txn): string {
  return (t.original_description || t.name || t.merchant_name || "").toLowerCase().replace(/\d+/g, "").replace(/[^a-z]+/g, " ").trim();
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function bandOf(gap: number): Frequency | null {
  if (gap >= 5 && gap <= 9) return "weekly";
  if (gap >= 12 && gap <= 16) return "biweekly";
  if (gap >= 26 && gap <= 35) return "monthly";
  return null;
}

const INTERVAL: Record<Frequency, number> = { weekly: 7, biweekly: 14, semi_monthly: 15, monthly: 30 };

/**
 * Twice a month on (roughly) the same two days, such as the 1st and 15th or the 15th and last day. The days of
 * the month are split at their largest gap into two clusters; both must be tight (within 3 days), about the
 * same size, and 10 to 20 days apart. Weekly and biweekly deposits drift across the month and fail this.
 */
function isSemiMonthly(dates: string[]): boolean {
  if (dates.length < 4) return false;
  const dom = dates.map((d) => Number(d.slice(8, 10))).sort((a, b) => a - b);
  let split = 1, widest = -1;
  for (let i = 1; i < dom.length; i++) {
    if (dom[i] - dom[i - 1] > widest) { widest = dom[i] - dom[i - 1]; split = i; }
  }
  const lower = dom.slice(0, split), upper = dom.slice(split);
  const tight = (xs: number[]) => xs.length >= 2 && xs[xs.length - 1] - xs[0] <= 3;
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const apart = mean(upper) - mean(lower);
  return tight(lower) && tight(upper) && Math.abs(lower.length - upper.length) <= 1 && apart >= 10 && apart <= 20;
}

function classify(dates: string[]): Frequency | null {
  if (isSemiMonthly(dates)) return "semi_monthly";
  const gaps = dates.slice(1).map((d, i) => days(dates[i], d));
  const counts = new Map<Frequency, number>();
  for (const g of gaps) {
    const b = bandOf(g);
    if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  let best: Frequency | null = null;
  let bestCount = 0;
  for (const [b, c] of counts) if (c > bestCount) { best = b; bestCount = c; }
  return best && bestCount / gaps.length >= BAND_SHARE ? best : null;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Detect recurring payment app inflows. `asOf` is the date the lookback and the activity check are measured
 * from, passed in (never read from the clock) so the result is reproducible.
 */
export async function detectRecurringTransfers(transactions: Txn[], asOf: string): Promise<DetectedStream[]> {
  const start = new Date(Date.parse(asOf) - LOOKBACK_DAYS * DAY).toISOString().slice(0, 10);
  const groups = new Map<string, { app: DetectedStream["app"]; txns: Txn[] }>();

  for (const t of transactions) {
    if (!(t.amount < 0)) continue; // inflows only (Plaid: negative is money in)
    if (t.date < start || t.date > asOf) continue;
    const app = appOf(t);
    if (!app) continue;
    const key = `${t.account_id}|${app}|${counterpartyKey(t)}`;
    const g = groups.get(key) ?? { app, txns: [] };
    g.txns.push(t);
    groups.set(key, g);
  }

  const streams: DetectedStream[] = [];
  for (const [key, g] of groups) {
    const all = [...g.txns].sort((a, b) => a.date.localeCompare(b.date) || a.transaction_id.localeCompare(b.transaction_id));
    const typical = median(all.map((t) => Math.abs(t.amount)));
    const inBand = (t: Txn) => Math.abs(Math.abs(t.amount) - typical) <= typical * AMOUNT_TOLERANCE;
    const txns = all.filter(inBand);
    const excluded = all.filter((t) => !inBand(t)).map((t) => t.transaction_id);
    if (txns.length < MIN_OCCURRENCES) continue;
    const dates = txns.map((t) => t.date);
    const frequency = classify(dates);
    if (!frequency) continue;
    const last = dates[dates.length - 1];
    if (days(last, asOf) > INTERVAL[frequency] * 1.5) continue; // no longer active
    const total = txns.reduce((s, t) => s + Math.abs(t.amount), 0);
    streams.push({
      stream_ref: (await sha256Hex(`${key}|${frequency}`)).slice(0, 32),
      account_id: txns[0].account_id,
      app: g.app,
      frequency,
      average_amount: Math.round((total / txns.length) * 100) / 100,
      occurrence_count: txns.length,
      first_seen: dates[0],
      last_seen: last,
      transaction_ids: txns.map((t) => t.transaction_id),
      excluded_transaction_ids: excluded,
    });
  }
  return streams.sort((a, b) => a.stream_ref.localeCompare(b.stream_ref));
}
