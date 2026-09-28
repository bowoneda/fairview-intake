"use client";

import { useActionState, useEffect, useState } from "react";
import { Field, buttonClass, describedBy, inputClass } from "@/components/ui";
import { requestCode, verifyCode, type SignInState } from "./actions";

const RESEND_SECONDS = 60;

export function SignInForm({ tenant, property, propertyName }: { tenant: string; property: string; propertyName: string }) {
  const [sent, sendCode, sending] = useActionState<SignInState, FormData>(requestCode, { step: "email" });
  const [verified, checkCode, checking] = useActionState<SignInState, FormData>(verifyCode, { step: "code" });
  const [useDifferentEmail, setUseDifferentEmail] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second while a resend countdown is running.
  useEffect(() => {
    if (!sent.sentAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sent.sentAt]);
  const secondsLeft = sent.sentAt
    ? Math.min(RESEND_SECONDS, Math.max(0, Math.ceil((sent.sentAt + RESEND_SECONDS * 1000 - now) / 1000)))
    : 0;

  const onCodeStep = sent.step === "code" && verified.step !== "email" && useDifferentEmail < (sent.sentCount ?? 0);

  if (!onCodeStep) {
    const error = sent.error ?? (verified.step === "email" ? verified.error : undefined);
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">Apply for {propertyName}</h1>
        <form action={sendCode} className="flex flex-col gap-6" noValidate>
          <input type="hidden" name="tenant" value={tenant} />
          <Field id="email" label="Email address (required)" hint="We will send you a 6 digit code. No password needed." error={error}>
            <input id="email" name="email" type="email" autoComplete="email" required className={inputClass(Boolean(error))}
                   aria-describedby={describedBy("email", "hint", error)} aria-invalid={Boolean(error)} />
          </Field>
          <button type="submit" className={`${buttonClass.primary} w-full sm:w-auto`} disabled={sending} aria-busy={sending}>
            {sending ? "Sending code…" : "Send code"}
          </button>
        </form>
      </div>
    );
  }

  const error = verified.error ?? sent.error;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold sm:text-3xl">Check your email</h1>
      <p>We sent a code to {sent.email}.</p>
      <form action={checkCode} className="flex flex-col gap-6" noValidate>
        <input type="hidden" name="tenant" value={tenant} />
        <input type="hidden" name="property" value={property} />
        <Field id="code" label="6 digit code (required)" error={error}>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required
                 className={`${inputClass(Boolean(error))} tracking-widest`}
                 aria-describedby={describedBy("code", undefined, error)} aria-invalid={Boolean(error)} />
        </Field>
        <button type="submit" className={`${buttonClass.primary} w-full sm:w-auto`} disabled={checking} aria-busy={checking}>
          {checking ? "Checking…" : "Continue"}
        </button>
      </form>
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
        <form action={sendCode}>
          <input type="hidden" name="tenant" value={tenant} />
          <input type="hidden" name="email" value={sent.email ?? ""} />
          <button type="submit" className={buttonClass.quiet} disabled={secondsLeft > 0 || sending}>
            {secondsLeft > 0 ? `Send a new code (${secondsLeft}s)` : "Send a new code"}
          </button>
        </form>
        <button type="button" className={buttonClass.quiet} onClick={() => setUseDifferentEmail(sent.sentCount ?? 0)}>
          Use a different email
        </button>
      </div>
    </div>
  );
}
