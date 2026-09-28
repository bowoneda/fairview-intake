// Plaid webhook verification, pure (PHASE-2-SPEC.md, WEBHOOK INGESTION STATE MACHINE). The key lookup is passed
// in, so every branch is unit tested with a key the test controls; plaid-webhook passes Plaid's key endpoint.
//   ES256 only; key by kid; iat no more than 5 minutes old; SHA-256 of the exact raw body equals
//   request_body_sha256, compared in constant time.
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from "jose";

export type VerifyFailure =
  | "missing_signature" | "malformed_signature" | "wrong_algorithm" | "missing_key_id" | "unknown_key"
  | "stale_signature" | "bad_signature" | "body_mismatch";

export const MAX_AGE_SECONDS = 300;

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * null when the webhook is genuine, otherwise the reason. `resolveKey` returns the JWK for a key id, or null
 * when the id is unknown. `now` (seconds) is injectable so the age check is testable.
 */
export async function verifyPlaidWebhook(
  signature: string | null,
  rawBody: string,
  resolveKey: (kid: string) => Promise<JWK | null>,
  now: number = Math.floor(Date.now() / 1000),
): Promise<VerifyFailure | null> {
  if (!signature) return "missing_signature";
  let kid: string | undefined;
  try {
    const header = decodeProtectedHeader(signature);
    if (header.alg !== "ES256") return "wrong_algorithm";
    kid = header.kid;
  } catch {
    return "malformed_signature";
  }
  if (!kid) return "missing_key_id";

  let jwk: JWK | null;
  try {
    jwk = await resolveKey(kid);
  } catch {
    return "unknown_key";
  }
  if (!jwk) return "unknown_key";

  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(signature, await importJWK(jwk, "ES256"), { algorithms: ["ES256"], currentDate: new Date(now * 1000) }));
  } catch {
    return "bad_signature";
  }
  const iat = typeof payload.iat === "number" ? payload.iat : NaN;
  if (!Number.isFinite(iat) || now - iat > MAX_AGE_SECONDS || iat - now > 60) return "stale_signature";

  const claimed = typeof payload.request_body_sha256 === "string" ? payload.request_body_sha256 : "";
  if (!constantTimeEqual(await sha256Hex(rawBody), claimed)) return "body_mismatch";
  return null;
}
