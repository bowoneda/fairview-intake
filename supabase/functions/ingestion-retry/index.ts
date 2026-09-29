// ingestion-retry: retry failed webhook processing with backoff (PHASE-2-SPEC.md). Called by pg_cron every
// 5 minutes; authenticated by the x-cron-secret header, checked against Vault. No user JWT.
// Backoff after a failed attempt: 1, 5, 15, 60 minutes; after 5 attempts the event stays failed and the
// connection is marked error for a person to look at.
import { json, serviceClient } from "../_shared/auth.ts";
import { ingestItem, PlaidError, type Connection } from "../_shared/plaid.ts";

const BACKOFF_MINUTES = [1, 5, 15, 60];
const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const svc = serviceClient();
  const { data: ok } = await svc.rpc("check_cron_secret", { p_secret: req.headers.get("x-cron-secret") ?? "" });
  if (ok !== true) return json(401, { error: "unauthorized" });

  const { data: events, error } = await svc.rpc("claim_retry_events", { p_limit: 10 });
  if (error) return json(500, { error: "claim_failed" });

  const results: { id: string; status: string }[] = [];
  for (const e of events ?? []) {
    const done = (status: string, fields: Record<string, unknown> = {}) =>
      svc.from("webhook_events").update({ status, processed_at: new Date().toISOString(), ...fields }).eq("id", e.id);
    try {
      if (e.provider !== "plaid" || !String(e.event_type).startsWith("TRANSACTIONS.")) {
        await done("ignored", { last_error: "not_retryable", next_attempt_at: null });
        results.push({ id: e.id, status: "ignored" });
        continue;
      }
      const { data: c } = await svc.from("provider_connections")
        .select("id, tenant_id, applicant_id, household_member_id").eq("provider", "plaid").eq("provider_ref", e.provider_ref ?? "").maybeSingle();
      if (!c) {
        await done("ignored", { last_error: "unknown_item", next_attempt_at: null });
        results.push({ id: e.id, status: "ignored" });
        continue;
      }
      await ingestItem(svc, c as Connection);
      await done("processed", { last_error: null, next_attempt_at: null });
      results.push({ id: e.id, status: "processed" });
    } catch (err) {
      const reason = err instanceof PlaidError ? `${err.errorType}/${err.errorCode}` : err instanceof Error ? err.message : "error";
      console.error(`ingestion-retry: attempt ${e.attempts} failed ${reason}`);
      if (e.attempts >= MAX_ATTEMPTS) {
        await done("failed", { last_error: `gave_up: ${reason}`.slice(0, 200), next_attempt_at: null });
        await svc.from("provider_connections").update({ status: "error", error_code: "ingestion_failed" })
          .eq("provider", "plaid").eq("provider_ref", e.provider_ref ?? "");
        results.push({ id: e.id, status: "gave_up" });
      } else {
        const wait = BACKOFF_MINUTES[Math.min(e.attempts, BACKOFF_MINUTES.length) - 1];
        await svc.from("webhook_events").update({
          status: "failed", last_error: reason.slice(0, 200), next_attempt_at: new Date(Date.now() + wait * 60_000).toISOString(),
        }).eq("id", e.id);
        results.push({ id: e.id, status: "rescheduled" });
      }
    }
  }
  return json(200, { claimed: results.length, results });
});
