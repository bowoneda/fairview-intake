// plaid-webhook: signature verified first, then recorded once, then processed (PHASE-2-SPEC.md, WEBHOOK
// INGESTION STATE MACHINE). No caller JWT: Plaid's signature is the authentication.
//   Plaid-Verification header: ES256 JWT; key fetched by kid from /webhook_verification_key/get and cached;
//   iat no more than 5 minutes old; SHA-256 of the exact raw body equals request_body_sha256 (constant time).
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from "jose";
import { json, serviceClient } from "../_shared/auth.ts";
import { ingestItem, plaid, PlaidError, type Connection } from "../_shared/plaid.ts";

const keyCache = new Map<string, JWK>();
const RETRY_MINUTES = [1, 5, 15, 60];

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Returns null when valid, otherwise a short reason (recorded, never the body). */
async function verify(req: Request, body: string): Promise<string | null> {
  const token = req.headers.get("Plaid-Verification");
  if (!token) return "missing_signature";
  let kid: string | undefined;
  try {
    const header = decodeProtectedHeader(token);
    if (header.alg !== "ES256") return "wrong_algorithm";
    kid = header.kid;
  } catch {
    return "malformed_signature";
  }
  if (!kid) return "missing_key_id";
  try {
    let jwk = keyCache.get(kid);
    if (!jwk) {
      const r = await plaid<{ key: JWK }>("/webhook_verification_key/get", { key_id: kid });
      jwk = r.key;
      keyCache.set(kid, jwk);
    }
    const { payload } = await jwtVerify(token, await importJWK(jwk, "ES256"), { algorithms: ["ES256"], maxTokenAge: "5 minutes" });
    const claimed = String(payload.request_body_sha256 ?? "");
    if (!constantTimeEqual(await sha256Hex(body), claimed)) return "body_mismatch";
    return null;
  } catch (e) {
    if (e instanceof PlaidError) return "unknown_key";
    const code = (e as { code?: string }).code ?? "";
    return code === "ERR_JWT_EXPIRED" || code === "ERR_JWT_CLAIM_VALIDATION_FAILED" ? "stale_signature" : "bad_signature";
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const svc = serviceClient();
  const body = await req.text();
  const eventId = await sha256Hex(body);

  const failure = await verify(req, body);
  if (failure) {
    // Recorded with type and reason only. A rejected body is never parsed further or stored.
    await svc.from("webhook_events").insert({
      // Every rejection is its own row: forgeries often reuse a body, and none may be dropped from the record.
      provider: "plaid", event_id: `rejected:${crypto.randomUUID()}`, event_type: failure, signature_valid: false, status: "rejected",
    }).then(() => {}, () => {});
    return json(401, { error: "invalid_signature" });
  }

  let event: Record<string, any>;
  try {
    event = JSON.parse(body);
  } catch {
    return json(400, { error: "bad_body" });
  }
  const eventType = `${event.webhook_type}.${event.webhook_code}`;

  // Idempotency: the same body is recorded and processed once.
  const { error: dupErr } = await svc.from("webhook_events").insert({
    provider: "plaid", event_id: eventId, event_type: eventType, provider_ref: event.item_id ?? null,
    signature_valid: true, status: "processing", attempts: 1,
  });
  if (dupErr) return json(200, { status: "duplicate" });

  const finish = (status: string, fields: Record<string, unknown> = {}) =>
    svc.from("webhook_events").update({ status, processed_at: new Date().toISOString(), ...fields })
      .eq("provider", "plaid").eq("event_id", eventId);

  try {
    const { data: c } = await svc.from("provider_connections")
      .select("id, tenant_id, applicant_id, household_member_id").eq("provider", "plaid").eq("provider_ref", event.item_id ?? "").maybeSingle();
    if (!c) {
      await finish("ignored", { last_error: "unknown_item" });
      return json(200, { status: "ignored" });
    }
    const code = String(event.webhook_code);
    if (event.webhook_type === "TRANSACTIONS" &&
        ["SYNC_UPDATES_AVAILABLE", "INITIAL_UPDATE", "HISTORICAL_UPDATE", "DEFAULT_UPDATE", "RECURRING_TRANSACTIONS_UPDATE"].includes(code)) {
      await ingestItem(svc, c as Connection);
    } else if (event.webhook_type === "ITEM" && (code === "ERROR" || code === "PENDING_EXPIRATION" || code === "PENDING_DISCONNECT")) {
      const errorCode = String(event.error?.error_code ?? code);
      await svc.from("provider_connections").update({
        status: errorCode === "ITEM_LOGIN_REQUIRED" || code !== "ERROR" ? "reauth_required" : "error",
        error_code: errorCode, last_event_at: new Date().toISOString(),
      }).eq("id", c.id);
    } else if (event.webhook_type === "ITEM" && code === "USER_PERMISSION_REVOKED") {
      await svc.from("provider_connections").update({ status: "revoked", last_event_at: new Date().toISOString() }).eq("id", c.id);
    } else {
      await finish("ignored");
      return json(200, { status: "ignored" });
    }
    await finish("processed");
    return json(200, { status: "processed" });
  } catch (e) {
    // Recorded durably and answered 2xx; ingestion-retry picks it up with backoff.
    const reason = e instanceof PlaidError ? `${e.errorType}/${e.errorCode}` : e instanceof Error ? e.message : "error";
    console.error(`plaid-webhook: processing failed ${reason}`);
    await finish("failed", { last_error: reason.slice(0, 200), next_attempt_at: new Date(Date.now() + RETRY_MINUTES[0] * 60_000).toISOString() });
    return json(200, { status: "failed_will_retry" });
  }
});
