// Redaction of raw provider payloads before storage (PHASE-2-SPEC.md, SECURITY DECISIONS). Removes full
// account and routing numbers, SSNs, dates of birth, and street addresses; keeps amounts, dates, categories,
// masks, and provider identifiers. Runs in Deno and Node, no dependencies.

export const REDACTED = "[REDACTED]";

// Field names are compared after lowercasing and dropping non letters, so account_number, accountNumber,
// and "Account Number" all match.
const SENSITIVE_KEYS = new Set([
  // full account and routing numbers (masks, last_four, and *_id identifiers are deliberately kept)
  "account", "accountnumber", "accountno", "acctnumber", "acct", "fullaccountnumber", "iban",
  "routing", "routingnumber", "wirerouting", "achrouting", "aba", "abanumber", "bic", "swift",
  // government identifiers
  "ssn", "socialsecuritynumber", "socialsecurity", "taxid", "tin", "itin", "ein", "nationalid",
  "driverslicense", "driverslicensenumber", "passportnumber",
  // dates of birth
  "dob", "dateofbirth", "birthdate", "birthday",
  // street addresses
  "address", "street", "streetaddress", "addressline", "line", "postaladdress", "homeaddress", "mailingaddress",
]);

const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z]/g, "");

// Values that look sensitive whatever their key: an SSN pattern, or a long run of digits (account or
// routing number). Nine to seventeen digits, optionally broken by spaces or dashes.
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const LONG_DIGITS = /\b\d(?:[ -]?\d){8,16}\b/g;

export interface RedactionResult<T = unknown> {
  value: T;
  /** JSON paths of everything removed or masked, for the audit of the redaction itself. Never values. */
  removed: string[];
}

/** Deep copy of payload with sensitive fields removed and sensitive-looking values masked. Input untouched. */
export function redactPayload<T = unknown>(payload: T): RedactionResult<T> {
  const removed: string[] = [];

  const scrubString = (s: string, path: string): string => {
    let out = s.replace(SSN_PATTERN, REDACTED);
    out = out.replace(LONG_DIGITS, REDACTED);
    if (out !== s) removed.push(path);
    return out;
  };

  const walk = (node: unknown, path: string): unknown => {
    if (Array.isArray(node)) return node.map((item, i) => walk(item, `${path}[${i}]`));
    if (node !== null && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        const childPath = path ? `${path}.${key}` : key;
        const norm = normalizeKey(key);
        // "addressline1", "line2", "street2": strip trailing digits handled by normalizeKey dropping them.
        if (SENSITIVE_KEYS.has(norm)) {
          removed.push(childPath);
          continue;
        }
        out[key] = walk(value, childPath);
      }
      return out;
    }
    if (typeof node === "string") return scrubString(node, path);
    return node;
  };

  return { value: walk(payload, "") as T, removed };
}
