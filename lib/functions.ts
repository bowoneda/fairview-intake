import "server-only";
import { SUPABASE_URL } from "@/lib/supabase/config";
import { sessionClient } from "@/lib/supabase/server";

export interface FunctionResult<T = Record<string, unknown>> {
  status: number;
  body: T & { error?: string; message?: string };
}

/**
 * Call one of our Edge Functions as the signed in applicant: their access token goes in the Authorization
 * header and the function verifies it itself. No provider secret is ever handled by the Next.js app.
 */
export async function callFunction<T = Record<string, unknown>>(name: string, body: unknown): Promise<FunctionResult<T>> {
  const db = await sessionClient();
  const { data } = await db.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { status: 401, body: { error: "signed_out", message: "Sign in again to continue." } as FunctionResult<T>["body"] };
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const parsed = (await res.json().catch(() => ({}))) as FunctionResult<T>["body"];
  return { status: res.status, body: parsed };
}
