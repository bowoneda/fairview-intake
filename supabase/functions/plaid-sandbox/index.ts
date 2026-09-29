// plaid-sandbox: SANDBOX ONLY. Lets integration tests drive the real Plaid flow without the Link UI, while the
// Plaid secret stays in Edge Function secrets. Refuses to run unless PLAID_ENV is sandbox.
//   POST { action: "link", household_member_id, product?, custom_user? }  -> sandbox public token, then the same exchange
//                                                                 and ingestion code the real flow uses
//   POST { action: "fire_webhook", connection_id, webhook_code } -> Plaid sends a real signed webhook
//   POST { action: "remove", connection_id }                     -> removes the item / payroll user at Plaid
import { authenticate, errorResponse, HttpError, json, serviceClient } from "../_shared/auth.ts";
import { exchangeAndIngest, plaid, PLAID_ENV, PlaidError, startConnection, WEBHOOK_URL } from "../_shared/plaid.ts";

const SANDBOX_INSTITUTION = "ins_109508"; // Plaid's sandbox "First Platypus Bank"

Deno.serve(async (req) => {
  if (PLAID_ENV !== "sandbox") return json(404, { error: "not_found" });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    const caller = await authenticate(req, "applicant");
    const input = await req.json().catch(() => ({}));
    const svc = serviceClient();

    if (input?.action === "link") {
      if (typeof input.household_member_id !== "string") throw new HttpError(400, "missing_member", "household_member_id required");
      const product = input.product === "payroll_income" ? "payroll_income" : "transactions";
      const c = await startConnection(svc, caller.asCaller, caller.tenantId, input.household_member_id, product)
        .catch((e) => { if (e instanceof PlaidError) throw e; throw new HttpError(404, "member_not_found", "member not found"); });
      // 180 days, like the real Link token: Plaid's default is 90, too short for the recurring rule's lookback.
      const options: Record<string, unknown> = { webhook: WEBHOOK_URL, transactions: { days_requested: 180 } };
      if (input.custom_user) {
        options.override_username = "user_custom";
        options.override_password = JSON.stringify(input.custom_user);
      }
      const pt = await plaid<{ public_token: string }>("/sandbox/public_token/create", product === "payroll_income"
        ? { institution_id: SANDBOX_INSTITUTION, initial_products: ["income_verification"], user_id: c.provider_user_ref,
            options: { webhook: WEBHOOK_URL, income_verification: { income_source_types: ["payroll"] } } }
        : { institution_id: SANDBOX_INSTITUTION, initial_products: ["transactions"], options });
      const summary = await exchangeAndIngest(svc, c, pt.public_token);
      return json(200, { connection_id: c.id, ...summary });
    }

    if (input?.action === "fire_webhook") {
      const { data: c } = await caller.asCaller.from("provider_connections").select("id").eq("id", input.connection_id).maybeSingle();
      if (!c) throw new HttpError(404, "not_found", "connection not found");
      const { data: token } = await svc.rpc("read_provider_token", { p_connection_id: c.id });
      await plaid("/sandbox/item/fire_webhook", { access_token: token, webhook_code: input.webhook_code ?? "SYNC_UPDATES_AVAILABLE" });
      return json(200, { fired: input.webhook_code ?? "SYNC_UPDATES_AVAILABLE" });
    }

    if (input?.action === "remove") {
      // Test teardown: remove the item (and payroll user) on Plaid's side so Plaid stops sending webhooks for
      // data the test is about to delete, and sandbox items do not pile up at Plaid.
      const { data: c } = await caller.asCaller.from("provider_connections").select("id").eq("id", input.connection_id).maybeSingle();
      if (!c) throw new HttpError(404, "not_found", "connection not found");
      const { data: ref } = await svc.from("provider_connections").select("provider_user_ref").eq("id", c.id).single();
      const { data: token } = await svc.rpc("read_provider_token", { p_connection_id: c.id });
      if (token) await plaid("/item/remove", { access_token: token });
      if (ref?.provider_user_ref) await plaid("/user/remove", { user_id: ref.provider_user_ref });
      return json(200, { removed: true });
    }

    throw new HttpError(400, "unknown_action", "action must be link, fire_webhook, or remove");
  } catch (e) {
    if (e instanceof PlaidError) return json(502, { error: "provider_error", plaid: `${e.errorType}/${e.errorCode}` });
    return errorResponse(e, "plaid-sandbox");
  }
});
