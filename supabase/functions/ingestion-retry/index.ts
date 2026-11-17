// ingestion-retry: retry failed webhook processing with backoff (PHASE-2-SPEC.md). Called by pg_cron every
// 5 minutes; authenticated by the x-cron-secret header, checked against Vault. No user JWT.
// Backoff after a failed attempt: 1, 5, 15, 60 minutes; after 5 attempts the event stays failed and the
// connection is marked error for a person to look at.
import { json, serviceClient } from "../_shared/auth.ts";
import { ingestConnection, safeReason, type Connection } from "../_shared/plaid.ts";

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
      const type = String(e.event_type);
      if (e.provider !== "plaid" || !(type.startsWith("TRANSACTIONS.") || type.startsWith("INCOME."))) {
        await done("ignored", { last_error: "not_retryable", next_attempt_at: null });
        results.push({ id: e.id, status: "ignored" });
        continue;
      }
      const cols = "id, tenant_id, applicant_id, household_member_id, product, provider_user_ref";
      const ref = e.provider_ref ?? "";
      const c = (await svc.from("provider_connections").select(cols).eq("provider", "plaid").eq("provider_ref", ref).maybeSingle()).data
        ?? (await svc.from("provider_connections").select(cols).eq("provider", "plaid").eq("provider_user_ref", ref).maybeSingle()).data;
      if (!c) {
        await done("ignored", { last_error: "unknown_item", next_attempt_at: null });
        results.push({ id: e.id, status: "ignored" });
        continue;
      }
      await ingestConnection(svc, c as Connection);
      await done("processed", { last_error: null, next_attempt_at: null });
      results.push({ id: e.id, status: "processed" });
    } catch (err) {
      const reason = safeReason(err);
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
  // Requests no run holds: a run that failed or was killed leaves its connection's request behind (AS BUILT 27).
  const { data: pending } = await svc.rpc("pending_ingest_requests", { p_limit: 10 });
  for (const c of (pending ?? []) as Connection[]) {
    try {
      const s = await ingestConnection(svc, c);
      results.push({ id: c.id, status: s.queued ? "pending_held" : "pending_ingested" });
    } catch (err) {
      // Not retried again from here: a connection that keeps failing (an item removed at Plaid) would otherwise be
      // read every 5 minutes for ever. Failed webhook events keep their own bounded retries, and Plaid's next
      // webhook raises a new request.
      console.error(`ingestion-retry: pending request failed ${safeReason(err)}`);
      await svc.from("provider_connections").update({ ingest_requested: false }).eq("id", c.id);
      results.push({ id: c.id, status: "pending_failed" });
    }
  }
  return json(200, { claimed: results.length, results });
});
