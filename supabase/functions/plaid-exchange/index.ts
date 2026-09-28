// plaid-exchange: exchange the public token from Plaid Link and run the first ingestion (PHASE-2-SPEC.md).
// POST { connection_id, public_token } with the applicant's bearer token.
import { authenticate, errorResponse, HttpError, json, serviceClient } from "../_shared/auth.ts";
import { exchangeAndIngest, PlaidError, type Connection } from "../_shared/plaid.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    const caller = await authenticate(req, "applicant");
    const input = await req.json().catch(() => ({}));
    if (typeof input?.connection_id !== "string" || typeof input?.public_token !== "string") {
      throw new HttpError(400, "bad_request", "The bank connection could not be completed. Try again.");
    }
    // Ownership through RLS: only the caller's own connection is visible.
    const { data: c } = await caller.asCaller.from("provider_connections")
      .select("id, tenant_id, applicant_id, household_member_id, status, provider").eq("id", input.connection_id).maybeSingle();
    if (!c || c.provider !== "plaid") throw new HttpError(404, "not_found", "Bank connection not found.");
    if (c.status !== "link_started") throw new HttpError(409, "already_exchanged", "This bank connection is already set up.");

    const summary = await exchangeAndIngest(serviceClient(), c as Connection, input.public_token);
    return json(200, summary);
  } catch (e) {
    if (e instanceof PlaidError) {
      console.error(`plaid-exchange: ${e.errorType}/${e.errorCode}`);
      return json(502, { error: "provider_error", message: "The bank connection could not be completed. Try again." });
    }
    return errorResponse(e, "plaid-exchange");
  }
});
