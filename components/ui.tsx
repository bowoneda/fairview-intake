import Link from "next/link";
import type { ReactNode } from "react";

// Components from DESIGN.md, VISUAL DESIGN SYSTEM, Components. Tenant colors appear only in the roles
// listed there: primary fill with its contrast text, and accent as decoration.

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-semibold " +
  "disabled:cursor-not-allowed disabled:opacity-50";
export const buttonClass = {
  primary: `${buttonBase} bg-primary text-primary-contrast hover:shadow-[inset_0_0_0_999px_rgb(0_0_0/0.08)]`,
  secondary: `${buttonBase} border border-border bg-surface-raised text-text hover:shadow-[inset_0_0_0_999px_rgb(0_0_0/0.08)]`,
  quiet: `${buttonBase} text-text hover:underline`,
};

export function Field({ id, label, hint, error, children }: {
  id: string; label: string; hint?: string; error?: string; children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">{label}</label>
      {hint && <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          <span className="sr-only">Error: </span>{error}
        </p>
      )}
    </div>
  );
}

export const inputClass = (invalid = false) =>
  `min-h-11 rounded-md bg-surface-raised px-3 text-base ${invalid ? "border-2 border-danger" : "border border-border"}`;

/** aria-describedby for a Field's control. */
export const describedBy = (id: string, hint?: string, error?: string) =>
  [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

type Tone = "success" | "warning" | "danger" | "info";
const toneClass: Record<Tone, string> = {
  success: "bg-success-tint border-success",
  warning: "bg-warning-tint border-warning",
  danger: "bg-danger-tint border-danger",
  info: "bg-surface-raised border-border",
};

export function Banner({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"}
         className={`rounded-md border-l-4 p-4 text-text ${toneClass[tone]}`}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

export type StepState = "not_started" | "in_progress" | "complete";
const stateLabel: Record<StepState, string> = { not_started: "Not started", in_progress: "In progress", complete: "Complete" };

export function StepIndicator({ steps, current }: {
  steps: { slug: string; title: string; state: StepState; href?: string }[];
  current?: string;
}) {
  const index = Math.max(0, steps.findIndex((s) => s.slug === current));
  const done = steps.filter((s) => s.state === "complete").length;
  return (
    <nav aria-label="Application steps" className="flex flex-col gap-2">
      {current && (
        <p className="text-sm font-semibold sm:hidden">Step {index + 1} of {steps.length}: {steps[index].title}</p>
      )}
      <div className="h-1 w-full rounded-sm bg-divider" aria-hidden="true">
        <div className="h-1 rounded-sm bg-accent" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className={`${current ? "hidden sm:flex" : "flex"} flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4`}>
        {steps.map((s, i) => {
          const isCurrent = s.slug === current;
          const marker = s.state === "complete" ? "✓" : String(i + 1);
          const label = (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true"
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                      isCurrent ? "bg-primary text-primary-contrast" : s.state === "complete" ? "text-success" : "border border-border"}`}>
                {marker}
              </span>
              <span>{s.title}</span>
              <span className="text-sm text-muted">({stateLabel[s.state]})</span>
            </span>
          );
          return (
            <li key={s.slug} aria-current={isCurrent ? "step" : undefined}>
              {s.href ? <Link href={s.href} className="inline-flex min-h-11 items-center hover:underline">{label}</Link>
                      : <span className="inline-flex min-h-11 items-center">{label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PropertyCard({ name, address, units, programs, href }: {
  name: string; address: string; units: number; programs: string[]; href: string;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-divider border-t-4 border-t-accent bg-surface-raised p-4">
      <div>
        <h2 className="text-lg font-semibold">{name}</h2>
        <p className="text-muted">{address}</p>
        <p className="text-muted">{units} units</p>
      </div>
      {programs.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Programs">
          {programs.map((p) => (
            <li key={p} className="rounded-sm border border-border px-2 py-1 text-sm">{p}</li>
          ))}
        </ul>
      )}
      <Link href={href} className={`${buttonClass.primary} mt-auto w-full`}>Apply for {name}</Link>
    </article>
  );
}

export type UploadState = "empty" | "uploading" | "uploaded" | "error";

/** The upload control's states, rendered statically. Wired to storage in Phase 2, not before. */
export function UploadControl({ state }: { state: UploadState }) {
  const hint = "Photos or PDFs, up to 10 MB each";
  if (state === "empty") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-border p-4">
        <p className="text-sm text-muted">{hint}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className={buttonClass.secondary} disabled>Take a photo</button>
          <button type="button" className={buttonClass.secondary} disabled>Choose a file</button>
        </div>
        <p className="text-sm text-muted">Uploads open in a later release.</p>
      </div>
    );
  }
  if (state === "uploading") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border p-4" aria-live="polite">
        <p>paystub-march.jpg</p>
        <div className="h-2 w-full rounded-sm bg-divider"><div className="h-2 w-3/5 rounded-sm bg-text" /></div>
        <p className="text-sm">60 percent uploaded</p>
        <button type="button" className={`${buttonClass.quiet} self-start`}>Cancel</button>
      </div>
    );
  }
  if (state === "uploaded") {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-4">
        <div><p>paystub-march.jpg, 1.2 MB</p><p className="text-sm text-success">✓ Uploaded</p></div>
        <button type="button" className={buttonClass.quiet}>Remove paystub-march.jpg</button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-danger p-4" role="alert">
      <p className="text-danger">This file is 14 MB. Files must be 10 MB or smaller. Try a photo instead of a scan.</p>
      <button type="button" className={`${buttonClass.secondary} self-start`}>Try again</button>
    </div>
  );
}
