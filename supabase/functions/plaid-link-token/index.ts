// plaid-link-token: create a Plaid Link token for the caller's own household member (PHASE-2-SPEC.md).
// POST { household_member_id, product? } with the applicant's bearer token; product is "transactions" (bank,
// the default) or "payroll_income" (payroll). Returns { link_token, connection_id }.
import { authenticate, errorResponse, HttpError, json, serviceClient } from "../_shared/auth.ts";
import { linkTokenBody, plaid, PlaidError, startConnection } from "../_shared/plaid.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    const caller = await authenticate(req, "applicant");
    const input = await req.json().catch(() => ({}));
    if (typeof input?.household_member_id !== "string") throw new HttpError(400, "missing_member", "Choose whose account this is.");

    const product = input.product === "payroll_income" ? "payroll_income" : "transactions";
    const svc = serviceClient();
    const c = await startConnection(svc, caller.asCaller, caller.tenantId, input.household_member_id, product)
      .catch((e) => { if (e instanceof PlaidError) throw e; throw new HttpError(404, "member_not_found", "That household member was not found."); });

    // client_user_id is our internal connection id: Plaid never receives the applicant's name, email, or SSN.
    const token = await plaid<{ link_token: string }>("/link/token/create", linkTokenBody(c));
    return json(200, { link_token: token.link_token, connection_id: c.id });
  } catch (e) {
    if (e instanceof PlaidError) {
      console.error(`plaid-link-token: ${e.errorType}/${e.errorCode}`);
      return json(502, { error: "provider_error", message: "The bank connection service is not available right now. Try again shortly." });
    }
    return errorResponse(e, "plaid-link-token");
  }
});
