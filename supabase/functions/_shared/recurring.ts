// Recurring peer to peer transfer detection (PHASE-2-SPEC.md, RECURRING TRANSFER RULE). Pure and deterministic
// so an auditor can re-run it on the same transactions and get the same answer. Detection only: a detected
// stream starts at awaiting_family_statement; software never decides whether it is income.
//
// Project conventions (not federal text; flagged for Regulatory Compliance Verification Skill confirmation), in
// PHASE-2-SPEC.md AS BUILT 13 and 17:
// - payment app inflows only, in a 180 day lookback, grouped by account, app, and sender;
// - deposits more than 50 percent away from the sender's median amount are kept out of the stream and listed
//   for the reviewer (a one-off gift is not part of a regular pattern);
// - the stream is the longest run of the sender's deposits whose consecutive gaps all fit one frequency, at
//   least 3 deposits, active when its last deposit is within 1.5 intervals of the as of date. Deposits off that
//   run (an extra payment, a switch in schedule) are kept out of the count, average, and dates, and listed;
// - a sender with at least 3 deposits and a recent one, but no regular run, is not dropped: it is surfaced with
//   no frequency ("irregular"), so the family is still asked about it and a reviewer still sees it.
//
// Grouping by sender matters: on real Plaid data, `name` is normalized to the app ("Venmo") for every deposit
// and the counterparty is the app itself; the sender exists only in `original_description`, which Plaid returns
// when /transactions/sync is called with include_original_description (PHASE_2_REWORK.md item 5). The sender is
// the first two words after "from" (or "by"), so a memo after the name ("Venmo from Chris Po rent share") does not
// split one sender into several groups (PHASE_2_REWORK_2.md case C).

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
  /** Stable key per sender (account, app, sender): the same source across reads, even if the frequency changes. */
  stream_ref: string;
  account_id: string;
  app: "Zelle" | "Venmo" | "Cash App";
  /** null when the sender's deposits have no regular schedule (pattern "irregular"). */
  frequency: Frequency | null;
  pattern: "regular" | "irregular";
  average_amount: number;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  transaction_ids: string[];
  /** Deposits from the same sender kept out of the stream: amount far from typical, or off the regular schedule. */
  excluded_transaction_ids: string[];
}

export const LOOKBACK_DAYS = 180;
export const MIN_OCCURRENCES = 3;
export const AMOUNT_TOLERANCE = 0.5;
export const SENDER_WORDS = 2;
/** An irregular sender is surfaced only if it sent money this recently (days before the as of date). */
export const IRREGULAR_RECENT_DAYS = 45;

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
 * Who sent it: from the original description when present (it carries the sender), else the name. Digits are
 * dropped (reference numbers change per transfer). When the text names a sender after "from" or "by", only the
 * first two words after it are kept, so memo text does not split a sender.
 */
