// plaid-webhook: signature verified first, then recorded once, then processed (PHASE-2-SPEC.md, WEBHOOK
// INGESTION STATE MACHINE). No caller JWT: Plaid's signature is the authentication.
//   Plaid-Verification header: ES256 JWT; key fetched by kid from /webhook_verification_key/get and cached;
//   iat no more than 5 minutes old; SHA-256 of the exact raw body equals request_body_sha256 (constant time).
import type { JWK } from "jose";
import { json, serviceClient } from "../_shared/auth.ts";
import { ingestItem, safeReason, plaid, PlaidError, type Connection } from "../_shared/plaid.ts";
import { sha256Hex, verifyPlaidWebhook } from "../_shared/plaid-verify.ts";

const keyCache = new Map<string, JWK>();
const RETRY_MINUTES = [1, 5, 15, 60];

/** Plaid's key for a key id, cached; null when Plaid does not know the id. */
async function resolveKey(kid: string): Promise<JWK | null> {
  const cached = keyCache.get(kid);
  if (cached) return cached;
  try {
    const r = await plaid<{ key: JWK }>("/webhook_verification_key/get", { key_id: kid });
    keyCache.set(kid, r.key);
    return r.key;
  } catch (e) {
    if (e instanceof PlaidError) return null;
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const svc = serviceClient();
  const body = await req.text();
  const eventId = await sha256Hex(body);

  const failure = await verifyPlaidWebhook(req.headers.get("Plaid-Verification"), body, resolveKey);
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
    const reason = safeReason(e);
    console.error(`plaid-webhook: processing failed ${reason}`);
    await finish("failed", { last_error: reason.slice(0, 200), next_attempt_at: new Date(Date.now() + RETRY_MINUTES[0] * 60_000).toISOString() });
    return json(200, { status: "failed_will_retry" });
  }
});
