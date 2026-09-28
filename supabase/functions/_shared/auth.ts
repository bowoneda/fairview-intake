// Caller authentication for Edge Functions (PHASE-2-SPEC.md, ARCHITECTURE DECISION). The gateway's JWT check is
// off for these functions (config.toml), because this project signs tokens with an asymmetric ES256 key; each
// function verifies the token itself with getClaims, which checks the signature against the project's keys.
// Deno only.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = (name: string) => Deno.env.get(name) ?? "";

/** The first key of a JSON map env var (SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS), if present. */
function firstKey(jsonMapVar: string): string {
  try {
    const map = JSON.parse(env(jsonMapVar) || "{}") as Record<string, string>;
    return Object.values(map)[0] ?? "";
  } catch {
    return "";
  }
}

export const SUPABASE_URL = env("SUPABASE_URL");
const PUBLISHABLE = env("SUPABASE_ANON_KEY") || firstKey("SUPABASE_PUBLISHABLE_KEYS");
const SERVICE = env("SUPABASE_SERVICE_ROLE_KEY") || firstKey("SUPABASE_SECRET_KEYS");

export interface Caller {
  userId: string;
  tenantId: string;
  role: "applicant" | "reviewer" | "admin";
  /** Runs under RLS as the caller. Use it to find anything the caller owns. */
  asCaller: SupabaseClient;
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** Verify the bearer token and return the caller, or throw a 401/403. */
export async function authenticate(req: Request, requireRole?: Caller["role"]): Promise<Caller> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "missing_token", "Sign in required.");

  const asCaller = createClient(SUPABASE_URL, PUBLISHABLE, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await asCaller.auth.getClaims(token);
  const claims = data?.claims as Record<string, unknown> | undefined;
  if (error || !claims?.sub) throw new HttpError(401, "invalid_token", "Sign in required.");

  // tenant_id and app_role come only from the Custom Access Token Hook, never from user_metadata.
  const tenantId = typeof claims.tenant_id === "string" ? claims.tenant_id : "";
  const role = claims.app_role as Caller["role"] | undefined;
  if (!tenantId || !role) throw new HttpError(403, "no_profile", "This account is not set up for any property manager.");
  if (requireRole && role !== requireRole) throw new HttpError(403, "wrong_role", "This action is not available for this account.");

  return { userId: String(claims.sub), tenantId, role, asCaller };
}

/**
 * Service role client. Only for writes on behalf of a caller whose ownership was already established through
 * `asCaller` (RULES.md: service role only after independent authentication and authorization).
 */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Errors to the caller carry a code and a plain message; internals are logged by code only, never payloads. */
export function errorResponse(e: unknown, fn: string): Response {
  if (e instanceof HttpError) return json(e.status, { error: e.code, message: e.message });
  console.error(`${fn}: unexpected ${e instanceof Error ? e.name : "error"}`);
  return json(500, { error: "internal", message: "Something went wrong. Your saved progress is safe; try again." });
}
