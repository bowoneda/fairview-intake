import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/** Server client bound to the request's session cookies. Every query runs under RLS as that user. */
export async function sessionClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read only. proxy.ts refreshes the session.
        }
      },
    },
  });
}

/** Anonymous client with no session, for the public tables (tenants, programs, theme, properties). */
export function publicClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export interface SessionClaims {
  userId: string;
  email: string | null;
  /** Set only by the Custom Access Token Hook from public.users; absent for a user with no profile. */
  tenantId: string | null;
  appRole: "applicant" | "reviewer" | "admin" | null;
}

/** Verified claims for the current request, or null when signed out. getClaims verifies the JWT. */
export async function currentClaims(): Promise<SessionClaims | null> {
  const supabase = await sessionClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const c = data.claims as Record<string, unknown>;
  return {
    userId: String(c.sub),
    email: typeof c.email === "string" ? c.email : null,
    tenantId: typeof c.tenant_id === "string" ? c.tenant_id : null,
    appRole: (c.app_role as SessionClaims["appRole"]) ?? null,
  };
}
