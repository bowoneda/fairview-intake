import "server-only";
import { currentClaims, type SessionClaims } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/tenant";

export type Access =
  | { kind: "signed_out" }
  /** Session belongs to another operator, or has no operator. The layout shows the mismatch page. */
  | { kind: "mismatch" }
  /** Reviewer or admin: their tools are the Phase 4 dashboard, not the applicant flow. */
  | { kind: "staff"; claims: SessionClaims }
  | { kind: "applicant"; claims: SessionClaims };

/**
 * Who is asking, relative to this operator. Pages call this before loading any data: a layout and its
 * page render in parallel, so the layout's mismatch check alone would not stop a page from loading.
 */
export async function accessFor(tenant: Tenant): Promise<Access> {
  const claims = await currentClaims();
  if (!claims) return { kind: "signed_out" };
  if (claims.tenantId !== tenant.id) return { kind: "mismatch" };
  if (claims.appRole === "applicant") return { kind: "applicant", claims };
  return { kind: "staff", claims };
}
