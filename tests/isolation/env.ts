import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Client as PgClient } from "pg";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Fill in .env.local for fairview-dev (see .env.example).`);
  return value;
}

export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");
export const PUBLISHABLE_KEY = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const SECRET_KEY = required("SUPABASE_SECRET_KEY");
const DB_PASSWORD = required("SUPABASE_DB_PASSWORD");

export const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];

// The direct database host is IPv6 only and unreachable from the development machine, so the owner
// connection goes through the session pooler (PHASE-1-SPEC.md, ENVIRONMENTS).
const DB_HOST = process.env.SUPABASE_DB_HOST ?? "aws-1-eu-west-1.pooler.supabase.com";

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Publishable key client with no session: the anonymous role. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, noSession);
}

/** Secret key client: service role. Test setup and teardown only, never application code. */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SECRET_KEY, noSession);
}

/** Database owner connection, for fixtures, append only teardown, and after-the-fact verification reads. */
export async function ownerDb(): Promise<PgClient> {
  const db = new PgClient({
    host: DB_HOST,
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
    password: DB_PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  return db;
}
