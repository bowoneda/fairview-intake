"use client";

import { useActionState } from "react";
import { Banner, Field, buttonClass, describedBy, inputClass } from "@/components/ui";
import { addHouseholdMember, type MemberFormState } from "../actions";

const RELATIONSHIPS = [
  { value: "head", label: "Head of household" },
  { value: "spouse", label: "Spouse" },
  { value: "co_head", label: "Co head" },
  { value: "dependent", label: "Dependent" },
  { value: "other_adult", label: "Other adult" },
];

export function HouseholdForm({ tenant, hasHead }: { tenant: string; hasHead: boolean }) {
  const [state, save, saving] = useActionState<MemberFormState, FormData>(addHouseholdMember, {});
  const e = state.errors ?? {};

  return (
    <form action={save} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="tenant" value={tenant} />
      {state.formError && <Banner tone="danger" title="Something went wrong">{state.formError}</Banner>}

      <Field id="full_name" label="Full name (required)" error={e.full_name}>
        <input id="full_name" name="full_name" autoComplete="name" required className={inputClass(Boolean(e.full_name))}
               aria-describedby={describedBy("full_name", undefined, e.full_name)} aria-invalid={Boolean(e.full_name)} />
      </Field>

      <fieldset className="flex flex-col gap-2" aria-describedby={e.relationship ? "relationship-error" : undefined}>
        <legend className="mb-2 font-semibold">Relationship to the head of household (required)</legend>
        {RELATIONSHIPS.filter((r) => !(hasHead && r.value === "head")).map((r, i) => (
          <label key={r.value} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="radio" name="relationship" value={r.value} defaultChecked={!hasHead ? r.value === "head" : i === 0}
                   className="h-5 w-5 accent-primary" />
            {r.label}
          </label>
        ))}
        {e.relationship && (
          <p id="relationship-error" className="text-sm text-danger"><span className="sr-only">Error: </span>{e.relationship}</p>
        )}
      </fieldset>

      <Field id="date_of_birth" label="Date of birth" error={e.date_of_birth}>
        <input id="date_of_birth" name="date_of_birth" type="date" className={inputClass(Boolean(e.date_of_birth))}
               aria-describedby={describedBy("date_of_birth", undefined, e.date_of_birth)} aria-invalid={Boolean(e.date_of_birth)} />
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="submit" name="intent" value="add_another" className={buttonClass.secondary} disabled={saving} aria-busy={saving}>
          Save and add another person
        </button>
        <button type="submit" name="intent" value="continue" className={buttonClass.primary} disabled={saving} aria-busy={saving}>
          Save and continue
        </button>
        <button type="submit" name="intent" value="finish_later" className={buttonClass.quiet} disabled={saving}>
          Save and finish later
        </button>
      </div>
    </form>
  );
}
