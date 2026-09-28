"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureApplication } from "@/lib/intake";
import { currentClaims, sessionClient } from "@/lib/supabase/server";
import { findProperty, resolveTenant } from "@/lib/tenant";

export interface SignInState {
  step: "email" | "code";
  /** Shown back to the person on the code step ("We sent a code to ..."). */
  email?: string;
  error?: string;
  /** Increments on each successful send. */
  sentCount?: number;
  /** When the last code was sent (epoch ms), for the resend countdown. */
  sentAt?: number;
}

// Holds the email between the two steps, so it never travels in a URL (and so never in access logs).
const EMAIL_COOKIE = "intake_email";

const emailSchema = z.string().trim().toLowerCase().email();
// The code length is a project setting in Supabase Auth (6 to 8 digits here), so accept any of them.
const codeSchema = z.string().trim().regex(/^\d{6,8}$/);

const RATE_LIMITED = "Too many attempts. Wait a minute and try again.";

export async function requestCode(prev: SignInState, form: FormData): Promise<SignInState> {
  const tenant = await resolveTenant(String(form.get("tenant") ?? ""));
  if (!tenant) return { step: "email", error: "This property manager could not be found." };
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { step: "email", error: "Enter an email address in the format name@example.com." };

  const db = await sessionClient();
  // tenant_slug is read only by the sign up trigger, and only when the account is first created: it
  // chooses which operator a new applicant belongs to. It never sets a role and never moves an existing user.
  const { error } = await db.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: true, data: { tenant_slug: tenant.slug } },
  });
  if (error) {
    const limited = error.status === 429 || /rate limit/i.test(error.message);
    return { ...prev, step: prev.step, error: limited ? RATE_LIMITED : "We could not send a code right now. Try again in a few minutes." };
  }

  (await cookies()).set(EMAIL_COOKIE, email.data, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 3600, path: "/",
  });
  return { step: "code", email: email.data, sentCount: (prev.sentCount ?? 0) + 1, sentAt: Date.now() };
}

export async function verifyCode(_prev: SignInState, form: FormData): Promise<SignInState> {
  const tenant = await resolveTenant(String(form.get("tenant") ?? ""));
  if (!tenant) return { step: "code", error: "This property manager could not be found." };
  const cookieStore = await cookies();
  const email = cookieStore.get(EMAIL_COOKIE)?.value;
  if (!email) return { step: "email", error: "Your code expired. Enter your email again." };
  const code = codeSchema.safeParse(form.get("code"));
  if (!code.success) return { step: "code", email, error: "Enter the code from the email, numbers only." };

  const db = await sessionClient();
  const { error } = await db.auth.verifyOtp({ email, token: code.data, type: "email" });
  if (error) {
    const limited = error.status === 429 || /rate limit/i.test(error.message);
    return { step: "code", email, error: limited ? RATE_LIMITED : "That code did not work. Codes expire after 1 hour. Send a new code." };
  }
  cookieStore.delete(EMAIL_COOKIE);

  const property = findProperty(tenant, String(form.get("property") ?? ""));
  const claims = await currentClaims();
  // Create the application only for an applicant of this operator, for this operator's property.
  if (claims && claims.tenantId === tenant.id && claims.appRole === "applicant" && property) {
    await ensureApplication(tenant, property, claims.userId, claims.email);
  }
  redirect(`/${tenant.slug}/apply${property ? `?property=${property.slug}` : ""}`);
}

export async function signOut(form: FormData) {
  const db = await sessionClient();
  await db.auth.signOut();
  const slug = String(form.get("tenant") ?? "");
  redirect(/^[a-z0-9-]+$/.test(slug) ? `/${slug}` : "/");
}