function senderKey(t: Txn): string {
  const text = (t.original_description || t.name || t.merchant_name || "").toLowerCase().replace(/\d+/g, " ").replace(/[^a-z]+/g, " ").trim();
  const m = text.match(/\b(?:from|by)\s+(.+)$/);
  return m ? m[1].split(" ").slice(0, SENDER_WORDS).join(" ") : text;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Gap bands in days. Semi-monthly's band overlaps biweekly's; a semi-monthly run must also pass isSemiMonthly. */
const BAND: Record<Frequency, [number, number]> = { weekly: [5, 9], biweekly: [12, 16], semi_monthly: [10, 20], monthly: [26, 35] };
const INTERVAL: Record<Frequency, number> = { weekly: 7, biweekly: 14, semi_monthly: 15, monthly: 30 };
/** Tie order when two frequencies give runs of the same length. Semi-monthly first: its extra check is stricter. */
const PREFERENCE: Frequency[] = ["semi_monthly", "weekly", "biweekly", "monthly"];

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

/**
 * The longest run of deposits (in date order, skipping any) whose consecutive gaps all fall in the frequency's
 * band. Ties go to the run ending latest, then to the latest predecessor, so the result is deterministic.
 */
function longestRun(txns: Txn[], f: Frequency): Txn[] {
  const [lo, hi] = BAND[f];
  const len = txns.map(() => 1);
  const prev = txns.map(() => -1);
  for (let i = 1; i < txns.length; i++) {
    for (let j = 0; j < i; j++) {
      const g = days(txns[j].date, txns[i].date);
      if (g >= lo && g <= hi && len[j] + 1 >= len[i]) { len[i] = len[j] + 1; prev[i] = j; }
    }
  }
  let end = -1;
  for (let i = 0; i < txns.length; i++) if (end < 0 || len[i] >= len[end]) end = i;
  const run: Txn[] = [];
  for (let i = end; i >= 0; i = prev[i]) run.unshift(txns[i]);
  return run;
}

function bestRegularRun(txns: Txn[], asOf: string): { frequency: Frequency; run: Txn[] } | null {
  let best: { frequency: Frequency; run: Txn[] } | null = null;
  for (const f of PREFERENCE) {
    const run = longestRun(txns, f);
    if (run.length < MIN_OCCURRENCES) continue;
    if (f === "semi_monthly" && !isSemiMonthly(run.map((t) => t.date))) continue;
    if (days(run[run.length - 1].date, asOf) > INTERVAL[f] * 1.5) continue; // no longer active
    if (!best || run.length > best.run.length) best = { frequency: f, run };
  }
  return best;
}

/**
 * A stream record's review reasons from its source's status. While undecided, the status reason, plus
 * irregular_pattern for a sender with no regular schedule; once a reviewer has decided, none. Migration 1500's
 * trigger applies the same rule in the database when the status changes between reads.
 */
export function streamReviewReasons(status: string, pattern: DetectedStream["pattern"]): string[] {
  if (status !== "awaiting_family_statement" && status !== "awaiting_review") return [];
  return pattern === "irregular" ? [status, "irregular_pattern"] : [status];
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
    const key = `${t.account_id}|${app}|${senderKey(t)}`;
    const g = groups.get(key) ?? { app, txns: [] };
    g.txns.push(t);
    groups.set(key, g);
  }

  const streams: DetectedStream[] = [];
  for (const [key, g] of groups) {
    const all = [...g.txns].sort((a, b) => a.date.localeCompare(b.date) || a.transaction_id.localeCompare(b.transaction_id));
    const typical = median(all.map((t) => Math.abs(t.amount)));
    const inBand = (t: Txn) => Math.abs(Math.abs(t.amount) - typical) <= typical * AMOUNT_TOLERANCE;
    const candidates = all.filter(inBand);
    if (candidates.length < MIN_OCCURRENCES) continue;

    const regular = bestRegularRun(candidates, asOf);
    let chosen: Txn[];
    if (regular) {
      chosen = regular.run;
    } else {
      // No regular schedule. Surface it rather than drop it, if the sender is still sending.
      if (days(candidates[candidates.length - 1].date, asOf) > IRREGULAR_RECENT_DAYS) continue;
      chosen = candidates;
    }
    const inStream = new Set(chosen.map((t) => t.transaction_id));
    const total = chosen.reduce((s, t) => s + Math.abs(t.amount), 0);
    streams.push({
      stream_ref: (await sha256Hex(key)).slice(0, 32),
      account_id: chosen[0].account_id,
      app: g.app,
      frequency: regular ? regular.frequency : null,
      pattern: regular ? "regular" : "irregular",
      average_amount: Math.round((total / chosen.length) * 100) / 100,
      occurrence_count: chosen.length,
      first_seen: chosen[0].date,
      last_seen: chosen[chosen.length - 1].date,
      transaction_ids: chosen.map((t) => t.transaction_id),
      excluded_transaction_ids: all.filter((t) => !inStream.has(t.transaction_id)).map((t) => t.transaction_id),
    });
  }
  return streams.sort((a, b) => a.stream_ref.localeCompare(b.stream_ref));
}
