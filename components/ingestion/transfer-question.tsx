"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { stateTransfer } from "@/app/[tenant]/apply/ingestion-actions";

// PHASE-2-SPEC.md, RECURRING TRANSFER RULE: the family's statement about a detected recurring deposit. Shown as
// the app, typical amount, frequency, and dates only, never the sender's details.

const OPTIONS = [
  { value: "regular_contribution", label: "Someone outside my household regularly gives me money" },
  { value: "gig_or_business_income", label: "Payment for work I do (gig or business income)" },
  { value: "own_account_transfer", label: "Moving my own money between my accounts" },
  { value: "shared_expense_reimbursement", label: "A roommate or relative paying me back for a shared bill" },
  { value: "life_event_gift", label: "A gift for a holiday, birthday, or life event" },
  { value: "will_not_repeat", label: "It has stopped and will not happen again this coming year" },
];

const FREQ: Record<string, string> = { weekly: "every week", biweekly: "every two weeks", semi_monthly: "twice a month", monthly: "every month" };
const money = (n: number) => `$${n.toFixed(2)}`;

export function TransferQuestion({ tenant, source }: {
  tenant: string;
  source: { id: string; appLabel: string | null; averageAmount: number | null; frequency: string | null; occurrences: number | null; firstSeen: string | null; lastSeen: string | null };
}) {
  const [choice, setChoice] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const legendId = `transfer-${source.id}`;

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-divider bg-surface-raised p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!choice) return setError("Choose the answer that fits best.");
        start(async () => {
          const r = await stateTransfer(tenant, source.id, choice);
          if (!r.ok) setError(r.message ?? "Try again.");
        });
      }}
    >
      <fieldset className="flex flex-col gap-1" aria-describedby={error ? `${legendId}-error` : undefined}>
        <legend id={legendId} className="mb-2 font-semibold">
          We found {source.occurrences} deposits from {source.appLabel} of about {source.averageAmount !== null ? money(source.averageAmount) : "the same amount"}{" "}
          {source.frequency ? FREQ[source.frequency] : "at irregular times"}, from {source.firstSeen} to {source.lastSeen}. What are these payments?
        </legend>
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="radio" name={`statement-${source.id}`} value={o.value} checked={choice === o.value} onChange={() => { setChoice(o.value); setError(""); }} className="h-5 w-5 accent-primary" />
            {o.label}
          </label>
        ))}
      </fieldset>
      {error && <p id={`${legendId}-error`} role="alert" className="text-sm text-danger"><span className="sr-only">Error: </span>{error}</p>}
      <button type="submit" className={`${buttonClass.primary} self-start`} disabled={pending} aria-busy={pending}>{pending ? "Saving…" : "Save answer"}</button>
    </form>
  );
}
